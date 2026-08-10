import type { AnyRecord } from "./types";

export type DashboardSummary = {
  metrics: { projects: number; tasks: number; people: number; events: number };
  attention: AnyRecord[];
  nextSteps: AnyRecord[];
  upcoming: AnyRecord[];
};

function dateValue(row: AnyRecord) { return String(row.due_date ?? row.date_start ?? row.next_follow_up_at ?? ""); }
function isBeforeToday(value: string, today: string) { return Boolean(value) && value.slice(0, 10) < today; }

export function buildDashboardSummary(input: { projects: AnyRecord[]; tasks: AnyRecord[]; people: AnyRecord[]; events: AnyRecord[]; commitments: AnyRecord[] }, now = new Date()): DashboardSummary {
  const today = now.toISOString().slice(0, 10);
  const tasks = input.tasks.filter((row) => String(row.status) !== "Done" && String(row.status) !== "Cancelled");
  const attention = [...tasks.filter((row) => isBeforeToday(String(row.due_date ?? ""), today)), ...tasks.filter((row) => String(row.status) === "Waiting"), ...input.commitments.filter((row) => String(row.status) === "Open" && isBeforeToday(String(row.due_date ?? ""), today))].filter((row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id) === index).slice(0, 6);
  const nextSteps = [...tasks].sort((a, b) => dateValue(a).localeCompare(dateValue(b))).slice(0, 6);
  const upcoming = [...input.events].filter((row) => dateValue(row) >= today).sort((a, b) => dateValue(a).localeCompare(dateValue(b))).slice(0, 5);
  return { metrics: { projects: input.projects.length, tasks: tasks.length, people: input.people.length, events: input.events.length }, attention, nextSteps, upcoming };
}
