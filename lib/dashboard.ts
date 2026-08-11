import type { AnyRecord } from "./types";
import { compareTriage, isAttentionItem } from "./triage";

export type DashboardSummary = {
  metrics: { projects: number; tasks: number; people: number; events: number };
  attention: AnyRecord[];
  nextSteps: AnyRecord[];
  upcoming: AnyRecord[];
};

function dateValue(row: AnyRecord) { return String(row.due_date ?? row.date_start ?? row.next_follow_up_at ?? ""); }
function isBeforeToday(value: string, today: string) { return Boolean(value) && value.slice(0, 10) < today; }

export function buildDashboardSummary(input: { projects: AnyRecord[]; tasks: AnyRecord[]; people: AnyRecord[]; events: AnyRecord[]; commitments: AnyRecord[]; counts?: Partial<DashboardSummary["metrics"]> }, now = new Date()): DashboardSummary {
  const today = now.toISOString().slice(0, 10);
  const tasks = input.tasks.filter((row) => String(row.status) !== "Done" && String(row.status) !== "Cancelled");
  const attentionById = new Map<string, AnyRecord>();
  for (const row of tasks) if (isAttentionItem(row, now)) attentionById.set(row.id, row);
  for (const row of input.commitments) if (String(row.status) === "Open" && isBeforeToday(String(row.due_date ?? ""), today)) attentionById.set(row.id, row);
  const attention = [...attentionById.values()].sort((a, b) => compareTriage(a, b, { now })).slice(0, 6);
  const nextSteps = [...tasks].sort((a, b) => compareTriage(a, b, { now })).slice(0, 6);
  const upcoming = [...input.events].filter((row) => dateValue(row) >= today).sort((a, b) => dateValue(a).localeCompare(dateValue(b))).slice(0, 5);
  return { metrics: { projects: input.counts?.projects ?? input.projects.length, tasks: input.counts?.tasks ?? tasks.length, people: input.counts?.people ?? input.people.length, events: input.counts?.events ?? input.events.length }, attention, nextSteps, upcoming };
}
