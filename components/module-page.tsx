"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ChartGantt, CornerDownRight, Grid2X2, List, Plus, Radar as RadarIcon, SlidersHorizontal } from "lucide-react";
import { listRecords, loadAllRecords, loadAllTaskRecords, updateRecord } from "@/lib/data";
import { fieldLabel, formatDateRu, localizeOptions, moduleCopy, ru } from "@/lib/i18n";
import { groupTasksByStatus } from "@/lib/task-board";
import { taskUrgency, type TaskUrgency } from "@/lib/task-urgency";
import { summarizeTaskTiming, type TaskTimingSummary as TaskTimingSummaryData } from "@/lib/task-timing";
import { displayName, getModule, type AnyRecord, type ModuleKey } from "@/lib/types";
import { requestQuickAdd } from "@/lib/ui-events";
import { PageHeader } from "./page-header";
import { GanttView } from "./gantt-view";
import { EmployeeImport } from "./employee-import";
import { StatusChip } from "./status-chip";
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, Select } from "./ui";

type ViewMode = "list" | "board" | "gantt" | "radar" | "changelog";

function defaultView(module: ModuleKey): ViewMode {
  return module === "tasks" ? "board" : module === "tech-radar" ? "radar" : "list";
}

function isViewMode(value: string | null): value is ViewMode {
  return value === "list" || value === "board" || value === "gantt" || value === "radar" || value === "changelog";
}

