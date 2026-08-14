export type ScheduleRecord = {
  start_date?: unknown;
  end_date?: unknown;
  due_date?: unknown;
  date_start?: unknown;
  date_end?: unknown;
};

export type ScheduleExpansion = {
  start_date?: string;
  end_date?: string;
  date_start?: string;
  date_end?: string;
};

function dateKey(value: unknown): string | null {
  const text = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function scheduleRange(record: ScheduleRecord) {
  return {
    start: dateKey(record.start_date) ?? dateKey(record.date_start),
    end: dateKey(record.end_date) ?? dateKey(record.date_end) ?? dateKey(record.due_date)
  };
}

export function expandScheduleRange(parent: ScheduleRecord, child: ScheduleRecord): ScheduleExpansion {
  const parentRange = scheduleRange(parent);
  const childRange = scheduleRange(child);
  const expansion: ScheduleExpansion = {};
  const hasLegacyStart = Object.prototype.hasOwnProperty.call(parent, "date_start");
  const hasLegacyEnd = Object.prototype.hasOwnProperty.call(parent, "date_end");

  if (childRange.start && (!parentRange.start || childRange.start < parentRange.start)) {
    expansion.start_date = childRange.start;
    if (hasLegacyStart) expansion.date_start = childRange.start;
  }
  if (childRange.end && (!parentRange.end || childRange.end > parentRange.end)) {
    expansion.end_date = childRange.end;
    if (hasLegacyEnd) expansion.date_end = childRange.end;
  }
  return expansion;
}
