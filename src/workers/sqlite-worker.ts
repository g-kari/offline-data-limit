/// <reference lib="webworker" />

import { generateChunk } from "../utils/chunk-generator";
import type {
  WorkerInMessage,
  WorkerProgressMessage,
  WorkerCompleteMessage,
  WorkerErrorMessage,
} from "../types/index";

const DB_NAME = "__benchmark_sqlite.db";
const START_CHUNK_BYTES = 64 * 1024 * 1024; // 64MB
const MIN_CHUNK_BYTES = 1024; // 1KB

/**
 * QuotaExceededError かどうかを判定する
 */
function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED"
    );
  }
  if (err instanceof Error) {
    return (
      err.name === "QuotaExceededError" ||
      err.message.toLowerCase().includes("quota") ||
      err.message.toLowerCase().includes("database or disk is full")
    );
  }
  return false;
}

// wa-sqlite の型定義（最小限）
type SQLiteDB = number;

interface SQLiteModule {
  open_v2(filename: string, flags?: number, vfs?: string): Promise<SQLiteDB>;
  exec(db: SQLiteDB, sql: string): Promise<void>;
  run(db: SQLiteDB, sql: string, bindings?: unknown[]): Promise<void>;
  close(db: SQLiteDB): Promise<void>;
  vfs_register(vfs: unknown, makeDefault?: boolean): void;
}

let sqliteModule: SQLiteModule | null = null;
let db: SQLiteDB | null = null;

/**
 * wa-sqlite を AccessHandlePoolVFS (OPFS) で初期化する
 */
async function initSQLite(): Promise<{ api: SQLiteModule; db: SQLiteDB }> {
  // @journeyapps/wa-sqlite の非同期版Wasmをロード
  const factory = (
    await import("@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs")
  ).default as (opts?: unknown) => Promise<unknown>;
  const SQLite = await import("@journeyapps/wa-sqlite");

  const wasmModule = await factory();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (SQLite as any).Factory(wasmModule) as SQLiteModule;

  // OPFS AccessHandlePool VFS を登録
  const { AccessHandlePoolVFS } = (await import(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - 型定義がないJSファイル
    "@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js"
  )) as { AccessHandlePoolVFS: { create(name: string, module: unknown): Promise<unknown> } };

  const vfs = await AccessHandlePoolVFS.create("benchmark-pool", wasmModule);
  api.vfs_register(vfs, true);

  // DB を開く（デフォルトVFSとして登録済み）
  const dbHandle = await api.open_v2(DB_NAME);

  return { api, db: dbHandle };
}

/**
 * SQLite にBLOBデータをINSERTしながら上限を計測する
 */
async function runBenchmark() {
  const init = await initSQLite();
  sqliteModule = init.api;
  db = init.db;

  // テーブル作成
  await sqliteModule.exec(
    db,
    "CREATE TABLE IF NOT EXISTS bench_data (id INTEGER PRIMARY KEY, chunk BLOB)"
  );

  const startTime = Date.now();
  let totalBytes = 0;
  let chunkSize = START_CHUNK_BYTES;

  while (chunkSize >= MIN_CHUNK_BYTES) {
    try {
      const chunk = generateChunk(chunkSize);
      await sqliteModule.run(
        db,
        "INSERT INTO bench_data (chunk) VALUES (?)",
        [chunk]
      );
      totalBytes += chunkSize;

      const elapsed = Date.now() - startTime;
      const throughputMBps =
        elapsed > 0 ? totalBytes / 1024 / 1024 / (elapsed / 1000) : 0;

      const progress: WorkerProgressMessage = {
        type: "progress",
        bytesWritten: totalBytes,
        currentChunkSize: chunkSize,
        throughputMBps,
      };
      self.postMessage(progress);
    } catch (err) {
      if (isQuotaError(err)) {
        // チャンクサイズを半減して再試行
        chunkSize = Math.floor(chunkSize / 2);
      } else {
        throw err;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const throughputMBps =
    durationMs > 0 ? totalBytes / 1024 / 1024 / (durationMs / 1000) : 0;

  const complete: WorkerCompleteMessage = {
    type: "complete",
    actualLimitBytes: totalBytes,
    throughputMBps,
    durationMs,
  };
  self.postMessage(complete);
}

/**
 * DB を閉じて OPFS からファイルを削除する
 */
async function cleanup() {
  try {
    if (sqliteModule && db !== null) {
      await sqliteModule.exec(db, "DROP TABLE IF EXISTS bench_data");
      await sqliteModule.close(db);
      db = null;
      sqliteModule = null;
    }
  } catch {
    // 閉じる際のエラーは無視
  }

  // OPFS から benchmark 関連ファイルを削除
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      if (name.includes("benchmark")) {
        await root.removeEntry(name, { recursive: true });
      }
    }
  } catch {
    // 削除失敗は無視
  }
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  try {
    if (e.data.type === "start") {
      await runBenchmark();
    } else if (e.data.type === "cleanup") {
      await cleanup();
    }
  } catch (err) {
    const error: WorkerErrorMessage = {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
