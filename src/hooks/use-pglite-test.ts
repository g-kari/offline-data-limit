import { useState, useCallback, useRef } from "react";
import type { TestResult, TestProgress, DataType } from "../types";
import { measureStorageLimit } from "../utils/binary-search";
import { generateChunkByType } from "../utils/chunk-generator";
import { getSafeMaxBytes } from "../utils/storage-cap";

const IDB_NAME = "/pglite/benchmark-pglite";

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: (dataType?: DataType, skipCleanup?: boolean) => Promise<void>;
  cleanup: () => Promise<void>;
}

/** PGLite の容量上限を計測する hook */
export function usePgliteTest(): UseStorageTestReturn {
  const [result, setResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const pgRef = useRef<{
    close: () => Promise<void>;
    exec: (sql: string) => Promise<unknown>;
  } | null>(null);

  const cleanup = useCallback(async () => {
    if (pgRef.current) {
      await pgRef.current.close().catch(() => {});
      pgRef.current = null;
    }
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(IDB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, []);

  const run = useCallback(
    async (dataType: DataType = "random", skipCleanup = false) => {
      if (isRunning) return;
      setIsRunning(true);
      setResult(null);
      setProgress(null);

      try {
        await cleanup();

        const { PGlite } = await import("@electric-sql/pglite");
        const pg = await PGlite.create("idb://benchmark-pglite");
        pgRef.current = pg;

        await pg.exec("CREATE TABLE IF NOT EXISTS data (id SERIAL, chunk BYTEA)");

        const maxBytes = await getSafeMaxBytes();

        const searchResult = await measureStorageLimit({
          maxBytes,
          onWrite: async (chunkSize, _keyIndex) => {
            const chunk = generateChunkByType(chunkSize, dataType);
            // hex文字列変換を避けパラメータクエリで直接バイナリを渡す
            await pg.query("INSERT INTO data (chunk) VALUES ($1)", [chunk]);
          },
          onProgress: (bytesWritten, currentChunkSize, startTime) => {
            const elapsed = (Date.now() - startTime) / 1000;
            setProgress({
              apiId: "pglite",
              bytesWritten,
              currentChunkSize,
              throughputMBps: elapsed > 0 ? bytesWritten / 1024 / 1024 / elapsed : 0,
              phase: "writing",
            });
          },
        });

        // 検証: レコードが読み返せるか確認
        let verified = false;
        try {
          const res = (await pg.exec("SELECT COUNT(*) AS cnt FROM data")) as unknown as {
            rows: { cnt: number }[];
          }[];
          verified = res[0]?.rows?.[0]?.cnt > 0;
        } catch {
          verified = false;
        }

        setResult({
          apiId: "pglite",
          actualLimitBytes: searchResult.actualLimitBytes,
          throughputMBps: searchResult.throughputMBps,
          reportedQuotaBytes: null,
          dataType,
          durationMs: searchResult.durationMs,
          supported: true,
          verified,
        });

        if (!skipCleanup) {
          setProgress((prev) => (prev ? { ...prev, phase: "cleanup" } : null));
          await cleanup();
        }
        setProgress((prev) => (prev ? { ...prev, phase: "done" } : null));
      } catch (err) {
        const message = err instanceof Error ? err.message : "不明なエラー";
        setResult({
          apiId: "pglite",
          actualLimitBytes: 0,
          throughputMBps: 0,
          reportedQuotaBytes: null,
          dataType,
          durationMs: 0,
          supported: true,
          error: message,
        });
        setProgress((prev) => (prev ? { ...prev, phase: "error" } : null));
        await cleanup();
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, cleanup],
  );

  return { result, progress, isRunning, run, cleanup };
}
