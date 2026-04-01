import { useState, useCallback } from "react";
import type { StorageApiId } from "../types";

export interface LsRecord {
  key: string;
  length: number;
  preview: string;
}

export interface IdbRecord {
  index: number;
  byteLength: number;
  hexPreview: string;
}

export interface CacheRecord {
  url: string;
  byteLength: number;
  contentType: string;
  hexPreview: string;
}

export interface OpfsFile {
  name: string;
  byteLength: number;
  lastModified: number;
  hexPreview: string;
}

export interface SqliteFile {
  name: string;
  byteLength: number;
  lastModified: number;
}

export interface PgliteStore {
  name: string;
  recordCount: number;
  byteLength: number;
}

export type InspectorData =
  | { apiId: "localStorage" | "sessionStorage"; records: LsRecord[] }
  | { apiId: "indexedDB"; records: IdbRecord[] }
  | { apiId: "cacheApi"; records: CacheRecord[] }
  | { apiId: "opfs"; files: OpfsFile[] }
  | { apiId: "sqlite"; files: SqliteFile[] }
  | { apiId: "pglite"; stores: PgliteStore[] };

const LS_PREFIX = "__bench_ls_";
const SS_PREFIX = "__bench_ss_";
const IDB_NAME = "__benchmark_idb";
const IDB_STORE = "data";
const CACHE_NAME = "__benchmark_cache";
const OPFS_FILE = "__benchmark_opfs";
const PGLITE_IDB = "/pglite/benchmark-pglite";

function toHex(bytes: Uint8Array, maxBytes = 32): string {
  return Array.from(bytes.slice(0, maxBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

async function inspectLocalStorage(prefix: string): Promise<LsRecord[]> {
  const records: LsRecord[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      const val = localStorage.getItem(key) ?? "";
      records.push({ key, length: val.length, preview: val.slice(0, 64) });
    }
  }
  return records;
}

async function inspectIndexedDB(): Promise<IdbRecord[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.close();
      indexedDB.deleteDatabase(IDB_NAME);
      resolve([]);
    };
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        db.close();
        const records = (allReq.result as Uint8Array[]).map((val, i) => ({
          index: i,
          byteLength: val?.byteLength ?? 0,
          hexPreview: val ? toHex(val) : "",
        }));
        resolve(records);
      };
      allReq.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
}

async function inspectCacheApi(): Promise<CacheRecord[]> {
  if (!("caches" in globalThis)) return [];
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const records: CacheRecord[] = [];
    for (const req of keys) {
      const resp = await cache.match(req);
      if (!resp) continue;
      const blob = await resp.blob();
      const byteLength = blob.size;
      const contentType = resp.headers.get("Content-Type") ?? "";
      // hex preview: read first 32 bytes only
      const sliced = blob.slice(0, 32);
      const arrBuf = await sliced.arrayBuffer();
      const hexPreview = toHex(new Uint8Array(arrBuf));
      records.push({ url: req.url, byteLength, contentType, hexPreview });
    }
    return records;
  } catch {
    return [];
  }
}

async function inspectOpfs(): Promise<OpfsFile[]> {
  if (!navigator.storage?.getDirectory) return [];
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(OPFS_FILE);
    const file = await handle.getFile();
    const sliced = file.slice(0, 32);
    const arrBuf = await sliced.arrayBuffer();
    return [
      {
        name: OPFS_FILE,
        byteLength: file.size,
        lastModified: file.lastModified,
        hexPreview: toHex(new Uint8Array(arrBuf)),
      },
    ];
  } catch {
    return [];
  }
}

async function inspectSqlite(): Promise<SqliteFile[]> {
  if (!navigator.storage?.getDirectory) return [];
  try {
    const root = await navigator.storage.getDirectory();
    const files: SqliteFile[] = [];
    for await (const [name, handle] of root as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      if (!name.includes("benchmark")) continue;
      if (handle.kind === "directory") {
        for await (const [childName, childHandle] of handle as unknown as AsyncIterable<
          [string, FileSystemHandle]
        >) {
          if (childHandle.kind === "file") {
            const f = await (childHandle as FileSystemFileHandle).getFile();
            files.push({
              name: `${name}/${childName}`,
              byteLength: f.size,
              lastModified: f.lastModified,
            });
          }
        }
      } else if (handle.kind === "file") {
        const f = await (handle as FileSystemFileHandle).getFile();
        files.push({ name, byteLength: f.size, lastModified: f.lastModified });
      }
    }
    return files;
  } catch {
    return [];
  }
}

async function inspectPglite(): Promise<PgliteStore[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open(PGLITE_IDB);
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      const storeNames = Array.from(db.objectStoreNames);
      if (storeNames.length === 0) {
        db.close();
        resolve([]);
        return;
      }
      const results: PgliteStore[] = [];
      let remaining = storeNames.length;
      for (const name of storeNames) {
        const tx = db.transaction(name, "readonly");
        const store = tx.objectStore(name);
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const records = allReq.result as unknown[];
          let byteLength = 0;
          for (const r of records) {
            if (r instanceof ArrayBuffer) byteLength += r.byteLength;
            else if (ArrayBuffer.isView(r)) byteLength += (r as ArrayBufferView).byteLength;
            else byteLength += JSON.stringify(r).length;
          }
          results.push({ name, recordCount: records.length, byteLength });
          remaining--;
          if (remaining === 0) {
            db.close();
            results.sort((a, b) => a.name.localeCompare(b.name));
            resolve(results);
          }
        };
        allReq.onerror = () => {
          results.push({ name, recordCount: 0, byteLength: 0 });
          remaining--;
          if (remaining === 0) {
            db.close();
            resolve(results);
          }
        };
      }
    };
  });
}

export function useStorageInspector() {
  const [data, setData] = useState<InspectorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeApiId, setActiveApiId] = useState<StorageApiId>("localStorage");

  const inspect = useCallback(async (apiId: StorageApiId) => {
    setIsLoading(true);
    setActiveApiId(apiId);
    try {
      switch (apiId) {
        case "localStorage":
          setData({ apiId, records: await inspectLocalStorage(LS_PREFIX) });
          break;
        case "sessionStorage":
          setData({ apiId, records: await inspectLocalStorage(SS_PREFIX) });
          break;
        case "indexedDB":
          setData({ apiId, records: await inspectIndexedDB() });
          break;
        case "cacheApi":
          setData({ apiId, records: await inspectCacheApi() });
          break;
        case "opfs":
          setData({ apiId, files: await inspectOpfs() });
          break;
        case "sqlite":
          setData({ apiId, files: await inspectSqlite() });
          break;
        case "pglite":
          setData({ apiId, stores: await inspectPglite() });
          break;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, activeApiId, inspect };
}
