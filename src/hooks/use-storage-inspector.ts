import { useState, useCallback, useRef, useEffect } from "react";
import type { StorageApiId } from "../types";

export const PAGE_SIZE = 20;

export interface LsRecord {
  key: string;
  length: number;
  preview: string;
}

export interface IdbRecord {
  index: number;
  byteLength: number;
  hexPreview: string;
  previewUrl?: string;
}

export interface CacheRecord {
  url: string;
  byteLength: number;
  contentType: string;
  hexPreview: string;
  previewUrl?: string;
}

export interface OpfsFile {
  name: string;
  byteLength: number;
  lastModified: number;
  hexPreview: string;
  previewUrl?: string;
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
  | { apiId: "localStorage" | "sessionStorage"; records: LsRecord[]; totalCount: number }
  | { apiId: "indexedDB"; records: IdbRecord[]; totalCount: number }
  | { apiId: "cacheApi"; records: CacheRecord[]; totalCount: number }
  | { apiId: "opfs"; files: OpfsFile[]; totalCount: number }
  | { apiId: "sqlite"; files: SqliteFile[]; totalCount: number }
  | { apiId: "pglite"; stores: PgliteStore[]; totalCount: number };

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

function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

async function inspectLocalStorage(
  prefix: string,
  page: number,
): Promise<{ records: LsRecord[]; totalCount: number }> {
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) allKeys.push(key);
  }
  const totalCount = allKeys.length;
  const pageKeys = allKeys.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const records: LsRecord[] = pageKeys.map((key) => {
    const val = localStorage.getItem(key) ?? "";
    return { key, length: val.length, preview: val.slice(0, 64) };
  });
  return { records, totalCount };
}

async function inspectIndexedDB(
  page: number,
): Promise<{ records: IdbRecord[]; totalCount: number }> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.close();
      indexedDB.deleteDatabase(IDB_NAME);
      resolve({ records: [], totalCount: 0 });
    };
    req.onerror = () => resolve({ records: [], totalCount: 0 });
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const countReq = store.count();
      countReq.onsuccess = () => {
        const totalCount = countReq.result;
        const offset = page * PAGE_SIZE;
        if (offset >= totalCount) {
          db.close();
          resolve({ records: [], totalCount });
          return;
        }
        const records: IdbRecord[] = [];
        let advanced = false;
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) {
            db.close();
            resolve({ records, totalCount });
            return;
          }
          // 先頭ページ以外は cursor.advance() で一気にスキップ
          if (!advanced && offset > 0) {
            advanced = true;
            cursor.advance(offset);
            return;
          }
          advanced = true;
          const val = cursor.value as Uint8Array;
          let previewUrl: string | undefined;
          if (val) {
            const mime = detectImageMime(val);
            if (mime) {
              previewUrl = URL.createObjectURL(new Blob([val], { type: mime }));
            }
          }
          records.push({
            index: offset + records.length,
            byteLength: val?.byteLength ?? 0,
            hexPreview: val ? toHex(val) : "",
            previewUrl,
          });
          if (records.length >= PAGE_SIZE) {
            db.close();
            resolve({ records, totalCount });
            return;
          }
          cursor.continue();
        };
        cursorReq.onerror = () => {
          db.close();
          resolve({ records, totalCount });
        };
      };
      countReq.onerror = () => {
        db.close();
        resolve({ records: [], totalCount: 0 });
      };
    };
  });
}

async function inspectCacheApi(
  page: number,
): Promise<{ records: CacheRecord[]; totalCount: number }> {
  if (!("caches" in globalThis)) return { records: [], totalCount: 0 };
  try {
    const cache = await caches.open(CACHE_NAME);
    const allKeys = await cache.keys();
    const totalCount = allKeys.length;
    const pageKeys = allKeys.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const records: CacheRecord[] = [];
    for (const reqKey of pageKeys) {
      const resp = await cache.match(reqKey);
      if (!resp) continue;
      const blob = await resp.blob();
      const byteLength = blob.size;
      const contentType = resp.headers.get("Content-Type") ?? "";
      const sliced = blob.slice(0, 32);
      const arrBuf = await sliced.arrayBuffer();
      let previewUrl: string | undefined;
      if (contentType.startsWith("image/")) {
        previewUrl = URL.createObjectURL(blob);
      }
      records.push({
        url: reqKey.url,
        byteLength,
        contentType,
        hexPreview: toHex(new Uint8Array(arrBuf)),
        previewUrl,
      });
    }
    return { records, totalCount };
  } catch {
    return { records: [], totalCount: 0 };
  }
}

