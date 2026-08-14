import type { AnyRecord } from "./types";

const DAY_MS = 86_400_000;

export type GanttRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  parentTaskId: string | null;
  parentTitle: string | null;
  start: string;
  end: string;
  dueDate: string | null;
  duration: number;
};

export type GanttRange = { start: string; end: string; days: string[] };

function dateKey(value: unknown, fallback: string): string {
  const text = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / DAY_MS) + 1);
}

function buildDays(start: string, end: string): string[] {
  const result: string[] = [];
  for (let current = start; current <= end; current = shiftDate(current, 1)) result.push(current);
  return result;
}

export function buildGanttRows(records: AnyRecord[], today = new Date()): GanttRow[] {
  const fallback = today.toISOString().slice(0, 10);
  const rows = records.map((record) => {
    const start = dateKey(record.start_date ?? record.due_date ?? record.created_at, fallback);
    const end = dateKey(record.end_date ?? record.due_date ?? record.start_date ?? record.created_at, start);
    const ordered = start <= end ? { start, end } : { start: end, end: start };
    return {
      id: record.id,
      title: String(record.title ?? record.name ?? "Без названия"),
      status: String(record.status ?? "Inbox"),
      priority: String(record.priority ?? "Normal"),
      parentTaskId: record.parent_task_id ? String(record.parent_task_id) : null,
      parentTitle: record.parent_title ? String(record.parent_title) : null,
      start: ordered.start,
      end: ordered.end,
      dueDate: record.due_date ? String(record.due_date).slice(0, 10) : null,
      duration: daysBetween(ordered.start, ordered.end)
    };
  });
  const children = new Map<string, GanttRow[]>();
  rows.forEach((row) => { if (row.parentTaskId) children.set(row.parentTaskId, [...(children.get(row.parentTaskId) ?? []), row]); });
  const sortRows = (left: GanttRow, right: GanttRow) => left.start.localeCompare(right.start) || left.title.localeCompare(right.title, "ru");
  const ordered: GanttRow[] = [];
  const visited = new Set<string>();
  const append = (row: GanttRow) => { if (visited.has(row.id)) return; visited.add(row.id); ordered.push(row); (children.get(row.id) ?? []).sort(sortRows).forEach(append); };
  rows.filter((row) => !row.parentTaskId || !rows.some((candidate) => candidate.id === row.parentTaskId)).sort(sortRows).forEach(append);
  rows.sort(sortRows).forEach(append);
  return ordered;
}

export function buildGanttRange(rows: GanttRow[], today = new Date()): GanttRange {
  const fallback = today.toISOString().slice(0, 10);
  if (!rows.length) return { start: fallback, end: shiftDate(fallback, 6), days: buildDays(fallback, shiftDate(fallback, 6)) };
  const first = rows.reduce((value, row) => row.start < value ? row.start : value, rows[0].start);
  const last = rows.reduce((value, row) => row.end > value ? row.end : value, rows[0].end);
  const start = shiftDate(first, -1);
  const end = shiftDate(last, 1);
  return { start, end, days: buildDays(start, end) };
}

export function dayOffset(rangeStart: string, value: string): number {
  return Math.round((new Date(`${value}T00:00:00Z`).getTime() - new Date(`${rangeStart}T00:00:00Z`).getTime()) / DAY_MS);
}
