import { describe, expect, it } from "vitest";
import { getDataErrorMessage, toDataError } from "./errors";

describe("data error messages", () => {
  it("explains when Supabase migrations are missing", () => {
    expect(getDataErrorMessage({ code: "PGRST205", message: "Could not find the table public.projects" }))
      .toContain("миграции Supabase");
  });

  it("translates network and authentication failures", () => {
    expect(getDataErrorMessage(new TypeError("Failed to fetch"))).toContain("связаться с облаком");
    expect(getDataErrorMessage({ message: "Invalid login credentials" })).toBe("Неверная почта или пароль.");
  });

  it("preserves useful unknown messages", () => {
    expect(toDataError({ message: "Custom failure" })).toEqual(new Error("Custom failure"));
  });
});
