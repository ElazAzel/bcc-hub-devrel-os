import { describe, expect, it } from "vitest";
import { displayName, getModule, isFieldVisible } from "./types";

const base = { id: "task", created_at: "", updated_at: "" };

describe("task display names", () => {
  it("marks a task with its parent context", () => {
    expect(displayName({ ...base, title: "Собрать обратную связь", parent_task_id: "parent", parent_title: "Подготовить meetup" })).toBe("↳ Собрать обратную связь · Подготовить meetup");
  });

  it("keeps top-level task names unchanged", () => {
    expect(displayName({ ...base, title: "Подготовить meetup" })).toBe("Подготовить meetup");
  });

  it("shows only the relevant meeting destination", () => {
    const fields = getModule("tasks")?.fields ?? [];
    const url = fields.find((field) => field.key === "meeting_url")!;
    const location = fields.find((field) => field.key === "location")!;
    expect(isFieldVisible("tasks", url, { meeting_mode: "online" })).toBe(true);
    expect(isFieldVisible("tasks", url, { meeting_mode: "offline" })).toBe(false);
    expect(isFieldVisible("tasks", location, { meeting_mode: "offline" })).toBe(true);
    expect(isFieldVisible("tasks", location, { meeting_mode: "online" })).toBe(false);
  });
});
