/** バイト数を人間が読みやすい形式に変換 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** スループット（MB/s）を表示 */
export function formatThroughput(mbps: number): string {
  if (mbps === 0) return "—";
  if (mbps < 1) return `${(mbps * 1000).toFixed(0)} KB/s`;
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} GB/s`;
  return `${mbps.toFixed(1)} MB/s`;
}

/** ミリ秒を秒に変換して表示 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** パーセンテージ表示 */
export function formatPercent(used: number, total: number): string {
  if (total === 0) return "—";
  return `${((used / total) * 100).toFixed(1)}%`;
}
