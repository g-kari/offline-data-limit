import type { StorageApiInfo } from "../types";

/** 計測対象ストレージAPIの定義 */
export const API_INFO: StorageApiInfo[] = [
  {
    id: "localStorage",
    name: "localStorage",
    description: "同期、5MB固定上限",
    details:
      "同期的なkey-valueストレージ。文字列のみ保存可能（バイナリはBase64エンコードが必要）。読み書きはメインスレッドをブロックするため、大量データ操作には不向き。オリジン単位で管理され、タブをまたいで共有される。ブラウザを閉じてもデータは消えない。\n\n上限は仕様上5MBとされているが、ブラウザによって実装が異なり、Chrome/Edgeは約5MB（文字列のUTF-16エンコードの都合で実質約2.5MB相当のバイナリを保存可能）、Firefoxは約5〜10MBの場合がある。超過すると QuotaExceededError が発生する。\n\nsetItem() / getItem() は同期実行のためUIをブロックする。数百KB以上の書き込みを頻繁に行う場合は体感できるほど応答が遅くなることがある。大きなデータを扱う場合は IndexedDB を検討すること。\n\nユースケース: ユーザー設定、テーマ、簡易なセッション情報など小サイズの永続データ。",
    sampleCode: `// 書き込み
localStorage.setItem('key', 'value');

// 読み込み
const value = localStorage.getItem('key'); // string | null

// 削除
localStorage.removeItem('key');

// 全削除
localStorage.clear();`,
    referenceUrl: "https://developer.mozilla.org/ja/docs/Web/API/Window/localStorage",
    platformNotes:
      "PC・Android・iPhoneすべてで5MB固定上限。iOS Safariのプライベートブラウズモードでは書き込みが制限される（エラーになる場合がある）。",
    sharedQuota: false,
    requiresWorker: false,
  },
  {
    id: "sessionStorage",
    name: "sessionStorage",
    description: "同期、5MB固定上限（タブ間非共有）",
    details:
      "localStorageと同じAPIを持つが、スコープがタブ（ウィンドウ）単位。タブを閉じるとデータは消失し、他のタブとは共有されない。ページリロードでは保持される。一時的なフォームデータやウィザードの途中状態の保存に適している。\n\nwindow.open() で開いた子ウィンドウは親と同じ sessionStorage を共有するが、独立して開かれたタブとは共有されない。iframeの挙動はブラウザによって異なる。\n\n上限・同期ブロックの特性は localStorage と同じ。localStorage との使い分けの基準は「ブラウザを閉じたら不要か否か」。フォームの入力途中状態、ショッピングカートの一時保存、マルチステップ画面のウィザード状態などに向いている。\n\nユースケース: タブ固有の一時状態、フォーム入力の途中保存、ページ遷移をまたがない認証トークンの一時保持。",
    sampleCode: `// 書き込み
sessionStorage.setItem('step', '2');

// 読み込み
const step = sessionStorage.getItem('step'); // string | null

// 削除
sessionStorage.removeItem('step');

// タブを閉じると自動的にクリアされる`,
    referenceUrl: "https://developer.mozilla.org/ja/docs/Web/API/Window/sessionStorage",
    platformNotes:
      "PC・Android・iPhoneすべてで5MB固定上限。モバイルブラウザではバックグラウンドのタブがOSによって破棄されることがあり、タブを再表示するとデータが消失するリスクがある。",
    sharedQuota: false,
    requiresWorker: false,
  },
  {
    id: "indexedDB",
    name: "IndexedDB",
    description: "非同期、共有クォータプール",
    details:
      "非同期のNoSQLデータベース。構造化オブジェクト・Blob・ArrayBufferを直接保存できる。インデックスによる検索、トランザクション、カーソルをサポート。共有クォータプールを使用し、空きディスクの大部分を利用できる。PWAのオフラインデータ保存の主力となるAPI。\n\nデータモデルはオブジェクトストア（テーブルに相当）の集合体。各ストアは keyPath または自動インクリメントキーで管理する。バージョン管理機能（onupgradeneeded）により、スキーマ変更を安全に行える。\n\nAPIはコールバックベース（IDBRequest）だが、idb ライブラリ等を使うとPromiseベースで扱いやすくなる。トランザクションは読み取り専用（readonly）と読み書き（readwrite）の2種類があり、読み取り専用は並列実行できる。\n\nクォータは Cache API・OPFS・SQLite/Wasm と共有される「共有クォータプール」から消費される。navigator.storage.estimate() でおおよその使用量と上限を確認できる。\n\nユースケース: 大量の構造化データ（記事キャッシュ、商品データ、ユーザー生成コンテンツ）、オフライン同期キュー、バイナリファイルのキャッシュ。",
    sampleCode: `// DB オープン
const request = indexedDB.open('mydb', 1);
request.onupgradeneeded = (e) => {
  const db = e.target.result;
  db.createObjectStore('store', { keyPath: 'id' });
};

// 書き込み
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('store', 'readwrite');
  tx.objectStore('store').put({ id: 1, data: new Uint8Array(1024) });
};

// 読み込み
const getReq = tx.objectStore('store').get(1);
getReq.onsuccess = () => console.log(getReq.result);`,
    referenceUrl: "https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API",
    platformNotes:
      "PC Chrome/Edgeはディスクの最大80%、Firefoxは最大50%。Android Chromeはデスクトップ版と同等。iOS Safari（WebKit）は共有クォータに約1GBの上限があり（iOS 17+で緩和傾向）、7日間アクセスがないとITP（Intelligent Tracking Prevention）によりデータが自動削除される。",
    sharedQuota: true,
    requiresWorker: false,
  },
  {
    id: "cacheApi",
    name: "Cache API",
    description: "非同期、共有クォータプール",
    details:
      "Service Workerと組み合わせてネットワークレスポンスをキャッシュするためのAPI。Request/Responseペアを保存する。オフラインファーストのPWA構築に不可欠。IndexedDBと同じ共有クォータプールを使用するため、大量使用時は他のAPIに影響する。\n\nメインスレッドからも使用できるが、主な用途は Service Worker 内でのネットワークリクエストの横取り（fetch イベント）とレスポンスのキャッシュ。キャッシュ戦略（Cache First / Network First / Stale While Revalidate など）を組み合わせてオフライン体験を実現する。\n\ncaches.open('名前') で名前付きキャッシュを作成・取得し、cache.put(request, response) で保存する。cache.match() で対応するレスポンスを検索し、ヒットしなければ undefined を返す。バージョン管理はキャッシュ名に含めるのが慣習（例: 'v2-assets'）。\n\nPWAツールキット（Workbox など）はこのAPIを内部で使用しており、設定ベースでキャッシュ戦略を管理できる。\n\nユースケース: アプリシェル（HTML/CSS/JS）のオフラインキャッシュ、画像・フォントの事前キャッシュ（プリキャッシュ）、APIレスポンスの一時キャッシュ。",
    sampleCode: `// キャッシュへの書き込み
const cache = await caches.open('v1');
await cache.put(
  new Request('/api/data'),
  new Response(JSON.stringify({ key: 'value' }))
);

// キャッシュからの読み込み
const response = await caches.match('/api/data');
if (response) {
  const data = await response.json();
}

// キャッシュの削除
await caches.delete('v1');`,
    referenceUrl: "https://developer.mozilla.org/ja/docs/Web/API/Cache",
    platformNotes:
      "PC ChromeとAndroidでは共有クォータ内で実質無制限に近い容量。iOS Safariでは50MBを超えるとユーザーへの確認ダイアログが表示される場合がある。WebKitの7日間自動削除ルールの影響を受ける。",
    sharedQuota: true,
    requiresWorker: false,
  },
  {
    id: "opfs",
    name: "OPFS",
    description: "高性能ファイルI/O、共有クォータプール",
    details:
      "Origin Private File System（OPFS）は、オリジン専用の仮想ファイルシステムAPI。Web Workerで FileSystemSyncAccessHandle を使うことで同期・高速なI/Oが可能。通常のFileSystem APIと異なりユーザーには見えない（ファイルアプリ等からは参照できない）。大きなバイナリファイルの読み書きに最適で、SQLiteやWasmエンジンのバックエンドとして使われる。\n\nファイルへのアクセス方法は2種類ある。①メインスレッド・Worker 両方で使える非同期API（FileSystemFileHandle.createWritable()）と、②Web Worker 専用の同期API（FileSystemSyncAccessHandle）。同期APIはシステムコールに近い速度でI/Oできるため、データベースエンジンのバックエンドとして特に重要。\n\nディレクトリ構造を持ち、navigator.storage.getDirectory() でルートを取得し、getFileHandle() / getDirectoryHandle() でファイルやサブディレクトリを操作する。ファイルは { create: true } オプションを渡すと存在しない場合に新規作成される。\n\nwa-sqlite の AccessHandlePoolVFS や SQLite WASM の opfs-sahpool VFS はこの同期APIを使ってブラウザ内でSQLite DBファイルを直接管理している。\n\nユースケース: SQLite/PostgreSQL などのWasmデータベースのバックエンド、大きなバイナリファイルのローカルキャッシュ、動画・音声ファイルの一時保存。",
    sampleCode: `// Web Worker 内で使用
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('data.bin', { create: true });

// 同期アクセス（Worker内のみ）
const syncHandle = await fileHandle.createSyncAccessHandle();
const buffer = new Uint8Array(1024);
syncHandle.write(buffer, { at: 0 });
syncHandle.flush();
syncHandle.close();

// 読み込み
syncHandle.read(buffer, { at: 0 });`,
    referenceUrl:
      "https://developer.mozilla.org/ja/docs/Web/API/File_System_API/Origin_private_file_system",
    platformNotes:
      "Chrome 86+・Edge 86+・Firefox 111+・Safari 17+で対応。同期アクセスハンドル（FileSystemSyncAccessHandle）はWeb Worker内のみ使用可能（メインスレッド不可）。Android Chromeは対応済み。iOS Safari 17+で対応したが実装が新しいため挙動に差がある場合がある。",
    sharedQuota: true,
    requiresWorker: true,
  },
  {
    id: "sqlite",
    name: "SQLite/Wasm",
    description: "wa-sqlite + OPFS VFS",
    details:
      "wa-sqlite はSQLite本体をWebAssemblyにコンパイルし、OPFSをVFS（仮想ファイルシステム）バックエンドとして使用するブラウザ内SQLite実装。完全なSQL構文・トランザクション・インデックスをサポートし、既存のSQLiteデスクトップ向けスキーマをほぼそのままブラウザで使える。SharedArrayBufferが必要なため COOP/COEPヘッダーの設定が必須。Workerスレッドで動作する。\n\nVFSとしてOPFSの同期アクセスハンドルを使うことで、ディスクI/Oに近いスループットが出る。バックエンドの選択肢は複数あり、AccessHandlePoolVFS（OPFSベース・高速）や IDBMirrorVFS（IndexedDB経由）などがある。\n\nSharedArrayBuffer を使うには、サーバーが Cross-Origin-Opener-Policy: same-origin と Cross-Origin-Embedder-Policy: require-corp の両方のレスポンスヘッダーを送る必要がある。このためローカルの開発サーバーや静的ホスティングでは追加設定が必要になる。\n\n公式の SQLite WASM（sqlite.org）も同様のコンセプトで実装されており、wa-sqlite の代替として使われることもある。\n\nユースケース: 既存のSQLiteスキーマ・クエリをブラウザに持ち込む場合、JOIN・集計・全文検索などの複雑なクエリが必要なオフラインアプリ、ゲームのセーブデータ管理。",
    sampleCode: `// Worker内で初期化
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';

const module = await SQLiteESMFactory();
const sqlite3 = SQLite.Factory(module);

// OPFSバックエンドでDBを開く
const db = await sqlite3.open_v2(
  'mydb.sqlite',
  SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE,
  'opfs'
);

// テーブル作成・データ挿入
await sqlite3.exec(db, \`
  CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, data BLOB);
  INSERT INTO items VALUES (1, zeroblob(1024));
\`);`,
    referenceUrl: "https://github.com/rhashimoto/wa-sqlite",
    platformNotes:
      "OPFSが対応しているChrome/Edge/Firefox/Safari 17+で動作。SharedArrayBufferを使用するため、サーバーからCross-Origin-Opener-Policy: same-origin と Cross-Origin-Embedder-Policy: require-corp ヘッダーの送信が必須。iOS Safariでは17+から対応したが、SharedArrayBufferの扱いに制約がある場合がある。",
    sharedQuota: true,
    requiresWorker: true,
  },
  {
    id: "pglite",
    name: "PGLite",
    description: "PostgreSQL in browser",
    details:
      "PostgreSQL全体をWebAssemblyにコンパイルし、ブラウザ内で実行するライブラリ（@electric-sql/pglite）。JSON演算子・全文検索・拡張機能など高度なSQL機能を利用可能。メインスレッドで動作可能（Worker対応もあり）。IndexedDBをバックエンドに使用してデータを永続化する。\n\nSQLite/Wasmと最大の違いは「PostgreSQLそのもの」であること。jsonb 型・配列型・ウィンドウ関数・CTEはもちろん、pg_trgm や pgvector といった拡張機能をロードすることもできる。バックエンドサーバーとスキーマを共有しやすい点が大きな強み。\n\nメモリには PostgreSQL プロセス全体（ヒープ・バッファプール）が展開されるため、ページ読み込み時の初期メモリ消費は SQLite に比べて大きい。ただし起動後はプロセス内でクエリを処理するため、メインスレッドで使っても I/O はIndexedDB経由となる（SQLite/OPFS より遅い傾向がある）。\n\nElectric SQLが提供するリアルタイム同期機能と組み合わせることで、サーバーのPostgreSQLとブラウザ内DBを自動同期するアーキテクチャが実現できる。\n\nユースケース: サーバーのPostgreSQLとスキーマを共有したいオフラインファーストアプリ、pgvectorを使ったブラウザ内ベクトル検索、ローカルファーストの共同編集アプリ。",
    sampleCode: `import { PGlite } from '@electric-sql/pglite';

// IndexedDBバックエンドで永続化
const db = new PGlite('idb://mydb');

// テーブル作成
await db.exec(\`
  CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
\`);

// データ挿入・検索
await db.exec("INSERT INTO logs(message) VALUES ('hello')");
const result = await db.query('SELECT * FROM logs');
console.log(result.rows);`,
    referenceUrl: "https://github.com/electric-sql/pglite",
    platformNotes:
      "Wasmをサポートする全ブラウザで動作（Chrome・Firefox・Safari・Edge）。ただしPostgreSQLエンジン全体をメモリに展開するため、メモリ消費が大きい。モバイルデバイス（特に低スペックのAndroidやiPhone）では初期化が遅くなる場合がある。iOSではIndexedDBバックエンドの約1GB上限が実質的な制約となる。",
    sharedQuota: true,
    requiresWorker: false,
  },
];
