import { describe, expect, it } from "vitest";
import { taskUrgency } from "./task-urgency";

const now = new Date("2026-08-14T12:00:00Z");

describe("task urgency", () => {
  it("marks overdue and today's active tasks red", () => {
    expect(taskUrgency({ status: "Inbox", due_date: "2026-08-13" }, now)).toBe("overdue");
    expect(taskUrgency({ status: "Planned", due_date: "2026-08-14" }, now)).toBe("today");
  });

  it("marks the next three days as soon", () => {
    expect(taskUrgency({ status: "Planned", due_date: "2026-08-17" }, now)).toBe("soon");
    expect(taskUrgency({ status: "Planned", due_date: "2026-08-18" }, now)).toBe("none");
  });

  it("does not alarm for completed, cancelled, or undated tasks", () => {
    expect(taskUrgency({ status: "Done", due_date: "2026-08-01" }, now)).toBe("none");
    expect(taskUrgency({ status: "Cancelled", due_date: "2026-08-14" }, now)).toBe("none");
    expect(taskUrgency({ status: "Inbox", due_date: null }, now)).toBe("none");
  });
});
