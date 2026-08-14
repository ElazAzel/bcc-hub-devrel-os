import { describe, expect, it } from "vitest";
import { groupTasksByStatus } from "./task-board";
import type { AnyRecord } from "./types";

describe("task board grouping", () => {
  it("sorts tasks within each status by the nearest deadline", () => {
    const rows: AnyRecord[] = [
      { id: "no-date", status: "Planned", created_at: "", updated_at: "" },
      { id: "later", status: "Planned", due_date: "2026-08-25", created_at: "", updated_at: "" },
      { id: "soon", status: "Planned", due_date: "2026-08-16", created_at: "", updated_at: "" },
      { id: "overdue", status: "Planned", due_date: "2026-08-10", created_at: "", updated_at: "" },
      { id: "other-status", status: "Done", due_date: "2026-08-01", created_at: "", updated_at: "" }
    ];
    const groups = groupTasksByStatus(rows, ["Inbox", "Planned", "Done"]);

    expect(groups.get("Planned")?.map((row) => row.id)).toEqual(["overdue", "soon", "later", "no-date"]);
    expect(groups.get("Done")?.map((row) => row.id)).toEqual(["other-status"]);
  });
});
