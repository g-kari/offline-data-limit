import type { PersistenceResult } from "../types";
import { formatBytes } from "../utils/format";
import { API_INFO } from "../data/api-info";

const API_NAMES = Object.fromEntries(API_INFO.map((a) => [a.id, a.name]));

interface Props {
  retainData: boolean;
  onRetainDataChange: (value: boolean) => void;
  results: PersistenceResult[];
  isChecking: boolean;
  onCheck: () => Promise<void>;
  isCleaning: boolean;
  onCleanupAll: () => Promise<void>;
  isBenchmarkRunning: boolean;
}

export function PersistencePanel({
  retainData,
  onRetainDataChange,
  results,
  isChecking,
  onCheck,
  isCleaning,
  onCleanupAll,
  isBenchmarkRunning,
}: Props) {
  const hasResults = results.length > 0;
  const hasAnyData = results.some((r) => r.persisted);

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-4">永続性検証</h2>

      {/* データ保持オプション */}
      <div className="rounded bg-surface p-4 mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={retainData}
            onChange={(e) => onRetainDataChange(e.target.checked)}
            disabled={isBenchmarkRunning}
            className="w-4 h-4 accent-accent"
          />
          <div>
            <span className="text-sm font-medium">データを残して計測</span>
            <p className="text-xs text-muted mt-0.5">
              計測後にデータをクリーンアップせず保持します。リロード後に永続性を検証できます。
            </p>
          </div>
        </label>
      </div>

      {/* 検証・削除ボタン */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={onCheck}
          disabled={isChecking || isBenchmarkRunning}
          className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isChecking ? "検証中..." : "永続性を検証"}
        </button>
        <button
          type="button"
          onClick={onCleanupAll}
          disabled={isCleaning || isBenchmarkRunning || !hasAnyData}
          className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isCleaning ? "削除中..." : "全データ削除"}
        </button>
      </div>

      {/* 検証結果 */}
      {hasResults && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-2 pr-4 font-medium">API</th>
                <th className="pb-2 pr-4 font-medium">残存データ</th>
                <th className="pb-2 pr-4 font-medium">元の書き込み量</th>
                <th className="pb-2 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.apiId} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{API_NAMES[r.apiId] ?? r.apiId}</td>
                  <td className="py-2 pr-4">{formatBytes(r.bytesRemaining)}</td>
                  <td className="py-2 pr-4">
                    {r.originalBytes > 0 ? formatBytes(r.originalBytes) : "—"}
                  </td>
                  <td className="py-2">
                    {r.persisted ? (
                      <span className="inline-block rounded-sm bg-green-700/20 px-2 py-0.5 text-xs font-medium text-green-400">
                        OK
                      </span>
                    ) : (
                      <span className="inline-block rounded-sm bg-red-700/20 px-2 py-0.5 text-xs font-medium text-red-400">
                        なし
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2">
            sessionStorage はタブ閉じで消去されるため検証対象外です。
          </p>
        </div>
      )}
    </section>
  );
}
