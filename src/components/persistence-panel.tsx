import type { PersistenceResult } from "../types";
import { formatBytes } from "../utils/format";
import { API_INFO } from "../data/api-info";
import { useDisclosure } from "../hooks/use-disclosure";

const API_NAMES = Object.fromEntries(API_INFO.map((a) => [a.id, a.name]));

/** 各ストレージAPIのデータ確認方法（DevTools / コンソール） */
const DATA_INSPECTION_GUIDES = [
  {
    name: "localStorage",
    desktopPath: "Application → Storage → Local Storage → オリジンを選択",
    consoleCommand: null as string | null,
    note: "__bench_ls_* というキーがベンチマークデータ",
  },
  {
    name: "sessionStorage",
    desktopPath: "Application → Storage → Session Storage → オリジンを選択",
    consoleCommand: null,
    note: "__bench_ss_* というキーがベンチマークデータ。タブを閉じると消える",
  },
  {
    name: "IndexedDB",
    desktopPath: "Application → Storage → IndexedDB → __benchmark_idb → data",
    consoleCommand: null,
    note: "レコード一覧とデータを確認可能",
  },
  {
    name: "Cache API",
    desktopPath: "Application → Storage → Cache Storage → __benchmark_cache",
    consoleCommand: null,
    note: "キャッシュされたリクエスト一覧が表示される",
  },
  {
    name: "OPFS",
    desktopPath: "Application → Storage → File System（Chrome 108+）",
    consoleCommand:
      "(async () => { const root = await navigator.storage.getDirectory(); for await (const [name] of root) console.log(name); })()",
    note: "__benchmark_opfs ファイルがベンチマークデータ",
  },
  {
    name: "SQLite/Wasm",
    desktopPath: "Application → Storage → File System（Chrome 108+）",
    consoleCommand:
      "(async () => { const root = await navigator.storage.getDirectory(); for await (const [name, h] of root) if (name.includes('benchmark')) console.log(name, h.kind); })()",
    note: "benchmark を含むファイル・ディレクトリがSQLiteのデータ",
  },
  {
    name: "PGLite",
    desktopPath: "Application → Storage → IndexedDB → /pglite/benchmark-pglite",
    consoleCommand: null,
    note: "PostgreSQLのデータがIndexedDBに格納されている",
  },
];

/** スマートフォンでのリモートデバッグ手順 */
const MOBILE_DEBUG_GUIDES = [
  {
    platform: "Android Chrome",
    steps: [
      "Android端末の設定 → 開発者向けオプション → USBデバッグをON",
      "USBケーブルでPCに接続し、PC ChromeのアドレスバーにURLを入力: chrome://inspect/#devices",
      "デバイスとページが表示されたら「inspect」をクリック",
      "PCと同じDevToolsでApplication → Storageを確認可能",
    ],
  },
  {
    platform: "iOS Safari",
    steps: [
      "iPhone/iPad: 設定 → Safari → 詳細 → Webインスペクタをオン",
      "MacのSafari: 設定 → 詳細 → メニューバーに開発メニューを表示をオン",
      "USBケーブルでMacに接続",
      "Mac Safariのメニュー: 開発 → デバイス名 → ページを選択",
      "Web Inspectorが開き、ストレージをStorage タブで確認可能",
    ],
  },
];

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
  const { isOpen: isGuideOpen, toggle: toggleGuide } = useDisclosure();

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-4">永続性検証</h2>

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

      <div className="flex gap-3 mb-4 flex-wrap">
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
        <a
          href="#/inspect"
          className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 ml-auto"
        >
          データ詳細を見る →
        </a>
        <a
          href="#/simulation"
          className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
        >
          画像キャッシュシミュレーション →
        </a>
      </div>

      {hasResults && (
        <div className="overflow-x-auto mb-4">
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
                  <td className="py-2 pr-4">
                    {r.bytesRemaining < 0 ? "不明" : formatBytes(r.bytesRemaining)}
                  </td>
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

      {/* データの確認方法 */}
      <div className="rounded border border-border overflow-hidden">
        <button
          type="button"
          onClick={toggleGuide}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-surface transition-colors"
        >
          <span className="text-sm font-medium">データの中身を確認する方法（DevTools）</span>
          <span className="text-muted text-xs">{isGuideOpen ? "閉じる ▲" : "開く ▼"}</span>
        </button>

        {isGuideOpen && (
          <div className="border-t border-border px-4 py-3 space-y-5">
            {/* デスクトップ DevTools テーブル */}
            <div>
              <p className="text-xs font-medium text-muted mb-2">
                PC（Chrome / Edge）— DevToolsのApplicationタブ
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="pb-1.5 pr-3 font-medium whitespace-nowrap">API</th>
                      <th className="pb-1.5 pr-3 font-medium">DevTools パス</th>
                      <th className="pb-1.5 pr-3 font-medium">コンソールコマンド</th>
                      <th className="pb-1.5 font-medium">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_INSPECTION_GUIDES.map((g) => (
                      <tr key={g.name} className="border-b border-border/40 align-top">
                        <td className="py-2 pr-3 font-medium whitespace-nowrap">{g.name}</td>
                        <td className="py-2 pr-3 text-muted">{g.desktopPath}</td>
                        <td className="py-2 pr-3">
                          {g.consoleCommand ? (
                            <pre className="bg-surface rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all max-w-xs">
                              <code>{g.consoleCommand}</code>
                            </pre>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="py-2 text-muted">{g.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* スマートフォン リモートデバッグ */}
            <div>
              <p className="text-xs font-medium text-muted mb-2">
                スマートフォン — USBリモートデバッグ（PCと接続が必要）
              </p>
              <p className="text-xs text-muted mb-3">
                スマートフォン単体ではDevToolsを開けません。PCとUSBケーブルで接続してリモートデバッグを行います。
              </p>
              <div className="space-y-3">
                {MOBILE_DEBUG_GUIDES.map((g) => (
                  <div key={g.platform} className="rounded bg-surface p-3">
                    <p className="text-xs font-medium mb-1.5">{g.platform}</p>
                    <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
                      {g.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
