import { describe, expect, it } from "vitest";
import { isUuid, parseTelegramCommand, truncateTelegramText } from "./telegram";

describe("Telegram commands", () => {
  it("parses bot usernames and arguments", () => {
    expect(parseTelegramCommand(" /task@DevRelAssistbot  Подтвердить спикера ")).toEqual({ name: "task", argument: "Подтвердить спикера" });
    expect(parseTelegramCommand("обычный текст")).toBeNull();
  });

  it("accepts only full UUIDs for task completion", () => {
    expect(isUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(isUuid("not-a-task-id")).toBe(false);
  });

  it("keeps Telegram replies below the API limit", () => {
    expect(truncateTelegramText("x".repeat(4000))).toHaveLength(3800);
  });
});
