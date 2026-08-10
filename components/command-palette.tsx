"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Command, Search } from "lucide-react";
import { searchAll } from "@/lib/data";
import { displayName, MODULES, type AnyRecord, type ModuleKey } from "@/lib/types";
import { Modal } from "./ui";

export function CommandPalette({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (module?: ModuleKey) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<AnyRecord & { module: ModuleKey }>>([]);
  useEffect(() => { if (!open) return; setQuery(""); setResults([]); }, [open]);
  useEffect(() => { const handle = window.setTimeout(() => { if (query.trim()) searchAll(query).then(setResults).catch(() => setResults([])); else setResults([]); }, 160); return () => window.clearTimeout(handle); }, [query]);
  return <Modal open={open} onClose={onClose} title="Command palette" description="Ctrl+K для поиска, перехода и быстрого создания." wide>
    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A90]" size={17} /><input autoFocus className="input pl-10" placeholder="Найти проект, задачу или контакт…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <div className="mt-4 space-y-2">{query && results.map((result) => <button key={`${result.module}-${result.id}`} onClick={() => { window.location.href = `/${result.module}/${result.id}`; onClose(); }} className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-bcc-lilac hover:bg-bcc-soft"><span><span className="eyebrow">{MODULES[result.module].label}</span><span className="mt-0.5 block font-medium">{displayName(result)}</span></span><ArrowRight size={16} className="text-[#8A8A90]" /></button>)}{query && results.length === 0 && <p className="rounded-xl bg-bcc-soft p-4 text-sm text-[#74747C]">Ничего не найдено. Создать новую запись?</p>} {!query && <div className="grid gap-2 sm:grid-cols-2">{Object.values(MODULES).slice(0, 8).map((item) => <button key={item.key} onClick={() => onCreate(item.key)} className="flex items-center gap-3 rounded-xl border border-bcc-border p-3 text-left hover:bg-bcc-soft"><Command size={15} className="text-bcc-violet" /><span className="text-sm">Создать {item.singular}</span></button>)}</div>}</div>
  </Modal>;
}
