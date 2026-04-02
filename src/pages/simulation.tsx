import { SimulationPanel } from "../components/simulation-panel";

export function SimulationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <a href="#" className="text-sm text-muted hover:text-current transition-colors">
          ← メインに戻る
        </a>
        <h1 className="text-xl font-bold">画像キャッシュシミュレーション</h1>
      </div>
      <SimulationPanel />
    </div>
  );
}