async function inspectOpfs(): Promise<{ files: OpfsFile[]; totalCount: number }> {
  if (!navigator.storage?.getDirectory) return { files: [], totalCount: 0 };
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(OPFS_FILE);
    const file = await handle.getFile();
    const sliced = file.slice(0, 32);
    const arrBuf = await sliced.arrayBuffer();
    const headerBytes = new Uint8Array(arrBuf);
    let previewUrl: string | undefined;
    const mime = detectImageMime(headerBytes);
    if (mime) {
      previewUrl = URL.createObjectURL(file);
    }
    const files = [
      {
        name: OPFS_FILE,
        byteLength: file.size,
        lastModified: file.lastModified,
        hexPreview: toHex(headerBytes),
        previewUrl,
      },
    ];
    return { files, totalCount: files.length };
  } catch {
    return { files: [], totalCount: 0 };
  }
}

async function inspectSqlite(): Promise<{ files: SqliteFile[]; totalCount: number }> {
  if (!navigator.storage?.getDirectory) return { files: [], totalCount: 0 };
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
    return { files, totalCount: files.length };
  } catch {
    return { files: [], totalCount: 0 };
  }
}

async function inspectPglite(): Promise<{ stores: PgliteStore[]; totalCount: number }> {
  return new Promise((resolve) => {
    const req = indexedDB.open(PGLITE_IDB);
    req.onerror = () => resolve({ stores: [], totalCount: 0 });
    req.onsuccess = () => {
      const db = req.result;
      const storeNames = Array.from(db.objectStoreNames);
      if (storeNames.length === 0) {
        db.close();
        resolve({ stores: [], totalCount: 0 });
        return;
      }
      const results: PgliteStore[] = [];
      let remaining = storeNames.length;
      for (const name of storeNames) {
        const tx = db.transaction(name, "readonly");
        const store = tx.objectStore(name);
        const countReq = store.count();
        countReq.onsuccess = () => {
          const recordCount = countReq.result;
          // サイズ推測: 先頭1件だけ読んでサイズを計測し全件に掛ける（高速な近似）
          const sampleReq = store.openCursor();
          sampleReq.onsuccess = () => {
            const cursor = sampleReq.result;
            let sampleSize = 0;
            if (cursor) {
              const r = cursor.value as unknown;
              if (r instanceof ArrayBuffer) sampleSize = r.byteLength;
              else if (ArrayBuffer.isView(r)) sampleSize = (r as ArrayBufferView).byteLength;
              else sampleSize = JSON.stringify(r).length;
            }
            results.push({ name, recordCount, byteLength: sampleSize * recordCount });
            if (--remaining === 0) {
              db.close();
              results.sort((a, b) => a.name.localeCompare(b.name));
              resolve({ stores: results, totalCount: results.length });
            }
          };
          sampleReq.onerror = () => {
            results.push({ name, recordCount, byteLength: 0 });
            if (--remaining === 0) {
              db.close();
              resolve({ stores: results, totalCount: results.length });
            }
          };
        };
        countReq.onerror = () => {
          results.push({ name, recordCount: 0, byteLength: 0 });
          if (--remaining === 0) {
            db.close();
            resolve({ stores: results, totalCount: results.length });
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
  const [page, setPage] = useState(0);
  const blobUrlsRef = useRef<string[]>([]);

  // dataが変わるたびに前回のURLをrevoke
  useEffect(() => {
    const prev = blobUrlsRef.current;
    const next: string[] = [];
    if (data) {
      if ("records" in data) {
        for (const r of data.records) {
          if ("previewUrl" in r && r.previewUrl) next.push(r.previewUrl);
        }
      } else if ("files" in data) {
        for (const f of data.files) {
          if ("previewUrl" in f && f.previewUrl) next.push(f.previewUrl);
        }
      }
    }
    blobUrlsRef.current = next;
    return () => {
      for (const url of prev) URL.revokeObjectURL(url);
    };
  }, [data]);

  const inspect = useCallback(async (apiId: StorageApiId, pageNum = 0) => {
    setIsLoading(true);
    setActiveApiId(apiId);
    setPage(pageNum);
    try {
      switch (apiId) {
        case "localStorage": {
          const r = await inspectLocalStorage(LS_PREFIX, pageNum);
          setData({ apiId, ...r });
          break;
        }
        case "sessionStorage": {
          const r = await inspectLocalStorage(SS_PREFIX, pageNum);
          setData({ apiId, ...r });
          break;
        }
        case "indexedDB": {
          const r = await inspectIndexedDB(pageNum);
          setData({ apiId, ...r });
          break;
        }
        case "cacheApi": {
          const r = await inspectCacheApi(pageNum);
          setData({ apiId, ...r });
          break;
        }
        case "opfs": {
          const r = await inspectOpfs();
          setData({ apiId, ...r });
          break;
        }
        case "sqlite": {
          const r = await inspectSqlite();
          setData({ apiId, ...r });
          break;
        }
        case "pglite": {
          const r = await inspectPglite();
          setData({ apiId, ...r });
          break;
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, activeApiId, page, inspect };
}
