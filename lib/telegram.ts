export type TelegramCommand = {
  name: string;
  argument: string;
};

export const TELEGRAM_COMMANDS = [
  { command: "start", description: "Подключить рабочее пространство" },
  { command: "task", description: "Создать задачу" },
  { command: "note", description: "Сохранить заметку" },
  { command: "tasks", description: "Показать активные задачи" },
  { command: "today", description: "Показать фокус на сегодня" },
  { command: "done", description: "Закрыть задачу по ID" },
  { command: "help", description: "Показать все команды" }
] as const;

export function parseTelegramCommand(text: string): TelegramCommand | null {
  const value = text.trim();
  if (!value.startsWith("/")) return null;
  const [rawName = "", ...rest] = value.slice(1).split(/\s+/);
  const name = rawName.split("@")[0].toLowerCase();
  return name ? { name, argument: rest.join(" ").trim() } : null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function telegramDisplayName(input: { username?: string | null; first_name?: string | null; last_name?: string | null }) {
  if (input.username) return `@${input.username}`;
  return [input.first_name, input.last_name].filter(Boolean).join(" ") || "Telegram";
}

export function escapeTelegramHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function truncateTelegramText(value: string, max = 3800) {
  const text = value.trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function truncateTelegramHtml(value: string, max = 3800) {
  const text = value.trim();
  if (text.length <= max) return text;
  return truncateTelegramText(text.replace(/<[^>]*>/g, ""), max);
}
