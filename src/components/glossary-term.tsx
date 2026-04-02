import { useState } from "react";
import type { GlossaryEntry } from "../data/glossary";
import { TERM_PATTERNS } from "../data/glossary";

interface Props {
  entry: GlossaryEntry;
  children: React.ReactNode;
}

export function GlossaryTerm({ entry, children }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <a
        href={`#/glossary/${entry.id}`}
        className="border-b border-dashed border-accent/60 text-current hover:border-accent cursor-help"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </a>
      {show && (
        <span className="absolute bottom-full left-0 z-50 mb-1.5 w-64 rounded border border-border bg-surface p-2.5 text-xs shadow-lg pointer-events-none">
          <span className="block leading-relaxed text-current mb-1.5">{entry.brief}</span>
          <span className="text-accent">単語集で詳細を見る →</span>
        </span>
      )}
    </span>
  );
}

interface Segment {
  text: string;
  entry: GlossaryEntry | null;
}

function segmentText(text: string): Segment[] {
  let segments: Segment[] = [{ text, entry: null }];

  for (const { entry, re } of TERM_PATTERNS) {
    const newSegments: Segment[] = [];
    for (const seg of segments) {
      if (seg.entry !== null) {
        newSegments.push(seg);
        continue;
      }
      re.lastIndex = 0;
      const parts = seg.text.split(re);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "") continue;
        newSegments.push({ text: parts[i], entry: i % 2 === 1 ? entry : null });
      }
    }
    segments = newSegments;
  }

  return segments;
}

function RichLine({ text }: { text: string }) {
  const segments = segmentText(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.entry ? (
          <GlossaryTerm key={i} entry={seg.entry}>
            {seg.text}
          </GlossaryTerm>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

interface RichTextProps {
  text: string;
  className?: string;
}

/** 段落（\n\n区切り）に分割し、各段落内のグロッサリー用語をリンク化する */
export function RichText({ text, className }: RichTextProps) {
  const paragraphs = text.split("\n\n").filter(Boolean);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} className={className}>
          <RichLine text={para} />
        </p>
      ))}
    </>
  );
}
