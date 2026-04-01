import { useState, useCallback, useRef, type MutableRefObject } from "react";
import type { StorageApiId, TestResult, TestProgress, BenchmarkSession, DataType } from "../types";
import { getBrowserInfo, getStorageEstimate } from "../utils/browser-info";
import { requestPersistence } from "../utils/storage-cap";
import { useLocalStorageTest } from "./use-localstorage-test";
import { useSessionStorageTest } from "./use-sessionstorage-test";
import { useIndexedDBTest } from "./use-indexeddb-test";
import { useCacheApiTest } from "./use-cache-api-test";
import { useOpfsTest } from "./use-opfs-test";
import { useSqliteTest } from "./use-sqlite-test";
import { usePgliteTest } from "./use-pglite-test";

const HISTORY_DB_NAME = "benchmark-history";
const HISTORY_STORE_NAME = "sessions";

interface UseBenchmarkReturn {
  session: BenchmarkSession | null;
  isRunning: boolean;
  currentApiId: StorageApiId | null;
  currentProgress: TestProgress | null;
  runAll: (retainData?: boolean) => Promise<void>;
  results: Map<StorageApiId, TestResult>;
  history: BenchmarkSession[];
}

/** 履歴DB を開く */
function openHistoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HISTORY_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        db.createObjectStore(HISTORY_STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 履歴を保存 */
async function saveSession(session: BenchmarkSession): Promise<void> {
  const db = await openHistoryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE_NAME, "readwrite");
    const store = tx.objectStore(HISTORY_STORE_NAME);
    store.put(session);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** 履歴を全件読み込み */
async function loadHistory(): Promise<BenchmarkSession[]> {
  const db = await openHistoryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE_NAME, "readonly");
    const store = tx.objectStore(HISTORY_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      // タイムスタンプ降順でソート
      const sessions = req.result as BenchmarkSession[];
      sessions.sort((a, b) => b.timestamp - a.timestamp);
      resolve(sessions);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/** 全テストを逐次実行するオーケストレーション hook */
export function useBenchmark(dataType: DataType = "random"): UseBenchmarkReturn {
  const [session, setSession] = useState<BenchmarkSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentApiId, setCurrentApiId] = useState<StorageApiId | null>(null);
  const [results, setResults] = useState<Map<StorageApiId, TestResult>>(new Map());
  const [history, setHistory] = useState<BenchmarkSession[]>([]);

  // 各テストhook
  const localStorage = useLocalStorageTest();
  const sessionStorage = useSessionStorageTest();
  const indexedDB = useIndexedDBTest();
  const cacheApi = useCacheApiTest();
  const opfs = useOpfsTest();
  const sqlite = useSqliteTest();
  const pglite = usePgliteTest();

  // クロージャ問題回避: 最新のresult/progressをrefで追跡
  const localStorageResultRef = useRef(localStorage.result);
  localStorageResultRef.current = localStorage.result;
  const sessionStorageResultRef = useRef(sessionStorage.result);
  sessionStorageResultRef.current = sessionStorage.result;
  const indexedDBResultRef = useRef(indexedDB.result);
  indexedDBResultRef.current = indexedDB.result;
  const cacheApiResultRef = useRef(cacheApi.result);
  cacheApiResultRef.current = cacheApi.result;
  const opfsResultRef = useRef(opfs.result);
  opfsResultRef.current = opfs.result;
  const sqliteResultRef = useRef(sqlite.result);
  sqliteResultRef.current = sqlite.result;
  const pgliteResultRef = useRef(pglite.result);
  pgliteResultRef.current = pglite.result;

  const localStorageProgressRef = useRef(localStorage.progress);
  localStorageProgressRef.current = localStorage.progress;
  const sessionStorageProgressRef = useRef(sessionStorage.progress);
  sessionStorageProgressRef.current = sessionStorage.progress;
  const indexedDBProgressRef = useRef(indexedDB.progress);
  indexedDBProgressRef.current = indexedDB.progress;
  const cacheApiProgressRef = useRef(cacheApi.progress);
  cacheApiProgressRef.current = cacheApi.progress;
  const opfsProgressRef = useRef(opfs.progress);
  opfsProgressRef.current = opfs.progress;
  const sqliteProgressRef = useRef(sqlite.progress);
  sqliteProgressRef.current = sqlite.progress;
  const pgliteProgressRef = useRef(pglite.progress);
  pgliteProgressRef.current = pglite.progress;

  // 初回マウント時に履歴を読み込む
  const historyLoadedRef = useRef(false);
  if (!historyLoadedRef.current) {
    historyLoadedRef.current = true;
    loadHistory()
      .then(setHistory)
      .catch(() => {});
  }

  const runAll = useCallback(
    async (retainData = false) => {
      if (isRunning) return;
      setIsRunning(true);
      setSession(null);
      setResults(new Map());

      const allResults: TestResult[] = [];
      const newResults = new Map<StorageApiId, TestResult>();

      // Persistent Storage を要求（自動消去防止）
      await requestPersistence();

      // テスト実行前のストレージ見積もり
      const storageEstimateBefore = await getStorageEstimate();
      const browserInfo = await getBrowserInfo();

      // 逐次実行する全テスト（共有クォータプール干渉防止のため並列不可）
      const tests: {
        id: StorageApiId;
        run: (dataType?: DataType, skipCleanup?: boolean) => Promise<void>;
        getResult: () => TestResult | null;
      }[] = [
        {
          id: "localStorage",
          run: localStorage.run,
          getResult: () => localStorageResultRef.current,
        },
        {
          id: "sessionStorage",
          run: sessionStorage.run,
          getResult: () => sessionStorageResultRef.current,
        },
        {
          id: "indexedDB",
          run: indexedDB.run,
          getResult: () => indexedDBResultRef.current,
        },
        {
          id: "cacheApi",
          run: cacheApi.run,
          getResult: () => cacheApiResultRef.current,
        },
        { id: "opfs", run: opfs.run, getResult: () => opfsResultRef.current },
        {
          id: "sqlite",
          run: sqlite.run,
          getResult: () => sqliteResultRef.current,
        },
        {
          id: "pglite",
          run: pglite.run,
          getResult: () => pgliteResultRef.current,
        },
      ];

      for (const test of tests) {
        setCurrentApiId(test.id);

        try {
          // sessionStorageはタブ閉じで消えるため常にクリーンアップ
          const skip = test.id === "sessionStorage" ? false : retainData;
          await test.run(dataType, skip);
        } catch {
          // 個別テストのエラーは各hookがresultに記録する
        }

        // run()がawaitで完了した時点でhook内のsetResult/setIsRunningは呼ばれているが、
        // Reactのstateがrefへreflectされるまで1フレーム待つ
        await new Promise((resolve) => setTimeout(resolve, 0));

        const testResult = test.getResult();
        if (testResult) {
          allResults.push(testResult);
          newResults.set(test.id, testResult);
          setResults(new Map(newResults));
        }
      }

      // テスト実行後のストレージ見積もり
      const storageEstimateAfter = await getStorageEstimate();

      const newSession: BenchmarkSession = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        browserInfo,
        storageEstimateBefore,
        storageEstimateAfter,
        dataType,
        results: allResults,
      };

      setSession(newSession);
      setCurrentApiId(null);

      // 履歴に保存
      try {
        await saveSession(newSession);
        const updatedHistory = await loadHistory();
        setHistory(updatedHistory);
      } catch {
        // 履歴保存失敗は無視
      }

      setIsRunning(false);
    },
    [isRunning, dataType, localStorage, sessionStorage, indexedDB, cacheApi, opfs, sqlite, pglite],
  );

  // 現在実行中APIのプログレスをrefから取得
  const progressRefMap: Record<StorageApiId, MutableRefObject<TestProgress | null>> = {
    localStorage: localStorageProgressRef,
    sessionStorage: sessionStorageProgressRef,
    indexedDB: indexedDBProgressRef,
    cacheApi: cacheApiProgressRef,
    opfs: opfsProgressRef,
    sqlite: sqliteProgressRef,
    pglite: pgliteProgressRef,
  };
  const currentProgress = currentApiId ? progressRefMap[currentApiId].current : null;

  return { session, isRunning, currentApiId, currentProgress, runAll, results, history };
}
