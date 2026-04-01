# React ルール

- 関数コンポーネントのみ使用する（クラスコンポーネント禁止）
- ロジックはcustom hooksに分離し、コンポーネントはUIのみを担当する
- `useCallback`/`useMemo`は本当に必要な場合のみ使用する
- コンポーネントファイル名はkebab-caseを使用する（例: `api-card.tsx`）
- propsの型定義はコンポーネントファイル内に`interface Props {}`として定義する
- 副作用は`useEffect`で管理し、クリーンアップ関数を適切に返す
- ストレージAPIへのアクセスはすべてcustom hooksに閉じ込める