export function ModulePage({ module }: { module: ModuleKey }) {
  const config = getModule(module)!;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialViewParam = searchParams.get("view");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [view, setView] = useState<ViewMode>(isViewMode(initialViewParam) ? initialViewParam : defaultView(module));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchTimer = useRef<number | null>(null);
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const query = searchParams.get("q") ?? "";
  const viewParam = initialViewParam;
  const statusParam = searchParams.get("status") ?? "";
  const result = useQuery({ queryKey: ["records", module, query, status, page], queryFn: () => listRecords(module, { q: query || undefined, statuses: status ? [status] : undefined, page, pageSize: 50 }), placeholderData: keepPreviousData });
  const timingQuery = useQuery({ queryKey: ["task-timing-summary"], queryFn: async () => summarizeTaskTiming(await loadAllTaskRecords()), enabled: module === "tasks", staleTime: 60_000 });
  const ganttQuery = useQuery({ queryKey: ["task-gantt", query, status], queryFn: () => loadAllRecords("tasks", { q: query || undefined, statuses: status ? [status] : undefined }), enabled: module === "tasks" && view === "gantt", staleTime: 60_000 });

  useEffect(() => {
    setSearchInput(query);
    setStatus(statusParam);
    setView(isViewMode(viewParam) ? viewParam : defaultView(module));
  }, [module, query, statusParam, viewParam]);
  useEffect(() => () => { if (searchTimer.current !== null) window.clearTimeout(searchTimer.current); }, []);
  useEffect(() => { const onChange = (event: Event) => { if ((event as CustomEvent).detail === module) void queryClient.invalidateQueries({ queryKey: ["records", module] }); }; window.addEventListener("bcc:data-changed", onChange); return () => window.removeEventListener("bcc:data-changed", onChange); }, [module, queryClient]);

  function updateUrl(changes: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => { if (value === undefined || value === "") next.delete(key); else next.set(key, String(value)); });
    const serialized = next.toString();
    router.replace(serialized ? `${pathname}?${serialized}` : pathname, { scroll: false });
  }
  function changeView(next: ViewMode) { setView(next); updateUrl({ view: next, page: 1 }); }
  function changeSearch(value: string) {
    setSearchInput(value);
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => updateUrl({ q: value.trim() || undefined, page: 1 }), 220);
  }

  if (result.isPending) return <LoadingState />;
  if (result.isError) return <ErrorState message={result.error instanceof Error ? result.error.message : "Не удалось загрузить данные."} onRetry={() => void result.refetch()} />;
  const rows = result.data.items;
  const viewOptions = module === "tasks" ? ["list", "board"] as ViewMode[] : module === "tech-radar" ? ["list", "radar", "changelog"] as ViewMode[] : ["list"] as ViewMode[];
  if (module === "tasks" && view === "gantt") {
    if (ganttQuery.isPending) return <LoadingState label="Собираем все задачи для Ганта…" />;
    if (ganttQuery.isError) return <ErrorState message={ganttQuery.error instanceof Error ? ganttQuery.error.message : "Не удалось загрузить задачи для Ганта."} onRetry={() => void ganttQuery.refetch()} />;
    return <div><PageHeader eyebrow="Рабочее пространство" title="Диаграмма Ганта" description="Сроки задач и иерархия субзадач на одной шкале." onSearch={changeSearch} searchValue={searchInput} /><div className="mb-4 flex justify-end"><Button variant="secondary" onClick={() => changeView("board")}><Grid2X2 size={16} />Вернуться к доске</Button></div><GanttView rows={ganttQuery.data ?? rows} /></div>;
  }
  return <div>
    <PageHeader eyebrow="Рабочее пространство" title={moduleCopy(module).label} description={moduleCopy(module).description} onSearch={changeSearch} searchValue={searchInput} />
    {module === "people" && <EmployeeImport />}
    {module === "tasks" && <div className="mb-4 flex justify-end"><Button variant="secondary" onClick={() => changeView("gantt")}><ChartGantt size={16} />Открыть диаграмму Ганта</Button></div>}
    {module === "tasks" && timingQuery.data && <TaskTimingSummary summary={timingQuery.data} />}
    {module === "ambassadors" && <AmbassadorSnapshot rows={rows} />}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="chip">{result.data.total} записей</span>{status && <button className="chip chip-active" onClick={() => { setStatus(""); updateUrl({ status: undefined, page: 1 }); }}>{ru(status)} ×</button>}</div><div className="flex items-center gap-1 rounded-full border border-bcc-border p-1">{viewOptions.map((option) => <IconTab key={option} active={view === option} label={option === "list" ? "Список" : option === "board" ? "Доска" : option === "radar" ? "Техрадар" : "Изменения"} onClick={() => changeView(option)}>{option === "list" ? <List size={16} /> : option === "board" ? <Grid2X2 size={16} /> : option === "radar" ? <RadarIcon size={16} /> : <span className="text-[10px] font-semibold">Δ</span>}</IconTab>)}<IconTab active={filtersOpen} label="Фильтры" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /></IconTab></div></div>
    {rows.length === 0 ? <EmptyState title={query ? "Ничего не найдено" : config.emptyTitle.replace(/^[A-Z].*$/, moduleCopy(module).label + " пока нет")} description={query ? "Измени запрос или создай новую запись." : config.emptyDescription} action={<Button variant="brand" onClick={() => requestQuickAdd(module)}><Plus size={16} />Создать {moduleCopy(module).singular}</Button>} /> : view === "board" ? <TaskBoard rows={rows} /> : view === "radar" ? <RadarOverview rows={rows} /> : view === "changelog" ? <RadarChangelog rows={rows} /> : <RecordTable rows={rows} module={module} />}
    {result.data.total > result.data.pageSize && <Pagination page={result.data.page} hasMore={result.data.hasMore} onChange={(next) => updateUrl({ page: next })} />}
    <AdvancedFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} module={module} value={status} onApply={(next) => { setStatus(next); updateUrl({ status: next || undefined, page: 1 }); }} />
  </div>;
}

