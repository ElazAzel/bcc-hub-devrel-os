import { describe, expect, it } from "vitest";
import { escapeTelegramHtml, isUuid, parseContextArgument, parseTelegramCommand, TELEGRAM_COMMANDS, truncateTelegramHtml, truncateTelegramText } from "./telegram";

describe("Telegram commands", () => {
  it("parses bot usernames and arguments", () => {
    expect(parseTelegramCommand(" /task@DevRelAssistbot  Подтвердить спикера ")).toEqual({ name: "task", argument: "Подтвердить спикера" });
    expect(parseTelegramCommand("обычный текст")).toBeNull();
  });

  it("accepts only full UUIDs for task completion", () => {
    expect(isUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(isUuid("not-a-task-id")).toBe(false);
  });

  it("parses a context id and text separated by a pipe", () => {
    expect(parseContextArgument("project-id | Подтвердить спикера")).toEqual({ contextId: "project-id", text: "Подтвердить спикера" });
    expect(parseContextArgument("только текст")).toBeNull();
  });

  it("rejects malformed commands and empty context arguments", () => {
    expect(parseTelegramCommand("/")).toBeNull();
    expect(parseTelegramCommand("обычный текст")).toBeNull();
    expect(parseContextArgument("| текст")).toBeNull();
    expect(parseContextArgument("context | ")).toBeNull();
    expect(parseContextArgument(`context | ${"x".repeat(2001)}`)).toBeNull();
  });

  it("keeps Telegram replies below the API limit", () => {
    expect(truncateTelegramText("x".repeat(4000))).toHaveLength(3800);
  });

  it("escapes user text before Telegram HTML formatting", () => {
    expect(escapeTelegramHtml("<b>A & B</b>")).toBe("&lt;b&gt;A &amp; B&lt;/b&gt;");
  });

  it("does not leave broken HTML tags when a formatted reply is truncated", () => {
    expect(truncateTelegramHtml(`<b>${"x".repeat(4000)}</b>`)).not.toContain("<b>");
    expect(truncateTelegramHtml(`<b>${"x".repeat(4000)}</b>`)).toHaveLength(3800);
  });

  it("keeps the command menu descriptions in Cyrillic", () => {
    expect(TELEGRAM_COMMANDS).toHaveLength(8);
    expect(TELEGRAM_COMMANDS.every((item) => item.description && !item.description.includes("?"))).toBe(true);
  });
});
