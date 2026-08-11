import { displayName, type AnyRecord, type ModuleKey } from "./types";

export function normalizeText(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[^\p{L}\p{N}@.+-]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function rankSearchRecord(row: AnyRecord, fields: string[], query: string): number {
  const needle = normalizeText(query);
  if (!needle) return 0;
  const title = normalizeText(displayName(row));
  const tokens = needle.split(" ").filter(Boolean);
  const titleTokens = title.split(" ").filter(Boolean);
  if (title === needle) return 100;
  if (title.startsWith(needle)) return 80;
  if (title.includes(needle)) return 60;
  const titleTokenMatches = tokens.filter((token) => titleTokens.some((titleToken) => titleToken.startsWith(token))).length;
  if (titleTokenMatches === tokens.length && titleTokenMatches > 0) return 72;
  if (titleTokenMatches > 0) return 45 + Math.round((titleTokenMatches / tokens.length) * 15);
  const fieldText = fields.map((field) => normalizeText(row[field])).join(" ");
  if (fieldText.includes(needle)) return 35;
  const fieldTokenMatches = tokens.filter((token) => fieldText.includes(token)).length;
  return fieldTokenMatches ? 15 + Math.round((fieldTokenMatches / tokens.length) * 15) : 0;
}

export function findDuplicateCandidates(module: ModuleKey, rows: AnyRecord[], input: Record<string, string>, limit = 5): AnyRecord[] {
  const compact = (value: unknown) => normalizeText(value).replace(/[^\p{L}\p{N}]/gu, "");
  const similarity = (left: string, right: string) => {
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length);
    const leftBigrams = new Set(Array.from({ length: Math.max(0, left.length - 1) }, (_, index) => left.slice(index, index + 2)));
    const rightBigrams = new Set(Array.from({ length: Math.max(0, right.length - 1) }, (_, index) => right.slice(index, index + 2)));
    const overlap = [...leftBigrams].filter((bigram) => rightBigrams.has(bigram)).length;
    return (2 * overlap) / Math.max(1, leftBigrams.size + rightBigrams.size);
  };
  const email = compact(input.email);
  const phone = compact(input.phone);
  const name = compact([input.first_name, input.last_name].filter(Boolean).join(" "));
  const organization = compact(input.organization_name);
  const title = compact(input.title ?? input.name);
  return rows.map((row) => {
    let score = 0;
    if (module === "people") {
      if (email && compact(row.email) === email) score = 100;
      else if (phone && compact(row.phone) === phone) score = 96;
      else if (name) {
        const rowName = compact([row.first_name, row.last_name].filter(Boolean).join(" "));
        const nameSimilarity = similarity(name, rowName);
        const organizationMatch = organization && compact(row.organization_name) === organization;
        score = nameSimilarity >= 0.85 ? (organizationMatch ? 92 : 78) : nameSimilarity >= 0.7 ? 58 : 0;
      }
    } else if (module === "organizations") {
      const nameSimilarity = similarity(title, compact(row.name));
      score = nameSimilarity >= 0.95 ? 100 : nameSimilarity >= 0.78 ? 72 : 0;
    } else if (module === "projects") {
      const titleSimilarity = similarity(title, compact(row.title));
      score = titleSimilarity >= 0.95 ? 100 : titleSimilarity >= 0.78 ? 70 : 0;
    }
    return { row, score };
  }).filter(({ score }) => score >= 55).sort((a, b) => b.score - a.score || String(a.row.id).localeCompare(String(b.row.id))).slice(0, limit).map(({ row }) => row);
}
