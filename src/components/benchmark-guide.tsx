import { useState } from "react";

/** 端末・ブラウザ別の差分情報 */
const PLATFORM_DIFFERENCES = [
  {
    platform: "PC (Chrome / Edge)",
    notes:
      "ディスク空き容量の最大80%まで利用可能。OPFS・SQLite/Wasmも完全対応。最も制約が少なく、大容量のオフラインデータに最適。",
  },
  {
    platform: "PC (Firefox)",
    notes:
      "ディスク容量の最大50%。プロファイルごとに独立管理。OPFS対応。全体的にChrome系と同等だが上限割合がやや低い。",
  },
  {
    platform: "Android (Chrome)",
    notes:
      "クォータ管理はデスクトップ版と同等だが、デバイスストレージが物理的に限られる。バックグラウンドでのデータ削除はデスクトップより積極的に行われる場合がある。",
  },
  {
    platform: "iPhone / iPad (Safari)",
    notes:
      "共有クォータに1GBの上限が設定されている（iOS 17+で緩和傾向）。7日間アクセスがないとデータが自動削除される（ITP: Intelligent Tracking Prevention）。プライベートブラウズではlocalStorage/sessionStorageへの書き込みが制限される。OPFS同期アクセスハンドルはWorker限定。",
  },
];

/** 計測結果の各項目の説明 */
const RESULT_FIELDS = [
  {
    label: "実測上限",
    desc: "実際にAPIへ書き込めたデータの最大バイト数。ブラウザが navigator.storage.estimate() で報告するクォータとは異なる場合がある。",
  },
  {
    label: "スループット",
    desc: "書き込み速度（MB/s）。APIの実装方式（同期/非同期）やデータ種別によって大きく異なる。",
  },
  {
    label: "所要時間",
    desc: "計測開始から完了までの合計時間。バイナリサーチの反復回数とスループットに依存する。",
  },
  {
    label: "検証 OK / NG",
    desc: "上限到達後、書き込んだデータを読み返して整合性を確認した結果。NGの場合、APIがデータを受け付けたように見えて実際には保存できていない可能性がある。",
  },
];

export function BenchmarkGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded border border-border bg-bg mb-6 overflow-hidden">
      {/* ヘッダー（常時表示） */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-surface transition-colors"
      >
        <h2 className="text-base font-semibold">このベンチマークについて</h2>
        <span className="text-muted text-sm">{isOpen ? "閉じる ▲" : "詳しく見る ▼"}</span>
      </button>

      {/* 展開コンテンツ */}
      {isOpen && (
        <div className="px-5 pb-6 space-y-6 text-sm border-t border-border">
          {/* 計測方法 */}
          <div className="pt-4">
            <h3 className="font-semibold mb-2">計測方法（バイナリサーチ方式）</h3>
            <p className="text-muted leading-relaxed">
              各ストレージAPIに対して、64MBのチャンクから書き込みを開始します。
              <code className="bg-surface px-1 rounded text-xs mx-0.5">QuotaExceededError</code>
              が発生するとチャンクサイズを半分にして再試行し、1KB未満になった時点で停止します。
              この方式により最大16ステップで実測上限に収束します。
            </p>
            <p className="text-muted leading-relaxed mt-2">
              IndexedDB・Cache API・OPFS・SQLite・PGLiteは同一の共有クォータプールを使用するため、
              並列実行すると互いにクォータを奪い合い正確な計測ができません。そのため、これらのAPIは{" "}
              <strong className="text-current">逐次実行</strong>されます。
            </p>
          </div>

          {/* 結果の見方 */}
          <div>
            <h3 className="font-semibold mb-2">結果の見方</h3>
            <dl className="space-y-2">
              {RESULT_FIELDS.map((f) => (
                <div key={f.label} className="flex gap-3">
                  <dt className="font-medium text-current min-w-[7rem] shrink-0">{f.label}</dt>
                  <dd className="text-muted leading-relaxed">{f.desc}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 端末・ブラウザ差分 */}
          <div>
            <h3 className="font-semibold mb-2">端末・ブラウザによる差分</h3>
            <div className="space-y-3">
              {PLATFORM_DIFFERENCES.map((p) => (
                <div key={p.platform} className="rounded bg-surface p-3">
                  <p className="font-medium mb-1">{p.platform}</p>
                  <p className="text-muted leading-relaxed">{p.notes}</p>
                </div>
              ))}
            </div>
            <p className="text-muted mt-3 leading-relaxed">
              <strong className="text-current">共通の注意点:</strong>{" "}
              <code className="bg-surface px-1 rounded text-xs">navigator.storage.persist()</code>{" "}
              で永続化を要求しないと、ストレージプレッシャー時にブラウザがデータを自動削除する場合があります。
              このツールのPreTestPanelで永続化ステータスを確認できます。
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