function TaskTimingSummary({ summary }: { summary: TaskTimingSummaryData }) {
  return <section className="surface mb-5 p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">Скорость выполнения</div><h2 className="mt-1 text-xl font-semibold">Время задач по факту</h2></div><span className="chip">Измерено: {summary.measured} из {summary.total}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Среднее" value={summary.averageDurationDays === null ? "—" : `${summary.averageDurationDays} дн.`} /><Metric label="Раньше срока" value={String(summary.early)} tone="success" /><Metric label="В срок" value={String(summary.onTime)} /><Metric label="Позже срока" value={String(summary.late)} tone="danger" /></div></section>;
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-[#177479]" : tone === "danger" ? "text-[#AF3030]" : "text-bcc-ink";
  return <div className="rounded-2xl bg-bcc-soft p-3"><div className="text-xs text-[#74747C]">{label}</div><div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div></div>;
}

function RecordTable({ rows, module }: { rows: AnyRecord[]; module: ModuleKey }) {
  return <div className="surface overflow-hidden"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[680px] text-left"><thead className="bg-white"><tr className="border-b border-bcc-border text-xs uppercase tracking-[0.08em] text-[#8A8A90]"><th className="px-5 py-3 font-semibold">{moduleCopy(module).singular}</th><th className="px-5 py-3 font-semibold">Статус и контекст</th><th className="px-5 py-3 font-semibold">Дата</th><th className="px-5 py-3 font-semibold">Обновлено</th><th className="w-12 px-3 py-3" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="table-row"><td className="px-5 py-4"><Link href={`/${module}/${row.id}`} className="group flex min-w-56 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bcc-soft text-bcc-violet">{module === "tech-radar" ? <RadarIcon size={17} /> : <span className="text-xs font-semibold">{displayName(row).slice(0, 1).toUpperCase()}</span>}</span><span className="min-w-0"><span className="block max-w-sm truncate font-medium group-hover:text-bcc-deep">{displayName(row)}</span><span className="mt-0.5 block max-w-sm truncate text-xs text-[#74747C]">{String(row.description ?? row.topic ?? row.position ?? row.category ?? row.direction ?? "")}</span></span></Link></td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5"><StatusChip value={row.status ?? row.ring ?? row.relationship_state ?? row.change_state} />{row.priority && <span className="chip">{ru(row.priority)}</span>}{row.direction && <span className="chip">{ru(row.direction)}</span>}</div></td><td className="whitespace-nowrap px-5 py-4 text-sm"><TaskDueDate enabled={module === "tasks"} row={row} value={row.due_date ?? row.date_start ?? row.planned_date ?? row.next_follow_up_at ?? row.date} /></td><td className="whitespace-nowrap px-5 py-4 text-sm text-[#74747C]">{formatDateRu(row.updated_at)}</td><td className="px-3 py-4"><Link href={`/${module}/${row.id}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-[#8A8A90] hover:bg-bcc-soft" aria-label={`Открыть ${displayName(row)}`}><ArrowUpRight size={16} /></Link></td></tr>)}</tbody></table></div><div className="divide-y divide-bcc-border md:hidden">{rows.map((row) => <Link href={`/${module}/${row.id}`} key={row.id} className="block p-4 transition hover:bg-bcc-soft/60"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bcc-lilac text-bcc-deep text-xs font-semibold">{displayName(row).slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{displayName(row)}</span><span className="mt-1 block truncate text-sm text-[#74747C]">{String(row.description ?? row.topic ?? row.category ?? row.direction ?? "")}</span><span className="mt-3 flex flex-wrap items-center gap-2"><StatusChip value={row.status ?? row.ring ?? row.change_state} /><TaskDueDate enabled={module === "tasks"} row={row} value={row.due_date ?? row.date_start ?? row.planned_date ?? row.updated_at} compact /></span></span><ArrowUpRight size={16} className="mt-1 shrink-0 text-[#8A8A90]" /></div></Link>)}</div></div>;
}

function TaskDueDate({ row, value, enabled, compact = false }: { row: AnyRecord; value: unknown; enabled: boolean; compact?: boolean }) {
  const urgency = enabled ? taskUrgency(row) : "none";
  const label: Record<TaskUrgency, string> = { overdue: "Просрочено", today: "Сегодня", soon: "Скоро", none: "" };
  const classes: Record<TaskUrgency, string> = { overdue: "task-due-overdue", today: "task-due-today", soon: "task-due-soon", none: "text-[#74747C]" };
  return <span className={`inline-flex flex-wrap items-center gap-1 ${classes[urgency]} ${compact ? "text-xs" : ""}`}>{formatDateRu(value)}{urgency !== "none" && <span className="font-semibold">· {label[urgency]}</span>}</span>;
}

function TaskBoard({ rows }: { rows: AnyRecord[] }) {
  const statuses = ["Inbox", "Planned", "In Progress", "Waiting", "Blocked", "Done"];
  const grouped = groupTasksByStatus(rows, statuses);
  return <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-6">
    {statuses.map((status) => <div key={status} className="min-w-[230px] rounded-2xl bg-bcc-soft p-3">
      <div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">{ru(status)}</span><span className="chip">{grouped.get(status)?.length ?? 0}</span></div>
      <div className="space-y-2">
        {grouped.get(status)?.map((row) => {
          const isSubtask = Boolean(row.parent_task_id);
          return <div key={row.id} className={`rounded-xl border p-3 shadow-sm ${isSubtask ? "border-bcc-violet/30 bg-[#FBF8FF]" : "border-bcc-border bg-white"}`}>
            <Link href={`/tasks/${row.id}`} className="block transition hover:text-bcc-deep" aria-label={`${isSubtask ? "Субзадача" : "Основная задача"}: ${displayName(row)}`}>
              <div className="flex items-start gap-2">{isSubtask && <CornerDownRight size={15} className="mt-0.5 shrink-0 text-bcc-violet" aria-hidden="true" />}<div className="min-w-0 flex-1"><div className="text-sm font-medium">{isSubtask ? "Субзадача · " : ""}{displayName(row)}</div>{isSubtask && <div className="mt-1 truncate text-xs text-bcc-violet">Основная: {String(row.parent_title ?? "задача из иерархии")}</div>}</div></div>
              <div className="mt-2 flex items-center justify-between text-xs"><span className="text-[#74747C]">{ru(row.priority ?? "Normal")}</span><TaskDueDate enabled row={row} value={row.due_date} compact /></div>
            </Link>
            <Select aria-label={`Изменить статус: ${displayName(row)}`} className="mt-3 min-h-10 text-xs" value={String(row.status ?? status)} onChange={async (event) => { await updateRecord("tasks", row.id, { status: event.target.value, completed_at: event.target.value === "Done" ? new Date().toISOString() : null }); window.dispatchEvent(new CustomEvent("bcc:data-changed", { detail: "tasks" })); }}><option value="Inbox">{ru("Inbox")}</option><option value="Planned">{ru("Planned")}</option><option value="In Progress">{ru("In Progress")}</option><option value="Waiting">{ru("Waiting")}</option><option value="Blocked">{ru("Blocked")}</option><option value="Done">{ru("Done")}</option></Select>
          </div>;
        })}
      </div>
    </div>)}
  </div>;
}

function RadarOverview({ rows }: { rows: AnyRecord[] }) { const rings = ["Adopt", "Trial", "Assess", "Hold"]; const grouped = new Map(rings.map((ring) => [ring, [] as AnyRecord[]])); rows.forEach((row) => (grouped.get(String(row.ring)) ?? grouped.get("Assess")!).push(row)); return <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]"><div className="surface relative min-h-[500px] overflow-hidden bg-[#FBF9FF] p-6"><div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at center, transparent 0 18%, #DEC4FF 18.3% 18.6%, transparent 18.9% 38%, #DEC4FF 38.3% 38.6%, transparent 38.9% 58%, #DEC4FF 58.3% 58.6%, transparent 58.9% 78%, #DEC4FF 78.3% 78.6%, transparent 78.9%)" }} /><div className="relative z-10"><div className="eyebrow">Backend · четыре кольца</div><h2 className="mt-2 text-2xl font-semibold">Техрадар BCC HUB</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[#74747C]">Ориентир для решений. Подробности и история изменений доступны в списке.</p><div className="mx-auto mt-12 flex max-w-md flex-wrap justify-center gap-3">{rows.map((row, index) => <Link key={row.id} href={`/tech-radar/${row.id}`} className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-white bg-bcc-violet px-2 text-center text-xs font-semibold text-white shadow-soft transition hover:scale-105" style={{ transform: `translate(${(index % 3 - 1) * 14}px, ${Math.floor(index / 3) * 6}px)` }}>{String(row.name).split(" ").slice(0, 2).join(" ")}<span className="mt-1 text-[10px] font-normal text-white/75">{ru(row.ring)}</span></Link>)}</div></div></div><div className="space-y-3">{rings.map((ring) => <div key={ring} className="surface p-4"><div className="flex items-center justify-between"><span className="font-semibold">{ru(ring)}</span><span className="chip">{grouped.get(ring)?.length ?? 0}</span></div><div className="mt-3 space-y-2">{grouped.get(ring)?.slice(0, 4).map((row) => <Link key={row.id} href={`/tech-radar/${row.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-bcc-deep"><span className="truncate">{String(row.name)}</span><StatusChip value={row.change_state} /></Link>)}</div></div>)}</div></div>; }

function RadarChangelog({ rows }: { rows: AnyRecord[] }) { const changed = rows.filter((row) => ["New", "Recently Changed"].includes(String(row.change_state))); return <div className="surface p-5 sm:p-6"><div className="eyebrow">История изменений</div><h2 className="mt-2 text-2xl font-semibold">Что изменилось</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#74747C]">Новые технологии и изменения после последнего обзора.</p><div className="mt-6 space-y-3">{changed.length ? changed.map((row) => <Link key={row.id} href={`/tech-radar/${row.id}`} className="flex items-center gap-4 rounded-2xl border border-bcc-border p-4 transition hover:border-bcc-violet/40 hover:bg-bcc-soft"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bcc-lilac text-bcc-deep">{String(row.change_state) === "New" ? "+" : "Δ"}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{String(row.name)}</span><span className="mt-1 block text-sm text-[#74747C]">{ru(row.category ?? "Backend")} · {ru(row.ring ?? "Assess")} · обзор {formatDateRu(row.last_reviewed_at)}</span></span><StatusChip value={row.change_state} /></Link>) : <EmptyState title="Изменений нет" description="Новые и изменённые технологии появятся здесь после обзора." />}</div></div>; }

function AmbassadorSnapshot({ rows }: { rows: AnyRecord[] }) { const leaderboard = [...rows].sort((a, b) => Number(b.total_xp ?? 0) - Number(a.total_xp ?? 0)).slice(0, 5); return <section className="surface mb-6 p-5"><div className="flex items-end justify-between"><div><div className="eyebrow">Рейтинг за всё время</div><h2 className="mt-1 text-xl font-semibold">Амбассадоры</h2></div><span className="chip">{rows.filter((row) => row.status === "Active").length} активных</span></div><div className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-5">{leaderboard.map((row, index) => <Link key={row.id} href={`/ambassadors/${row.id}`} className="rounded-2xl bg-bcc-soft p-3 transition hover:bg-bcc-lilac/50"><div className="flex items-center justify-between text-xs text-[#74747C]"><span>#{index + 1}</span><StatusChip value={row.level} /></div><div className="mt-3 truncate text-sm font-semibold">{displayName(row)}</div><div className="mt-1 text-2xl font-semibold tracking-[-0.05em]">{Number(row.total_xp ?? 0)} <span className="text-xs font-normal text-[#74747C]">XP</span></div><div className="mt-2 text-xs text-[#74747C]">{ru(row.track ?? "")}</div></Link>)}</div></section>; }

function AdvancedFilters({ open, onClose, module, value, onApply }: { open: boolean; onClose: () => void; module: ModuleKey; value: string; onApply: (value: string) => void }) { const config = getModule(module)!; const options = config.fields.find((field) => field.key === "status")?.options ?? []; const [draft, setDraft] = useState(value); useEffect(() => setDraft(value), [value, open]); return <Modal open={open} onClose={onClose} title="Фильтры" description="Оставь только то, что нужно для текущей работы."><div className="space-y-4"><Field label={fieldLabel("status")}><Select value={draft} onChange={(event) => setDraft(event.target.value)}><option value="">Все статусы</option>{localizeOptions(options).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setDraft(""); onApply(""); onClose(); }}>Сбросить</Button><Button variant="brand" onClick={() => { onApply(draft); onClose(); }}>Применить</Button></div></div></Modal>; }
function Pagination({ page, hasMore, onChange }: { page: number; hasMore: boolean; onChange: (page: number) => void }) { return <div className="mt-4 flex items-center justify-between rounded-2xl border border-bcc-border bg-white px-4 py-3 text-sm"><Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Назад</Button><span className="text-[#74747C]">Страница {page}</span><Button variant="secondary" disabled={!hasMore} onClick={() => onChange(page + 1)}>Дальше</Button></div>; }
function IconTab({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) { return <button aria-label={label} title={label} onClick={onClick} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full ${active ? "bg-bcc-lilac text-bcc-deep" : "text-[#8A8A90] hover:bg-bcc-soft"}`}>{children}</button>; }
