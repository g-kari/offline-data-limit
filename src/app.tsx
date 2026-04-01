import { useState, useEffect, useRef, useMemo } from "react";
import { useBenchmark } from "./hooks/use-benchmark";
import { usePersistenceCheck } from "./hooks/use-persistence-check";
import type { StorageEstimate, BrowserInfo, DataType } from "./types";
import { getBrowserInfo, getStorageEstimate } from "./utils/browser-info";
import { API_INFO } from "./data/api-info";
import { Header } from "./components/header";
import { PreTestPanel } from "./components/pre-test-panel";
import { BenchmarkGuide } from "./components/benchmark-guide";
import { TestRunner } from "./components/test-runner";
import { ResultsDashboard } from "./components/results-dashboard";
import { ResultsHistory } from "./components/results-history";
import { PersistencePanel } from "./components/persistence-panel";

export function App() {
  const [dataType, setDataType] = useState<DataType>("random");
  const [retainData, setRetainData] = useState(false);
  const { session, isRunning, currentApiId, currentProgress, runAll, runSingle, results, history } =
    useBenchmark(dataType);
  const persistence = usePersistenceCheck();

  // ページ読み込み時にストレージ情報とブラウザ情報を取得
  const [initialEstimate, setInitialEstimate] = useState<StorageEstimate | null>(null);
  const [initialBrowserInfo, setInitialBrowserInfo] = useState<BrowserInfo | null>(null);
  const initLoadedRef = useRef(false);
  useEffect(() => {
    if (initLoadedRef.current) return;
    initLoadedRef.current = true;
    getStorageEstimate()
      .then(setInitialEstimate)
      .catch(() => {});
    getBrowserInfo()
      .then(setInitialBrowserInfo)
      .catch(() => {});
  }, []);

  // セッション完了後はセッションの値を優先、未完了時は初期取得値を使用
  const browserInfo = session?.browserInfo ?? initialBrowserInfo;
  const estimateBefore = session?.storageEstimateBefore ?? initialEstimate;
  const estimateAfter = session?.storageEstimateAfter ?? null;

  const apiCards = useMemo(
    () =>
      API_INFO.map((api) => ({
        apiId: api.id,
        name: api.name,
        description: api.description,
        details: api.details,
        sampleCode: api.sampleCode,
        referenceUrl: api.referenceUrl,
        platformNotes: api.platformNotes,
        supported: true,
        result: results.get(api.id) ?? null,
        progress: currentApiId === api.id ? currentProgress : null,
        isRunning: currentApiId === api.id,
        onRun: () => runSingle(api.id, retainData),
      })),
    [results, currentApiId, currentProgress, runAll],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Header browserInfo={browserInfo} />
      <PreTestPanel
        estimate={estimateBefore}
        isPersistent={browserInfo?.persistentStorage ?? false}
      />
      <BenchmarkGuide />
      <TestRunner
        apiCards={apiCards}
        isRunning={isRunning}
        onRunAll={() => runAll(retainData)}
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
      <PersistencePanel
        retainData={retainData}
        onRetainDataChange={setRetainData}
        results={persistence.results}
        isChecking={persistence.isChecking}
        onCheck={persistence.check}
        isCleaning={persistence.isCleaning}
        onCleanupAll={persistence.cleanupAll}
        isBenchmarkRunning={isRunning}
      />
      <ResultsHistory history={history} />
    </div>
  );
}
