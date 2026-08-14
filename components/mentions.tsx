"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type TextareaHTMLAttributes } from "react";
import { searchAll } from "@/lib/data";
import { moduleCopy } from "@/lib/i18n";
import { mentionToken, parseMentions } from "@/lib/mentions";
import type { WorkspaceSearchResult } from "@/lib/types";
import { Textarea } from "./ui";

type MentionTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function MentionTextarea({ value, onChange, ...props }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    let active = true;
    void searchAll(query, 8).then((next) => { if (active) setResults(next); }).catch(() => { if (active) setResults([]); });
    return () => { active = false; };
  }, [query]);

  function updateMentionContext(nextValue: string, cursor: number) {
    const before = nextValue.slice(0, cursor);
    const match = /(^|\s)@([^\s@]*)$/.exec(before);
    if (!match) {
      setQuery(null);
      setRange(null);
      return;
    }
    const start = cursor - match[0].length + (match[1] ? match[1].length : 0);
    setQuery(match[2]);
    setRange({ start, end: cursor });
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value;
    onChange(nextValue);
    updateMentionContext(nextValue, event.target.selectionStart);
  }

  function selectMention(result: WorkspaceSearchResult) {
    if (!range) return;
    const token = mentionToken({ module: result.module, id: result.id, label: result.title });
    const nextValue = `${value.slice(0, range.start)}${token} ${value.slice(range.end)}`;
    const cursor = range.start + token.length + 1;
    onChange(nextValue);
    setQuery(null);
    setRange(null);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  return <div className="relative">
    <Textarea ref={textareaRef} {...props} value={value} onChange={handleChange} onKeyUp={(event) => updateMentionContext(value, event.currentTarget.selectionStart)} onClick={(event) => updateMentionContext(value, event.currentTarget.selectionStart)} />
    {query && results.length > 0 && <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-bcc-border bg-white p-1 shadow-popover" role="listbox" aria-label="Упоминания">
      {results.map((result) => <button key={`${result.module}:${result.id}`} type="button" role="option" className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-bcc-soft" onMouseDown={(event) => event.preventDefault()} onClick={() => selectMention(result)}>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">@{result.title}</span><span className="mt-0.5 block truncate text-xs text-[#74747C]">{moduleCopy(result.module).label}{result.subtitle ? ` · ${result.subtitle}` : ""}</span></span>
      </button>)}
    </div>}
  </div>;
}

export function RichTextWithMentions({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`whitespace-pre-wrap ${className}`}>{parseMentions(value).map((segment, index) => segment.type === "text" ? <span key={`text-${index}`}>{segment.value}</span> : <Link key={`mention-${index}`} href={`/${segment.reference.module}/${segment.reference.id}`} className="rounded bg-bcc-lilac px-1 font-medium text-bcc-deep underline decoration-bcc-violet/50 underline-offset-2 hover:bg-bcc-lilac/80">@{segment.reference.label}</Link>)}</div>;
}
