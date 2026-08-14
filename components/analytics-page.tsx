"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, CheckCircle2, CircleAlert, Clock3, Users } from "lucide-react";
import { calculateProjectHealth } from "@/lib/health";
import { listRecords } from "@/lib/data";
import { formatDateRu, ru } from "@/lib/i18n";
import { type AnyRecord, type ModuleKey } from "@/lib/types";
import { PageHeader } from "./page-header";
import { StatusChip } from "./status-chip";
import { ErrorState, LoadingState } from "./ui";

const keys: ModuleKey[] = ["projects", "tasks", "commitments", "events", "content", "people", "tech-radar"];

type AnalyticsData = Record<string, AnyRecord[]>;

async function loadAnalytics(): Promise<AnalyticsData> {
  const entries = await Promise.all(keys.map(async (key) => [key, (await listRecords(key, { pageSize: 100 })).items] as const));
  const data = Object.fromEntries(entries) as AnalyticsData;
  const tasks = data.tasks ?? [];
  const commitments = data.commitments ?? [];
  return {
    ...data,
    projects: (data.projects ?? []).map((project) => {
      const health = calculateProjectHealth(project, tasks, commitments);
      return { ...project, health_score: health.score, health_state: health.state };
    }),
  };
}

export function AnalyticsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["analytics"], queryFn: loadAnalytics, staleTime: 60_000 });

  useEffect(() => {
    const onChange = () => void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    window.addEventListener("bcc:data-changed", onChange);
    return () => window.removeEventListener("bcc:data-changed", onChange);
  }, [queryClient]);

  if (query.isPending) return <LoadingState label="Считаем рабочие показатели…" />;
  if (query.isError) return <ErrorState message="Не удалось загрузить аналитику." onRetry={() => void query.refetch()} />;

  const data = query.data;
  const projects = data.projects ?? [];
  const tasks = data.tasks ?? [];
  const events = data.events ?? [];
  const content = data.content ?? [];
  const people = data.people ?? [];
  const radar = data["tech-radar"] ?? [];
  const health = projects.reduce((sum, row) => sum + Number(row.health_score ?? 0), 0) / Math.max(projects.length, 1);
  const overdue = tasks.filter((row) => row.due_date && new Date(String(row.due_date)).getTime() < Date.now() && !["Done", "Cancelled"].includes(String(row.status))).length;
  const healthStates = [
    ["Healthy", "В норме", "bg-[#3EA86B]"],
    ["Attention", "Нужно внимание", "bg-[#D49A1E]"],
    ["At Risk", "Под риском", "bg-bcc-violet"],
    ["Critical", "Критично", "bg-[#CF4F4F]"],
  ] as const;

  return <div>
    <PageHeader eyebrow="Поддержка решений" title="Аналитика" description="Короткие сигналы по портфелю, задачам, людям и техрадару." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Здоровье портфеля" value={`${Math.round(health)}`} suffix="/100" tone="lilac" />
      <Kpi label="Просроченные задачи" value={String(overdue)} tone={overdue ? "danger" : "cyan"} />
      <Kpi label="Опубликованные материалы" value={String(content.filter((row) => row.status === "Published").length)} tone="cyan" />
      <Kpi label="Технологии в техрадаре" value={String(radar.length)} tone="soft" />
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Panel title="Здоровье портфеля" icon={<BarChart3 size={18} />}>
        <div className="space-y-4">{healthStates.map(([state, label, color]) => {
          const count = projects.filter((row) => row.health_state === state).length;
          return <div key={state}><div className="flex items-center justify-between text-sm"><span>{label}</span><span className="font-semibold">{count}</span></div><div className="mt-2 h-2 rounded-full bg-bcc-soft"><div className={`h-full rounded-full ${color}`} style={{ width: `${projects.length ? (count / projects.length) * 100 : 0}%` }} /></div></div>;
        })}</div>
      </Panel>
      <Panel title="Задачи по статусу" icon={<CheckCircle2 size={18} />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{["Inbox", "In Progress", "Waiting", "Done"].map((status) => <div key={status} className="rounded-2xl bg-bcc-soft p-4"><div className="text-2xl font-semibold">{tasks.filter((row) => row.status === status).length}</div><div className="mt-1 text-xs text-[#74747C]">{ru(status)}</div></div>)}</div>
        <div className="mt-5 rounded-2xl bg-bcc-lilac/60 p-4 text-sm leading-6 text-[#5F4A73]"><CircleAlert className="mr-2 inline text-bcc-deep" size={16} />Источники и время выполнения можно открыть в карточке каждой задачи.</div>
      </Panel>
      <Panel title="Люди и контакты" icon={<Users size={18} />}>
        <div className="space-y-3">{people.slice(0, 5).map((person) => <div key={person.id} className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bcc-cyan text-[#177479]">{String(person.first_name ?? person.name ?? "Л").slice(0, 1)}</span><div className="min-w-0"><div className="truncate text-sm font-medium">{String(person.name ?? `${person.first_name ?? ""} ${person.last_name ?? ""}`)}</div><div className="text-xs text-[#74747C]">{person.last_interaction_at ? `Последний контакт: ${formatDateRu(person.last_interaction_at)}` : "Последнего контакта нет"}</div></div></div><StatusChip value={person.relationship_state ?? "Active"} /></div>)}</div>
      </Panel>
      <Panel title="События и содержание" icon={<Activity size={18} />}>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-bcc-border p-4"><div className="text-xs text-[#74747C]">События</div><div className="mt-2 text-3xl font-semibold">{events.length}</div><div className="mt-1 text-xs text-[#74747C]">{events.filter((row) => row.status !== "Done").length} активных</div></div><div className="rounded-2xl border border-bcc-border p-4"><div className="text-xs text-[#74747C]">Материалы</div><div className="mt-2 text-3xl font-semibold">{content.length}</div><div className="mt-1 text-xs text-[#74747C]">{content.filter((row) => row.status === "Review").length} на проверке</div></div></div>
        <div className="mt-4 flex items-center gap-2 text-xs text-[#74747C]"><Clock3 size={14} />Показатели считаются из актуальных записей рабочего пространства.</div>
      </Panel>
    </div>
  </div>;
}

function Kpi({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: "lilac" | "cyan" | "soft" | "danger" }) {
  return <div className="surface p-4 sm:p-5"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone === "lilac" ? "bg-bcc-lilac text-bcc-deep" : tone === "cyan" ? "bg-bcc-cyan text-[#177479]" : tone === "danger" ? "bg-[#FDECEC] text-[#AF3030]" : "bg-bcc-soft"}`}><BarChart3 size={17} /></div><div className="mt-4 text-3xl font-semibold tracking-[-0.05em]">{value}<span className="text-base font-normal text-[#8A8A90]">{suffix}</span></div><div className="mt-1 text-xs text-[#74747C]">{label}</div></div>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="surface p-5"><div className="flex items-center gap-2"><span className="text-bcc-violet">{icon}</span><h2 className="text-lg font-semibold">{title}</h2></div><div className="mt-5">{children}</div></section>;
}
