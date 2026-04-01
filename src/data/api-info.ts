import type { StorageApiInfo } from "../types";

/** 計測対象ストレージAPIの定義 */
export const API_INFO: StorageApiInfo[] = [
  {
    id: "localStorage",
    name: "localStorage",
    description: "同期、5MB固定上限",
    details:
      "同期的なkey-valueストレージ。文字列のみ保存可能（バイナリはBase64エンコードが必要）。読み書きはメインスレッドをブロックするため、大量データ操作には不向き。オリジン単位で管理され、タブをまたいで共有される。ブラウザを閉じてもデータは消えない。",
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
      "localStorageと同じAPIを持つが、スコープがタブ（ウィンドウ）単位。タブを閉じるとデータは消失し、他のタブとは共有されない。ページリロードでは保持される。一時的なフォームデータやウィザードの途中状態の保存に適している。",
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
      "非同期のNoSQLデータベース。構造化オブジェクト・Blob・ArrayBufferを直接保存できる。インデックスによる検索、トランザクション、カーソルをサポート。共有クォータプールを使用し、空きディスクの大部分を利用できる。PWAのオフラインデータ保存の主力となるAPI。",
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
      "Service Workerと組み合わせてネットワークレスポンスをキャッシュするためのAPI。Request/Responseペアを保存する。オフラインファーストのPWA構築に不可欠。IndexedDBと同じ共有クォータプールを使用するため、大量使用時は他のAPIに影響する。",
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
      "Origin Private File System。オリジン専用の仮想ファイルシステムAPI。Web Workerで FileSystemSyncAccessHandle を使うことで同期・高速なI/Oが可能。通常のFileSystem APIと異なりユーザーには見えない。大きなバイナリファイルの読み書きに最適で、SQLiteやWasmエンジンのバックエンドとして使われる。",
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
      "wa-sqlite をWebAssemblyにコンパイルし、OPFSをVFS（仮想ファイルシステム）バックエンドとして使用するブラウザ内SQLite実装。完全なSQL構文・トランザクション・インデックスをサポート。SharedArrayBufferが必要なため COOP/COEPヘッダーの設定が必須。Workerスレッドで動作する。",
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
      "PostgreSQL全体をWebAssemblyにコンパイルし、ブラウザ内で実行するライブラリ（@electric-sql/pglite）。JSON演算子・全文検索・拡張機能など高度なSQL機能を利用可能。メインスレッドで動作可能（Worker対応もあり）。IndexedDBをバックエンドに使用してデータを永続化する。",
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
