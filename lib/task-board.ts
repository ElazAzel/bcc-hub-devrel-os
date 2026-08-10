import type { AnyRecord } from "./types";

export function groupTasksByStatus(rows: AnyRecord[], statuses: string[]) {
  const groups = new Map(statuses.map((status) => [status, [] as AnyRecord[]]));
  rows.forEach((row) => {
    const status = String(row.status ?? statuses[0] ?? "Inbox");
    if (!groups.has(status)) groups.set(status, []);
    groups.get(status)?.push(row);
  });
  return groups;
}
