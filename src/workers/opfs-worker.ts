/// <reference lib="webworker" />

import { generateChunkByType } from "../utils/chunk-generator";
import { isQuotaError } from "../utils/binary-search";
import type {
  DataType,
  WorkerInMessage,
  WorkerProgressMessage,
  WorkerCompleteMessage,
  WorkerErrorMessage,
} from "../types/index";

const FILE_NAME = "__benchmark_opfs";
const START_CHUNK_BYTES = 64 * 1024 * 1024; // 64MB
const MIN_CHUNK_BYTES = 1024; // 1KB
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * OPFS の FileSystemSyncAccessHandle を使ってバイナリサーチ書き込みを行う
 */
async function runBenchmark(dataType: DataType, maxBytes: number) {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(FILE_NAME, { create: true });
  const handle = await fileHandle.createSyncAccessHandle();

  const startTime = Date.now();
  let totalBytes = 0;
  let chunkSize = START_CHUNK_BYTES;

  try {
    while (chunkSize >= MIN_CHUNK_BYTES) {
      // 安全上限に達したら停止
      if (totalBytes >= maxBytes) break;

      try {
        const chunk = generateChunkByType(chunkSize, dataType);
        handle.write(chunk, { at: totalBytes });
        handle.flush();
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

    // 検証: 先頭データを実際に読み返して確認
    let verified = false;
    if (totalBytes > 0) {
      try {
        const buf = new ArrayBuffer(1024);
        const bytesRead = handle.read(new DataView(buf), { at: 0 });
        verified = bytesRead > 0;
      } catch {
        verified = false;
      }
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
  } finally {
    handle.close();
  }
}

/**
 * OPFS からベンチマークファイルを削除する
 */
async function cleanup() {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(FILE_NAME);
  } catch {
    // ファイルが存在しない場合は無視
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
