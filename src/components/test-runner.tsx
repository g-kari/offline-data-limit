import type { StorageApiId, TestResult, TestProgress, DataType } from "../types";
import { ApiCard } from "./api-card";

/** データ種別の選択肢 */
const DATA_TYPES: { id: DataType; label: string; description: string }[] = [
  { id: "random", label: "ランダムバイナリ", description: "crypto.getRandomValues() で生成" },
  { id: "bmp", label: "画像 (BMP)", description: "BMPヘッダー + ランダムピクセル" },
  { id: "text", label: "テキスト", description: "日本語テキストを繰り返し" },
  { id: "json", label: "JSON", description: "構造化JSONオブジェクト配列" },
];

interface ApiCardProps {
  apiId: StorageApiId;
  name: string;
  description: string;
  details: string;
  sampleCode: string;
  referenceUrl: string;
  platformNotes: string;
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
  dataType: DataType;
  onDataTypeChange: (dt: DataType) => void;
}

export function TestRunner({ apiCards, isRunning, onRunAll, dataType, onDataTypeChange }: Props) {
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

      {/* データ種別セレクター */}
      <div className="mb-4">
        <p className="text-xs text-muted mb-2">テストデータの種別</p>
        <div className="flex rounded-md overflow-hidden border border-border">
          {DATA_TYPES.map((dt) => (
            <button
              key={dt.id}
              type="button"
              disabled={isRunning}
              aria-pressed={dataType === dt.id}
              onClick={() => onDataTypeChange(dt.id)}
              className={`flex-1 px-3 py-2 text-sm transition-colors ${
                dataType === dt.id ? "bg-[#73862d] text-white" : "bg-surface text-current"
              } ${isRunning ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
            >
              <span className="block font-medium">{dt.label}</span>
              <span
                className={`block text-xs mt-0.5 ${
                  dataType === dt.id ? "text-white/70" : "text-muted"
                }`}
              >
                {dt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {apiCards.map((card) => (
          <ApiCard key={card.apiId} {...card} />
        ))}
      </div>
    </section>
  );
}
