# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際に Claude Code への指針を提供します。

## プロジェクト概要

**オフラインデータ限度ベンチマーク** — ブラウザの各ストレージAPIが実際にどれだけのデータを保存できるかを計測するPWAツール。

### 計測対象のストレージAPI
- `localStorage` / `sessionStorage` — 同期、5MB上限（固定）
- `IndexedDB` — 非同期、共有クォータプール（GB単位）
- `Cache API` — 非同期、共有クォータプール
- `OPFS`（Origin Private File System） — 高性能ファイルI/O、共有クォータプール
- `SQLite/Wasm`（wa-sqlite + OPFS VFS） — ブラウザ内SQLite
- `PGLite` — ブラウザ内PostgreSQL

## 技術スタック

| 技術 | 用途 |
|------|------|
| Vite 8 + vite-plus | ビルド・リント・フォーマット |
| React 19 + TypeScript 5.8 | UI |
| Tailwind CSS 4 + @tailwindcss/vite | スタイリング（katasu.me配色） |
| vite-plugin-pwa | PWA/Service Worker生成 |
| Cloudflare Workers（静的アセット） | デプロイ |
| @rhashimoto/wa-sqlite | SQLite in browser |
| @electric-sql/pglite | PostgreSQL in browser |

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動（http://localhost:5173）
npm run build      # 本番ビルド → dist/
npm run preview    # wrangler devでWorkers環境プレビュー
npm run deploy     # ビルド + Cloudflare Workers デプロイ
npm run type-check # TypeScript型チェック
vp lint            # Oxlintでリント
vp format          # Oxfmtでフォーマット
vp check           # リント + フォーマットチェック
```

## デプロイ

Cloudflare WorkersにGitHub連携でデプロイ（GitHub Actions不使用）:
- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`
- `wrangler.jsonc`の`assets.directory: "dist"`で静的アセット配信

## アーキテクチャの重要な決定事項

### COOP/COEPヘッダーが必須な理由

`SharedArrayBuffer`を有効にするために必要。`wa-sqlite`のOPFS VFSが`SharedArrayBuffer`を使用するため。
- 開発時: `vite.config.ts`の`server.headers`で設定
- 本番: `public/_headers`でCloudflare Workers静的アセットに設定

### テストは逐次実行する理由

IndexedDB・Cache API・OPFSは同一の**共有クォータプール**を使用する。並列実行するとクォータを奪い合い、各APIの実際の上限が正確に測定できない。

### Web WorkerがOPFS・SQLiteに必須な理由

- `FileSystemSyncAccessHandle`（OPFS高性能アクセス）はWorkerスレッドのみで使用可能
- `wa-sqlite`のOPFS VFSはWorkerスレッドが必要

### バイナリサーチ戦略

64MBチャンクから開始 → 失敗時に半減 → 1KB未満で停止。最大16ステップで収束し高速。

## ディレクトリ構造

```
src/
├── types/          TypeScript型定義
├── utils/          ユーティリティ（バイナリサーチ、チャンク生成、フォーマット）
├── hooks/          ストレージテスト用React hooks
├── workers/        Web Workers（OPFS・SQLite）
└── components/     UIコンポーネント
```

## 作業フロー（必須）

### エージェントチーム構築
実装タスクを開始するたびに `TeamCreate` でエージェントチームを構築し、独立したタスクを並列化すること。

### Serena MCP ツールの利用
コードの検索・読み込み・編集には Serena の MCP ツールを積極活用すること:
- `serena__find_symbol` / `serena__get_symbols_overview` — シンボル検索・概観
- `serena__search_for_pattern` — パターン検索
- `serena__read_file` — ファイル読み込み
- `serena__replace_content` / `serena__replace_symbol_body` — 編集

## コード規約

- `.claude/rules/` 配下のルールに従うこと
- コメントは日本語で記述
- コミットメッセージは日本語
- `vp check`を通過してからコミット
