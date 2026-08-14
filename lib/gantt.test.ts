import { describe, expect, it } from "vitest";
import { buildGanttRange, buildGanttRows, dayOffset } from "./gantt";

const today = new Date("2026-08-14T12:00:00Z");

describe("gantt calculations", () => {
  it("uses task dates and keeps subtasks marked", () => {
    const rows = buildGanttRows([
      { id: "parent", title: "Главная", start_date: "2026-08-14", due_date: "2026-08-18", status: "Planned", created_at: "2026-08-14T10:00:00Z", updated_at: "2026-08-14T10:00:00Z" },
      { id: "child", title: "Субзадача", parent_task_id: "parent", parent_title: "Главная", due_date: "2026-08-16", status: "Done", created_at: "2026-08-14T10:00:00Z", updated_at: "2026-08-14T10:00:00Z" }
    ], today);
    expect(rows[0].start).toBe("2026-08-14");
    expect(rows[0].duration).toBe(5);
    expect(rows[1].parentTaskId).toBe("parent");
    expect(rows[1].parentTitle).toBe("Главная");
  });

  it("falls back to creation date and adds visual padding", () => {
    const rows = buildGanttRows([{ id: "task", title: "Без дат", created_at: "2026-08-14T10:00:00Z", updated_at: "2026-08-14T10:00:00Z" }], today);
    const range = buildGanttRange(rows, today);
    expect(rows[0].start).toBe("2026-08-14");
    expect(range.start).toBe("2026-08-13");
    expect(range.end).toBe("2026-08-15");
    expect(dayOffset(range.start, rows[0].start)).toBe(1);
  });
});
