import type { AnyRecord } from "./types";

export type HealthResult = { score: number; state: "Healthy" | "Attention" | "At Risk" | "Critical"; reasons: string[] };

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calendarDaysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

export function calculateProjectHealth(project: AnyRecord, tasks: AnyRecord[], commitments: AnyRecord[], now = new Date()): HealthResult {
  let score = 100;
  const reasons: string[] = [];
  const linkedTasks = tasks.filter((task) => task.project_id === project.id);
  const linkedCommitments = commitments.filter((commitment) => commitment.project_id === project.id && commitment.status !== "Done" && commitment.status !== "Cancelled");
  const overdue = linkedTasks.filter((task) => {
    const due = parseDate(task.due_date);
    return Boolean(due && due.getTime() < now.getTime() && !["Done", "Cancelled"].includes(String(task.status)));
  });
  if (project.status === "Blocked") { score -= 25; reasons.push("Проект заблокирован"); }
  for (const task of overdue) {
    const penalty = task.priority === "Critical" ? 15 : task.priority === "High" ? 8 : 4;
    score -= penalty;
  }
  if (overdue.length) reasons.push(`${overdue.length} просроченные задачи`);
  const deadline = parseDate(project.due_date);
  const daysToDeadline = deadline ? calendarDaysBetween(now, deadline) : 999;
  const doneCount = linkedTasks.filter((task) => task.status === "Done").length;
  const progress = linkedTasks.length ? doneCount / linkedTasks.length : 0;
  if (daysToDeadline < 7 && progress < 0.5) { score -= 12; reasons.push("Дедлайн ближе 7 дней, прогресс низкий"); }
  if (!project.next_action) { score -= 8; reasons.push("Нет следующего действия"); }
  const lastActivityDate = parseDate(project.last_activity_at ?? project.updated_at ?? project.created_at) ?? now;
  const daysSinceActivity = Math.max(0, calendarDaysBetween(lastActivityDate, now));
  if (daysSinceActivity > 30) { score -= 15; reasons.push(`Нет активности ${daysSinceActivity} дней`); }
  else if (daysSinceActivity > 14) { score -= 8; reasons.push(`Нет активности ${daysSinceActivity} дней`); }
  if (linkedCommitments.some((commitment) => {
    const due = parseDate(commitment.due_date);
    return Boolean(due && due.getTime() < now.getTime());
  })) { score -= 8; reasons.push("Есть просроченная договорённость"); }
  if (!reasons.length) reasons.push("Критичных сигналов не обнаружено");
  const normalized = Math.max(0, Math.min(100, score));
  return { score: normalized, state: normalized >= 85 ? "Healthy" : normalized >= 65 ? "Attention" : normalized >= 40 ? "At Risk" : "Critical", reasons };
}
