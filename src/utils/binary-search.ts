const START_CHUNK_BYTES = 64 * 1024 * 1024; // 64MB
const MIN_CHUNK_BYTES = 1024; // 1KB
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export interface BinarySearchCallbacks {
  onWrite: (chunkSize: number, keyIndex: number) => Promise<void>;
  onProgress?: (bytesWritten: number, chunkSize: number, startTime: number) => void;
  onCleanup?: () => Promise<void>;
  /** 書き込み上限バイト数（デフォルト: 2GB） */
  maxBytes?: number;
}

export interface BinarySearchResult {
  actualLimitBytes: number;
  throughputMBps: number;
  durationMs: number;
}

/**
 * バイナリサーチでストレージ上限を計測する
 * 64MBから開始し、QuotaExceededError で失敗したらチャンクサイズを半減、
 * 1KB未満になったら停止する（最大16ステップで収束）
 */
export async function measureStorageLimit(
  callbacks: BinarySearchCallbacks,
): Promise<BinarySearchResult> {
  const startTime = Date.now();
  let totalBytes = 0;
  let chunkSize = START_CHUNK_BYTES;
  let keyIndex = 0;
  let totalBytesWritten = 0;
  const maxBytes = callbacks.maxBytes ?? DEFAULT_MAX_BYTES;

  while (chunkSize >= MIN_CHUNK_BYTES) {
    // 安全上限に達したら停止
    if (totalBytes >= maxBytes) break;
    try {
      await callbacks.onWrite(chunkSize, keyIndex);
      totalBytes += chunkSize;
      totalBytesWritten += chunkSize;
      keyIndex++;

      callbacks.onProgress?.(totalBytes, chunkSize, startTime);
    } catch (err) {
      if (isQuotaError(err)) {
        // 失敗したのでチャンクサイズを半減して再試行
        chunkSize = Math.floor(chunkSize / 2);
      } else {
        throw err;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const throughputMBps = durationMs > 0 ? totalBytesWritten / 1024 / 1024 / (durationMs / 1000) : 0;

  if (callbacks.onCleanup) {
    await callbacks.onCleanup();
  }

  return { actualLimitBytes: totalBytes, throughputMBps, durationMs };
}

function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED";
  }
  if (err instanceof Error) {
    return err.name === "QuotaExceededError" || err.message.toLowerCase().includes("quota");
  }
  return false;
}
