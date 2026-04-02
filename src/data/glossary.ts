export type GlossaryCategory = "storage-api" | "concept" | "measurement" | "web-tech" | "browser";

export interface GlossaryEntry {
  id: string;
  /** 見出し語 */
  term: string;
  /** テキスト中でマッチさせる表記のリスト（termを含む） */
  aliases: string[];
  category: GlossaryCategory;
  /** ツールチップに表示する一行説明 */
  brief: string;
  /** 単語集ページに表示する詳細説明 */
  description: string;
}

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  "storage-api": "ストレージ API",
  concept: "基本概念",
  measurement: "計測・結果",
  "web-tech": "Web 技術",
  browser: "ブラウザ・プラットフォーム",
};

export const GLOSSARY: GlossaryEntry[] = [
  // ── ストレージ API ──────────────────────────────────────────────────────────
  {
    id: "local-storage",
    term: "localStorage",
    aliases: ["localStorage"],
    category: "storage-api",
    brief: "ブラウザに文字列を永続保存する同期KVストレージ。上限は約5MB。",
    description:
      "オリジン単位で管理されるキー・バリュー型のストレージ。setItem() / getItem() は同期実行でメインスレッドをブロックする。保存できるのは文字列のみで、バイナリを扱う場合は Base64 エンコードが必要。タブをまたいで共有され、ブラウザを閉じてもデータは消えない。上限は仕様上5MBだが、UTF-16のエンコードの都合で実質的なバイナリ格納容量は約2.5MBになる場合がある。",
  },
  {
    id: "session-storage",
    term: "sessionStorage",
    aliases: ["sessionStorage"],
    category: "storage-api",
    brief: "タブを閉じると消える一時的なKVストレージ。上限は約5MB。",
    description:
      "localStorage と同じAPIを持つが、スコープがタブ（ウィンドウ）単位。タブを閉じるとデータは即座に削除される。他のタブとは共有されないが、ページリロードでは保持される。window.open() で開いた子ウィンドウは親と同じ sessionStorage を共有する。フォームの入力途中状態やマルチステップウィザードの一時保存に向いている。",
  },
  {
    id: "indexeddb",
    term: "IndexedDB",
    aliases: ["IndexedDB"],
    category: "storage-api",
    brief: "非同期NoSQLデータベース。バイナリも直接保存でき、共有クォータプールを利用する。",
    description:
      "ブラウザ組み込みの非同期オブジェクトデータベース。構造化オブジェクト・Blob・ArrayBuffer を直接保存できる。インデックス検索・トランザクション・カーソルをサポート。API はコールバックベースだが idb ライブラリ等でPromise化できる。共有クォータプールからストレージを使用し、デバイスの空き容量の最大80%（Chromeの場合）まで利用できる。PWAのオフラインデータ保存の主力となるAPI。",
  },
  {
    id: "cache-api",
    term: "Cache API",
    aliases: ["Cache API", "キャッシュAPI"],
    category: "storage-api",
    brief: "Request/Responseペアを保存するAPI。Service Workerと組み合わせてオフライン対応に使う。",
    description:
      "ネットワークレスポンスを名前付きキャッシュに保存・取得するAPI。Service Worker の fetch イベントと組み合わせることで、Cache First / Network First / Stale While Revalidate などのキャッシュ戦略が実現できる。caches.open('名前') でキャッシュを作成し、cache.put(request, response) で保存する。IndexedDB と同じ共有クォータプールを消費する。Workbox などのPWAツールキットはこのAPIを内部で使用している。",
  },
  {
    id: "opfs",
    term: "OPFS",
    aliases: ["OPFS", "Origin Private File System"],
    category: "storage-api",
    brief: "オリジン専用の仮想ファイルシステム。Web Worker で高速な同期I/Oが可能。",
    description:
      "Origin Private File System の略。オリジン専用の仮想ファイルシステムAPIで、ユーザーのファイルアプリからは見えない。アクセス方法は2種類あり、①メインスレッドでも使える非同期API (createWritable) と ②Web Worker 専用の同期高速API (FileSystemSyncAccessHandle) がある。同期APIはシステムコールに近い速度でI/Oできるため、SQLite などのWasmデータベースのバックエンドとして利用される。Chrome 86+ / Firefox 111+ / Safari 17+ で対応。",
  },
  {
    id: "sqlite-wasm",
    term: "SQLite/Wasm",
    aliases: ["SQLite/Wasm", "wa-sqlite", "SQLite"],
    category: "storage-api",
    brief: "SQLite をWebAssemblyにコンパイルしOPFSをバックエンドとして使うブラウザ内SQLite実装。",
    description:
      "wa-sqlite や公式 SQLite WASM などのライブラリを使い、SQLite をブラウザで動作させる実装。OPFS の FileSystemSyncAccessHandle をVFS（仮想ファイルシステム）として使うことで高速なI/Oが実現できる。完全なSQL構文・トランザクション・インデックスをサポートし、既存のSQLiteスキーマをほぼそのままブラウザに持ち込める。SharedArrayBuffer を使うため COOP/COEP ヘッダーの設定が必須。Web Worker 内で動作する。",
  },
  {
    id: "pglite",
    term: "PGLite",
    aliases: ["PGLite"],
    category: "storage-api",
    brief: "PostgreSQLをWebAssemblyにコンパイルしたブラウザ内DB。IndexedDBで永続化。",
    description:
      "@electric-sql/pglite が提供するライブラリ。PostgreSQL 本体を Wasm にコンパイルしており、jsonb 型・配列型・ウィンドウ関数・pgvector などの拡張機能をブラウザ内で使用できる。IndexedDB をバックエンドとして永続化し、メインスレッドでも動作する（Worker対応もあり）。Electric SQL のリアルタイム同期と組み合わせてサーバーのPostgreSQLとブラウザ内DBを同期するアーキテクチャが実現できる。",
  },

  // ── 基本概念 ───────────────────────────────────────────────────────────────
  {
    id: "quota",
    term: "クォータ",
    aliases: ["クォータ", "quota"],
    category: "concept",
    brief: "ブラウザがオリジンに割り当てるストレージの上限量。",
    description:
      "ブラウザが各オリジンに割り当てるストレージ容量の上限。navigator.storage.estimate() で現在の quota（上限）と usage（使用量）を確認できる。この値はあくまでブラウザの推定値であり、実際に書き込める量とは異なる場合がある（このツールが実測する理由）。クォータを超えると QuotaExceededError が発生する。",
  },
  {
    id: "shared-quota-pool",
    term: "共有クォータプール",
    aliases: ["共有クォータプール", "共有クォータ"],
    category: "concept",
    brief: "IndexedDB・Cache API・OPFS・SQLite・PGLiteが共用するストレージ容量の総枠。",
    description:
      "IndexedDB・Cache API・OPFS・SQLite/Wasm・PGLite の各APIは、ブラウザが管理する同一の「共有クォータプール」からストレージを消費する。あるAPIが大量にデータを書き込むと、他のAPIが使用できる残容量が減る。このためこれらのAPIは並列でベンチマークを実行すると正確な上限が測定できず、このツールでは逐次実行している。localStorage / sessionStorage はこのプールに含まれず、固定の別枠（約5MB）を持つ。",
  },
  {
    id: "origin",
    term: "オリジン",
    aliases: ["オリジン", "origin"],
    category: "concept",
    brief: "プロトコル+ホスト+ポートの組み合わせ。ストレージの分離単位。",
    description:
      "URLの「プロトコル://ホスト:ポート」の組み合わせを指す。例えば https://example.com と http://example.com は別のオリジン。ブラウザのストレージAPIは全てオリジン単位で分離されており、あるオリジンのJavaScriptが別オリジンのデータにアクセスすることはできない（Same-Origin Policy）。",
  },
  {
    id: "persistent-storage",
    term: "永続ストレージ",
    aliases: ["永続ストレージ", "永続化"],
    category: "concept",
    brief: "ストレージプレッシャー時にブラウザが自動削除しないことが保証されたストレージ状態。",
    description:
      "navigator.storage.persist() を呼び出してブラウザに許可されると、そのオリジンのストレージは「永続ストレージ」になる。通常の「ベストエフォート」状態では、デバイスのディスク容量が逼迫したとき（ストレージプレッシャー）にブラウザが古いデータを自動削除することがある。PWAで重要なデータを保持したい場合は必ず永続化を要求すること。",
  },
  {
    id: "storage-pressure",
    term: "ストレージプレッシャー",
    aliases: ["ストレージプレッシャー"],
    category: "concept",
    brief: "デバイスのディスク容量が不足し、ブラウザが古いデータを自動削除する状態。",
    description:
      "デバイスのストレージが一定の閾値を下回ると、ブラウザは LRU（最近アクセスされていない）順にオリジンのデータを自動削除することがある。永続ストレージを取得していないオリジンが対象になる。iOS Safari では7日間アクセスがないとITP によりデータが削除される仕組みも存在する。",
  },
  {
    id: "pwa",
    term: "PWA",
    aliases: ["PWA", "Progressive Web App"],
    category: "concept",
    brief: "Service Worker・マニフェストなどを使いアプリに近い体験を提供するWebアプリの形態。",
    description:
      "Progressive Web App の略。Service Worker によるオフライン対応、Web App Manifest によるホーム画面追加、プッシュ通知などの機能を組み合わせてネイティブアプリに近い体験を提供するWebアプリケーションの設計パターン。オフラインファーストの実現にはストレージAPIの適切な選択と容量管理が不可欠。",
  },
  {
    id: "offline-first",
    term: "オフラインファースト",
    aliases: ["オフラインファースト", "オフライン対応"],
    category: "concept",
    brief: "ネットワークがなくても動作することを前提に設計するアーキテクチャ方針。",
    description:
      "ネットワーク接続がない状態でも基本機能が動作することを前提に設計するアプローチ。Cache API でアセットをキャッシュし、IndexedDB でデータをローカルに保持し、Service Worker がオフライン時もリクエストに応答することで実現する。「ネットワークがあれば同期、なければキャッシュで動作」というUXを目指す。",
  },

  // ── 計測・結果 ─────────────────────────────────────────────────────────────
  {
    id: "binary-search",
    term: "バイナリサーチ方式",
    aliases: ["バイナリサーチ方式", "バイナリサーチ", "binary search"],
    category: "measurement",
    brief: "64MBチャンクから書き込み開始し、失敗したら半分にして再試行し上限を特定する計測手法。",
    description:
      "このツールがストレージ上限を計測する際に使うアルゴリズム。64MBのチャンクで書き込みを試み、QuotaExceededError が発生したらチャンクサイズを半分にして再試行する。1KB未満になった時点で停止し、それまでに書き込めた合計バイト数を「実測上限」とする。最大16ステップで収束するため、線形探索より大幅に高速。",
  },
  {
    id: "throughput",
    term: "スループット",
    aliases: ["スループット", "throughput"],
    category: "measurement",
    brief: "ストレージへの書き込み速度（MB/s）。APIの実装方式やデータ種別で大きく変わる。",
    description:
      "単位時間あたりに書き込めるデータ量（MB/秒）。同期APIの localStorage は比較的高いスループットを示すが、大量書き込みでメインスレッドをブロックする。非同期のIndexedDB/Cache APIはスループットは落ちるが UIをブロックしない。OPFS の同期アクセスハンドルはネイティブファイルI/Oに近い高スループットが出る傾向がある。",
  },
  {
    id: "chunk",
    term: "チャンク",
    aliases: ["チャンク", "チャンクサイズ", "chunk"],
    category: "measurement",
    brief: "バイナリサーチ計測で一度に書き込むデータのブロック。64MBから始まり失敗時に半減する。",
    description:
      "バイナリサーチ計測で1回の書き込み操作に使うデータブロック。最初は64MBで開始し、QuotaExceededError が発生するたびに半分（32MB → 16MB → …）にしていく。チャンクサイズが1KB未満になった時点で計測を終了する。チャンクのデータ種別（ランダム・BMP・テキスト・JSON）は計測結果に影響する場合がある（圧縮の有無など）。",
  },
  {
    id: "quota-exceeded-error",
    term: "QuotaExceededError",
    aliases: ["QuotaExceededError"],
    category: "measurement",
    brief: "ストレージ上限を超えたときにブラウザが投げる例外。計測の折り返し点として使用する。",
    description:
      "ストレージAPIへの書き込みがブラウザのクォータを超えた際にスローされる DOMException。name プロパティが 'QuotaExceededError'（FirefoxはNS_ERROR_DOM_QUOTA_REACHED）になる。このツールはこの例外をキャッチしてチャンクサイズを半減させるバイナリサーチを行う。",
  },
  {
    id: "sequential-execution",
    term: "逐次実行",
    aliases: ["逐次実行"],
    category: "measurement",
    brief: "共有クォータプールを使うAPIを一つずつ順番に計測すること。並列実行すると干渉するため。",
    description:
      "IndexedDB・Cache API・OPFS・SQLite/Wasm・PGLite は共有クォータプールを使うため、並列に計測するとお互いにクォータを奪い合い正確な上限が測定できない。このツールではこれらのAPIを1つずつ順番に計測する（逐次実行）。localStorage・sessionStorage は別枠クォータを持つため並列計測しても干渉しない。",
  },
  {
    id: "actual-limit",
    term: "実測上限",
    aliases: ["実測上限"],
    category: "measurement",
    brief: "バイナリサーチで実際に書き込めた最大バイト数。ブラウザ報告のクォータとは異なる。",
    description:
      "このツールがバイナリサーチで計測した、実際にAPIへ書き込めたデータの合計バイト数。navigator.storage.estimate() が返す quota（報告クォータ）はブラウザの推定値であり、実際に書き込める量より大きい場合も小さい場合もある。実測上限の方がより正確な利用可能容量を示す。",
  },
  {
    id: "reported-quota",
    term: "報告クォータ",
    aliases: ["報告クォータ"],
    category: "measurement",
    brief: "navigator.storage.estimate() がブラウザから返すストレージ上限の推定値。",
    description:
      "navigator.storage.estimate() を呼び出すと { quota, usage } オブジェクトが返る。quota は「利用可能な推定ストレージ容量」で、ブラウザがデバイスのディスク空き容量などを元に計算した推定値。実際に書き込める量（実測上限）とは差が生じる場合がある。iOS Safari では実態より大きな値が返ることがある。",
  },
  {
    id: "verification",
    term: "検証（verify）",
    aliases: ["検証OK", "検証NG", "検証"],
    category: "measurement",
    brief: "書き込んだデータを実際に読み返して整合性を確認する処理。",
    description:
      "ベンチマーク完了後、実際に書き込んだデータを読み返して正しく保存されているか確認する処理。検証OKなら書き込みと読み取りが整合している。検証NGの場合、APIがエラーなく書き込みを受け付けたように見えて実際にはデータが保存できていない可能性がある（一部のモバイルブラウザで報告されている挙動）。",
  },

  // ── Web 技術 ───────────────────────────────────────────────────────────────
  {
    id: "wasm",
    term: "WebAssembly",
    aliases: ["WebAssembly", "Wasm", "wasm"],
    category: "web-tech",
    brief: "CやC++などをブラウザで高速実行するためのバイナリ命令フォーマット。",
    description:
      "Web Assembly（Wasm）は、C・C++・Rust などで書かれたコードをコンパイルしてブラウザ上で近ネイティブ速度で実行できるバイナリフォーマット。SQLite・PostgreSQL などのネイティブDBをブラウザに持ち込む際に使われる。JavaScriptと相互に呼び出しができる。",
  },
  {
    id: "service-worker",
    term: "Service Worker",
    aliases: ["Service Worker", "サービスワーカー"],
    category: "web-tech",
    brief:
      "バックグラウンドで動くスクリプト。ネットワークリクエストの横取りとキャッシュ制御ができる。",
    description:
      "Webページとは独立してバックグラウンドで動作するJavaScriptスクリプト。ページからのネットワークリクエストを横取り（インターセプト）して Cache API から応答を返すことでオフライン対応を実現する。プッシュ通知の受信やバックグラウンド同期にも使われる。登録後はブラウザが管理し、ページが閉じていても動作できる。",
  },
  {
    id: "shared-array-buffer",
    term: "SharedArrayBuffer",
    aliases: ["SharedArrayBuffer"],
    category: "web-tech",
    brief: "複数のJSスレッド間でメモリを共有するためのオブジェクト。COOP/COEPヘッダーが必要。",
    description:
      "メインスレッドと Web Worker の間で同じメモリ領域を共有するためのオブジェクト。Spectre 脆弱性対策のため、使用するには COOP（Cross-Origin-Opener-Policy: same-origin）と COEP（Cross-Origin-Embedder-Policy: require-corp）の両方のレスポンスヘッダーが必要。wa-sqlite の OPFS VFS が内部で使用している。",
  },
  {
    id: "coop-coep",
    term: "COOP/COEP",
    aliases: ["COOP/COEP", "COOP", "COEP"],
    category: "web-tech",
    brief: "SharedArrayBufferを有効化するために必要な2つのHTTPレスポンスヘッダーの組み合わせ。",
    description:
      "Cross-Origin-Opener-Policy（COOP）と Cross-Origin-Embedder-Policy（COEP）の2つのHTTPレスポンスヘッダーの組み合わせ。COOP: same-origin + COEP: require-corp を設定すると「Cross-Origin Isolated」な環境になり、SharedArrayBuffer が使用できるようになる。SQLite/Wasm（wa-sqlite）を使う場合に必須。このサイトでは public/_headers と vite.config.ts に設定済み。",
  },
  {
    id: "vfs",
    term: "VFS",
    aliases: ["VFS", "仮想ファイルシステム"],
    category: "web-tech",
    brief: "Virtual File System。SQLiteがディスクの代わりに使う抽象I/Oレイヤー。",
    description:
      "Virtual File System（仮想ファイルシステム）の略。SQLiteはファイルI/Oを VFS という抽象レイヤー経由で行う設計になっており、VFSを差し替えることで様々なバックエンドでSQLiteを動作させられる。ブラウザ向けには OPFS をバックエンドとした AccessHandlePoolVFS（wa-sqlite）や opfs-sahpool（公式Wasm）が使われる。",
  },
  {
    id: "filesystem-sync-access-handle",
    term: "FileSystemSyncAccessHandle",
    aliases: ["FileSystemSyncAccessHandle", "同期アクセスハンドル"],
    category: "web-tech",
    brief: "OPFS ファイルに対する Web Worker 専用の同期I/OハンドルAPI。",
    description:
      "OPFS (Origin Private File System) のファイルに対して、Web Worker 内からのみ使用できる同期I/Oハンドル。read() / write() / flush() / close() / getSize() などのメソッドを同期的に呼び出せるため、システムコールに近い高速I/Oが可能。SQLiteなどのWasmDBがファイルI/Oのバックエンドとして使用する。メインスレッドでは使用不可。",
  },

  // ── ブラウザ・プラットフォーム ──────────────────────────────────────────────
  {
    id: "itp",
    term: "ITP",
    aliases: ["ITP", "Intelligent Tracking Prevention"],
    category: "browser",
    brief: "Safariのトラッキング防止機能。7日間未訪問のサイトのストレージを自動削除する。",
    description:
      "Intelligent Tracking Prevention（インテリジェント・トラッキング・プリベンション）の略。Apple Safari に搭載されたプライバシー保護機能。7日間ユーザーがサイトにアクセスしないと、IndexedDB・Cache API・localStorage などのストレージデータが自動削除される。navigator.storage.persist() で永続化を要求しても、ユーザーが明示的に許可しない限りiOSでは通常削除対象になる。",
  },
  {
    id: "devtools",
    term: "DevTools",
    aliases: ["DevTools", "デベロッパーツール"],
    category: "browser",
    brief: "ブラウザ組み込みの開発者向けデバッグ・検査ツール。ストレージの中身も確認できる。",
    description:
      "Chrome DevTools・Firefox Developer Tools・Safari Web Inspector などのブラウザ組み込みデバッグツールの総称。F12キーまたは右クリック→検証で開く。Application タブ（Chrome）または Storage タブ（Firefox）からlocalStorage・IndexedDB・Cache APIの中身をGUIで閲覧・編集・削除できる。モバイル端末のデバッグにはUSBリモートデバッグを使用する。",
  },
  {
    id: "remote-debugging",
    term: "リモートデバッグ",
    aliases: ["リモートデバッグ"],
    category: "browser",
    brief: "PCとスマートフォンをUSBで繋いでPC側のDevToolsからモバイルブラウザを検査する手法。",
    description:
      "スマートフォンのブラウザ（Chrome for Android / Mobile Safari）をPC側の DevTools から検査するデバッグ手法。Android の場合は Chrome の chrome://inspect/#devices からUSB接続したデバイスのタブを開ける。iPhone/iPadの場合は Safari の「開発」メニューから接続されたデバイスを選択する（事前にデバイス側でWebインスペクタを有効にする必要がある）。",
  },
  {
    id: "navigator-storage-estimate",
    term: "navigator.storage.estimate()",
    aliases: ["navigator.storage.estimate()", "storage.estimate"],
    category: "browser",
    brief: "ブラウザが推定する利用可能クォータと現在の使用量を非同期で返すAPI。",
    description:
      "Storage API の一部。{ quota: number, usage: number, usageDetails?: {...} } を解決する Promise を返す。quota は利用可能と推定されるバイト数、usage は現在使用中のバイト数。usageDetails では IndexedDB / Cache API / Service Worker などの内訳を確認できる（ブラウザによって対応状況が異なる）。返り値はあくまで推定値であり実際に書き込める量とは異なる場合がある。",
  },
  {
    id: "navigator-storage-persist",
    term: "navigator.storage.persist()",
    aliases: ["navigator.storage.persist()", "storage.persist"],
    category: "browser",
    brief:
      "ストレージの永続化をブラウザに要求するAPI。成功するとストレージプレッシャー時も削除されない。",
    description:
      "Storage API の一部。ストレージの永続化をブラウザに要求し、許可されたかどうかを示す boolean を解決する Promise を返す。永続化が許可されると、ブラウザはストレージプレッシャー時にそのオリジンのデータを自動削除しなくなる。ChromeではPWAとしてインストールされているか、ユーザーがサイトをブックマークしているかなどの条件で自動的に許可されることもある。iOSでは通常ユーザーの明示的な操作が必要。",
  },
];

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map((e) => [e.id, e]));

/** テキスト中の用語を検出するための正規表現マップ（長い用語を先に処理するため降順ソート） */
export const TERM_PATTERNS: { entry: GlossaryEntry; re: RegExp }[] = GLOSSARY.flatMap((entry) =>
  entry.aliases.map((alias) => ({
    entry,
    re: new RegExp(`(${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g"),
  })),
).sort((a, b) => b.entry.aliases[0].length - a.entry.aliases[0].length);
