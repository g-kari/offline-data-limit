import { useState, useCallback } from "react";
import type { TestResult, TestProgress } from "../types";
import { measureStorageLimit } from "../utils/binary-search";
import { generateStringChunk } from "../utils/chunk-generator";

const KEY_PREFIX = "__bench_ss_";
const START_CHUNK = 1024 * 1024; // 1MB（sessionStorage向け）

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: () => Promise<void>;
  cleanup: () => Promise<void>;
}

/** sessionStorage の容量上限を計測する hook */
export function useSessionStorageTest(): UseStorageTestReturn {
  const [result, setResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const cleanup = useCallback(async () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  }, []);

  const run = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);
    setProgress(null);

    try {
      await cleanup();

      const searchResult = await measureStorageLimit({
        onWrite: async (chunkSize, keyIndex) => {
          const actualSize = Math.min(chunkSize, START_CHUNK);
          const data = generateStringChunk(actualSize);
          sessionStorage.setItem(`${KEY_PREFIX}${keyIndex}`, data);
        },
        onProgress: (bytesWritten, currentChunkSize, startTime) => {
          const elapsed = (Date.now() - startTime) / 1000;
          setProgress({
            apiId: "sessionStorage",
            bytesWritten,
            currentChunkSize,
            throughputMBps:
              elapsed > 0 ? bytesWritten / 1024 / 1024 / elapsed : 0,
            phase: "writing",
          });
        },
      });

      setResult({
        apiId: "sessionStorage",
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
        apiId: "sessionStorage",
        actualLimitBytes: 0,
        throughputMBps: 0,
        reportedQuotaBytes: null,
        durationMs: 0,
        supported:
          typeof window !== "undefined" && "sessionStorage" in window,
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
