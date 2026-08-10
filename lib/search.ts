import { displayName, type AnyRecord, type ModuleKey } from "./types";

export function normalizeText(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[^\p{L}\p{N}@.+-]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function rankSearchRecord(row: AnyRecord, fields: string[], query: string): number {
  const needle = normalizeText(query);
  if (!needle) return 0;
  const title = normalizeText(displayName(row));
  if (title === needle) return 100;
  if (title.startsWith(needle)) return 80;
  if (title.includes(needle)) return 60;
  return fields.some((field) => normalizeText(row[field]).includes(needle)) ? 25 : 0;
}

export function findDuplicateCandidates(module: ModuleKey, rows: AnyRecord[], input: Record<string, string>, limit = 5): AnyRecord[] {
  const compact = (value: unknown) => normalizeText(value).replace(/[^\p{L}\p{N}]/gu, "");
  const email = compact(input.email);
  const phone = compact(input.phone);
  const name = compact([input.first_name, input.last_name].filter(Boolean).join(" "));
  const organization = compact(input.organization_name);
  const title = compact(input.title ?? input.name);
  return rows.filter((row) => {
    if (module === "people" && email && compact(row.email) === email) return true;
    if (module === "people" && phone && compact(row.phone) === phone) return true;
    if (module === "people" && name && compact([row.first_name, row.last_name].filter(Boolean).join(" ")) === name && (!organization || compact(row.organization_name) === organization)) return true;
    if (module === "organizations" && title && compact(row.name) === title) return true;
    if (module === "projects" && title && compact(row.title) === title) return true;
    return false;
  }).slice(0, limit);
}
