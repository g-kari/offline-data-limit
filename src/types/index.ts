export type DataType = "random" | "bmp" | "text" | "json";

export interface DataTypeInfo {
  id: DataType;
  name: string;
  description: string;
}

export type StorageApiId =
  | "localStorage"
  | "sessionStorage"
  | "indexedDB"
  | "cacheApi"
  | "opfs"
  | "sqlite"
  | "pglite";

export interface StorageApiInfo {
  id: StorageApiId;
  name: string;
  /** 短い説明（カード常時表示） */
  description: string;
  /** 詳細説明（アコーディオン展開時） */
  details: string;
  /** サンプルコード */
  sampleCode: string;
  /** 出典URL（MDN等） */
  referenceUrl: string;
  /** PC/Android/iPhoneでの差分説明 */
  platformNotes: string;
  sharedQuota: boolean;
  requiresWorker: boolean;
}

export type TestPhase = "idle" | "writing" | "verifying" | "cleanup" | "done" | "error";

export interface TestProgress {
  apiId: StorageApiId;
  bytesWritten: number;
  currentChunkSize: number;
  throughputMBps: number;
  phase: TestPhase;
}

export interface TestResult {
  apiId: StorageApiId;
  actualLimitBytes: number;
  throughputMBps: number;
  reportedQuotaBytes: number | null;
  dataType: DataType;
  durationMs: number;
  supported: boolean;
  error?: string;
  /** 書き込み後の検証結果（true=読み返し成功, false=失敗） */
  verified?: boolean;
}

export interface StorageEstimate {
  quota: number;
  usage: number;
  usageDetails?: {
    indexedDB?: number;
    caches?: number;
    serviceWorkerRegistrations?: number;
  };
}

export interface BrowserInfo {
  userAgent: string;
  vendor: string;
  platform: string;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number;
  persistentStorage: boolean;
}

export interface BenchmarkSession {
  id: string;
  timestamp: number;
  browserInfo: BrowserInfo;
  storageEstimateBefore: StorageEstimate;
  storageEstimateAfter: StorageEstimate;
  dataType: DataType;
  results: TestResult[];
}

/** 永続性検証の結果 */
export interface PersistenceResult {
  apiId: StorageApiId;
  /** 読み返せたバイト数（概算） */
  bytesRemaining: number;
  /** 元の書き込みバイト数 */
  originalBytes: number;
  /** データが残っていたか */
  persisted: boolean;
  /** 検証時刻 */
  checkedAt: number;
}

// Web Worker 通信用
export type WorkerMessageType = "start" | "progress" | "complete" | "error" | "cleanup";

export interface WorkerStartMessage {
  type: "start";
  dataType: DataType;
  maxBytes?: number;
}

export interface WorkerCleanupMessage {
  type: "cleanup";
}

export interface WorkerProgressMessage {
  type: "progress";
  bytesWritten: number;
  currentChunkSize: number;
  throughputMBps: number;
}

export interface WorkerCompleteMessage {
  type: "complete";
  actualLimitBytes: number;
  throughputMBps: number;
  durationMs: number;
  verified?: boolean;
}

export interface WorkerErrorMessage {
  type: "error";
  message: string;
}

export type WorkerInMessage = WorkerStartMessage | WorkerCleanupMessage;
export type WorkerOutMessage = WorkerProgressMessage | WorkerCompleteMessage | WorkerErrorMessage;

export type ImageFormat = "png" | "jpg" | "webp";

export interface SimulationConfig {
  imageCount: number;
  width: number;
  height: number;
  format: ImageFormat;
  quality?: number; // JPEG品質（1-100、JPEGのみ有効）
}

export interface SimulationProgress {
  current: number;
  total: number;
  bytesWritten: number;
}

export interface SimulationResult {
  config: SimulationConfig;
  totalBytes: number;
  successCount: number;
  failedAtIndex: number | null;
  durationMs: number;
  throughputMBps: number;
  averageImageBytes: number;
}
