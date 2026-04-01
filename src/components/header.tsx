import type { BrowserInfo } from "../types";
import { detectBrowserName } from "../utils/browser-info";

interface Props {
  browserInfo: BrowserInfo | null;
}

export function Header({ browserInfo }: Props) {
  const browserName = browserInfo
    ? detectBrowserName(browserInfo.userAgent)
    : null;

  return (
    <header className="flex items-center justify-between border-b border-border pb-4 mb-6">
      <h1 className="text-2xl font-bold tracking-tight">
        オフラインストレージ限度計測
      </h1>
      {browserInfo && (
        <div className="flex items-center gap-3 text-sm">
          {browserName && (
            <span className="rounded-sm bg-surface px-3 py-1 font-medium">
              {browserName}
            </span>
          )}
          {browserInfo.deviceMemoryGB !== null && (
            <span className="text-muted">
              メモリ {browserInfo.deviceMemoryGB} GB
            </span>
          )}
        </div>
      )}
    </header>
  );
}
