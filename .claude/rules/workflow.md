# 作業ワークフロールール

## エージェントチーム構築（必須）

実装タスクを開始するたびに `TeamCreate` でエージェントチームを作成し、独立したタスクを並列化すること。
- タスクは `TaskCreate` で作成し `TaskUpdate` で進捗管理する
- 複数の独立したファイル作成・編集はエージェントに並列分担させる

## Serena MCP ツールの利用（必須）

コードの検索・参照・編集には Serena の MCP ツールを優先的に使用すること:

```
検索:  serena__find_symbol, serena__search_for_pattern, serena__get_symbols_overview
読込:  serena__read_file
編集:  serena__replace_content, serena__replace_symbol_body, serena__insert_after_symbol
ファイル作成: serena__create_text_file
```

シンプルな単一ファイル読み込みには Read ツールも可。
ただしコードベース全体の構造把握・シンボル解析は Serena を使う。
