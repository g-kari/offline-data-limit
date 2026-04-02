import { useState } from "react";
import type { SimulationConfig } from "../types";
import { useImageSimulation } from "../hooks/use-image-simulation";
import { formatBytes } from "../utils/format";

interface Preset {
  label: string;
  config: SimulationConfig;
}

const PRESETS: Preset[] = [
  { label: "TCGカード（500枚×200KB）", config: { imageCount: 500, imageSizeKB: 200 } },
  { label: "写真（100枚×2MB）", config: { imageCount: 100, imageSizeKB: 2048 } },
  { label: "アイコン（1000枚×50KB）", config: { imageCount: 1000, imageSizeKB: 50 } },
];

export function SimulationPanel() {
  const [imageCount, setImageCount] = useState(500);
  const [imageSizeKB, setImageSizeKB] = useState(200);
  const { isRunning, progress, result, run, cleanup } = useImageSimulation();

  const estimatedBytes = imageCount * imageSizeKB * 1024;

  const applyPreset = (preset: Preset) => {
    setImageCount(preset.config.imageCount);
    setImageSizeKB(preset.config.imageSizeKB);
  };

  const handleRun = () => {
    run({ imageCount, imageSizeKB });
  };

  return (
    <div className="space-y-4">
      {/* プリセット */}
      <div>
        <p className="text-sm font-medium mb-2">プリセット</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              disabled={isRunning}
              className="rounded-sm border border-border px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* カスタム入力 */}
      <div className="rounded bg-surface p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">枚数</span>
            <input
              type="number"
              min={1}
              max={100000}
              value={imageCount}
              onChange={(e) => setImageCount(Math.max(1, Number(e.target.value)))}
              disabled={isRunning}
              className="w-28 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm disabled:opacity-40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">1枚のサイズ（KB）</span>
            <input
              type="number"
              min={1}
              max={1048576}
              value={imageSizeKB}
              onChange={(e) => setImageSizeKB(Math.max(1, Number(e.target.value)))}
              disabled={isRunning}
              className="w-28 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm disabled:opacity-40"
            />
          </label>
          <p className="text-sm text-muted">
            合計見積もり:{" "}
            <span className="font-medium text-current">{formatBytes(estimatedBytes)}</span>
          </p>
        </div>
      </div>

      {/* 実行ボタン */}
      <button
        type="button"
        onClick={handleRun}
        disabled={isRunning}
        className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isRunning ? "実行中..." : "シミュレーション実行"}
      </button>

      {/* プログレスバー */}
      {progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted">
            <span>
              {progress.current} / {progress.total}
            </span>
            <span>{formatBytes(progress.bytesWritten)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-150"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="rounded bg-surface p-4 space-y-2">
          <p className="text-sm font-medium">結果</p>
          {result.failedAtIndex !== null ? (
            <p className="text-sm font-medium text-red-400">
              {result.failedAtIndex}枚目でクォータ超過
            </p>
          ) : (
            <p className="text-sm font-medium text-green-400">
              全{result.successCount}枚のキャッシュに成功
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted">成功枚数:</span>{" "}
              <span className="font-medium">
                {result.successCount} / {result.config.imageCount}
              </span>
            </div>
            <div>
              <span className="text-muted">合計サイズ:</span>{" "}
              <span className="font-medium">{formatBytes(result.totalBytes)}</span>
            </div>
            <div>
              <span className="text-muted">所要時間:</span>{" "}
              <span className="font-medium">
                {result.durationMs < 1000
                  ? `${result.durationMs}ms`
                  : `${(result.durationMs / 1000).toFixed(1)}s`}
              </span>
            </div>
            <div>
              <span className="text-muted">スループット:</span>{" "}
              <span className="font-medium">{result.throughputMBps.toFixed(1)} MB/s</span>
            </div>
          </div>

          {/* クリーンアップボタン */}
          <button
            type="button"
            onClick={cleanup}
            className="mt-2 rounded-sm border border-border px-3 py-1.5 text-xs transition-opacity hover:opacity-80"
          >
            キャッシュを削除
          </button>
        </div>
      )}
    </div>
  );
}
