const ABSOLUTE_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const QUOTA_RATIO = 0.5; // クォータの50%まで

/**
 * ストレージの安全な書き込み上限バイト数を計算する
 * navigator.storage.estimate() のクォータの50%、最大2GBを返す
 */
export async function getSafeMaxBytes(): Promise<number> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota) {
        return Math.min(Math.floor(est.quota * QUOTA_RATIO), ABSOLUTE_MAX_BYTES);
      }
    }
  } catch {
    // estimate 取得失敗時はデフォルト値を使う
  }
  return ABSOLUTE_MAX_BYTES;
}

/**
 * Persistent Storage を要求する
 * 成功すればブラウザによるストレージ自動消去を防止できる
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // persist 要求失敗は無視
  }
  return false;
}
