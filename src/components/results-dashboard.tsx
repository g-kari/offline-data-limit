import type { StorageApiId, TestResult, StorageEstimate } from "../types";
import { formatBytes, formatThroughput } from "../utils/format";

interface Props {
  results: Map<StorageApiId, TestResult>;
  estimateBefore: StorageEstimate | null;
  estimateAfter: StorageEstimate | null;
}

export function ResultsDashboard({
  results,
  estimateBefore,
  estimateAfter,
}: Props) {
  if (results.size === 0) return null;

  const totalActual = Array.from(results.values()).reduce(
    (sum, r) => sum + r.actualLimitBytes,
    0,
  );

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-4">計測結果サマリー</h2>

      {/* クォータ比較 */}
      <div className="rounded bg-surface p-4 mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {estimateBefore && (
          <div>
            <p className="text-muted">報告クォータ</p>
            <p className="text-lg font-medium">
              {formatBytes(estimateBefore.quota)}
            </p>
          </div>
        )}
        <div>
          <p className="text-muted">実測合計</p>
          <p className="text-lg font-medium">{formatBytes(totalActual)}</p>
        </div>
        {estimateAfter && (
          <div>
            <p className="text-muted">計測後使用量</p>
            <p className="text-lg font-medium">
              {formatBytes(estimateAfter.usage)}
            </p>
          </div>
        )}
      </div>

      {/* 結果テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4 font-medium">API</th>
              <th className="pb-2 pr-4 font-medium">実測上限</th>
              <th className="pb-2 pr-4 font-medium">スループット</th>
              <th className="pb-2 font-medium">共有クォータ</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(results.values()).map((r) => (
              <tr key={r.apiId} className="border-b border-border/50">
                <td className="py-2 pr-4 font-medium">{r.apiId}</td>
                <td className="py-2 pr-4">
                  {formatBytes(r.actualLimitBytes)}
                </td>
                <td className="py-2 pr-4">
                  {formatThroughput(r.throughputMBps)}
                </td>
                <td className="py-2">
                  {r.reportedQuotaBytes !== null ? "はい" : "いいえ"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
