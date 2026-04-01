# TypeScript ルール

- `strict: true`を常に有効にする
- `interface`を優先し、`type`は必要な場合のみ使用
- `any`型は使用禁止。`unknown`を使い型を絞り込む
- `async/await`を使用し`Promise.then()`チェーンは避ける
- 関数の戻り値型は推論可能な場合は省略してよい
- `export`は名前付きエクスポートを基本とする
- ファイル名はkebab-caseを使用する（例: `use-benchmark.ts`）
- Web APIの型（`IDBDatabase`等）は`lib: ["DOM"]`から利用する
