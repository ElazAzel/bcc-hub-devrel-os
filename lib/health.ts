import type { AnyRecord } from "./types";

export type HealthResult = { score: number; state: "Healthy" | "Attention" | "At Risk" | "Critical"; reasons: string[] };

export function calculateProjectHealth(project: AnyRecord, tasks: AnyRecord[], commitments: AnyRecord[], now = new Date()): HealthResult {
  let score = 100;
  const reasons: string[] = [];
  const linkedTasks = tasks.filter((task) => task.project_id === project.id);
  const linkedCommitments = commitments.filter((commitment) => commitment.project_id === project.id && commitment.status !== "Done" && commitment.status !== "Cancelled");
  const overdue = linkedTasks.filter((task) => task.due_date && new Date(String(task.due_date)).getTime() < now.getTime() && !["Done", "Cancelled"].includes(String(task.status)));
  if (project.status === "Blocked") { score -= 25; reasons.push("Проект заблокирован"); }
  for (const task of overdue) {
    const penalty = task.priority === "Critical" ? 15 : task.priority === "High" ? 8 : 4;
    score -= penalty;
  }
  if (overdue.length) reasons.push(`${overdue.length} просроченные задачи`);
  const daysToDeadline = project.due_date ? Math.ceil((new Date(String(project.due_date)).getTime() - now.getTime()) / 86400000) : 999;
  const doneCount = linkedTasks.filter((task) => task.status === "Done").length;
  const progress = linkedTasks.length ? doneCount / linkedTasks.length : 0;
  if (daysToDeadline < 7 && progress < 0.5) { score -= 12; reasons.push("Дедлайн ближе 7 дней, прогресс низкий"); }
  if (!project.next_action) { score -= 8; reasons.push("Нет следующего действия"); }
  const lastActivity = project.last_activity_at ? new Date(String(project.last_activity_at)).getTime() : new Date(String(project.updated_at ?? project.created_at)).getTime();
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity) / 86400000);
  if (daysSinceActivity > 30) { score -= 15; reasons.push(`Нет активности ${daysSinceActivity} дней`); }
  else if (daysSinceActivity > 14) { score -= 8; reasons.push(`Нет активности ${daysSinceActivity} дней`); }
  if (linkedCommitments.some((commitment) => commitment.due_date && new Date(String(commitment.due_date)).getTime() < now.getTime())) { score -= 8; reasons.push("Есть просроченная договорённость"); }
  if (!reasons.length) reasons.push("Критичных сигналов не обнаружено");
  const normalized = Math.max(0, Math.min(100, score));
  return { score: normalized, state: normalized >= 85 ? "Healthy" : normalized >= 65 ? "Attention" : normalized >= 40 ? "At Risk" : "Critical", reasons };
}
