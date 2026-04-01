# オフラインデータ限度ベンチマーク

ブラウザの各ストレージAPIが実際にどれだけのデータを保存できるかを計測するPWAツール。

## 概要

ブラウザには複数のオフラインストレージAPIがあり、それぞれ異なるクォータ制限があります。このツールはバイナリサーチ戦略（64MB→半減→1KB）で各APIの実際の上限値とスループットを計測し、ブラウザ間・デバイス間の違いを可視化します。

## 計測対象

| API | クォータ | 方式 |
|-----|---------|------|
| `localStorage` | 5MB（固定） | 同期 |
| `sessionStorage` | 5MB（固定） | 同期 |
| `IndexedDB` | 共有プール（GB単位） | 非同期 |
| `Cache API` | 共有プール（GB単位） | 非同期 |
| `OPFS` | 共有プール（GB単位） | Worker内同期 |
| `SQLite/Wasm` | 共有プール（GB単位） | Worker内 |
| `PGLite` | 共有プール（GB単位） | 非同期 |

> **共有プール**: IndexedDB・Cache API・OPFSは同一のオリジンクォータを共有します。Chrome では利用可能ディスク容量の約80%、Firefox では最大2GB（永続ストレージ許可時10GB）が上限です。

## 技術スタック

- **Vite 8** + **React 19** + **TypeScript 5.8**
- **Tailwind CSS 4** (katasu.me インスパイアデザイン)
- **vite-plus** (Oxlint + Oxfmt)
- **vite-plugin-pwa** (Service Worker、オフライン対応)
- **@journeyapps/wa-sqlite** (SQLite in browser via OPFS VFS)
- **@electric-sql/pglite** (PostgreSQL in browser)
- **Cloudflare Workers** (静的アセット配信)

## セットアップ

```bash
npm install --legacy-peer-deps
npm run dev
```

ブラウザで http://localhost:5173 にアクセス。

> **注意**: OPFS・SQLiteテストは `SharedArrayBuffer` が必要です。開発サーバーは自動でCOOP/COEPヘッダーを付与します。

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動 (http://localhost:5173)
npm run build      # 本番ビルド → dist/
npm run preview    # wrangler dev でWorkers環境プレビュー
npm run deploy     # ビルド + Cloudflare Workers デプロイ
npm run type-check # TypeScript型チェック
npm run lint       # Oxlintでリント
npm run format     # Oxfmtでフォーマット
npm run check      # リント + フォーマットチェック
```

## デプロイ (Cloudflare Workers)

GitHub ActionsなしでCloudflare側でビルド・デプロイします。

1. GitHubにリポジトリをpush
2. Cloudflare Dashboard → **Workers & Pages** → 新規作成
3. GitHubリポジトリを接続
4. 以下を設定:
   - ビルドコマンド: `npm run build`
   - 出力ディレクトリ: `dist`
   - Node.jsバージョン: `22`（`.node-version`で自動設定）

`public/_headers` により本番環境でも COOP/COEP ヘッダーが適用され、`SharedArrayBuffer` が有効になります。

## アーキテクチャ

```
src/
├── types/          型定義
├── utils/          バイナリサーチ・チャンク生成・フォーマット
├── hooks/          ストレージAPI別テストhooks + オーケストレーション
├── workers/        Web Workers (OPFS SyncAccessHandle, wa-sqlite)
└── components/     UIコンポーネント (Tailwind CSS)
```

### バイナリサーチ戦略

```
64MB → 成功 → 128MB → 失敗 → 64MB+32MB → 失敗 → 64MB+16MB → ...
```

最大16ステップで1KB精度まで収束。テストは**逐次実行**（共有クォータプールの干渉を防ぐため）。

### Web Worker必須の理由

- `FileSystemSyncAccessHandle`（OPFS高性能アクセス）はWorkerスレッドのみで使用可能
- `wa-sqlite` の OPFS VFS は `SharedArrayBuffer` + Worker が必要

## ライセンス

MIT
