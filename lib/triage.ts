import type { AnyRecord } from "./types";

export type TriageContext = { now?: Date; projectHealth?: Map<string, number> };

const priorityScore: Record<string, number> = { Critical: 40, High: 30, Medium: 20, Normal: 20, Low: 10 };

function dateOnly(value: unknown): string { return String(value ?? "").slice(0, 10); }

function daysFromToday(value: unknown, now: Date): number | null {
  const date = dateOnly(value);
  if (!date) return null;
  const due = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function staleDays(row: AnyRecord, now: Date): number {
  const updated = new Date(String(row.updated_at ?? row.created_at ?? ""));
  if (Number.isNaN(updated.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - updated.getTime()) / 86_400_000));
}

export function triageScore(row: AnyRecord, context: TriageContext = {}): number {
  const now = context.now ?? new Date();
  const status = String(row.status ?? "");
  const dueIn = daysFromToday(row.due_date ?? row.next_follow_up_at ?? row.date_start, now);
  let score = priorityScore[String(row.priority ?? "Normal")] ?? 15;
  if (status === "Blocked") score += 28;
  if (status === "Waiting") score += 22;
  if (status === "Inbox") score += 12;
  if (status === "In Progress") score += 10;
  if (dueIn !== null && dueIn < 0) score += Math.min(42, 18 + Math.abs(dueIn) * 2);
  else if (dueIn !== null && dueIn <= 3) score += 16 - Math.max(0, dueIn) * 3;
  else if (dueIn !== null && dueIn <= 7) score += 7;
  if (!String(row.next_action ?? "").trim()) score += 8;
  const stale = staleDays(row, now);
  if (stale > 14) score += Math.min(12, Math.floor(stale / 7));
  const projectId = String(row.project_id ?? "");
  const health = projectId ? context.projectHealth?.get(projectId) : undefined;
  if (health !== undefined && health < 65) score += health < 40 ? 16 : 8;
  return Math.min(100, score);
}

export function compareTriage(a: AnyRecord, b: AnyRecord, context: TriageContext = {}): number {
  const scoreDifference = triageScore(b, context) - triageScore(a, context);
  if (scoreDifference) return scoreDifference;
  const aDate = dateOnly(a.due_date ?? a.next_follow_up_at ?? a.date_start) || "9999-12-31";
  const bDate = dateOnly(b.due_date ?? b.next_follow_up_at ?? b.date_start) || "9999-12-31";
  const dateDifference = aDate.localeCompare(bDate);
  if (dateDifference) return dateDifference;
  return String(a.title ?? a.name ?? a.id).localeCompare(String(b.title ?? b.name ?? b.id), "ru");
}

export function isAttentionItem(row: AnyRecord, now = new Date()): boolean {
  const status = String(row.status ?? "");
  const dueIn = daysFromToday(row.due_date ?? row.next_follow_up_at ?? row.date_start, now);
  return status === "Blocked" || status === "Waiting" || (dueIn !== null && dueIn < 0);
}
