import type { AnyRecord } from "./types";

export function groupTasksByStatus(rows: AnyRecord[], statuses: string[]) {
  const groups = new Map(statuses.map((status) => [status, [] as AnyRecord[]]));
  rows.forEach((row) => {
    const status = String(row.status ?? statuses[0] ?? "Inbox");
    if (!groups.has(status)) groups.set(status, []);
    groups.get(status)?.push(row);
  });
  groups.forEach((group) => group.sort(compareTaskDeadline));
  return groups;
}

function compareTaskDeadline(a: AnyRecord, b: AnyRecord) {
  const aDate = taskDeadline(a);
  const bDate = taskDeadline(b);
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.localeCompare(bDate);
}

function taskDeadline(row: AnyRecord) {
  const value = String(row.due_date ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
