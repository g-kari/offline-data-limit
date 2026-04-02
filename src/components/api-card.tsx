import type { StorageApiId, TestResult, TestProgress } from "../types";
import { formatBytes, formatThroughput, formatDuration } from "../utils/format";
import { useDisclosure } from "../hooks/use-disclosure";
import { RichText } from "./glossary-term";

export interface ApiCardProps {
  apiId: StorageApiId;
  name: string;
  description: string;
  details: string;
  sampleCode: string;
  referenceUrl: string;
  platformNotes: string;
  supported: boolean;
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  onRun: () => Promise<void>;
}

export function ApiCard({
  name,
  description,
  details,
  sampleCode,
  referenceUrl,
  platformNotes,
  supported,
  result,
  progress,
  isRunning,
  onRun,
}: ApiCardProps) {
  const { isOpen: isExpanded, toggle } = useDisclosure();

  /** プログレスバーの幅（書き込み済み / 現在のチャンクサイズを目安） */
  const progressPercent =
    progress && progress.currentChunkSize > 0
      ? Math.min(
          (progress.bytesWritten / (progress.bytesWritten + progress.currentChunkSize)) * 100,
          100,
        )
      : 0;

  return (
    <div className="rounded border border-border bg-bg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-muted">{description}</p>
          <button
            type="button"
            onClick={toggle}
            className="text-xs text-accent hover:underline mt-1"
          >
            {isExpanded ? "閉じる ▲" : "詳細を見る ▼"}
          </button>
        </div>
        <span
          className={`ml-3 shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium ${
            supported ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
          }`}
        >
          {supported ? "対応" : "非対応"}
        </span>
      </div>

      {isExpanded && (
        <div className="border-t border-border/50 pt-3 space-y-3 text-sm">
          <RichText text={details} className="text-muted leading-relaxed" />
          <div>
            <p className="text-xs font-medium mb-1">サンプルコード</p>
            <pre className="bg-surface rounded p-3 overflow-x-auto text-xs leading-relaxed whitespace-pre">
              <code>{sampleCode}</code>
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium mb-1">端末・ブラウザ差分</p>
            <p className="text-muted leading-relaxed text-xs">{platformNotes}</p>
          </div>
          <a
            href={referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            ドキュメントを見る →
          </a>
        </div>
      )}

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

      {result && !isRunning && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted text-xs">実測上限</p>
            <p className="font-medium">{formatBytes(result.actualLimitBytes)}</p>
          </div>
          <div>
            <p className="text-muted text-xs">スループット</p>
            <p className="font-medium">{formatThroughput(result.throughputMBps)}</p>
          </div>
          <div>
            <p className="text-muted text-xs">所要時間</p>
            <p className="font-medium">{formatDuration(result.durationMs)}</p>
          </div>
        </div>
      )}

      {result && !isRunning && result.verified !== undefined && (
        <p
          className={`rounded px-2 py-1 text-xs ${
            result.verified ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"
          }`}
        >
          {result.verified
            ? "検証OK: 書き込み後にデータを読み返せました"
            : "検証NG: 書き込み後にデータを読み返せませんでした"}
        </p>
      )}

      {result?.error && (
        <p className="rounded bg-danger/10 px-2 py-1 text-xs text-danger">{result.error}</p>
      )}

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
