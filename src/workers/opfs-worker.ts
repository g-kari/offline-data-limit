/// <reference lib="webworker" />

import { generateChunkByType } from "../utils/chunk-generator";
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
      err.message.toLowerCase().includes("quota")
    );
  }
  return false;
}

/**
 * OPFS の FileSystemSyncAccessHandle を使ってバイナリサーチ書き込みを行う
 */
async function runBenchmark(dataType: DataType) {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(FILE_NAME, { create: true });
  const handle = await fileHandle.createSyncAccessHandle();

  const startTime = Date.now();
  let totalBytes = 0;
  let chunkSize = START_CHUNK_BYTES;

  try {
    while (chunkSize >= MIN_CHUNK_BYTES) {
      try {
        const chunk = generateChunkByType(chunkSize, dataType);
        handle.write(chunk, { at: totalBytes });
        handle.flush();
        totalBytes += chunkSize;

        const elapsed = Date.now() - startTime;
        const throughputMBps =
          elapsed > 0
            ? totalBytes / 1024 / 1024 / (elapsed / 1000)
            : 0;

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
      durationMs > 0
        ? totalBytes / 1024 / 1024 / (durationMs / 1000)
        : 0;

    const complete: WorkerCompleteMessage = {
      type: "complete",
      actualLimitBytes: totalBytes,
      throughputMBps,
      durationMs,
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
      await runBenchmark(e.data.dataType ?? "random");
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
