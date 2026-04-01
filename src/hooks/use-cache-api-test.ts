import { useState, useCallback } from "react";
import type { TestResult, TestProgress } from "../types";
import { measureStorageLimit } from "../utils/binary-search";
import { generateChunk } from "../utils/chunk-generator";

const CACHE_NAME = "__benchmark_cache";

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: () => Promise<void>;
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

  const run = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);
    setProgress(null);

    try {
      await cleanup();
      const cache = await caches.open(CACHE_NAME);

      const searchResult = await measureStorageLimit({
        onWrite: async (chunkSize, keyIndex) => {
          const chunk = generateChunk(chunkSize);
          // Blob は ArrayBuffer を要求するため buffer を渡す
          const blob = new Blob([chunk.buffer as ArrayBuffer]);
          const response = new Response(blob);
          await cache.put(`/bench/${keyIndex}`, response);
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

      setResult({
        apiId: "cacheApi",
        actualLimitBytes: searchResult.actualLimitBytes,
        throughputMBps: searchResult.throughputMBps,
        reportedQuotaBytes: null,
        durationMs: searchResult.durationMs,
        supported: true,
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
