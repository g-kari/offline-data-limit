import type { StorageApiId, TestResult, TestProgress } from "../types";
import { ApiCard } from "./api-card";

interface ApiCardProps {
  apiId: StorageApiId;
  name: string;
  description: string;
  supported: boolean;
  result: TestResult | null;
  progress: TestProgress | null;
  isRunning: boolean;
  onRun: () => Promise<void>;
}

interface Props {
  apiCards: ApiCardProps[];
  isRunning: boolean;
  onRunAll: () => Promise<void>;
}

export function TestRunner({ apiCards, isRunning, onRunAll }: Props) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">ストレージAPI計測</h2>
        <button
          type="button"
          onClick={onRunAll}
          disabled={isRunning}
          className="rounded-sm bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRunning ? "計測中…" : "全テスト実行"}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {apiCards.map((card) => (
          <ApiCard key={card.apiId} {...card} />
        ))}
      </div>
    </section>
  );
}
