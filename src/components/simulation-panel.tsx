import { useState, useEffect, useRef } from "react";
import type { ImageFormat, SimulationConfig } from "../types";
import { useImageSimulation, SIMULATION_CACHE } from "../hooks/use-image-simulation";
import { formatBytes } from "../utils/format";

const GALLERY_LIMIT = 20;

function SimulationGallery({
  triggerReload,
  knownTotal,
}: {
  triggerReload: number;
  knownTotal?: number;
}) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const currentUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!("caches" in globalThis)) return;
      try {
        const cache = await caches.open(SIMULATION_CACHE);
        const keys = (await cache.keys()).slice(0, GALLERY_LIMIT);
        if (!active) return;
        const newUrls = (
          await Promise.all(
            keys.map(async (req) => {
              const resp = await cache.match(req);
              return resp ? URL.createObjectURL(await resp.blob()) : null;
            }),
          )
        ).filter((u): u is string => u !== null);
        if (!active) {
          for (const u of newUrls) URL.revokeObjectURL(u);
          return;
        }
        for (const u of currentUrlsRef.current) URL.revokeObjectURL(u);
        currentUrlsRef.current = newUrls;
        setThumbs(newUrls);
      } catch {
        // キャッシュなし or 非対応環境
      }
    })();

    return () => {
      active = false;
    };
  }, [triggerReload]);

  useEffect(() => {
    return () => {
      for (const u of currentUrlsRef.current) URL.revokeObjectURL(u);
    };
  }, []);

  if (thumbs.length === 0) return null;

  const totalCount = knownTotal ?? thumbs.length;

  return (
    <div className="mt-4">
      <p className="text-xs text-muted mb-2">
        キャッシュ済み画像（先頭{thumbs.length}枚）
        {totalCount > GALLERY_LIMIT && `（全${totalCount}枚中）`}
      </p>
      <div className="flex flex-wrap gap-1">
        {thumbs.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`card_${i}`}
            className="w-16 h-16 object-contain rounded border border-border/40 bg-surface"
          />
        ))}
      </div>
    </div>
  );
}

interface Preset {
  label: string;
  config: SimulationConfig;
}

const PRESETS: Preset[] = [
  {
    label: "TCGカード（500枚 300×420 JPEG）",
    config: { imageCount: 500, width: 300, height: 420, format: "jpg", quality: 85 },
  },
  {
    label: "写真（100枚 1920×1080 JPEG）",
    config: { imageCount: 100, width: 1920, height: 1080, format: "jpg", quality: 85 },
  },
  {
    label: "アプリアイコン（1000枚 128×128 PNG）",
    config: { imageCount: 1000, width: 128, height: 128, format: "png" },
  },
  {
    label: "WebPサムネイル（200枚 400×300）",
    config: { imageCount: 200, width: 400, height: 300, format: "webp" },
  },
];

const FORMAT_OPTIONS: { value: ImageFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

export function SimulationPanel() {
  const [imageCount, setImageCount] = useState(500);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(420);
  const [format, setFormat] = useState<ImageFormat>("jpg");
  const [quality, setQuality] = useState(85);
  const [galleryKey, setGalleryKey] = useState(0);
  const { isRunning, progress, result, error, run, cleanup } = useImageSimulation();

  const applyPreset = (preset: Preset) => {
    setImageCount(preset.config.imageCount);
    setWidth(preset.config.width);
    setHeight(preset.config.height);
    setFormat(preset.config.format);
    setQuality(preset.config.quality ?? 85);
  };

  const handleRun = async () => {
    await run({
      imageCount,
      width,
      height,
      format,
      quality: format === "jpg" ? quality : undefined,
    });
    setGalleryKey((k) => k + 1);
  };

  const handleCleanup = async () => {
    await cleanup();
    setGalleryKey((k) => k + 1);
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
            <span className="text-xs text-muted">幅（px）</span>
            <input
              type="number"
              min={1}
              max={4096}
              value={width}
              onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
              disabled={isRunning}
              className="w-24 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm disabled:opacity-40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">高さ（px）</span>
            <input
              type="number"
              min={1}
              max={4096}
              value={height}
              onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
              disabled={isRunning}
              className="w-24 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm disabled:opacity-40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">フォーマット</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ImageFormat)}
              disabled={isRunning}
              className="rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm disabled:opacity-40"
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {format === "jpg" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">品質</span>
              <input
                type="number"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Math.min(100, Math.max(1, Number(e.target.value))))}
                disabled={isRunning}
                className="w-20 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm disabled:opacity-40"
              />
            </label>
          )}
          <p className="text-sm text-muted">
            1枚:{" "}
            <span className="font-medium text-current">
              {width}×{height} {format.toUpperCase()}
            </span>
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 実行ボタン */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRunning ? "実行中..." : "シミュレーション実行"}
        </button>
        <button
          type="button"
          onClick={handleCleanup}
          disabled={isRunning}
          className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          キャッシュを削除
        </button>
      </div>

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
              <span className="text-muted">平均画像サイズ:</span>{" "}
              <span className="font-medium">{formatBytes(result.averageImageBytes)}</span>
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
        </div>
      )}

      <SimulationGallery triggerReload={galleryKey} knownTotal={result?.successCount} />
    </div>
  );
}
