import { useState, useCallback } from "react";
import type { TestResult, TestProgress, DataType } from "../types";
import { measureStorageLimit } from "../utils/binary-search";
import { generateChunkByType } from "../utils/chunk-generator";
import { getSafeMaxBytes } from "../utils/storage-cap";

const CACHE_NAME = "__benchmark_cache";

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: (dataType?: DataType) => Promise<void>;
  cleanup: () => Promise<void>;
}

/** Cache API の容量上限を計測する hook */
export function useCacheApiTest(): UseStorageTestReturn {
  const [result, setResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const cleanup = useCallback(async () => {
    await caches.delete(CACHE_NAME);
  }, []);

  const run = useCallback(async (dataType: DataType = "random") => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);
    setProgress(null);

    try {
      await cleanup();
      const cache = await caches.open(CACHE_NAME);
      const maxBytes = await getSafeMaxBytes();
      let lastKeyIndex = 0;

      const searchResult = await measureStorageLimit({
        maxBytes,
        onWrite: async (chunkSize, keyIndex) => {
          const chunk = generateChunkByType(chunkSize, dataType);
          const contentType = {
            random: "application/octet-stream",
            bmp: "image/bmp",
            text: "text/plain; charset=utf-8",
            json: "application/json; charset=utf-8",
          }[dataType];
          const blob = new Blob([chunk.buffer as ArrayBuffer], { type: contentType });
          const response = new Response(blob, {
            headers: { "Content-Type": contentType },
          });
          await cache.put(`/bench/${keyIndex}`, response);
          lastKeyIndex = keyIndex;
        },
        onProgress: (bytesWritten, currentChunkSize, startTime) => {
          const elapsed = (Date.now() - startTime) / 1000;
          setProgress({
            apiId: "cacheApi",
            bytesWritten,
            currentChunkSize,
            throughputMBps:
              elapsed > 0 ? bytesWritten / 1024 / 1024 / elapsed : 0,
            phase: "writing",
          });
        },
      });

      // 検証: 最初のエントリが読み返せるか確認
      let verified = false;
      if (lastKeyIndex >= 0) {
        const resp = await cache.match("/bench/0");
        verified = resp !== undefined;
      }

      setResult({
        apiId: "cacheApi",
        actualLimitBytes: searchResult.actualLimitBytes,
        throughputMBps: searchResult.throughputMBps,
        reportedQuotaBytes: null,
        dataType,
        durationMs: searchResult.durationMs,
        supported: true,
        verified,
      });

      setProgress((prev) =>
        prev ? { ...prev, phase: "cleanup" } : null
      );
      await cleanup();
      setProgress((prev) =>
        prev ? { ...prev, phase: "done" } : null
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "不明なエラー";
      setResult({
        apiId: "cacheApi",
        actualLimitBytes: 0,
        throughputMBps: 0,
        reportedQuotaBytes: null,
        dataType,
        durationMs: 0,
        supported:
          typeof window !== "undefined" && "caches" in window,
        error: message,
      });
      setProgress((prev) =>
        prev ? { ...prev, phase: "error" } : null
      );
      await cleanup();
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, cleanup]);

  return { result, progress, isRunning, run, cleanup };
}
