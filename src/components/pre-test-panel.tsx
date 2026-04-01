import type { StorageEstimate } from "../types";
import { formatBytes, formatPercent } from "../utils/format";

interface Props {
  estimate: StorageEstimate | null;
  isPersistent: boolean;
}

export function PreTestPanel({ estimate, isPersistent }: Props) {
  return (
    <section className="rounded bg-surface p-5 mb-6">
      <h2 className="text-lg font-semibold mb-3">ストレージ概要</h2>
      {estimate ? (
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted">報告クォータ</p>
            <p className="text-lg font-medium">{formatBytes(estimate.quota)}</p>
          </div>
          <div>
            <p className="text-muted">現在の使用量</p>
            <p className="text-lg font-medium">{formatBytes(estimate.usage)}</p>
          </div>
          <div>
            <p className="text-muted">使用率</p>
            <p className="text-lg font-medium">
              {formatPercent(estimate.usage, estimate.quota)}
            </p>
          </div>
          <div>
            <p className="text-muted">永続ストレージ</p>
            <p className="text-lg font-medium">
              {isPersistent ? (
                <span className="text-accent">許可済み</span>
              ) : (
                <span className="text-muted">未許可</span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-muted text-sm">ストレージ情報を取得中…</p>
      )}
    </section>
  );
}
