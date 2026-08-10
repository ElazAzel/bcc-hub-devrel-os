"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, FolderKanban, Plus, Users } from "lucide-react";
import { listRecords } from "@/lib/data";
import { buildDashboardSummary } from "@/lib/dashboard";
import { formatDateRu, moduleCopy, ru } from "@/lib/i18n";
import { type AnyRecord, type ModuleKey } from "@/lib/types";
import { Button, EmptyState, ErrorState, LoadingState } from "./ui";
import { QuickAdd } from "./quick-add";
import { StatusChip } from "./status-chip";

const modules: ModuleKey[] = ["projects", "tasks", "people", "events", "commitments"];

export function Dashboard() {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickModule, setQuickModule] = useState<ModuleKey | undefined>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["dashboard-summary"], queryFn: async () => { const entries = await Promise.all(modules.map(async (module) => [module, (await listRecords(module, { pageSize: 80 })).items] as const)); const data = Object.fromEntries(entries) as Record<ModuleKey, AnyRecord[]>; return buildDashboardSummary({ projects: data.projects ?? [], tasks: data.tasks ?? [], people: data.people ?? [], events: data.events ?? [], commitments: data.commitments ?? [] }); }, staleTime: 30_000 });
  useEffect(() => { const onChange = () => void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }); window.addEventListener("bcc:data-changed", onChange); return () => window.removeEventListener("bcc:data-changed", onChange); }, [queryClient]);
  const summary = query.data;
  const greeting = useMemo(() => { const hour = new Date().getHours(); return hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер"; }, []);
  if (query.isPending) return <LoadingState label="Собираем главное для рабочего дня…" />;
  if (query.isError || !summary) return <ErrorState message="Не удалось собрать обзор рабочего пространства." onRetry={() => void query.refetch()} />;
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 rounded-3xl bg-[linear-gradient(135deg,#fff_10%,#f7efff_100%)] p-5 shadow-soft sm:p-7 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow">Рабочее пространство</div><h1 className="page-title mt-2">{greeting}. Вот главное.</h1><p className="body-muted mt-2 max-w-2xl">Три вопроса на сегодня: что требует внимания, какой следующий шаг и что скоро наступит.</p></div><Button variant="brand" onClick={() => { setQuickModule(undefined); setQuickOpen(true); }}><Plus size={17} />Быстро добавить</Button></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Проекты", value: summary.metrics.projects, Icon: FolderKanban, href: "/projects" }, { label: "Активные задачи", value: summary.metrics.tasks, Icon: CheckCircle2, href: "/tasks" }, { label: "Люди", value: summary.metrics.people, Icon: Users, href: "/people" }, { label: "События", value: summary.metrics.events, Icon: CalendarDays, href: "/events" }].map(({ label, value, Icon, href }) => <Link key={label} href={href} className="surface flex items-center justify-between p-4 transition hover:-translate-y-0.5 hover:border-bcc-violet/30"><div><div className="text-sm text-[#74747C]">{label}</div><div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{value}</div></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bcc-lilac text-bcc-deep"><Icon size={18} /></span></Link>)}</section>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
      <SummaryCard title="Что требует внимания?" icon={<CircleAlert size={17} />} tone="warning" action={summary.attention.length ? undefined : <Link href="/tasks" className="text-xs font-semibold text-bcc-deep">Открыть задачи</Link>}>{summary.attention.length ? <div className="space-y-2">{summary.attention.map((row) => <RecordRow key={row.id} row={row} href={row.title ? `/tasks/${row.id}` : "/commitments"} status={row.status ?? "Open"} date={row.due_date} />)}</div> : <EmptyState title="Всё спокойно" description="Просроченных задач и договорённостей нет." />}</SummaryCard>
      <SummaryCard title="Какой следующий шаг?" icon={<CheckCircle2 size={17} />} action={<Link href="/tasks" className="text-xs font-semibold text-bcc-deep">Все задачи</Link>}>{summary.nextSteps.length ? <div className="space-y-2">{summary.nextSteps.map((row) => <RecordRow key={row.id} row={row} href={`/tasks/${row.id}`} status={row.status} date={row.due_date} />)}</div> : <EmptyState title="Шагов пока нет" description="Добавь задачу, чтобы двигаться дальше." action={<Button variant="brand" onClick={() => { setQuickModule("tasks"); setQuickOpen(true); }}>Создать задачу</Button>} />}</SummaryCard>
      <SummaryCard title="Что скоро наступит?" icon={<CalendarDays size={17} />} action={<Link href="/calendar" className="text-xs font-semibold text-bcc-deep">Открыть календарь</Link>}>{summary.upcoming.length ? <div className="space-y-2">{summary.upcoming.map((row) => <RecordRow key={row.id} row={row} href={`/events/${row.id}`} status={row.status} date={row.date_start} />)}</div> : <EmptyState title="Ближайших событий нет" description="Запланируй событие, чтобы не держать дату в голове." />}</SummaryCard>
    </div>
    <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} initialModule={quickModule} />
  </div>;
}

function SummaryCard({ title, icon, children, action, tone = "normal" }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; tone?: "normal" | "warning" }) { return <section className={`surface p-4 sm:p-5 ${tone === "warning" ? "border-[#F3D58A]" : ""}`}><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone === "warning" ? "bg-[#FFF2C7] text-[#8A6100]" : "bg-bcc-lilac text-bcc-deep"}`}>{icon}</span><h2 className="font-semibold">{title}</h2></div>{action}</div>{children}</section>; }
function RecordRow({ row, href, status, date }: { row: AnyRecord; href: string; status?: unknown; date?: unknown }) { return <Link href={href} className="flex min-w-0 items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-bcc-border hover:bg-bcc-soft"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bcc-soft text-xs font-semibold text-bcc-deep">{String(row.title ?? row.name ?? "?").slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{String(row.title ?? row.name ?? "Без названия")}</span><span className="mt-0.5 block truncate text-xs text-[#74747C]">{String(row.description ?? row.next_action ?? row.location ?? "")}</span></span><span className="flex shrink-0 flex-col items-end gap-1"><StatusChip value={status} /><span className="text-[10px] text-[#8A8A90]">{formatDateRu(date)}</span></span><ArrowRight size={14} className="shrink-0 text-[#AAA7B2]" /></Link>; }
