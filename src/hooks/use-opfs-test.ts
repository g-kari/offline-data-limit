import { useState, useCallback, useRef } from "react";
import type {
  TestResult,
  TestProgress,
  WorkerInMessage,
  WorkerOutMessage,
  DataType,
} from "../types";
import { getSafeMaxBytes } from "../utils/storage-cap";

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: (dataType?: DataType, skipCleanup?: boolean) => Promise<void>;
  cleanup: () => Promise<void>;
}

/** OPFS の容量上限を計測する hook（Web Worker経由） */
export function useOpfsTest(): UseStorageTestReturn {
  const [result, setResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const cleanup = useCallback(async () => {
    // Worker にクリーンアップを指示
    if (workerRef.current) {
      const msg: WorkerInMessage = { type: "cleanup" };
      workerRef.current.postMessage(msg);
      // Worker終了を待つ
      await new Promise<void>((resolve) => {
        const onMessage = (e: MessageEvent<WorkerOutMessage>) => {
          if (e.data.type === "complete" || e.data.type === "error") {
            workerRef.current?.removeEventListener("message", onMessage);
            resolve();
          }
        };
        workerRef.current?.addEventListener("message", onMessage);
      });
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const run = useCallback(
    async (dataType: DataType = "random", _skipCleanup = false) => {
      if (isRunning) return;
      setIsRunning(true);
      setResult(null);
      setProgress(null);

      try {
        const worker = new Worker(new URL("../workers/opfs-worker.ts", import.meta.url), {
          type: "module",
        });
        workerRef.current = worker;
        const maxBytes = await getSafeMaxBytes();

        await new Promise<void>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
            const msg = e.data;

            switch (msg.type) {
              case "progress":
                setProgress({
                  apiId: "opfs",
                  bytesWritten: msg.bytesWritten,
                  currentChunkSize: msg.currentChunkSize,
                  throughputMBps: msg.throughputMBps,
                  phase: "writing",
                });
                break;

              case "complete":
                setResult({
                  apiId: "opfs",
                  actualLimitBytes: msg.actualLimitBytes,
                  throughputMBps: msg.throughputMBps,
                  reportedQuotaBytes: null,
                  dataType,
                  durationMs: msg.durationMs,
                  supported: true,
                  verified: msg.verified,
                });
                setProgress((prev) => (prev ? { ...prev, phase: "done" } : null));
                worker.terminate();
                workerRef.current = null;
                resolve();
                break;

              case "error":
                setResult({
                  apiId: "opfs",
                  actualLimitBytes: 0,
                  throughputMBps: 0,
                  reportedQuotaBytes: null,
                  dataType,
                  durationMs: 0,
                  supported: true,
                  error: msg.message,
                });
                setProgress((prev) => (prev ? { ...prev, phase: "error" } : null));
                worker.terminate();
                workerRef.current = null;
                reject(new Error(msg.message));
                break;
            }
          };

          worker.onerror = (e) => {
            worker.terminate();
            workerRef.current = null;
            reject(new Error(e.message));
          };

          // 計測開始
          const startMsg: WorkerInMessage = { type: "start", dataType, maxBytes };
          worker.postMessage(startMsg);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "不明なエラー";
        // resultが未設定の場合のみ（worker.onerror等）
        setResult(
          (prev) =>
            prev ?? {
              apiId: "opfs",
              actualLimitBytes: 0,
              throughputMBps: 0,
              reportedQuotaBytes: null,
              dataType,
              durationMs: 0,
              supported: false,
              error: message,
            },
        );
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning],
  );

  return { result, progress, isRunning, run, cleanup };
}
