"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, Clock3, FileText, List, MessageCircle, Users } from "lucide-react";
import { loadAllRecords } from "@/lib/data";
import { displayName, type AnyRecord, type ModuleKey } from "@/lib/types";
import { formatDateRu } from "@/lib/i18n";
import { PageHeader } from "./page-header";
import { StatusChip } from "./status-chip";
import { Button, EmptyState, ErrorState, IconButton, LoadingState } from "./ui";

type CalendarView = "list" | "calendar";
type CalendarItem = AnyRecord & { kind: string; module: ModuleKey; date: string };
type CalendarDay = { key: string; day: number; inMonth: boolean };

const calendarSources: Array<[ModuleKey, string, string]> = [
  ["tasks", "Задача", "due_date"],
  ["events", "Событие", "date_start"],
  ["people", "Контакт", "next_follow_up_at"],
  ["content", "Материал", "planned_date"],
  ["commitments", "Договорённость", "due_date"]
];
const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseMonth(value: string | null) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(year, month - 1, 1);
  return date.getFullYear() === year && date.getMonth() === month - 1 ? date : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatMonthRu(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(parseMonth(value));
}

function shiftMonth(value: string, amount: number) {
  const date = parseMonth(value);
  date.setMonth(date.getMonth() + amount);
  return formatMonthKey(date);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildMonthDays(value: string): CalendarDay[] {
  const month = parseMonth(value);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const totalDays = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(month.getFullYear(), month.getMonth(), index - mondayOffset + 1);
    return { key: dateKey(day), day: day.getDate(), inMonth: day.getMonth() === month.getMonth() };
  });
}

function itemTitle(item: CalendarItem) {
  return displayName(item) || "Без названия";
}

function itemClass(module: ModuleKey) {
  if (module === "events") return "bg-bcc-cyan/70 text-[#23666A] hover:bg-bcc-cyan";
  if (module === "tasks") return "bg-bcc-lilac text-bcc-deep hover:bg-[#d7b9ff]";
  if (module === "people") return "bg-[#EAF5EC] text-[#28683C] hover:bg-[#D8EEDC]";
  return "bg-bcc-soft text-[#5F5F68] hover:bg-bcc-lilac";
}

export function CalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: CalendarView = searchParams.get("view") === "calendar" ? "calendar" : "list";
  const selectedMonth = formatMonthKey(parseMonth(searchParams.get("month")));
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      const rows = await Promise.all(calendarSources.map(async ([module, kind, field]) => ({ module, kind, field, rows: await loadAllRecords(module) })));
      return rows.flatMap(({ module, kind, field, rows }) => rows.map((row) => ({ ...row, kind, module, date: String(row[field] ?? "").slice(0, 10) } as CalendarItem))).filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date));
    },
    staleTime: 60_000
  });

  useEffect(() => {
    const onChange = () => void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    window.addEventListener("bcc:data-changed", onChange);
    return () => window.removeEventListener("bcc:data-changed", onChange);
  }, [queryClient]);

  function updateUrl(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    });
    const serialized = next.toString();
    router.replace(serialized ? `${pathname}?${serialized}` : pathname, { scroll: false });
  }

  function changeView(nextView: CalendarView) {
    updateUrl({ view: nextView });
  }

  function changeMonth(nextMonth: string) {
    updateUrl({ view: "calendar", month: nextMonth });
  }

  if (query.isPending) return <LoadingState label="Собираем даты…" />;
  if (query.isError) return <ErrorState message="Не удалось загрузить календарь." onRetry={() => void query.refetch()} />;

  const items = query.data;
  const grouped = items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    const key = item.date.slice(0, 7);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});

  return <div>
    <PageHeader eyebrow="Все рабочие даты" title="Календарь" description="Задачи, события, follow-up, договорённости и даты публикаций — в списке или на календарной сетке." />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex w-fit rounded-full border border-bcc-border bg-white p-1" role="tablist" aria-label="Вид календаря">
        <button type="button" role="tab" aria-selected={view === "list"} aria-label="Список" onClick={() => changeView("list")} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${view === "list" ? "bg-bcc-ink text-white" : "text-[#74747C] hover:bg-bcc-soft hover:text-bcc-ink"}`}><List size={16} />Список</button>
        <button type="button" role="tab" aria-selected={view === "calendar"} aria-label="Календарь" onClick={() => changeView("calendar")} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${view === "calendar" ? "bg-bcc-ink text-white" : "text-[#74747C] hover:bg-bcc-soft hover:text-bcc-ink"}`}><CalendarDays size={16} />Календарь</button>
      </div>
      {view === "calendar" && <div className="flex items-center gap-2" aria-label="Навигация по месяцам">
        <IconButton label="Предыдущий месяц" onClick={() => changeMonth(shiftMonth(selectedMonth, -1))}><ChevronLeft size={18} /></IconButton>
        <h2 className="min-w-36 text-center text-base font-semibold capitalize" aria-live="polite">{formatMonthRu(selectedMonth)}</h2>
        <IconButton label="Следующий месяц" onClick={() => changeMonth(shiftMonth(selectedMonth, 1))}><ChevronRight size={18} /></IconButton>
        <Button variant="secondary" className="ml-1" onClick={() => changeMonth(monthKey())}>Сегодня</Button>
      </div>}
    </div>
    <div className="mb-5 flex flex-wrap gap-2"><span className="chip"><CheckSquare size={13} />Задачи</span><span className="chip"><CalendarDays size={13} />События</span><span className="chip"><Users size={13} />Люди</span><span className="chip"><FileText size={13} />Материалы</span><span className="chip"><MessageCircle size={13} />Договорённости</span></div>
    {view === "calendar" ? <CalendarGrid items={items} month={selectedMonth} /> : <CalendarList items={items} grouped={grouped} />}
  </div>;
}

