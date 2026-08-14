import type { AnyRecord } from "./types";

export type TaskUrgency = "overdue" | "today" | "soon" | "none";

const DAY_MS = 86_400_000;
const SOON_DAYS = 3;

function dateKey(value: unknown): string | null {
  const text = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return null;
}

export function taskUrgency(task: Pick<AnyRecord, "due_date" | "status">, now = new Date()): TaskUrgency {
  const status = String(task.status ?? "");
  if (["Done", "Cancelled"].includes(status)) return "none";
  const due = dateKey(task.due_date);
  if (!due) return "none";
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dueDate = new Date(`${due}T00:00:00Z`);
  if (Number.isNaN(dueDate.getTime())) return "none";
  const days = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= SOON_DAYS) return "soon";
  return "none";
}
