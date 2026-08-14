import type { AnyRecord } from "./types";

const DAY_MS = 86_400_000;
const COMPLETED_STATUS = "Done";

export type TaskScheduleState = "early" | "on-time" | "late" | "open" | "unmeasured";

export type TaskTiming = {
  durationDays: number | null;
  plannedDays: number | null;
  varianceDays: number | null;
  state: TaskScheduleState;
  completedDate: string | null;
  requiresReason: boolean;
};

export type TaskTimingSummary = {
  total: number;
  measured: number;
  averageDurationDays: number | null;
  early: number;
  onTime: number;
  late: number;
  open: number;
};

function dateKey(value: unknown): string | null {
  const text = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function dayNumber(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

export function calendarDaysBetween(start: unknown, end: unknown): number | null {
  const startDate = dateKey(start);
  const endDate = dateKey(end);
  if (!startDate || !endDate) return null;
  const difference = Math.round((dayNumber(endDate) - dayNumber(startDate)) / DAY_MS);
  return difference >= 0 ? difference + 1 : null;
}

export function calculateTaskTiming(task: Pick<AnyRecord, "start_date" | "end_date" | "due_date" | "completed_at" | "status" | "schedule_variance_reason">, now = new Date()): TaskTiming {
  const start = dateKey(task.start_date);
  const completed = String(task.status ?? "") === COMPLETED_STATUS;
  const completedDate = completed ? dateKey(task.completed_at) ?? dateKey(now) : null;
  const plannedEnd = dateKey(task.end_date) ?? dateKey(task.due_date);
  const deadline = dateKey(task.due_date) ?? plannedEnd;
  const durationDays = start ? calendarDaysBetween(start, completedDate ?? now) : null;
  const plannedDays = start && plannedEnd ? calendarDaysBetween(start, plannedEnd) : null;
  const varianceDays = completedDate && deadline ? Math.round((dayNumber(completedDate) - dayNumber(deadline)) / DAY_MS) : null;
  const state: TaskScheduleState = !start ? "unmeasured" : !completed ? "open" : varianceDays === null ? "on-time" : varianceDays < 0 ? "early" : varianceDays > 0 ? "late" : "on-time";
  return {
    durationDays,
    plannedDays,
    varianceDays,
    state,
    completedDate,
    requiresReason: completed && varianceDays !== null && varianceDays !== 0 && !String(task.schedule_variance_reason ?? "").trim()
  };
}

export function summarizeTaskTiming(tasks: AnyRecord[], now = new Date()): TaskTimingSummary {
  const timings = tasks.map((task) => calculateTaskTiming(task, now));
  const measured = timings.filter((timing, index) => String(tasks[index].status ?? "") === COMPLETED_STATUS && timing.durationDays !== null);
  const durations = measured.flatMap((timing) => timing.durationDays === null ? [] : [timing.durationDays]);
  return {
    total: tasks.length,
    measured: measured.length,
    averageDurationDays: durations.length ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : null,
    early: timings.filter((timing) => timing.state === "early").length,
    onTime: timings.filter((timing) => timing.state === "on-time").length,
    late: timings.filter((timing) => timing.state === "late").length,
    open: timings.filter((timing) => timing.state === "open").length
  };
}
