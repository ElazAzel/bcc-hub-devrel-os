import { describe, expect, it } from "vitest";
import { buildDashboardSummary } from "./dashboard";
import { findDuplicateCandidates, normalizeText, rankSearchRecord } from "./search";
import { groupTasksByStatus } from "./task-board";

const base = { created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" };

describe("search and ranking", () => {
  it("normalizes Russian text and ranks title matches higher", () => {
    expect(normalizeText("Ёлка  API")).toBe("елка api");
    expect(rankSearchRecord({ ...base, id: "1", title: "Frontend Meetup" }, ["description"], "front")).toBeGreaterThan(rankSearchRecord({ ...base, id: "2", title: "Other", description: "frontend" }, ["description"], "front"));
  });

  it("returns several duplicate candidates", () => {
    const rows = [{ ...base, id: "1", title: "Meetup" }, { ...base, id: "2", title: "Meetup" }, { ...base, id: "3", title: "Other" }];
    expect(findDuplicateCandidates("projects", rows, { title: "Meetup" }, 5).map((row) => row.id)).toEqual(["1", "2"]);
  });
});

describe("task grouping", () => {
  it("groups rows in one pass and keeps unknown status visible", () => {
    const groups = groupTasksByStatus([{ ...base, id: "1", status: "Inbox" }, { ...base, id: "2", status: "Done" }, { ...base, id: "3", status: "Custom" }], ["Inbox", "Done"]);
    expect(groups.get("Inbox")?.map((row) => row.id)).toEqual(["1"]);
    expect(groups.get("Done")?.map((row) => row.id)).toEqual(["2"]);
    expect(groups.get("Custom")?.map((row) => row.id)).toEqual(["3"]);
  });
});

describe("dashboard summary", () => {
  it("answers attention, next step and upcoming questions", () => {
    const summary = buildDashboardSummary({ projects: [{ ...base, id: "p1" }], people: [], commitments: [], tasks: [{ ...base, id: "t1", title: "Overdue", status: "Inbox", due_date: "2026-08-01" }, { ...base, id: "t2", title: "Next", status: "Planned", due_date: "2026-08-12" }], events: [{ ...base, id: "e1", title: "Meetup", date_start: "2026-08-20" }] }, new Date("2026-08-10T12:00:00Z"));
    expect(summary.attention.map((row) => row.id)).toContain("t1");
    expect(summary.nextSteps[0]?.id).toBe("t1");
    expect(summary.upcoming[0]?.id).toBe("e1");
  });
});
