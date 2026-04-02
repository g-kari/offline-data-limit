import { useState, useCallback } from "react";
import type { SimulationConfig, SimulationProgress, SimulationResult } from "../types";
import { generateBmpChunk } from "../utils/chunk-generator";

const SIMULATION_CACHE = "__simulation_cache";

export function useImageSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SimulationProgress | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const cleanup = useCallback(async () => {
    await caches.delete(SIMULATION_CACHE).catch(() => {});
  }, []);

  const run = useCallback(
    async (config: SimulationConfig) => {
      if (isRunning) return;
      setIsRunning(true);
      setResult(null);
      setProgress(null);

      await cleanup();

      const startTime = Date.now();
      let successCount = 0;
      let totalBytes = 0;
      let failedAtIndex: number | null = null;

      try {
        const cache = await caches.open(SIMULATION_CACHE);
        const sizeBytes = config.imageSizeKB * 1024;

        for (let i = 0; i < config.imageCount; i++) {
          setProgress({ current: i, total: config.imageCount, bytesWritten: totalBytes });
          try {
            const chunk = generateBmpChunk(sizeBytes);
            const blob = new Blob([chunk.buffer as ArrayBuffer], { type: "image/bmp" });
            const response = new Response(blob, { headers: { "Content-Type": "image/bmp" } });
            await cache.put(`/sim/card_${i}.bmp`, response);
            successCount++;
            totalBytes += sizeBytes;
          } catch (err) {
            const isQuota =
              err instanceof DOMException &&
              (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
            if (isQuota) {
              failedAtIndex = i;
              break;
            }
            throw err;
          }
        }
      } finally {
        const durationMs = Date.now() - startTime;
        setResult({
          config,
          totalBytes,
          successCount,
          failedAtIndex,
          durationMs,
          throughputMBps: durationMs > 0 ? totalBytes / 1024 / 1024 / (durationMs / 1000) : 0,
        });
        setProgress(null);
        setIsRunning(false);
      }
    },
    [isRunning, cleanup],
  );

  return { isRunning, progress, result, run, cleanup };
}
