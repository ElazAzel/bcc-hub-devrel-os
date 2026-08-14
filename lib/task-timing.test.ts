import { describe, expect, it } from "vitest";
import { calculateTaskTiming, summarizeTaskTiming } from "./task-timing";

const now = new Date("2026-08-20T12:00:00.000Z");

describe("task timing", () => {
  it("measures completed duration and detects an early finish", () => {
    const timing = calculateTaskTiming({ start_date: "2026-08-10", end_date: "2026-08-20", due_date: "2026-08-20", completed_at: "2026-08-18T10:00:00.000Z", status: "Done", schedule_variance_reason: "Готовый материал пришёл раньше." }, now);
    expect(timing.durationDays).toBe(9);
    expect(timing.plannedDays).toBe(11);
    expect(timing.varianceDays).toBe(-2);
    expect(timing.state).toBe("early");
  });

  it("requires an explanation for an early or late completion", () => {
    const timing = calculateTaskTiming({ start_date: "2026-08-10", end_date: "2026-08-20", due_date: "2026-08-20", completed_at: "2026-08-22", status: "Done", schedule_variance_reason: "" }, now);
    expect(timing.state).toBe("late");
    expect(timing.requiresReason).toBe(true);
  });

  it("summarizes measured tasks and excludes open tasks from the average", () => {
    const summary = summarizeTaskTiming([
      { id: "1", start_date: "2026-08-10", end_date: "2026-08-12", due_date: "2026-08-12", completed_at: "2026-08-12", status: "Done", created_at: "", updated_at: "" },
      { id: "2", start_date: "2026-08-10", end_date: "2026-08-14", due_date: "2026-08-14", completed_at: "2026-08-12", status: "Done", created_at: "", updated_at: "" },
      { id: "3", start_date: "2026-08-20", end_date: "2026-08-25", due_date: "2026-08-25", status: "In Progress", created_at: "", updated_at: "" }
    ], now);
    expect(summary.measured).toBe(2);
    expect(summary.averageDurationDays).toBe(3);
    expect(summary.early).toBe(1);
    expect(summary.open).toBe(1);
  });
});
