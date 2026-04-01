import { useState, useEffect, useRef } from "react";
import { useBenchmark } from "./hooks/use-benchmark";
import type { StorageApiInfo, StorageEstimate, BrowserInfo, DataType } from "./types";
import { getBrowserInfo, getStorageEstimate } from "./utils/browser-info";
import { Header } from "./components/header";
import { PreTestPanel } from "./components/pre-test-panel";
import { TestRunner } from "./components/test-runner";
import { ResultsDashboard } from "./components/results-dashboard";
import { ResultsHistory } from "./components/results-history";

const API_INFO: StorageApiInfo[] = [
  {
    id: "localStorage",
    name: "localStorage",
    description: "同期、5MB固定上限",
    sharedQuota: false,
    requiresWorker: false,
  },
  {
    id: "sessionStorage",
    name: "sessionStorage",
    description: "同期、5MB固定上限（タブ間非共有）",
    sharedQuota: false,
    requiresWorker: false,
  },
  {
    id: "indexedDB",
    name: "IndexedDB",
    description: "非同期、共有クォータプール",
    sharedQuota: true,
    requiresWorker: false,
  },
  {
    id: "cacheApi",
    name: "Cache API",
    description: "非同期、共有クォータプール",
    sharedQuota: true,
    requiresWorker: false,
  },
  {
    id: "opfs",
    name: "OPFS",
    description: "高性能ファイルI/O、共有クォータプール",
    sharedQuota: true,
    requiresWorker: true,
  },
  {
    id: "sqlite",
    name: "SQLite/Wasm",
    description: "wa-sqlite + OPFS VFS",
    sharedQuota: true,
    requiresWorker: true,
  },
  {
    id: "pglite",
    name: "PGLite",
    description: "PostgreSQL in browser",
    sharedQuota: true,
    requiresWorker: false,
  },
];

export function App() {
  const [dataType, setDataType] = useState<DataType>("random");
  const { session, isRunning, currentApiId, currentProgress, runAll, results, history } =
    useBenchmark(dataType);

  // ページ読み込み時にストレージ情報とブラウザ情報を取得
  const [initialEstimate, setInitialEstimate] = useState<StorageEstimate | null>(null);
  const [initialBrowserInfo, setInitialBrowserInfo] = useState<BrowserInfo | null>(null);
  const initLoadedRef = useRef(false);
  useEffect(() => {
    if (initLoadedRef.current) return;
    initLoadedRef.current = true;
    getStorageEstimate().then(setInitialEstimate).catch(() => {});
    getBrowserInfo().then(setInitialBrowserInfo).catch(() => {});
  }, []);

  // セッション完了後はセッションの値を優先、未完了時は初期取得値を使用
  const browserInfo = session?.browserInfo ?? initialBrowserInfo;
  const estimateBefore = session?.storageEstimateBefore ?? initialEstimate;
  const estimateAfter = session?.storageEstimateAfter ?? null;

  const apiCards = API_INFO.map((api) => ({
    apiId: api.id,
    name: api.name,
    description: api.description,
    supported: true,
    result: results.get(api.id) ?? null,
    progress: currentApiId === api.id ? currentProgress : null,
    isRunning: currentApiId === api.id,
    // 全テスト実行のみサポート（個別実行は現在の実装では非対応）
    onRun: runAll,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Header browserInfo={browserInfo} />
      <PreTestPanel
        estimate={estimateBefore}
        isPersistent={browserInfo?.persistentStorage ?? false}
      />
      <TestRunner
        apiCards={apiCards}
        isRunning={isRunning}
        onRunAll={runAll}
        dataType={dataType}
        onDataTypeChange={setDataType}
      />
      {results.size > 0 && (
        <ResultsDashboard
          results={results}
          estimateBefore={estimateBefore}
          estimateAfter={estimateAfter}
        />
      )}
      <ResultsHistory history={history} />
    </div>
  );
}