function CalendarList({ items, grouped }: { items: CalendarItem[]; grouped: Record<string, CalendarItem[]> }) {
  if (!items.length) return <EmptyState title="Календарь пуст" description="Добавь срок, событие или follow-up — они появятся здесь." />;
  return <div className="space-y-6">{Object.entries(grouped).map(([month, monthItems]) => <section key={month}><div className="mb-3 text-sm font-semibold capitalize text-[#74747C]">{formatMonthRu(month)}</div><div className="surface divide-y divide-bcc-border overflow-hidden">{monthItems.map((item) => <Link key={`${item.module}-${item.id}`} href={`/${item.module}/${item.id}`} className="flex min-h-16 items-center gap-4 p-4 transition hover:bg-bcc-soft/60"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bcc-lilac text-bcc-deep"><Clock3 size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{itemTitle(item)}</span><span className="mt-1 block text-xs text-[#74747C]">{item.kind} · {formatDateRu(item.date, { day: "numeric", month: "long", year: "numeric" })}</span></span><StatusChip value={item.status} /></Link>)}</div></section>)}</div>;
}

function CalendarGrid({ items, month }: { items: CalendarItem[]; month: string }) {
  const days = buildMonthDays(month);
  const itemsByDate = items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    (acc[item.date] ||= []).push(item);
    return acc;
  }, {});
  const today = dateKey(new Date());
  return <div className="surface overflow-hidden">
    <div className="grid grid-cols-7 border-b border-bcc-border bg-bcc-soft/60">{weekdays.map((day) => <div key={day} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A8A90] sm:px-3 sm:py-3 sm:text-xs">{day}</div>)}</div>
    <div className="grid grid-cols-7">
      {days.map((day) => {
        const dayItems = itemsByDate[day.key] ?? [];
        return <div key={day.key} className={`min-w-0 min-h-24 border-b border-r border-bcc-border p-1.5 last:border-r-0 sm:min-h-32 sm:p-2.5 ${day.inMonth ? "bg-white" : "bg-[#FBFAFF] text-[#B0AEB7]"}`}>
          <div className="flex items-center justify-between gap-1"><span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-semibold ${today === day.key ? "bg-bcc-violet text-white" : day.inMonth ? "text-bcc-ink" : "text-[#A9A6B0]"}`}>{day.day}</span>{dayItems.length > 0 && <span className="text-[10px] text-[#8A8A90]">{dayItems.length}</span>}</div>
          <div className="mt-1 space-y-1">{dayItems.slice(0, 3).map((item) => <Link key={`${item.module}-${item.id}`} href={`/${item.module}/${item.id}`} title={`${item.kind}: ${itemTitle(item)}`} className={`block min-h-10 min-w-0 rounded-lg px-1.5 py-1 text-[10px] leading-4 transition sm:min-h-0 sm:text-xs ${itemClass(item.module)}`}><span className="block truncate">{itemTitle(item)}</span></Link>)}{dayItems.length > 3 && <span className="block px-1 text-[10px] font-semibold text-[#74747C]">+{dayItems.length - 3} ещё</span>}</div>
        </div>;
      })}
    </div>
  </div>;
}
