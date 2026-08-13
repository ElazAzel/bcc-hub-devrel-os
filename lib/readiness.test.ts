import { describe, expect, it } from "vitest";
import { calculateTaskReadiness, readinessLabel } from "./readiness";

const base = { created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" };

describe("task readiness", () => {
  it("counts done and in-progress children with weighted progress", () => {
    const result = calculateTaskReadiness([
      { ...base, id: "1", status: "Done" },
      { ...base, id: "2", status: "In Progress" },
      { ...base, id: "3", status: "Planned" },
      { ...base, id: "4", status: "Blocked" }
    ]);
    expect(result).toMatchObject({ total: 4, done: 1, inProgress: 1, blocked: 1, percent: 40 });
    expect(readinessLabel(result)).toBe("1 заблокировано");
  });

  it("does not let cancelled children lower readiness", () => {
    expect(calculateTaskReadiness([{ ...base, id: "1", status: "Done" }, { ...base, id: "2", status: "Cancelled" }])).toMatchObject({ total: 1, done: 1, percent: 100 });
  });

  it("returns a clear empty state for a task without children", () => {
    const result = calculateTaskReadiness([]);
    expect(result).toMatchObject({ total: 0, percent: 0 });
    expect(readinessLabel(result)).toBe("Субзадач пока нет");
  });
});
