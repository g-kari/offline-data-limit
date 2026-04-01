import type { StorageApiId, TestResult, TestProgress } from "../types";
import { formatBytes, formatThroughput, formatDuration } from "../utils/format";

interface Props {
  apiId: StorageApiId;
  name: string;
  description: string;
  supported: boolean;
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  onRun: () => Promise<void>;
}

export function ApiCard({
  name,
  description,
  supported,
  result,
  progress,
  isRunning,
  onRun,
}: Props) {
  /** プログレスバーの幅（書き込み済み / 現在のチャンクサイズを目安） */
  const progressPercent =
    progress && progress.currentChunkSize > 0
      ? Math.min(
          (progress.bytesWritten /
            (progress.bytesWritten + progress.currentChunkSize)) *
            100,
          100,
        )
      : 0;

  return (
    <div className="rounded border border-border bg-bg p-4 flex flex-col gap-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <span
          className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
            supported
              ? "bg-accent/15 text-accent"
              : "bg-danger/15 text-danger"
          }`}
        >
          {supported ? "対応" : "非対応"}
        </span>
      </div>

      {/* 実行中プログレス */}
      {isRunning && progress && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>{formatBytes(progress.bytesWritten)} 書き込み済み</span>
            <span>{formatThroughput(progress.throughputMBps)}</span>
          </div>
        </div>
      )}

      {/* 完了結果 */}
      {result && !isRunning && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted text-xs">実測上限</p>
            <p className="font-medium">{formatBytes(result.actualLimitBytes)}</p>
          </div>
          <div>
            <p className="text-muted text-xs">スループット</p>
            <p className="font-medium">
              {formatThroughput(result.throughputMBps)}
            </p>
          </div>
          <div>
            <p className="text-muted text-xs">所要時間</p>
            <p className="font-medium">{formatDuration(result.durationMs)}</p>
          </div>
          {result.error && (
            <p className="col-span-3 text-xs text-danger">{result.error}</p>
          )}
        </div>
      )}

      {/* 実行ボタン */}
      <button
        type="button"
        onClick={onRun}
        disabled={!supported || isRunning}
        className="mt-auto rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isRunning ? "計測中…" : "個別実行"}
      </button>
    </div>
  );
}
