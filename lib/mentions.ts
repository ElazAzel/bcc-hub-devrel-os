import type { ModuleKey } from "./types";

export type MentionReference = { module: ModuleKey; id: string; label: string };
export type MentionSegment = { type: "text"; value: string } | { type: "mention"; reference: MentionReference };

const MODULE_KEYS = new Set<ModuleKey>([
  "projects", "tasks", "people", "organizations", "interactions", "commitments", "events", "content", "communities", "ambassadors", "tech-radar", "documents", "decisions", "knowledge"
]);
const MENTION_PATTERN = /@\[([^\]\r\n]+)\]\(([^():\s]+):([^\s)]+)\)/g;

function isModuleKey(value: string): value is ModuleKey {
  return MODULE_KEYS.has(value as ModuleKey);
}
export function mentionToken(reference: MentionReference): string {
  const label = reference.label.replace(/[\[\]()`]/g, "").trim() || "Без названия";
  return `@[${label}](${reference.module}:${reference.id})`;
}

export function parseMentions(value: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    const module = match[2];
    if (!isModuleKey(module)) continue;
    if (index > cursor) segments.push({ type: "text", value: value.slice(cursor, index) });
    segments.push({ type: "mention", reference: { module, id: match[3], label: match[1] } });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) segments.push({ type: "text", value: value.slice(cursor) });
  return segments.length ? segments : [{ type: "text", value }];
}

export function extractMentions(value: string): MentionReference[] {
  return parseMentions(value).flatMap((segment) => segment.type === "mention" ? [segment.reference] : []);
}
