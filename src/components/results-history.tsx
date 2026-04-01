import type { BenchmarkSession } from "../types";
import { detectBrowserName } from "../utils/browser-info";
import { formatBytes } from "../utils/format";

interface Props {
  history: BenchmarkSession[];
}

export function ResultsHistory({ history }: Props) {
  if (history.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">計測履歴</h2>
        <p className="text-sm text-muted">まだ計測履歴がありません</p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-3">計測履歴</h2>
      <div className="space-y-2">
        {history.map((session) => {
          const maxResult = session.results.reduce(
            (max, r) =>
              r.actualLimitBytes > max.actualLimitBytes ? r : max,
            session.results[0],
          );
          const date = new Date(session.timestamp);

          return (
            <div
              key={session.id}
              className="flex items-center justify-between rounded border border-border p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted">
                  {date.toLocaleDateString("ja-JP")}{" "}
                  {date.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="rounded-sm bg-surface px-2 py-0.5 text-xs">
                  {detectBrowserName(session.browserInfo.userAgent)}
                </span>
              </div>
              <span className="font-medium">
                最大 {formatBytes(maxResult.actualLimitBytes)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
