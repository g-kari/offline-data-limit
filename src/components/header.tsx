import { useEffect, useState } from "react";
import type { BrowserInfo } from "../types";
import { detectBrowserName } from "../utils/browser-info";

interface Props {
  browserInfo: BrowserInfo | null;
}

export function Header({ browserInfo }: Props) {
  const browserName = browserInfo ? detectBrowserName(browserInfo.userAgent) : null;
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-border pb-4 mb-6">
      <h1 className="text-2xl font-bold tracking-tight">オフラインストレージ限度計測</h1>
      <div className="flex items-center gap-3 text-sm">
        <a
          href="https://github.com/g-kari/offline-data-limit"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-current transition-colors"
          aria-label="GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
        {!isOnline && (
          <span className="rounded-sm bg-red-700/20 px-3 py-1 font-medium text-red-400">
            オフライン
          </span>
        )}
        {browserInfo && (
          <>
            {browserName && (
              <span className="rounded-sm bg-surface px-3 py-1 font-medium">{browserName}</span>
            )}
            {browserInfo.deviceMemoryGB !== null && (
              <span className="text-muted">メモリ {browserInfo.deviceMemoryGB} GB</span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
