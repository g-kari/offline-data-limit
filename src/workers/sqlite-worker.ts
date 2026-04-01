/// <reference lib="webworker" />

import { generateChunkByType } from "../utils/chunk-generator";
import type {
  DataType,
  WorkerInMessage,
  WorkerProgressMessage,
  WorkerCompleteMessage,
  WorkerErrorMessage,
} from "../types/index";

const DB_NAME = "__benchmark_sqlite.db";
const START_CHUNK_BYTES = 64 * 1024 * 1024; // 64MB
const MIN_CHUNK_BYTES = 1024; // 1KB
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * QuotaExceededError かどうかを判定する
 */
function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED";
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
  statements(db: SQLiteDB, sql: string): AsyncIterable<number>;
  bind_collection(stmt: number, bindings: unknown[]): number;
  step(stmt: number): Promise<number>;
  finalize(stmt: number): Promise<number>;
  close(db: SQLiteDB): Promise<void>;
  vfs_register(vfs: unknown, makeDefault?: boolean): void;
}

let sqliteModule: SQLiteModule | null = null;
let db: SQLiteDB | null = null;

/**
 * wa-sqlite を AccessHandlePoolVFS (OPFS) で初期化する
 */
async function initSQLite(): Promise<{ api: SQLiteModule; db: SQLiteDB }> {
  const factory = (await import("@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs")).default as (
    opts?: unknown,
  ) => Promise<unknown>;
  const SQLite = await import("@journeyapps/wa-sqlite");

  const wasmModule = await factory();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (SQLite as any).Factory(wasmModule) as SQLiteModule;

  const { AccessHandlePoolVFS } = (await import(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - 型定義がないJSファイル
    "@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js"
  )) as { AccessHandlePoolVFS: { create(name: string, module: unknown): Promise<unknown> } };

  const vfs = await AccessHandlePoolVFS.create("benchmark-pool", wasmModule);
  api.vfs_register(vfs, true);

  const dbHandle = await api.open_v2(DB_NAME);

  return { api, db: dbHandle };
}

/**
 * SQLite にBLOBデータをINSERTしながら上限を計測する
 */
async function runBenchmark(dataType: DataType, maxBytes: number) {
  const init = await initSQLite();
  sqliteModule = init.api;
  db = init.db;

  await sqliteModule.exec(
    db,
    "CREATE TABLE IF NOT EXISTS bench_data (id INTEGER PRIMARY KEY, chunk BLOB)",
  );

  const startTime = Date.now();
  let totalBytes = 0;
  let chunkSize = START_CHUNK_BYTES;

  while (chunkSize >= MIN_CHUNK_BYTES) {
    // 安全上限に達したら停止
    if (totalBytes >= maxBytes) break;

    try {
      const chunk = generateChunkByType(chunkSize, dataType);
      // statements + bind_collection + step でBLOBをINSERTする
      for await (const stmt of sqliteModule.statements(
        db,
        "INSERT INTO bench_data (chunk) VALUES (?)",
      )) {
        sqliteModule.bind_collection(stmt, [chunk]);
        await sqliteModule.step(stmt);
      }
      totalBytes += chunkSize;

      const elapsed = Date.now() - startTime;
      const throughputMBps = elapsed > 0 ? totalBytes / 1024 / 1024 / (elapsed / 1000) : 0;

      const progress: WorkerProgressMessage = {
        type: "progress",
        bytesWritten: totalBytes,
        currentChunkSize: chunkSize,
        throughputMBps,
      };
      self.postMessage(progress);
    } catch (err) {
      if (isQuotaError(err)) {
        chunkSize = Math.floor(chunkSize / 2);
      } else {
        throw err;
      }
    }
  }

  // 検証: レコードが読めるか確認
  let verified = false;
  try {
    await sqliteModule.exec(db, "SELECT COUNT(*) FROM bench_data");
    verified = true;
  } catch {
    verified = false;
  }

  const durationMs = Date.now() - startTime;
  const throughputMBps = durationMs > 0 ? totalBytes / 1024 / 1024 / (durationMs / 1000) : 0;

  const complete: WorkerCompleteMessage = {
    type: "complete",
    actualLimitBytes: totalBytes,
    throughputMBps,
    durationMs,
    verified,
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
      const maxBytes = e.data.maxBytes ?? DEFAULT_MAX_BYTES;
      await runBenchmark(e.data.dataType ?? "random", maxBytes);
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
