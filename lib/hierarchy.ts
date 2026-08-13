import type { AnyRecord, ModuleKey } from "./types";

export type HierarchyNodeType = Extract<ModuleKey, "projects" | "events" | "tasks" | "interactions" | "commitments" | "content" | "documents" | "decisions" | "knowledge">;

export type ParentSelection = {
  parentType?: HierarchyNodeType;
  parentId?: string;
};

export type HierarchyPathItem = {
  module: HierarchyNodeType;
  id: string;
  relation?: string;
  title: string;
};

export type HierarchyChild = HierarchyPathItem & {
  relation: string;
  status: string | null;
};

const allowedParents: Partial<Record<ModuleKey, HierarchyNodeType[]>> = {
  projects: ["projects"],
  events: ["projects"],
  tasks: ["projects", "events", "tasks"],
  interactions: ["projects", "events", "tasks"],
  commitments: ["projects", "events", "tasks", "interactions"],
  content: ["projects", "events", "tasks"],
  documents: ["projects", "events", "tasks"],
  decisions: ["projects", "events", "tasks"],
  knowledge: ["projects", "events", "tasks"]
};

export function hierarchySupports(module: ModuleKey): boolean {
  return Boolean(allowedParents[module]);
}

export function allowedParentTypes(module: ModuleKey): HierarchyNodeType[] {
  return allowedParents[module] ?? [];
}

export function parentSelectionForRecord(module: ModuleKey, record: AnyRecord): ParentSelection {
  if (module === "projects" && record.parent_project_id) return { parentType: "projects", parentId: String(record.parent_project_id) };
  if (module === "tasks") {
    if (record.parent_task_id) return { parentType: "tasks", parentId: String(record.parent_task_id) };
    if (record.event_id) return { parentType: "events", parentId: String(record.event_id) };
    if (record.project_id) return { parentType: "projects", parentId: String(record.project_id) };
  }
  if (record.task_id && allowedParentTypes(module).includes("tasks")) return { parentType: "tasks", parentId: String(record.task_id) };
  if (record.event_id && allowedParentTypes(module).includes("events")) return { parentType: "events", parentId: String(record.event_id) };
  if (record.project_id && allowedParentTypes(module).includes("projects")) return { parentType: "projects", parentId: String(record.project_id) };
  if (record.interaction_id && allowedParentTypes(module).includes("interactions")) return { parentType: "interactions", parentId: String(record.interaction_id) };
  return {};
}

export function recordFieldsForParent(module: ModuleKey, selection: ParentSelection): Record<string, string | null> {
  const parentType = selection.parentType;
  const parentId = selection.parentId || null;
  if (!parentType || !parentId) {
    if (module === "projects") return { parent_project_id: null };
    if (module === "tasks") return { parent_task_id: null, project_id: null, event_id: null };
    if (module === "interactions") return { project_id: null, event_id: null, task_id: null };
    if (module === "commitments") return { project_id: null, event_id: null, task_id: null, interaction_id: null };
    if (["content", "documents", "decisions", "knowledge"].includes(module)) return { project_id: null, event_id: null, task_id: null };
    return {};
  }
  if (module === "projects") return { parent_project_id: parentType === "projects" ? parentId : null };
  if (module === "tasks") return {
    parent_task_id: parentType === "tasks" ? parentId : null,
    project_id: parentType === "projects" ? parentId : null,
    event_id: parentType === "events" ? parentId : null
  };
  if (module === "interactions") return {
    task_id: parentType === "tasks" ? parentId : null,
    event_id: parentType === "events" ? parentId : null,
    project_id: parentType === "projects" ? parentId : null
  };
  if (module === "commitments") return {
    task_id: parentType === "tasks" ? parentId : null,
    event_id: parentType === "events" ? parentId : null,
    project_id: parentType === "projects" ? parentId : null,
    interaction_id: parentType === "interactions" ? parentId : null
  };
  if (["content", "documents", "decisions", "knowledge"].includes(module)) return {
    task_id: parentType === "tasks" ? parentId : null,
    event_id: parentType === "events" ? parentId : null,
    project_id: parentType === "projects" ? parentId : null
  };
  return {};
}

export function relationForParent(module: ModuleKey, parentType: HierarchyNodeType): string {
  if (module === "projects") return "SUBPROJECT_OF";
  if (module === "tasks" && parentType === "tasks") return "SUBTASK_OF";
  return "PART_OF";
}

export function hierarchyTypeLabel(type: HierarchyNodeType): string {
  return {
    projects: "Проект",
    events: "Событие",
    tasks: "Задача",
    interactions: "Взаимодействие",
    commitments: "Договорённость",
    content: "Материал",
    documents: "Документ",
    decisions: "Решение",
    knowledge: "Заметка"
  }[type];
}

export function hierarchyTitle(record: AnyRecord): string {
  return String(record.title ?? record.name ?? ([record.first_name, record.last_name].filter(Boolean).join(" ") || "Без названия"));
}

export function isHierarchyNodeType(value: string): value is HierarchyNodeType {
  return ["projects", "events", "tasks", "interactions", "commitments", "content", "documents", "decisions", "knowledge"].includes(value);
}
