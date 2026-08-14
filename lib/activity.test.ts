import { describe, expect, it } from "vitest";
import { describeRecordChanges, describeRecordCreation } from "./activity";

const base = { id: "task-1", title: "Подготовить демо", status: "Planned", priority: "Normal", due_date: "2026-08-20", created_at: "2026-08-14T10:00:00Z", updated_at: "2026-08-14T10:00:00Z" };

describe("activity descriptions", () => {
  it("lists changed fields with old and new values", () => {
    const message = describeRecordChanges("tasks", base, { ...base, status: "Done", due_date: "2026-08-21" });
    expect(message).toContain("Статус");
    expect(message).toContain("Запланировано");
    expect(message).toContain("Готово");
    expect(message).toContain("Срок");
  });

  it("does not report unchanged fields", () => {
    expect(describeRecordChanges("tasks", base, { ...base })).toBe("Запись сохранена без изменения полей");
  });

  it("describes the initial values of a new record", () => {
    const message = describeRecordCreation("tasks", base);
    expect(message).toContain("Подготовить демо");
    expect(message).toContain("Срок");
  });
});
