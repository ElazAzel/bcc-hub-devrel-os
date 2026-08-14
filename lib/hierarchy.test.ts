import { describe, expect, it } from "vitest";
import { allowedParentTypes, parentSelectionForRecord, recordFieldsForParent, relationForParent } from "./hierarchy";

const base = { id: "child", created_at: "", updated_at: "" };

describe("work hierarchy", () => {
  it("prefers a subtask parent over event and project context", () => {
    expect(parentSelectionForRecord("tasks", { ...base, parent_task_id: "subtask", event_id: "event", project_id: "project" })).toEqual({ parentType: "tasks", parentId: "subtask" });
    expect(parentSelectionForRecord("tasks", { ...base, event_id: "event", project_id: "project" })).toEqual({ parentType: "events", parentId: "event" });
  });

  it("maps a selected parent to stable database fields", () => {
    expect(recordFieldsForParent("knowledge", { parentType: "tasks", parentId: "task-1" })).toEqual({ task_id: "task-1", event_id: null, project_id: null });
    expect(recordFieldsForParent("tasks", { parentType: "events", parentId: "event-1" })).toEqual({ parent_task_id: null, project_id: null, event_id: "event-1" });
    expect(recordFieldsForParent("tasks", { parentType: "tasks", parentId: "parent-task" })).toEqual({ parent_task_id: "parent-task" });
  });

  it("keeps parent choices understandable by module", () => {
    expect(allowedParentTypes("knowledge")).toEqual(["projects", "events", "tasks"]);
    expect(allowedParentTypes("projects")).toEqual(["projects"]);
    expect(relationForParent("tasks", "tasks")).toBe("SUBTASK_OF");
    expect(relationForParent("knowledge", "tasks")).toBe("PART_OF");
  });
});
