import { useState, useCallback, useRef } from "react";
import type { SimulationConfig, SimulationProgress, SimulationResult } from "../types";
import { buildImageUrl } from "../utils/image-url";

export const SIMULATION_CACHE = "__simulation_cache";

const MAX_CONCURRENT = 5;

export function useImageSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SimulationProgress | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(async () => {
    abortRef.current?.abort();
    await caches.delete(SIMULATION_CACHE).catch(() => {});
  }, []);

  const run = useCallback(
    async (config: SimulationConfig) => {
      if (isRunning) return;

      setIsRunning(true);
      setResult(null);
      setError(null);
      setProgress(null);

      // プリフライトチェック: APIへの疎通確認
      try {
        const preflightUrl = buildImageUrl(
          0,
          config.width,
          config.height,
          config.format,
          config.quality,
        );
        await fetch(preflightUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      } catch {
        setError("外部画像APIに接続できません。ネットワーク接続を確認してください。");
        setIsRunning(false);
        return;
      }

      await cleanup();

      const abort = new AbortController();
      abortRef.current = abort;

      const startTime = Date.now();
      let successCount = 0;
      let totalBytes = 0;
      let failedAtIndex: number | null = null;

      try {
        const cache = await caches.open(SIMULATION_CACHE);

        // Promiseプールで最大MAX_CONCURRENT並行フェッチ
        let nextIndex = 0;
        let quotaIndex: number | null = null;

        const worker = async () => {
          while (nextIndex < config.imageCount && quotaIndex === null && !abort.signal.aborted) {
            const i = nextIndex++;
            const url = buildImageUrl(
              i,
              config.width,
              config.height,
              config.format,
              config.quality,
            );

            try {
              const response = await fetch(url, { signal: abort.signal });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);

              // サイズ計測のためにcloneしてblobを読む
              const blob = await response.clone().blob();
              const imageBytes = blob.size;

              await cache.put(url, response);

              successCount++;
              totalBytes += imageBytes;
              setProgress({
                current: successCount,
                total: config.imageCount,
                bytesWritten: totalBytes,
              });
            } catch (err) {
              if (abort.signal.aborted) return;
              const isQuota =
                err instanceof DOMException &&
                (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
              if (isQuota) {
                quotaIndex = i;
                abort.abort();
                return;
              }
              // その他のネットワークエラーはスキップ（1枚失敗でも続行）
            }
          }
        };

        await Promise.all(Array.from({ length: MAX_CONCURRENT }, worker));
        failedAtIndex = quotaIndex;
      } finally {
        const durationMs = Date.now() - startTime;
        setResult({
          config,
          totalBytes,
          successCount,
          failedAtIndex,
          durationMs,
          throughputMBps: durationMs > 0 ? totalBytes / 1024 / 1024 / (durationMs / 1000) : 0,
          averageImageBytes: successCount > 0 ? Math.round(totalBytes / successCount) : 0,
        });
        setProgress(null);
        setIsRunning(false);
      }
    },
    [isRunning, cleanup],
  );

  return { isRunning, progress, result, error, run, cleanup };
}
