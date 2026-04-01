import type { PersistenceResult } from "../types";

const LS_PREFIX = "__bench_ls_";
const SS_PREFIX = "__bench_ss_";
const IDB_NAME = "__benchmark_idb";
const IDB_STORE = "data";
const CACHE_NAME = "__benchmark_cache";
const OPFS_FILE = "__benchmark_opfs";
const PGLITE_IDB = "/pglite/benchmark-pglite";

/** localStorage のベンチマークデータ残存を確認 */
export async function checkLocalStorage(): Promise<PersistenceResult> {
  let bytesRemaining = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LS_PREFIX)) {
      const val = localStorage.getItem(key);
      if (val) bytesRemaining += val.length;
    }
  }
  return {
    apiId: "localStorage",
    bytesRemaining,
    originalBytes: 0, // 元の値は不明（セッション情報から補完する）
    persisted: bytesRemaining > 0,
    checkedAt: Date.now(),
  };
}

/** IndexedDB のベンチマークデータ残存を確認 */
export async function checkIndexedDB(): Promise<PersistenceResult> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        // DBが存在しなかった → データなし
        req.result.close();
        indexedDB.deleteDatabase(IDB_NAME);
        reject(new Error("no data"));
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    // レコード数のみ（正確なバイト数は取得コストが高いため概算不可）
    return {
      apiId: "indexedDB",
      bytesRemaining: count > 0 ? -1 : 0, // -1 = "データあり、サイズ不明"
      originalBytes: 0,
      persisted: count > 0,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      apiId: "indexedDB",
      bytesRemaining: 0,
      originalBytes: 0,
      persisted: false,
      checkedAt: Date.now(),
    };
  }
}

/** Cache API のベンチマークデータ残存を確認 */
export async function checkCacheApi(): Promise<PersistenceResult> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    // 全エントリのContent-Lengthを合計（概算）
    let bytesRemaining = 0;
    for (const req of keys) {
      const resp = await cache.match(req);
      if (resp) {
        const blob = await resp.blob();
        bytesRemaining += blob.size;
      }
    }
    // キーが0件ならキャッシュ自体を削除
    if (keys.length === 0) {
      await caches.delete(CACHE_NAME);
    }
    return {
      apiId: "cacheApi",
      bytesRemaining,
      originalBytes: 0,
      persisted: bytesRemaining > 0,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      apiId: "cacheApi",
      bytesRemaining: 0,
      originalBytes: 0,
      persisted: false,
      checkedAt: Date.now(),
    };
  }
}

/** OPFS のベンチマークファイル残存を確認 */
export async function checkOpfs(): Promise<PersistenceResult> {
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(OPFS_FILE);
    const file = await handle.getFile();
    return {
      apiId: "opfs",
      bytesRemaining: file.size,
      originalBytes: 0,
      persisted: file.size > 0,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      apiId: "opfs",
      bytesRemaining: 0,
      originalBytes: 0,
      persisted: false,
      checkedAt: Date.now(),
    };
  }
}

/** SQLite (wa-sqlite) のOPFS内ファイル残存を確認（ファイルサイズのみ、DB再初期化は重いため） */
export async function checkSqlite(): Promise<PersistenceResult> {
  try {
    const root = await navigator.storage.getDirectory();
    let totalSize = 0;
    let found = false;
    for await (const [name, handle] of root as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      if (name.includes("benchmark") && handle.kind === "file") {
        const file = await (handle as FileSystemFileHandle).getFile();
        totalSize += file.size;
        found = true;
      } else if (name.includes("benchmark") && handle.kind === "directory") {
        found = true;
        // ディレクトリ内のファイルサイズ合計は取得コストが高いためスキップ
        totalSize = -1;
      }
    }
    return {
      apiId: "sqlite",
      bytesRemaining: totalSize,
      originalBytes: 0,
      persisted: found,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      apiId: "sqlite",
      bytesRemaining: 0,
      originalBytes: 0,
      persisted: false,
      checkedAt: Date.now(),
    };
  }
}

/** PGLite のIndexedDB残存を確認 */
export async function checkPglite(): Promise<PersistenceResult> {
  try {
    // IDB が存在するか確認（開いてストアがあるかチェック）
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(PGLITE_IDB);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const hasStores = db.objectStoreNames.length > 0;
    db.close();
    return {
      apiId: "pglite",
      bytesRemaining: hasStores ? -1 : 0,
      originalBytes: 0,
      persisted: hasStores,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      apiId: "pglite",
      bytesRemaining: 0,
      originalBytes: 0,
      persisted: false,
      checkedAt: Date.now(),
    };
  }
}

/** 全ストレージAPIのベンチマークデータ残存を一括確認（sessionStorageは対象外） */
export async function checkAllPersistence(): Promise<PersistenceResult[]> {
  const checks: Promise<PersistenceResult>[] = [
    checkLocalStorage(),
    checkIndexedDB(),
    checkCacheApi(),
    checkOpfs(),
    checkSqlite(),
    checkPglite(),
  ];
  return Promise.all(checks);
}

/** 全ストレージAPIのベンチマークデータを一括削除 */
export async function cleanupAllBenchmarkData(): Promise<void> {
  // localStorage
  const lsKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LS_PREFIX)) lsKeysToRemove.push(key);
  }
  for (const key of lsKeysToRemove) localStorage.removeItem(key);

  // sessionStorage
  const ssKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(SS_PREFIX)) ssKeysToRemove.push(key);
  }
  for (const key of ssKeysToRemove) sessionStorage.removeItem(key);

  // IndexedDB
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });

  // Cache API
  await caches.delete(CACHE_NAME).catch(() => {});

  // OPFS
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(OPFS_FILE).catch(() => {});
    // SQLite/benchmark 関連ファイルも削除
    for await (const [name] of root as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      if (name.includes("benchmark")) {
        await root.removeEntry(name, { recursive: true }).catch(() => {});
      }
    }
  } catch {
    // OPFS未対応環境では無視
  }

  // PGlite
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(PGLITE_IDB);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
