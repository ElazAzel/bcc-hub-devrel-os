"use client";

import { useEffect, useRef, useState } from "react";
import { Command as CommandIcon, ArrowRight, Search } from "lucide-react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { searchAll } from "@/lib/data";
import { moduleCopy } from "@/lib/i18n";
import { MODULES, type ModuleKey, type WorkspaceSearchResult } from "@/lib/types";
import { Modal } from "./ui";

export function CommandPalette({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (module?: ModuleKey) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const requestId = useRef(0);
  useEffect(() => { if (open) { setQuery(""); setResults([]); } }, [open]);
  useEffect(() => {
    const currentRequest = ++requestId.current;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      if (!query.trim()) { setResults([]); return; }
      void searchAll(query, 40, controller.signal).then((next) => { if (currentRequest === requestId.current) setResults(next); }).catch((error) => { if (currentRequest === requestId.current && error?.name !== "AbortError") setResults([]); });
    }, 180);
    return () => { window.clearTimeout(handle); controller.abort(); };
  }, [query]);
  function openResult(result: WorkspaceSearchResult) { onClose(); router.push(`/${result.module}/${result.id}`); }
  return <Modal open={open} onClose={onClose} title="Быстрый поиск" description="Найди запись, раздел или действие. Ctrl+K открывает поиск в любой момент." wide>
    <Command shouldFilter={false} className="overflow-hidden rounded-2xl border border-bcc-border" label="Поиск по рабочему пространству">
      <div className="flex items-center gap-2 border-b border-bcc-border px-3"><Search size={16} className="text-[#8A8A90]" /><Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Проект, задача, контакт или действие…" className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#AAA7B2]" /></div>
      <Command.List className="max-h-[min(55vh,420px)] overflow-y-auto p-2"><Command.Empty className="p-4 text-sm text-[#74747C]">{query ? "Ничего не найдено. Попробуй другой запрос." : "Начни вводить запрос."}</Command.Empty>{query && results.map((result) => <Command.Item key={`${result.module}-${result.id}`} value={`${result.module}-${result.id}`} onSelect={() => openResult(result)} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 outline-none data-[selected=true]:bg-bcc-soft"><span className="min-w-0"><span className="eyebrow">{moduleCopy(result.module).label}</span><span className="mt-0.5 block truncate font-medium">{result.title}</span>{result.subtitle && <span className="mt-0.5 block truncate text-xs text-[#74747C]">{result.subtitle}</span>}</span><ArrowRight size={16} className="shrink-0 text-[#8A8A90]" /></Command.Item>)}{!query && <div className="grid gap-2 p-1 sm:grid-cols-2">{Object.values(MODULES).slice(0, 8).map((item) => <Command.Item key={item.key} value={`создать-${item.key}`} onSelect={() => onCreate(item.key)} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-bcc-border px-3 py-3 outline-none data-[selected=true]:bg-bcc-soft"><CommandIcon size={15} className="text-bcc-violet" /><span className="text-sm">Создать {moduleCopy(item.key).singular}</span></Command.Item>)}</div>}</Command.List>
    </Command>
  </Modal>;
}
