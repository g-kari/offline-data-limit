import { useState } from "react";
import { useBenchmark } from "./hooks/use-benchmark";
import type { StorageApiInfo, DataType } from "./types";
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
  const { session, isRunning, currentApiId, runAll, results, history } =
    useBenchmark(dataType);

  const browserInfo = session?.browserInfo ?? null;
  const estimateBefore = session?.storageEstimateBefore ?? null;
  const estimateAfter = session?.storageEstimateAfter ?? null;

  const apiCards = API_INFO.map((api) => ({
    apiId: api.id,
    name: api.name,
    description: api.description,
    supported: true,
    result: results.get(api.id) ?? null,
    // 現在実行中のAPIにはプログレス表示（progress詳細は個別hookから取得できないため簡易表示）
    progress:
      currentApiId === api.id
        ? {
            apiId: api.id,
            bytesWritten: 0,
            currentChunkSize: 0,
            throughputMBps: 0,
            phase: "writing" as const,
          }
        : null,
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
