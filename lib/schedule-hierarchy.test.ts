import { describe, expect, it } from "vitest";
import { expandScheduleRange, scheduleRange } from "./schedule-hierarchy";

describe("schedule hierarchy", () => {
  it("expands a parent to cover a child task", () => {
    expect(expandScheduleRange({ start_date: "2026-08-10", end_date: "2026-08-12" }, { start_date: "2026-08-08", end_date: "2026-08-15" })).toEqual({ start_date: "2026-08-08", end_date: "2026-08-15" });
  });

  it("uses a task deadline when its end date is not set", () => {
    expect(scheduleRange({ start_date: "2026-08-10", due_date: "2026-08-20" })).toEqual({ start: "2026-08-10", end: "2026-08-20" });
  });

  it("keeps legacy event date fields synchronized", () => {
    expect(expandScheduleRange({ start_date: "2026-08-10", end_date: "2026-08-12", date_start: "2026-08-10", date_end: "2026-08-12" }, { start_date: "2026-08-08", end_date: "2026-08-15" })).toEqual({ start_date: "2026-08-08", end_date: "2026-08-15", date_start: "2026-08-08", date_end: "2026-08-15" });
  });
});
