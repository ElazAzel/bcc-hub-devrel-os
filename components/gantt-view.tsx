"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { buildGanttRange, buildGanttRows, dayOffset } from "@/lib/gantt";
import { formatDateRu, ru } from "@/lib/i18n";
import { taskUrgency } from "@/lib/task-urgency";
import type { AnyRecord } from "@/lib/types";
import { EmptyState } from "./ui";

const DAY_WIDTH = 44;

export function GanttView({ rows }: { rows: AnyRecord[] }) {
  const ganttRows = buildGanttRows(rows);
  if (!ganttRows.length) {
    return <EmptyState title="Для Ганта пока нет задач" description="Добавь задачи, чтобы увидеть их сроки и иерархию на одной шкале." />;
  }

  const range = buildGanttRange(ganttRows);
  const today = new Date().toISOString().slice(0, 10);
  const todayOffset = dayOffset(range.start, today);
  const timelineWidth = range.days.length * DAY_WIDTH;
  const gridTemplateColumns = `minmax(220px, 1fr) ${timelineWidth}px`;

  return <section className="surface overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bcc-border p-5 sm:p-6">
      <div>
        <div className="eyebrow">Планирование задач</div>
        <h2 className="mt-1 text-xl font-semibold">Диаграмма Ганта</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#74747C]">Сроки показаны вместе с иерархией задач. Если дата старта не указана, шкала использует дедлайн, а для задач без дат — дату создания.</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#74747C]" aria-label="Легенда диаграммы">
        <span className="h-2.5 w-2.5 rounded-full bg-bcc-deep" /> Основная задача
        <span className="ml-2 h-2.5 w-2.5 rounded-full bg-bcc-violet" /> Субзадача
      </div>
    </div>
    <div className="overflow-x-auto">
      <div className="min-w-[760px]" style={{ width: `max(100%, ${220 + timelineWidth}px)` }}>
        <div className="grid border-b border-bcc-border bg-bcc-soft/60 text-xs font-semibold text-[#74747C]" style={{ gridTemplateColumns }}>
          <div className="sticky left-0 z-20 bg-bcc-soft/95 px-4 py-3">Задача</div>
          <div className="flex" style={{ width: timelineWidth }}>
            {range.days.map((day) => <div key={day} className={`w-11 shrink-0 border-l border-bcc-border px-1 py-3 text-center ${day === today ? "text-bcc-deep" : ""}`}><span className="block">{new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(new Date(`${day}T00:00:00Z`))}</span><span className="mt-0.5 block text-[10px] font-normal uppercase">{new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(new Date(`${day}T00:00:00Z`))}</span></div>)}
          </div>
        </div>
        {ganttRows.map((row) => {
          const left = dayOffset(range.start, row.start) * DAY_WIDTH + 4;
          const width = Math.max(DAY_WIDTH - 8, row.duration * DAY_WIDTH - 8);
          const isDone = row.status === "Done";
          const urgency = taskUrgency({ due_date: row.dueDate, status: row.status });
          const urgent = urgency === "overdue" || urgency === "today";
          const barClass = urgent ? "bg-[#AF3030]" : urgency === "soon" ? "bg-[#D08A00]" : row.parentTaskId ? "bg-bcc-violet" : isDone ? "bg-[#177479]" : "bg-bcc-deep";
          return <div key={row.id} className="grid min-h-16 border-b border-bcc-border last:border-b-0" style={{ gridTemplateColumns }}>
            <Link href={`/tasks/${row.id}`} className={`sticky left-0 z-10 flex min-w-0 items-center gap-2 border-r border-bcc-border bg-white px-4 py-2 transition hover:bg-bcc-soft ${row.parentTaskId ? "pl-8" : ""}`}>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${urgent ? "bg-[#AF3030]" : urgency === "soon" ? "bg-[#D08A00]" : row.parentTaskId ? "bg-bcc-violet" : "bg-bcc-deep"}`} aria-hidden="true" />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{row.parentTaskId ? "↳ " : ""}{row.title}</span><span className={`mt-0.5 block truncate text-xs ${urgent ? "text-[#AF3030]" : urgency === "soon" ? "text-[#A56600]" : "text-[#8A8A90]"}`}>{row.parentTitle ? `Субзадача: ${row.parentTitle}` : `${ru(row.status)} · ${formatDateRu(row.end)}`}</span></span>
            </Link>
            <div className="relative min-h-16" style={{ width: timelineWidth }}>
              <div className="absolute inset-0 flex">{range.days.map((day) => <div key={day} className={`w-11 shrink-0 border-l border-bcc-border ${day === today ? "bg-bcc-lilac/30" : ""}`} />)}</div>
              {todayOffset >= 0 && todayOffset < range.days.length && <div className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-bcc-violet/60" style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }} aria-hidden="true" />}
              <Link href={`/tasks/${row.id}`} className={`absolute top-4 z-[2] flex h-8 items-center overflow-hidden rounded-lg px-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 ${barClass}`} style={{ left, width }} title={`${row.title}: ${formatDateRu(row.start)} — ${formatDateRu(row.end)}`}><span className="truncate">{row.title}</span></Link>
            </div>
          </div>;
        })}
      </div>
    </div>
    <div className="flex items-center gap-2 border-t border-bcc-border px-5 py-3 text-xs text-[#8A8A90]"><CalendarRange size={14} /> Период: {formatDateRu(range.start)} — {formatDateRu(range.end)} · горизонтальная прокрутка доступна на мобильном</div>
  </section>;
}
