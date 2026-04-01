import { useState, useCallback } from "react";
import type { TestResult, TestProgress, DataType } from "../types";
import { measureStorageLimit } from "../utils/binary-search";
import { generateChunkByType } from "../utils/chunk-generator";
import { getSafeMaxBytes } from "../utils/storage-cap";

const DB_NAME = "__benchmark_idb";
const STORE_NAME = "data";

interface UseStorageTestReturn {
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  run: (dataType?: DataType) => Promise<void>;
  cleanup: () => Promise<void>;
}

/** IndexedDB を開く */
function openBenchmarkDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB にチャンクを書き込む */
function writeChunk(db: IDBDatabase, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(
        tx.error ??
          new DOMException("Transaction aborted", "QuotaExceededError")
      );
  });
}

/** IndexedDB からレコード件数を取得して検証する */
function verifyData(db: IDBDatabase): Promise<boolean> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror = () => resolve(false);
  });
}

/** IndexedDB の容量上限を計測する hook */
export function useIndexedDBTest(): UseStorageTestReturn {
  const [result, setResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const cleanup = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  }, []);

  const run = useCallback(async (dataType: DataType = "random") => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);
    setProgress(null);

    let db: IDBDatabase | null = null;

    try {
      await cleanup();
      db = await openBenchmarkDB();
      const maxBytes = await getSafeMaxBytes();

      const searchResult = await measureStorageLimit({
        maxBytes,
        onWrite: async (chunkSize, _keyIndex) => {
          const chunk = generateChunkByType(chunkSize, dataType);
          await writeChunk(db!, chunk);
        },
        onProgress: (bytesWritten, currentChunkSize, startTime) => {
          const elapsed = (Date.now() - startTime) / 1000;
          setProgress({
            apiId: "indexedDB",
            bytesWritten,
            currentChunkSize,
            throughputMBps:
              elapsed > 0 ? bytesWritten / 1024 / 1024 / elapsed : 0,
            phase: "writing",
          });
        },
      });

      // 検証: データが読み返せるか確認
      const verified = await verifyData(db);

      db.close();
      db = null;

      setResult({
        apiId: "indexedDB",
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
      db?.close();
      const message =
        err instanceof Error ? err.message : "不明なエラー";
      setResult({
        apiId: "indexedDB",
        actualLimitBytes: 0,
        throughputMBps: 0,
        reportedQuotaBytes: null,
        dataType,
        durationMs: 0,
        supported:
          typeof window !== "undefined" && "indexedDB" in window,
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
