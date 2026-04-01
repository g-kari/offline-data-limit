import { useState, useCallback } from "react";
import type { TestResult, TestProgress, DataType } from "../types";
import { generateStringChunkByType } from "../utils/chunk-generator";

const KEY_PREFIX = "__bench_ss_";
// sessionStorage は通常 5MB 上限のため、512KB スタートで十分収束する
const START_CHUNK_BYTES = 512 * 1024; // 512KB
const MIN_CHUNK_BYTES = 1024; // 1KB

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: (dataType?: DataType) => Promise<void>;
  cleanup: () => Promise<void>;
}

function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED"
    );
  }
  if (err instanceof Error) {
    return (
      err.name === "QuotaExceededError" ||
      err.message.toLowerCase().includes("quota")
    );
  }
  return false;
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

  const run = useCallback(async (dataType: DataType = "random") => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);
    setProgress(null);

    try {
      await cleanup();

      const startTime = Date.now();
      let totalBytes = 0;
      let chunkSize = START_CHUNK_BYTES;
      let keyIndex = 0;

      while (chunkSize >= MIN_CHUNK_BYTES) {
        try {
          const data = generateStringChunkByType(chunkSize, dataType);
          sessionStorage.setItem(`${KEY_PREFIX}${keyIndex}`, data);
          totalBytes += chunkSize;
          keyIndex++;

          const elapsed = (Date.now() - startTime) / 1000;
          setProgress({
            apiId: "sessionStorage",
            bytesWritten: totalBytes,
            currentChunkSize: chunkSize,
            throughputMBps: elapsed > 0 ? totalBytes / 1024 / 1024 / elapsed : 0,
            phase: "writing",
          });
        } catch (err) {
          if (isQuotaError(err)) {
            chunkSize = Math.floor(chunkSize / 2);
          } else {
            throw err;
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const throughputMBps =
        durationMs > 0 ? totalBytes / 1024 / 1024 / (durationMs / 1000) : 0;

      setResult({
        apiId: "sessionStorage",
        actualLimitBytes: totalBytes,
        throughputMBps,
        reportedQuotaBytes: null,
        dataType,
        durationMs,
        supported: true,
      });

      setProgress((prev) => (prev ? { ...prev, phase: "cleanup" } : null));
      await cleanup();
      setProgress((prev) => (prev ? { ...prev, phase: "done" } : null));
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setResult({
        apiId: "sessionStorage",
        actualLimitBytes: 0,
        throughputMBps: 0,
        reportedQuotaBytes: null,
        dataType,
        durationMs: 0,
        supported:
          typeof window !== "undefined" && "sessionStorage" in window,
        error: message,
      });
      setProgress((prev) => (prev ? { ...prev, phase: "error" } : null));
      await cleanup();
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, cleanup]);

  return { result, progress, isRunning, run, cleanup };
}
