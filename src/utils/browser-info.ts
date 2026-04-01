import type { BrowserInfo, StorageEstimate } from "../types";

export async function getBrowserInfo(): Promise<BrowserInfo> {
  const persistentStorage = await navigator.storage
    .persist()
    .catch(() => false);

  return {
    userAgent: navigator.userAgent,
    vendor: navigator.vendor,
    platform: navigator.platform,
    deviceMemoryGB:
      "deviceMemory" in navigator
        ? (navigator as Navigator & { deviceMemory: number }).deviceMemory
        : null,
    hardwareConcurrency: navigator.hardwareConcurrency,
    persistentStorage,
  };
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const estimate = await navigator.storage.estimate();
  return {
    quota: estimate.quota ?? 0,
    usage: estimate.usage ?? 0,
    usageDetails: (
      estimate as StorageEstimate & {
        usageDetails?: StorageEstimate["usageDetails"];
      }
    ).usageDetails,
  };
}

/** ブラウザ名をUAから簡易判定 */
export function detectBrowserName(userAgent: string): string {
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("OPR/")) return "Opera";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Unknown";
}
