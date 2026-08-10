import { describe, expect, it } from "vitest";
import { calculateProjectHealth, calendarDaysBetween } from "./health";

const base = { created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" };

describe("project health", () => {
  it("uses UTC calendar boundaries for deadlines", () => {
    const now = new Date("2026-08-10T23:30:00Z");
    expect(calendarDaysBetween(now, new Date("2026-08-11T00:10:00Z"))).toBe(1);
    const result = calculateProjectHealth({ ...base, id: "p1", status: "Active", due_date: "2026-08-30", next_action: "Review" }, [], [], now);
    expect(result.score).toBe(100);
    expect(result.state).toBe("Healthy");
  });

  it("penalizes overdue critical work and missing next action", () => {
    const result = calculateProjectHealth({ ...base, id: "p1", status: "Active", due_date: "2026-08-30" }, [{ ...base, id: "t1", project_id: "p1", due_date: "2026-08-01", priority: "Critical", status: "Inbox" }], [], new Date("2026-08-10T12:00:00Z"));
    expect(result.score).toBe(77);
    expect(result.reasons).toEqual(expect.arrayContaining(["1 просроченные задачи", "Нет следующего действия"]));
  });
});
