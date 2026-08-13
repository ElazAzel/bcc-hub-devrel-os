import type { AnyRecord, EventReadiness, TaskReadiness } from "./types";

const ACTIVE_STATUSES = new Set(["Inbox", "Planned", "In Progress", "Waiting", "Blocked", "Done"]);
const STATUS_WEIGHT: Record<string, number> = {
  Inbox: 0,
  Planned: 0.1,
  "In Progress": 0.5,
  Waiting: 0.25,
  Blocked: 0,
  Done: 1
};

/**
 * A parent task is ready when its active children move forward. In-progress
 * work contributes half, waiting work a quarter, and cancelled children do
 * not distort the percentage. This makes the number useful before the last
 * checkbox is closed while keeping Done equal to 100%.
 */
export function calculateTaskReadiness(subtasks: AnyRecord[]): TaskReadiness {
  const active = subtasks.filter((task) => ACTIVE_STATUSES.has(String(task.status ?? "Inbox")));
  const counts = active.reduce((result, task) => {
    const status = String(task.status ?? "Inbox");
    if (status === "Done") result.done += 1;
    if (status === "In Progress") result.inProgress += 1;
    if (status === "Waiting") result.waiting += 1;
    if (status === "Blocked") result.blocked += 1;
    result.weight += STATUS_WEIGHT[status] ?? 0;
    return result;
  }, { done: 0, inProgress: 0, waiting: 0, blocked: 0, weight: 0 });

  return {
    total: active.length,
    done: counts.done,
    inProgress: counts.inProgress,
    waiting: counts.waiting,
    blocked: counts.blocked,
    percent: active.length ? Math.round((counts.weight / active.length) * 100) : 0
  };
}

export function readinessLabel(readiness: TaskReadiness): string {
  if (!readiness.total) return "Субзадач пока нет";
  if (readiness.percent === 100) return "Все субзадачи завершены";
  if (readiness.blocked) return `${readiness.blocked} заблокировано`;
  return `${readiness.done} из ${readiness.total} завершено`;
}

export function calculateEventReadiness(event: AnyRecord, tasks: AnyRecord[]): EventReadiness {
  const target = Math.max(0, Number(event.registration_target ?? 0));
  const registrations = Math.max(0, Number(event.registrations ?? 0));
  const registrationPercent = target ? Math.min(100, Math.round((registrations / target) * 100)) : 0;
  const criticalTasks = calculateTaskReadiness(tasks.filter((task) => String(task.priority ?? "") === "Critical"));
  const criticalTaskPercent = criticalTasks.total ? criticalTasks.percent : 100;

  return {
    percent: Math.min(registrationPercent, criticalTaskPercent),
    registrationPercent,
    criticalTaskPercent,
    criticalTasks
  };
}
