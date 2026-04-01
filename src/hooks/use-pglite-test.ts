import { useState, useCallback, useRef } from "react";
import type { TestResult, TestProgress } from "../types";
import { measureStorageLimit } from "../utils/binary-search";
import { generateChunk } from "../utils/chunk-generator";

const IDB_NAME = "/pglite/benchmark-pglite";

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: () => Promise<void>;
  cleanup: () => Promise<void>;
}

/** Uint8Array を16進文字列に変換 */
function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/** PGLite の容量上限を計測する hook */
export function usePgliteTest(): UseStorageTestReturn {
  const [result, setResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const pgRef = useRef<{ close: () => Promise<void> } | null>(null);

  const cleanup = useCallback(async () => {
    // PGliteインスタンスを閉じる
    if (pgRef.current) {
      await pgRef.current.close().catch(() => {});
      pgRef.current = null;
    }
    // IndexedDB からPGliteデータを削除
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(IDB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, []);

  const run = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);
    setProgress(null);

    try {
      await cleanup();

      // PGlite を動的import
      const { PGlite } = await import("@electric-sql/pglite");
      const pg = await PGlite.create("idb://benchmark-pglite");
      pgRef.current = pg;

      // テーブル作成
      await pg.exec(
        "CREATE TABLE IF NOT EXISTS data (id SERIAL, chunk BYTEA)"
      );

      const searchResult = await measureStorageLimit({
        onWrite: async (chunkSize, _keyIndex) => {
          const chunk = generateChunk(chunkSize);
          const hexStr = "\\x" + toHex(chunk);
          await pg.exec(`INSERT INTO data (chunk) VALUES ('${hexStr}')`);
        },
        onProgress: (bytesWritten, currentChunkSize, startTime) => {
          const elapsed = (Date.now() - startTime) / 1000;
          setProgress({
            apiId: "pglite",
            bytesWritten,
            currentChunkSize,
            throughputMBps:
              elapsed > 0 ? bytesWritten / 1024 / 1024 / elapsed : 0,
            phase: "writing",
          });
        },
      });

      setResult({
        apiId: "pglite",
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
        apiId: "pglite",
        actualLimitBytes: 0,
        throughputMBps: 0,
        reportedQuotaBytes: null,
        durationMs: 0,
        supported: true,
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
