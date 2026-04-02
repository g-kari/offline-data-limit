import { useState, useEffect, useRef } from "react";
import { GLOSSARY, CATEGORY_LABELS } from "../data/glossary";
import type { GlossaryCategory, GlossaryEntry } from "../data/glossary";

const CATEGORIES: GlossaryCategory[] = [
  "storage-api",
  "concept",
  "measurement",
  "web-tech",
  "browser",
];

function matchesSearch(entry: GlossaryEntry, query: string): boolean {
  const q = query.toLowerCase();
  return (
    entry.term.toLowerCase().includes(q) ||
    entry.brief.toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q) ||
    entry.aliases.some((a) => a.toLowerCase().includes(q))
  );
}

interface Props {
  initialTermId?: string | null;
}

export function GlossaryPage({ initialTermId }: Props) {
  const [query, setQuery] = useState("");
  const scrolledRef = useRef(false);

  const filtered = query.trim() ? GLOSSARY.filter((e) => matchesSearch(e, query.trim())) : GLOSSARY;

  useEffect(() => {
    if (!initialTermId || scrolledRef.current) return;
    scrolledRef.current = true;
    // 少し待ってからスクロール（レンダリング完了後）
    const id = setTimeout(() => {
      document
        .getElementById(`glossary-${initialTermId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(id);
  }, [initialTermId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">単語集</h1>
          <p className="text-sm text-muted mt-1">このサイトで使用する技術用語の一覧</p>
        </div>
        <a href="#" className="text-sm text-accent hover:underline">
          ← トップへ戻る
        </a>
      </header>

      {/* 検索 */}
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="用語を検索…"
          className="w-full rounded border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {query.trim() && <p className="text-xs text-muted mt-1.5">{filtered.length} 件ヒット</p>}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted text-sm">「{query}」に一致する用語はありませんでした。</p>
      ) : query.trim() ? (
        /* 検索中はカテゴリ分けなしでフラット表示 */
        <div className="space-y-4">
          {filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} highlight={query.trim()} />
          ))}
        </div>
      ) : (
        /* 通常表示: カテゴリ別 */
        <div className="space-y-10">
          {CATEGORIES.map((cat) => {
            const entries = filtered.filter((e) => e.category === cat);
            if (entries.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 border-b border-border pb-2">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface EntryCardProps {
  entry: GlossaryEntry;
  highlight?: string;
}

function EntryCard({ entry, highlight }: EntryCardProps) {
  return (
    <div id={`glossary-${entry.id}`} className="rounded border border-border bg-bg p-4 scroll-mt-4">
      <div className="flex items-start gap-3 mb-2">
        <h3 className="font-semibold text-base">
          {highlight ? <Highlighted text={entry.term} query={highlight} /> : entry.term}
        </h3>
        <span className="mt-0.5 shrink-0 rounded-sm bg-surface px-2 py-0.5 text-xs text-muted">
          {CATEGORY_LABELS[entry.category]}
        </span>
      </div>
      <p className="text-sm text-accent mb-2">
        {highlight ? <Highlighted text={entry.brief} query={highlight} /> : entry.brief}
      </p>
      <p className="text-sm text-muted leading-relaxed">
        {highlight ? <Highlighted text={entry.description} query={highlight} /> : entry.description}
      </p>
      {entry.aliases.length > 1 && (
        <p className="text-xs text-muted mt-2">別名: {entry.aliases.slice(1).join(" / ")}</p>
      )}
    </div>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="bg-accent/20 text-current rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
