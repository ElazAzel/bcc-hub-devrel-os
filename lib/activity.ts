import { fieldLabel, formatDateRu, ru } from "./i18n";
import { displayName, getModule, type AnyRecord, type ModuleKey } from "./types";

const IGNORED_FIELDS = new Set(["id", "owner_id", "created_at", "updated_at", "archived_at", "parent_title"]);
const DATE_FIELDS = new Set(["date", "start_date", "due_date", "date_start", "date_end", "planned_date", "follow_up_date", "next_follow_up_at", "review_date"]);
const TRANSLATED_FIELDS = new Set(["status", "priority", "direction", "source_type", "type", "format", "meeting_mode", "ring", "change_state", "relationship_state", "owed_by", "channel", "content_type"]);

function normalizedValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "string" ? value.trim() : String(value);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return normalizedValue(left) === normalizedValue(right);
}

function formatValue(field: string, value: unknown): string {
  const normalized = normalizedValue(value);
  if (!normalized) return "—";
  if (DATE_FIELDS.has(field)) return formatDateRu(normalized);
  if (TRANSLATED_FIELDS.has(field)) return ru(normalized);
  const compact = normalized.replace(/\s+/g, " ");
  return compact.length > 100 ? `${compact.slice(0, 97)}…` : compact;
}

function activityFields(module: ModuleKey, before: Partial<AnyRecord>, after: Partial<AnyRecord>): string[] {
  const configured = getModule(module)?.fields.map((field) => field.key) ?? [];
  return [...new Set([...configured, ...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => !IGNORED_FIELDS.has(field))
    .filter((field) => !valuesEqual(before[field], after[field]));
}

export function describeRecordChanges(module: ModuleKey, before: Partial<AnyRecord>, after: Partial<AnyRecord>): string {
  const changes = activityFields(module, before, after).map((field) => `${fieldLabel(field)}: ${formatValue(field, before[field])} → ${formatValue(field, after[field])}`);
  return changes.length ? `Изменено: ${changes.join("; ")}` : "Запись сохранена без изменения полей";
}

export function describeRecordCreation(module: ModuleKey, record: AnyRecord): string {
  const title = displayName(record);
  const configured = getModule(module)?.fields.map((field) => field.key).filter((field) => field !== "title" && field !== "name") ?? [];
  const filled = configured.filter((field) => normalizedValue(record[field])).slice(0, 4).map((field) => `${fieldLabel(field)}: ${formatValue(field, record[field])}`);
  return filled.length ? `Создана запись «${title}». Заполнено: ${filled.join("; ")}` : `Создана запись «${title}»`;
}
