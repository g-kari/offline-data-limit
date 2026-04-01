import { useEffect } from "react";
import { useStorageInspector } from "../hooks/use-storage-inspector";
import type { InspectorData } from "../hooks/use-storage-inspector";
import { formatBytes } from "../utils/format";
import { API_INFO } from "../data/api-info";
import type { StorageApiId } from "../types";

const TABS: { id: StorageApiId; label: string }[] = API_INFO.map((a) => ({
  id: a.id,
  label: a.name,
}));

function EmptyState() {
  return (
    <p className="text-sm text-muted py-6 text-center">
      データが見つかりませんでした。計測後に「データを残して計測」でベンチマークを実行してください。
    </p>
  );
}

function DataTable({ data }: { data: InspectorData }) {
  if (data.apiId === "localStorage" || data.apiId === "sessionStorage") {
    if (data.records.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4 font-medium">キー</th>
              <th className="pb-2 pr-4 font-medium">サイズ（文字）</th>
              <th className="pb-2 font-medium">先頭64文字</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.key} className="border-b border-border/40">
                <td className="py-2 pr-4 font-mono break-all">{r.key}</td>
                <td className="py-2 pr-4">{r.length.toLocaleString()}</td>
                <td className="py-2 font-mono break-all text-muted">{r.preview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.apiId === "indexedDB") {
    if (data.records.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4 font-medium">#</th>
              <th className="pb-2 pr-4 font-medium">サイズ</th>
              <th className="pb-2 font-medium">先頭32バイト（hex）</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.index} className="border-b border-border/40">
                <td className="py-2 pr-4">{r.index}</td>
                <td className="py-2 pr-4">{formatBytes(r.byteLength)}</td>
                <td className="py-2 font-mono text-muted break-all">{r.hexPreview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.apiId === "cacheApi") {
    if (data.records.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4 font-medium">URL</th>
              <th className="pb-2 pr-4 font-medium">サイズ</th>
              <th className="pb-2 pr-4 font-medium">Content-Type</th>
              <th className="pb-2 font-medium">先頭32バイト（hex）</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.url} className="border-b border-border/40">
                <td className="py-2 pr-4 font-mono break-all max-w-[12rem]">{r.url}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{formatBytes(r.byteLength)}</td>
                <td className="py-2 pr-4 text-muted">{r.contentType || "—"}</td>
                <td className="py-2 font-mono text-muted break-all">{r.hexPreview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.apiId === "opfs") {
    if (data.files.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4 font-medium">ファイル名</th>
              <th className="pb-2 pr-4 font-medium">サイズ</th>
              <th className="pb-2 pr-4 font-medium">最終更新</th>
              <th className="pb-2 font-medium">先頭32バイト（hex）</th>
            </tr>
          </thead>
          <tbody>
            {data.files.map((f) => (
              <tr key={f.name} className="border-b border-border/40">
                <td className="py-2 pr-4 font-mono">{f.name}</td>
                <td className="py-2 pr-4">{formatBytes(f.byteLength)}</td>
                <td className="py-2 pr-4 text-muted">
                  {new Date(f.lastModified).toLocaleString("ja-JP")}
                </td>
                <td className="py-2 font-mono text-muted break-all">{f.hexPreview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.apiId === "sqlite") {
    if (data.files.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4 font-medium">ファイル名（OPFS内）</th>
              <th className="pb-2 pr-4 font-medium">サイズ</th>
              <th className="pb-2 font-medium">最終更新</th>
            </tr>
          </thead>
          <tbody>
            {data.files.map((f) => (
              <tr key={f.name} className="border-b border-border/40">
                <td className="py-2 pr-4 font-mono">{f.name}</td>
                <td className="py-2 pr-4">{formatBytes(f.byteLength)}</td>
                <td className="py-2 text-muted">
                  {new Date(f.lastModified).toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted mt-2">
          SQLの内容はwa-sqliteを再初期化しないと読み出せないため、ファイルメタデータのみ表示しています。
        </p>
      </div>
    );
  }

  if (data.apiId === "pglite") {
    if (data.stores.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4 font-medium">IDBストア名</th>
              <th className="pb-2 pr-4 font-medium">レコード数</th>
              <th className="pb-2 font-medium">推定サイズ</th>
            </tr>
          </thead>
          <tbody>
            {data.stores.map((s) => (
              <tr key={s.name} className="border-b border-border/40">
                <td className="py-2 pr-4 font-mono">{s.name}</td>
                <td className="py-2 pr-4">{s.recordCount.toLocaleString()}</td>
                <td className="py-2">{formatBytes(s.byteLength)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted mt-2">
          SQLの内容はPGLiteを再初期化しないと読み出せないため、IndexedDBのストア一覧のみ表示しています。
        </p>
      </div>
    );
  }

  return null;
}

export function DataInspectorPage() {
  const { data, isLoading, activeApiId, inspect } = useStorageInspector();

  useEffect(() => {
    inspect("localStorage");
  }, [inspect]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <a href="#" className="text-sm text-muted hover:text-current transition-colors">
          ← メインに戻る
        </a>
        <h1 className="text-xl font-bold">ストレージデータ詳細</h1>
      </div>

      {/* タブ */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => inspect(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
              activeApiId === tab.id
                ? "bg-accent text-white"
                : "bg-surface text-current hover:opacity-80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="rounded border border-border p-4">
        {isLoading ? (
          <p className="text-sm text-muted py-6 text-center">読み込み中...</p>
        ) : data ? (
          <>
            {activeApiId === "sessionStorage" && (
              <p className="text-xs text-muted mb-3 rounded bg-surface px-3 py-2">
                sessionStorageはタブセッション内のみ保持されます。タブを閉じるとデータは消去されます。
              </p>
            )}
            <DataTable data={data} />
          </>
        ) : null}
      </div>
    </div>
  );
}
