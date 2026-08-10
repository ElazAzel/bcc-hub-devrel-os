"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, Clock3, FileText, FolderKanban, Gauge, ListChecks, MessageCircle, MoreHorizontal, Plus, Radar, Sparkles, Users } from "lucide-react";
import { loadRecords } from "@/lib/data";
import { displayName, type AnyRecord, type ModuleKey } from "@/lib/types";
import { StatusChip } from "./status-chip";
import { Button, EmptyState, LoadingState } from "./ui";
import { QuickAdd } from "./quick-add";

function daysUntil(date?: unknown) {
  if (!date) return 999;
  return Math.ceil((new Date(String(date)).getTime() - Date.now()) / 86400000);
}

function isOverdue(row: AnyRecord) {
  return Boolean(row.due_date && daysUntil(row.due_date) < 0 && !["Done", "Cancelled", "Archived"].includes(String(row.status)));
}

function dateLabel(value: unknown) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(String(value)));
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [data, setData] = useState<Record<string, AnyRecord[]>>({
    projects: [], tasks: [], people: [], events: [], commitments: [], interactions: [], ambassadors: [], content: [], "tech-radar": []
  });

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const keys = Object.keys(data) as ModuleKey[];
      const rows = await Promise.all(keys.map(async (key) => [key, await loadRecords(key)] as const));
      setData(Object.fromEntries(rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("bcc:data-changed", onChange);
    return () => window.removeEventListener("bcc:data-changed", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tasks = data.tasks ?? [];
  const projects = data.projects ?? [];
  const commitments = data.commitments ?? [];
  const interactions = data.interactions ?? [];
  const events = data.events ?? [];
  const content = data.content ?? [];
  const radar = data["tech-radar"] ?? [];
  const ambassadors = data.ambassadors ?? [];
  const activeProjects = projects.filter((row) => ["Active", "Planning"].includes(String(row.status)));
  const dueThisWeek = tasks.filter((row) => daysUntil(row.due_date) <= 7 && daysUntil(row.due_date) >= 0 && row.status !== "Done");
  const waitingResponses = tasks.filter((row) => row.status === "Waiting").length + commitments.filter((row) => row.owed_by === "contact" && row.status === "Open").length;
  const attention = useMemo(() => [
    ...tasks.filter(isOverdue).map((row) => ({ row, module: "tasks" as ModuleKey, tone: "critical" as const })),
    ...tasks.filter((row) => ["Blocked", "Waiting"].includes(String(row.status))).map((row) => ({ row, module: "tasks" as ModuleKey, tone: String(row.status) === "Blocked" ? "critical" as const : "warning" as const })),
    ...commitments.filter((row) => row.status === "Open" && daysUntil(row.due_date) < 0).map((row) => ({ row, module: "commitments" as ModuleKey, tone: "warning" as const }))
  ], [tasks, commitments]);

  if (loading) return <LoadingState />;
  if (error) return <div className="surface-muted p-6 text-sm text-[#AF3030]">{error}<Button variant="secondary" className="ml-3" onClick={refresh}>Try again</Button></div>;

  return <div className="page-enter min-w-0 max-w-full space-y-7 lg:w-auto" style={{ width: "calc(100vw - 32px)" }}>
    <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="eyebrow">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</div><h1 className="page-title mt-2">Overview</h1><p className="body-muted mt-2">Your DevRel operations at a glance.</p></div>
      <button onClick={() => setQuickOpen(true)} className="button-brand self-start px-4 sm:self-auto"><Plus size={16} />Quick Add <span className="hidden text-white/60 sm:inline">⌄</span></button>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Metric icon={<FolderKanban size={18} />} label="Active projects" value={activeProjects.length} delta="+12%" tone="violet" href="/projects" note="vs last 30 days" />
      <Metric icon={<CalendarDays size={18} />} label="Due this week" value={dueThisWeek.length} delta="+8%" tone="orange" href="/tasks" note="vs last week" />
      <Metric icon={<MessageCircle size={18} />} label="Waiting responses" value={waitingResponses} delta={waitingResponses ? "Needs follow-up" : "All clear"} tone="blue" href="/commitments" note="open commitments" compactDelta />
      <Metric icon={<Users size={18} />} label="Ambassadors" value={ambassadors.filter((row) => row.status === "Active").length} delta="+24%" tone="green" href="/ambassadors" note="active programme" />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.16fr_1fr_1fr]">
      <DashboardPanel className="stagger-1" title="Needs attention" count={attention.length} action="View tasks" href="/tasks">
        {attention.length ? <div>{attention.slice(0, 4).map(({ row, module, tone }) => <Link key={`${module}-${row.id}`} href={`/${module}/${row.id}`} className="dashboard-row flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#fbf9ff]"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone === "critical" ? "bg-[#fff0f0] text-[#d34a58]" : "bg-[#fff7e7] text-[#c27c19]"}`}><CircleAlert size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-bcc-ink">{displayName(row)}</span><span className="mt-0.5 block truncate text-[11px] text-[#8a8895]">{isOverdue(row) ? "Overdue" : row.next_action ? String(row.next_action) : "Needs a next step"}</span></span><StatusChip value={isOverdue(row) ? "Overdue" : row.status} /></Link>)}</div> : <MiniEmpty icon={<CheckCircle2 size={18} />} title="Nothing critical" description="Your workspace is clear for now." />}
      </DashboardPanel>

      <DashboardPanel className="stagger-2" title="Projects portfolio" action="View all" href="/projects">
        {projects.length ? <div>{projects.slice(0, 4).map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="dashboard-row flex items-center gap-2.5 px-4 py-3.5 transition hover:bg-[#fbf9ff]"><span className={`h-2 w-2 shrink-0 rounded-full ${Number(project.health_score ?? 0) < 75 ? "bg-[#f59a28]" : "bg-[#20ad69]"}`} /><span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{displayName(project)}</span><StatusChip value={Number(project.health_score ?? 0) < 75 ? "At risk" : "On track"} tone={Number(project.health_score ?? 0) >= 75 ? "brand" : undefined} /></Link>)}</div> : <MiniEmpty icon={<FolderKanban size={18} />} title="No projects yet" description="Create a project to build your portfolio." />}
      </DashboardPanel>

      <DashboardPanel className="stagger-3" title="Upcoming events" action="View calendar" href="/events">
        {events.length ? <div>{events.slice(0, 3).map((event) => <Link key={event.id} href={`/events/${event.id}`} className="dashboard-row flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#fbf9ff]"><span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f1e8ff] text-[9px] font-bold uppercase leading-3 text-bcc-deep"><span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(String(event.date_start ?? Date.now())))}</span><span className="text-[13px]">{event.date_start ? new Date(String(event.date_start)).getDate() : "—"}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold">{displayName(event)}</span><span className="mt-0.5 block truncate text-[11px] text-[#8a8895]">{String(event.location ?? "Location to be confirmed")}</span></span><span className="text-[11px] font-medium text-[#8a8895]">{dateLabel(event.date_start)}</span></Link>)}</div> : <MiniEmpty icon={<CalendarDays size={18} />} title="No events scheduled" description="Plan the next community moment." action={<Button variant="brand" className="min-h-8 px-3 text-xs" onClick={() => setQuickOpen(true)}>Create event</Button>} />}
      </DashboardPanel>
    </section>

    <section className="grid gap-4 xl:grid-cols-3">
      <DashboardPanel className="stagger-2" title="Recent interactions" action="View all" href="/interactions">
        {interactions.length ? <div>{interactions.slice(0, 4).map((item) => <Link key={item.id} href={`/interactions/${item.id}`} className="dashboard-row flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#fbf9ff]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eafcff] text-[#177479]"><Users size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold">{displayName(item)}</span><span className="mt-0.5 block truncate text-[11px] text-[#8a8895]">{String(item.topic ?? item.type ?? "Interaction")}</span></span><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bcc-violet" /></Link>)}</div> : <MiniEmpty icon={<Users size={18} />} title="No interactions yet" description="Log conversations to keep context connected." />}
      </DashboardPanel>

      <DashboardPanel className="stagger-3" title="Ambassador leaderboard" action="View all" href="/ambassadors">
        {ambassadors.length ? <div>{ambassadors.slice(0, 4).map((person, index) => <Link key={person.id} href={`/ambassadors/${person.id}`} className="dashboard-row flex items-center gap-3 px-4 py-3"><span className="w-4 text-center text-[11px] font-semibold text-[#8a8895]">{index + 1}</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e9dcff] text-[10px] font-semibold text-bcc-deep">{String(person.name ?? "A").slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{displayName(person)}</span><span className="text-[11px] font-semibold text-[#6c6878]">{Number(person.total_xp ?? 0).toLocaleString()} XP</span></Link>)}</div> : <MiniEmpty icon={<Users size={18} />} title="No ambassadors yet" description="Start the programme when you're ready." />}
      </DashboardPanel>

      <DashboardPanel className="stagger-4" title="Content pipeline" action="View all" href="/content">
        {content.length ? <div>{content.slice(0, 4).map((item) => <Link key={item.id} href={`/content/${item.id}`} className="dashboard-row flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#fbf9ff]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fff3df] text-[#c27c19]"><FileText size={15} /></span><span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{displayName(item)}</span><StatusChip value={item.status} /></Link>)}</div> : <MiniEmpty icon={<FileText size={18} />} title="Pipeline is empty" description="Capture an idea and move it toward publish." />}
      </DashboardPanel>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
      <DashboardPanel className="stagger-2" title="Tech radar" action="Full radar" href="/tech-radar">
        {radar.length ? <div className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 sm:p-5"><div className="relative mx-auto flex h-36 w-36 items-end justify-center overflow-hidden rounded-t-[80px] bg-[#f0e4ff]"><span className="absolute bottom-0 h-[82%] w-[82%] rounded-t-[80px] bg-[#d7baff]" /><span className="absolute bottom-0 h-[60%] w-[60%] rounded-t-[80px] bg-[#aa78f2]" /><span className="absolute bottom-0 h-[37%] w-[37%] rounded-t-[80px] bg-bcc-violet" /></div><div className="space-y-3">{["Adopt", "Trial", "Assess", "Hold"].map((ring) => <Link href={`/tech-radar?ring=${ring}`} key={ring} className="flex items-center gap-2 text-xs text-[#686474] transition hover:text-bcc-deep"><span className={`h-2 w-2 rounded-full ${ring === "Adopt" ? "bg-bcc-deep" : ring === "Trial" ? "bg-[#3e8ee8]" : ring === "Assess" ? "bg-[#68c7e8]" : "bg-[#d2c8e4]"}`} />{ring}<span className="ml-auto pl-3 font-semibold text-bcc-ink">{radar.filter((row) => row.ring === ring).length}</span></Link>)}</div></div> : <MiniEmpty icon={<Radar size={18} />} title="Radar is waiting" description="Add a technology to start the map." />}
      </DashboardPanel>

      <DashboardPanel className="stagger-3" title="Activity feed" action="View all" href="/analytics">
        <div className="p-4 sm:p-5">{tasks.slice(0, 4).map((item, index) => <Link key={item.id} href={`/tasks/${item.id}`} className="flex items-start gap-3 pb-4 last:pb-0"><span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${index % 2 ? "bg-[#e8fbfc] text-[#177479]" : "bg-[#f1e7ff] text-bcc-deep"}`}><ListChecks size={14} /></span><span className="min-w-0"><span className="block text-[12px] font-semibold">{index === 0 ? "Task updated" : "Next step in motion"}</span><span className="mt-0.5 block truncate text-[11px] text-[#8a8895]">{displayName(item)}</span></span></Link>)}{!tasks.length && <MiniEmpty icon={<ListChecks size={18} />} title="No activity yet" description="Your activity feed will appear here." />}</div>
      </DashboardPanel>

      <DashboardPanel className="stagger-4" title="Quick actions">
        <div className="space-y-2 p-4 sm:p-5">{[["Create new project", FolderKanban, "projects"], ["Log interaction", MessageCircle, "interactions"], ["Schedule event", CalendarDays, "events"], ["Add content", FileText, "content"]].map(([label, Icon, module]) => <button key={String(label)} onClick={() => setQuickOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-[#ece9f2] px-3 py-2.5 text-left text-xs font-semibold text-bcc-ink transition hover:border-bcc-lilac hover:bg-[#fbf9ff]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f4effc] text-bcc-deep"><Icon size={14} /></span>{String(label)}<ArrowRight size={14} className="ml-auto text-[#aaa7b2]" /></button>)}</div>
      </DashboardPanel>
    </section>
    <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
  </div>;
}

function Metric({ icon, label, value, delta, tone, href, note, compactDelta = false }: { icon: React.ReactNode; label: string; value: number; delta: string; tone: "violet" | "orange" | "blue" | "green"; href: string; note: string; compactDelta?: boolean }) {
  const iconClass = { violet: "bg-[#f0e4ff] text-bcc-deep", orange: "bg-[#fff1dd] text-[#c27c19]", blue: "bg-[#eaf2ff] text-[#3b72d8]", green: "bg-[#e7f8ef] text-[#22925c]" }[tone];
  const deltaClass = { violet: "bg-[#eee2ff] text-bcc-deep", orange: "bg-[#fff1dd] text-[#c27c19]", blue: "bg-[#eaf2ff] text-[#3b72d8]", green: "bg-[#e7f8ef] text-[#22925c]" }[tone];
  return <Link href={href} className="dashboard-panel hover-lift group min-w-0 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span><MoreHorizontal size={17} className="text-[#c4bfcc] transition group-hover:text-[#8c8798]" /></div><div className="mt-4 flex items-end gap-2"><span className="text-[30px] font-semibold leading-none tracking-[-0.06em] text-bcc-ink">{value}</span><span className={`mb-0.5 hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${deltaClass} ${compactDelta ? "max-w-[105px] truncate" : ""}`}>{delta}</span></div><div className="mt-2 truncate text-[12px] font-semibold text-bcc-ink">{label}</div><div className="mt-1 truncate text-[10px] text-[#96929f]">{note}</div></Link>;
}

function DashboardPanel({ title, count, action, href, children, className = "" }: { title: string; count?: number; action?: string; href?: string; children: React.ReactNode; className?: string }) {
  return <section className={`dashboard-panel min-w-0 overflow-hidden ${className}`}><div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5"><div className="flex min-w-0 items-center gap-2"><h2 className="truncate text-[13px] font-semibold text-bcc-ink">{title}</h2>{typeof count === "number" && <span className="rounded-full bg-[#fff0f2] px-1.5 py-0.5 text-[10px] font-semibold text-[#d34a58]">{count}</span>}</div>{href && <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-bcc-violet transition hover:text-bcc-deep">{action}<ArrowUpRight size={13} /></Link>}</div>{children}</section>;
}

function MiniEmpty({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-[152px] flex-col items-center justify-center px-5 py-6 text-center"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3ebff] text-bcc-deep">{icon}</span><div className="mt-3 text-[12px] font-semibold text-bcc-ink">{title}</div><p className="mt-1 max-w-[220px] text-[11px] leading-5 text-[#96929f]">{description}</p>{action && <div className="mt-3">{action}</div>}</div>;
}
