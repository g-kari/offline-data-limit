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
  description: string;
  sharedQuota: boolean;
  requiresWorker: boolean;
}

export type TestPhase = "idle" | "writing" | "cleanup" | "done" | "error";

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

// Web Worker 通信用
export type WorkerMessageType =
  | "start"
  | "progress"
  | "complete"
  | "error"
  | "cleanup";

export interface WorkerStartMessage {
  type: "start";
  dataType: DataType;
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
}

export interface WorkerErrorMessage {
  type: "error";
  message: string;
}

export type WorkerInMessage = WorkerStartMessage | WorkerCleanupMessage;
export type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage;
