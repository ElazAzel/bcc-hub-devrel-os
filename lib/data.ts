import { getSupabaseBrowserClient } from "./supabase/client";
import { SEED_DATA } from "./seed";
import { findDuplicateCandidates, normalizeText, rankSearchRecord } from "./search";
import { toDataError } from "./errors";
import { displayName, getModule, type AnyRecord, type ConnectionEdge, type ConnectionNode, type EntityComment, type EntityContactLink, type EntityParentLink, type EntityRelation, type EmployeeImportRow, type ModuleKey, type RecordListQuery, type RecordPage, type TaskReadiness, type WorkspaceSearchResult } from "./types";
import { calculateTaskReadiness } from "./readiness";
import { expandScheduleRange } from "./schedule-hierarchy";
import { employeeIdentity } from "./employee-import";
import { allowedParentTypes, hierarchyTitle, isHierarchyNodeType, parentSelectionForRecord, recordFieldsForParent, relationForParent, type HierarchyNodeType, type HierarchyPathItem, type ParentSelection } from "./hierarchy";
import { describeRecordChanges, describeRecordCreation } from "./activity";

const supabase = getSupabaseBrowserClient();
export const isCloudMode = Boolean(supabase);

function localKey(module: ModuleKey) { return `bcc-hub:records:${module}`; }
function ownerKey() { return "local-owner"; }

function readLocal(module: ModuleKey): AnyRecord[] {
  if (typeof window === "undefined") return SEED_DATA[module] ?? [];
  const key = localKey(module);
  const saved = window.localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved) as AnyRecord[]; } catch { window.localStorage.removeItem(key); }
  }
  const seeded = (SEED_DATA[module] ?? []).map((item) => ({ ...item }));
  window.localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}

function writeLocal(module: ModuleKey, rows: AnyRecord[]) {
  window.localStorage.setItem(localKey(module), JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("bcc:data-changed", { detail: module }));
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 120;
const COMMON_COLUMNS = ["id", "owner_id", "created_at", "updated_at", "archived_at"];

// PostgREST validates every selected column against the concrete table. Keep
// the list derived from the module schema instead of sending a shared union of
// columns to every table (which turns a valid authenticated request into 400).
const MODULE_QUERY_EXTRAS: Partial<Record<ModuleKey, string[]>> = {
  projects: ["parent_project_id", "health_score", "health_state", "last_activity_at", "project_type", "goal", "expected_result", "actual_result"],
  tasks: ["project_id", "event_id", "parent_task_id", "source_date", "requested_by_contact_id", "expected_result", "blocker", "actual_result", "retrospective", "completed_at", "schedule_variance_reason"],
  people: ["name", "phone", "department", "contact_kind", "relationship_score", "relationship_state", "last_interaction_at"],
  organizations: ["notes"],
  interactions: ["project_id", "event_id", "task_id", "what_i_said", "what_they_said", "follow_up_date"],
  commitments: ["contact_id", "project_id", "event_id", "task_id", "interaction_id"],
  events: ["project_id", "format", "capacity", "registrations", "confirmed", "attended", "nps", "budget_planned", "budget_actual"],
  content: ["author_contact_id", "ambassador_id", "project_id", "event_id", "task_id", "community_id", "published_at", "views", "reach", "likes", "comments", "shares"],
  communities: ["owner_contact_id", "last_activity_at"],
  ambassadors: ["contact_id", "start_date", "training_progress", "last_contribution_at"],
  "tech-radar": ["slug", "domain", "rationale", "owner_contact_id"],
  documents: ["storage_path", "project_id", "task_id", "event_id", "contact_id", "ambassador_id", "version", "last_updated_at"],
  decisions: ["date", "problem", "options", "consequences", "review_date", "project_id", "task_id", "event_id"],
  knowledge: ["trigger", "people", "actions", "communication", "decision", "tags", "project_id", "task_id", "event_id"]
};

function queryColumns(module: ModuleKey, config: NonNullable<ReturnType<typeof getModule>>): string[] {
  return Array.from(new Set([
    ...COMMON_COLUMNS,
    ...config.searchFields,
    ...config.fields.map((field) => field.key),
    ...(MODULE_QUERY_EXTRAS[module] ?? [])
  ]));
}

function safePage(query: RecordListQuery = {}) {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page, pageSize };
}

function dateField(row: AnyRecord): string {
  return String(row.due_date ?? row.date_start ?? row.planned_date ?? row.next_follow_up_at ?? row.date ?? row.updated_at ?? "");
}

function searchFields(row: AnyRecord, module: ModuleKey): string[] {
  const config = getModule(module);
  return (config?.searchFields ?? []).map((field) => String(row[field] ?? ""));
}

function matchesQuery(row: AnyRecord, module: ModuleKey, query: RecordListQuery): boolean {
  if (query.statuses?.length && !query.statuses.includes(String(row.status ?? row.relationship_state ?? row.change_state ?? row.ring ?? ""))) return false;
  if (query.q) {
    const needle = normalizeText(query.q);
    if (needle && !searchFields(row, module).some((value) => normalizeText(value).includes(needle))) return false;
  }
  const date = dateField(row);
  if (query.dateFrom && date && date < query.dateFrom) return false;
  if (query.dateTo && date && date > query.dateTo) return false;
  return true;
}

function sortRows(rows: AnyRecord[], query: RecordListQuery): AnyRecord[] {
  const field = query.sort?.field ?? "updated_at";
  const direction = query.sort?.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => String(a[field] ?? "").localeCompare(String(b[field] ?? ""), "ru", { numeric: true }) * direction);
}

async function logActivity(action: string, entityType: string, entityId: string, message: string) {
  let owner = ownerKey();
  if (supabase) { const { data } = await supabase.auth.getUser(); if (!data.user) return; owner = data.user.id; }
  const activity = { id: crypto.randomUUID(), action, entity_type: entityType, entity_id: entityId, message, created_at: new Date().toISOString(), owner_id: owner };
  if (supabase) { await supabase.from("activity_log").insert(activity); return; }
  const key = "bcc-hub:activity";
  const rows = JSON.parse(window.localStorage.getItem(key) ?? "[]") as AnyRecord[];
  window.localStorage.setItem(key, JSON.stringify([activity, ...rows].slice(0, 200)));
}

export async function getCurrentUser() {
  if (!supabase) return { id: ownerKey(), email: "local@devrel.local" };
  const { data, error } = await supabase.auth.getUser();
  if (error) throw toDataError(error);
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
}

export async function signIn(email: string, password: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? toDataError(error) : null };
}

export async function signUp(email: string, password: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error ? toDataError(error) : null };
}

export async function signOut() { if (supabase) await supabase.auth.signOut(); }

export async function listRecords(module: ModuleKey, query: RecordListQuery = {}): Promise<RecordPage> {
  const config = getModule(module);
  if (!config) return { items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE, hasMore: false };
  const { page, pageSize } = safePage(query);
  if (!supabase) {
    const rows = sortRows(readLocal(module).filter((row) => !row.archived_at && matchesQuery(row, module, query)), query);
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);
    return { items: await decorateTaskRows(items), total: rows.length, page, pageSize, hasMore: start + pageSize < rows.length };
  }
  const allowedColumns = new Set(queryColumns(module, config));
  const selectColumns = Array.from(allowedColumns).join(",");
  const sortField = allowedColumns.has(query.sort?.field ?? "") ? query.sort!.field : "updated_at";
  let request = supabase.from(config.table).select(selectColumns, { count: "exact" }).is("archived_at", null).order(sortField, { ascending: query.sort?.direction === "asc" });
  if (query.statuses?.length && config.fields.some((field) => field.key === "status")) request = request.in("status", query.statuses);
  if (query.q?.trim()) {
    const needle = query.q.trim().slice(0, MAX_SEARCH_LENGTH).replace(/[%,()*\\.:]/g, " ").replace(/\s+/g, " ");
    const clauses = config.searchFields.map((field) => `${field}.ilike.%${needle}%`).join(",");
    if (clauses) request = request.or(clauses);
  }
  const dateColumn = module === "events" ? "date_start" : module === "people" ? "next_follow_up_at" : module === "content" ? "planned_date" : module === "interactions" ? "date" : ["tasks", "commitments"].includes(module) ? "due_date" : null;
  if (dateColumn && query.dateFrom) request = request.gte(dateColumn, query.dateFrom);
  if (dateColumn && query.dateTo) request = request.lte(dateColumn, query.dateTo);
  const start = (page - 1) * pageSize;
  const { data, error, count } = await request.range(start, start + pageSize - 1);
  if (error) throw toDataError(error);
  const total = count ?? data?.length ?? 0;
  const items = (data ?? []) as unknown as AnyRecord[];
  return { items: await decorateTaskRows(items), total, page, pageSize, hasMore: start + pageSize < total };
}

export async function loadRecords(module: ModuleKey, query: RecordListQuery = {}): Promise<AnyRecord[]> {
  const result = await listRecords(module, { pageSize: MAX_PAGE_SIZE, ...query });
  return result.items;
}

export async function loadAllRecords(module: ModuleKey, query: RecordListQuery = {}): Promise<AnyRecord[]> {
  const rows: AnyRecord[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const result = await listRecords(module, { ...query, page, pageSize: MAX_PAGE_SIZE });
    rows.push(...result.items);
    if (!result.hasMore) return rows;
  }
  return rows;
}

export async function loadAllTaskRecords(): Promise<AnyRecord[]> {
  return loadAllRecords("tasks");
}

export async function loadRecordsByIds(module: ModuleKey, ids: string[]): Promise<AnyRecord[]> {
  const config = getModule(module);
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!config || !uniqueIds.length) return [];
  if (!supabase) return readLocal(module).filter((row) => uniqueIds.includes(row.id) && !row.archived_at);
  const { data, error } = await supabase.from(config.table).select(queryColumns(module, config).join(",")).in("id", uniqueIds).is("archived_at", null).limit(MAX_PAGE_SIZE);
  if (error) throw toDataError(error);
  return (data ?? []) as unknown as AnyRecord[];
}

async function decorateTaskRows(rows: AnyRecord[]): Promise<AnyRecord[]> {
  const parentIds = [...new Set(rows.map((row) => String(row.parent_task_id ?? "")).filter(Boolean))];
  if (!parentIds.length) return rows;
  const parents = await loadRecordsByIds("tasks", parentIds);
  const titles = new Map(parents.map((parent) => [parent.id, String(parent.title ?? parent.name ?? "Основная задача")]));
  return rows.map((row) => row.parent_task_id ? { ...row, parent_title: titles.get(String(row.parent_task_id)) ?? "Основная задача" } : row);
}

export async function loadRecord(module: ModuleKey, id: string): Promise<AnyRecord | null> {
  const config = getModule(module);
  if (!config) return null;
  if (!supabase) return readLocal(module).find((row) => row.id === id && !row.archived_at) ?? null;
  const { data, error } = await supabase.from(config.table).select("*").eq("id", id).is("archived_at", null).maybeSingle();
  if (error) throw toDataError(error);
  return (data as AnyRecord | null) ?? null;
}

export async function loadActivity(entityType?: string, entityId?: string): Promise<AnyRecord[]> {
  if (!supabase) {
    const rows = JSON.parse(window.localStorage.getItem("bcc-hub:activity") ?? "[]") as AnyRecord[];
    return rows.filter((row) => (!entityType || row.entity_type === entityType) && (!entityId || row.entity_id === entityId));
  }
  let query = supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(50);
  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);
  const { data, error } = await query;
  if (error) throw toDataError(error);
  return (data ?? []) as AnyRecord[];
}

async function logActivities(activities: Array<{ action: string; entityType: string; entityId: string; message: string }>) {
  if (!activities.length) return;
  if (supabase) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return;
    const ownerId = user.data.user.id;
    const timestamp = new Date().toISOString();
    const { error } = await supabase.from("activity_log").insert(activities.map((activity) => ({ id: crypto.randomUUID(), action: activity.action, entity_type: activity.entityType, entity_id: activity.entityId, message: activity.message, created_at: timestamp, owner_id: ownerId })));
    if (error) throw toDataError(error);
    return;
  }
  const key = "bcc-hub:activity";
  const rows = JSON.parse(window.localStorage.getItem(key) ?? "[]") as AnyRecord[];
  const timestamp = new Date().toISOString();
  const next = activities.map((activity) => ({ id: crypto.randomUUID(), action: activity.action, entity_type: activity.entityType, entity_id: activity.entityId, message: activity.message, created_at: timestamp, owner_id: ownerKey() }));
  window.localStorage.setItem(key, JSON.stringify([...next, ...rows].slice(0, 200)));
}

const HIERARCHY_KEY = "bcc-hub:entity-parent-links";

function readLocalParentLinks(): EntityParentLink[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(HIERARCHY_KEY) ?? "[]") as EntityParentLink[]; } catch { return []; }
}

function writeLocalParentLinks(rows: EntityParentLink[]) {
  window.localStorage.setItem(HIERARCHY_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("bcc:data-changed", { detail: "entity-parent-links" }));
}

function localHierarchyLinks(): EntityParentLink[] {
  const modules: HierarchyNodeType[] = ["projects", "events", "tasks", "interactions", "commitments", "content", "documents", "decisions", "knowledge"];
  const derived = modules.flatMap((module) => readLocal(module).flatMap((record) => {
    const parent = parentSelectionForRecord(module, record);
    return parent.parentType && parent.parentId ? [{ id: `derived:${module}:${record.id}`, owner_id: ownerKey(), child_type: module, child_id: record.id, parent_type: parent.parentType, parent_id: parent.parentId, relation_type: relationForParent(module, parent.parentType), created_at: record.updated_at }] : [];
  }));
  const explicit = readLocalParentLinks();
  const explicitChildren = new Set(explicit.map((row) => `${row.child_type}:${row.child_id}`));
  return [...explicit, ...derived.filter((row) => !explicitChildren.has(`${row.child_type}:${row.child_id}`))];
}

export async function loadEntityParentLinks(filters: { childType?: HierarchyNodeType; childId?: string; parentType?: HierarchyNodeType; parentId?: string } = {}): Promise<EntityParentLink[]> {
  if (!supabase) {
    return localHierarchyLinks().filter((row) =>
      (!filters.childType || row.child_type === filters.childType) &&
      (!filters.childId || row.child_id === filters.childId) &&
      (!filters.parentType || row.parent_type === filters.parentType) &&
      (!filters.parentId || row.parent_id === filters.parentId)
    );
  }
  let request = supabase.from("entity_parent_links").select("*").order("created_at", { ascending: true }).limit(500);
  if (filters.childType) request = request.eq("child_type", filters.childType);
  if (filters.childId) request = request.eq("child_id", filters.childId);
  if (filters.parentType) request = request.eq("parent_type", filters.parentType);
  if (filters.parentId) request = request.eq("parent_id", filters.parentId);
  const { data, error } = await request;
  if (error) throw toDataError(error);
  return (data ?? []) as EntityParentLink[];
}

export async function loadEntityParentLink(childType: HierarchyNodeType, childId: string): Promise<EntityParentLink | null> {
  return (await loadEntityParentLinks({ childType, childId }))[0] ?? null;
}

async function assertHierarchyRecord(type: HierarchyNodeType, id: string, label: string) {
  const record = await loadRecord(type, id);
  if (!record) throw new Error(`${label} не найдена или недоступна`);
}

async function ensureNoHierarchyCycle(childType: HierarchyNodeType, childId: string, parentType: HierarchyNodeType, parentId: string) {
  let currentType = parentType;
  let currentId = parentId;
  const visited = new Set<string>();
  for (let depth = 0; depth < 30; depth += 1) {
    const key = `${currentType}:${currentId}`;
    if (visited.has(key)) throw new Error("В иерархии обнаружен цикл");
    visited.add(key);
    if (currentType === childType && currentId === childId) throw new Error("Запись нельзя поместить внутрь самой себя или своего потомка");
    const parent = await loadEntityParentLink(currentType, currentId);
    if (!parent || !isHierarchyNodeType(parent.parent_type)) return;
    currentType = parent.parent_type;
    currentId = parent.parent_id;
  }
  throw new Error("Иерархия слишком глубокая или содержит цикл");
}

async function validateHierarchyParent(childType: HierarchyNodeType, childId: string, parent: ParentSelection) {
  if (!parent.parentType || !parent.parentId) return;
  if (!allowedParentTypes(childType).includes(parent.parentType)) throw new Error("Invalid hierarchy parent type");
  if (childType === parent.parentType && childId === parent.parentId) throw new Error("A record cannot be its own hierarchy parent");
  await assertHierarchyRecord(parent.parentType, parent.parentId, "Parent record");
  await ensureNoHierarchyCycle(childType, childId, parent.parentType, parent.parentId);
}

export async function setEntityParent(childType: HierarchyNodeType, childId: string, parent: ParentSelection) {
  if (!parent.parentType || !parent.parentId) {
    await clearEntityParent(childType, childId);
    return;
  }
  if (!allowedParentTypes(childType).includes(parent.parentType)) throw new Error("Этот тип записи нельзя вложить в выбранный контекст");
  if (childType === parent.parentType && childId === parent.parentId) throw new Error("Запись нельзя связать сама с собой");
  await assertHierarchyRecord(parent.parentType, parent.parentId, "Родительская запись");
  await assertHierarchyRecord(childType, childId, "Дочерняя запись");
  await ensureNoHierarchyCycle(childType, childId, parent.parentType, parent.parentId);
  const link = { child_type: childType, child_id: childId, parent_type: parent.parentType, parent_id: parent.parentId, relation_type: relationForParent(childType, parent.parentType) };
  if (!supabase) {
    const rows = readLocalParentLinks().filter((row) => !(row.child_type === childType && row.child_id === childId));
    writeLocalParentLinks([{ id: crypto.randomUUID(), owner_id: ownerKey(), created_at: new Date().toISOString(), ...link }, ...rows]);
  } else {
    const user = await supabase.auth.getUser();
    if (user.error) throw toDataError(user.error);
    if (!user.data.user) throw new Error("Нужна авторизация");
    const { error: deleteError } = await supabase.from("entity_parent_links").delete().eq("child_type", childType).eq("child_id", childId);
    if (deleteError) throw toDataError(deleteError);
    const { error: insertError } = await supabase.from("entity_parent_links").insert({ ...link, owner_id: user.data.user.id });
    if (insertError) throw toDataError(insertError);
  }
}

export async function clearEntityParent(childType: HierarchyNodeType, childId: string) {
  if (!supabase) {
    writeLocalParentLinks(readLocalParentLinks().filter((row) => !(row.child_type === childType && row.child_id === childId)));
    return;
  }
  const { error } = await supabase.from("entity_parent_links").delete().eq("child_type", childType).eq("child_id", childId);
  if (error) throw toDataError(error);
}

async function syncEntityParent(module: ModuleKey, record: AnyRecord) {
  if (!allowedParentTypes(module).length || !isHierarchyNodeType(module)) return;
  const selection = parentSelectionForRecord(module, record);
  if (selection.parentType && selection.parentId) await setEntityParent(module, record.id, selection);
  else await clearEntityParent(module, record.id);
}

async function inheritProjectContext(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const parentType: ModuleKey = input.parent_task_id || input.task_id ? "tasks" : "events";
  const parentId = String(input.parent_task_id ?? input.task_id ?? input.event_id ?? "");
  if (!parentId || (!input.event_id && !input.task_id && !input.parent_task_id)) return input;
  const parent = await loadRecord(parentType, parentId);
  if (!parent) return input;
  if (parentType === "tasks") return { ...input, project_id: parent.project_id ?? null, event_id: parent.event_id ?? null };
  return { ...input, project_id: parent.project_id ?? null };
}

const nonNullableLabelField: Partial<Record<ModuleKey, "title" | "name">> = {
  projects: "title",
  tasks: "title",
  organizations: "name",
  interactions: "title",
  commitments: "title",
  events: "title",
  content: "title",
  communities: "name",
  ambassadors: "name",
  "tech-radar": "name",
  documents: "title",
  decisions: "title",
  knowledge: "title"
};

function normalizeRecordInput(module: ModuleKey, input: Record<string, unknown>, existing?: AnyRecord | null): Record<string, unknown> {
  const next = { ...input };
  Object.entries(next).forEach(([key, value]) => {
    if (value !== "") return;
    if (existing) next[key] = null;
    else delete next[key];
  });
  const labelField = nonNullableLabelField[module];
  if (labelField && !String(next[labelField] ?? existing?.[labelField] ?? "").trim()) next[labelField] = "Без названия";
  const start = String(next.start_date ?? existing?.start_date ?? "");
  const end = String(next.end_date ?? existing?.end_date ?? "");
  if (start && end && start > end) throw new Error("Дата окончания не может быть раньше даты старта");
  if (module === "tasks") {
    const nextStatus = String(next.status ?? existing?.status ?? "");
    if (nextStatus === "Done" && !next.completed_at && String(existing?.status ?? "") !== "Done") next.completed_at = new Date().toISOString();
    if (Object.prototype.hasOwnProperty.call(next, "status") && nextStatus !== "Done" && String(existing?.status ?? "") === "Done") next.completed_at = null;
  }
  return next;
}

async function syncScheduleAncestors(module: ModuleKey, record: AnyRecord, visited = new Set<string>()): Promise<void> {
  const recordKey = `${module}:${record.id}`;
  if (visited.has(recordKey)) return;
  visited.add(recordKey);

  async function expand(parentModule: ModuleKey, parentId: unknown) {
    if (!parentId) return;
    const parent = await loadRecord(parentModule, String(parentId));
    if (!parent) return;
    const expansion = expandScheduleRange(parent, record);
    if (!Object.keys(expansion).length) return;
    await updateRecord(parentModule, parent.id, expansion);
  }

  if (module === "projects") {
    await expand("projects", record.parent_project_id);
    return;
  }
  if (module === "tasks") {
    await expand("tasks", record.parent_task_id);
    await expand("events", record.event_id);
    await expand("projects", record.project_id);
    return;
  }
  if (module === "events") {
    await expand("projects", record.project_id);
    return;
  }
  if (record.project_id) await expand("projects", record.project_id);
}

export async function loadHierarchyPath(module: HierarchyNodeType, id: string): Promise<HierarchyPathItem[]> {
  const path: HierarchyPathItem[] = [];
  let currentType = module;
  let currentId = id;
  const visited = new Set<string>();
  for (let depth = 0; depth < 30; depth += 1) {
    const key = `${currentType}:${currentId}`;
    if (visited.has(key)) break;
    visited.add(key);
    const record = await loadRecord(currentType, currentId);
    if (!record) break;
    const parent = await loadEntityParentLink(currentType, currentId);
    path.unshift({ module: currentType, id: currentId, title: hierarchyTitle(record), relation: parent?.relation_type });
    if (!parent || !isHierarchyNodeType(parent.parent_type)) break;
    currentType = parent.parent_type;
    currentId = parent.parent_id;
  }
  return path;
}

export async function loadHierarchyChildren(parentType: HierarchyNodeType, parentId: string): Promise<Array<HierarchyPathItem & { relation: string; status: string | null }>> {
  const links = await loadEntityParentLinks({ parentType, parentId });
  const recordsByKey = new Map<string, AnyRecord>();
  const groups = new Map<HierarchyNodeType, Set<string>>();
  links.forEach((link) => {
    if (!isHierarchyNodeType(link.child_type)) return;
    const childType = link.child_type as HierarchyNodeType;
    const ids = groups.get(childType) ?? new Set<string>();
    ids.add(link.child_id);
    groups.set(childType, ids);
  });
  await Promise.all([...groups.entries()].map(async ([childType, ids]) => {
    const records = await loadRecords(childType, { pageSize: MAX_PAGE_SIZE });
    records.filter((record) => ids.has(record.id)).forEach((record) => recordsByKey.set(`${childType}:${record.id}`, record));
  }));
  return links.flatMap((link) => {
    if (!isHierarchyNodeType(link.child_type)) return [];
    const childType = link.child_type as HierarchyNodeType;
    const record = recordsByKey.get(`${childType}:${link.child_id}`);
    return record ? [{ module: childType, id: link.child_id, title: hierarchyTitle(record), relation: link.relation_type, status: record.status ?? null }] : [];
  });
}

export async function createRecords(module: ModuleKey, inputs: Array<Record<string, unknown>>): Promise<AnyRecord[]> {
  const config = getModule(module);
  if (!config) throw new Error("Неизвестный раздел");
  if (!inputs.length) return [];
  const timestamp = new Date().toISOString();
  const normalizedInputs = await Promise.all(inputs.map(async (input) => normalizeRecordInput(module, await inheritProjectContext(input))));
  if (!supabase) {
    const records = normalizedInputs.map((input) => ({ id: crypto.randomUUID(), owner_id: ownerKey(), created_at: timestamp, updated_at: timestamp, ...input }));
    writeLocal(module, [...records, ...readLocal(module)]);
    await logActivities(records.map((record) => ({ action: "entity created", entityType: module, entityId: record.id, message: describeRecordCreation(module, record) })));
    await Promise.all(records.map((record) => syncEntityParent(module, record)));
    for (const record of records) await syncScheduleAncestors(module, record);
    return records;
  }
  const user = await supabase.auth.getUser();
  if (user.error) throw toDataError(user.error);
  if (!user.data.user) throw new Error("Нужна авторизация");
  const ownerId = user.data.user.id;
  const { data, error } = await supabase.from(config.table).insert(normalizedInputs.map((input) => ({ ...input, owner_id: ownerId, created_at: timestamp, updated_at: timestamp }))).select();
  if (error) throw toDataError(error);
  const records = (data ?? []) as AnyRecord[];
  await logActivities(records.map((record) => ({ action: "entity created", entityType: module, entityId: record.id, message: describeRecordCreation(module, record) })));
  await Promise.all(records.map((record) => syncEntityParent(module, record)));
  for (const record of records) await syncScheduleAncestors(module, record);
  return records;
}

export async function createRecord(module: ModuleKey, input: Record<string, unknown>): Promise<AnyRecord> {
  const [record] = await createRecords(module, [input]);
  if (!record) throw new Error("Не удалось создать запись");
  return record;
}

export async function updateRecord(module: ModuleKey, id: string, input: Record<string, unknown>): Promise<AnyRecord> {
  const config = getModule(module);
  if (!config) throw new Error("Неизвестный раздел");
  if (module === "ambassadors" && Object.prototype.hasOwnProperty.call(input, "total_xp")) {
    const existing = await loadRecord(module, id);
    const delta = Number(input.total_xp ?? 0) - Number(existing?.total_xp ?? 0);
    if (delta > 0) {
      await addAmbassadorContribution(id, { type: "Manual contribution", base_xp: delta, final_xp: delta, status: "Approved" });
      const refreshed = await loadRecord(module, id);
      if (refreshed) return refreshed;
    }
  }
  const existing = await loadRecord(module, id);
  const normalizedInput = normalizeRecordInput(module, await inheritProjectContext(input), existing);
  if (isHierarchyNodeType(module)) await validateHierarchyParent(module, id, parentSelectionForRecord(module, normalizedInput as AnyRecord));
  const timestamp = new Date().toISOString();
  if (!supabase) {
    const rows = readLocal(module).map((row) => row.id === id ? { ...row, ...normalizedInput, updated_at: timestamp } : row);
    writeLocal(module, rows);
    const updated = rows.find((row) => row.id === id);
    if (!updated) throw new Error("Запись не найдена");
    await logActivity("entity updated", module, id, `${displayName(updated)} обновлено. ${describeRecordChanges(module, existing ?? {}, updated)}`);
    await syncEntityParent(module, updated);
    await syncScheduleAncestors(module, updated);
    return updated;
  }
  const { data, error } = await supabase.from(config.table).update({ ...normalizedInput, updated_at: timestamp }).eq("id", id).select().single();
  if (error) throw toDataError(error);
  await logActivity("entity updated", module, id, `${displayName(data as AnyRecord)} обновлено. ${describeRecordChanges(module, existing ?? {}, data as AnyRecord)}`);
  await syncEntityParent(module, data as AnyRecord);
  await syncScheduleAncestors(module, data as AnyRecord);
  return data as AnyRecord;
}

export async function archiveRecord(module: ModuleKey, id: string) {
  const config = getModule(module);
  if (!config) throw new Error("Неизвестный раздел");
  const archived = new Date().toISOString();
  if (!supabase) {
    writeLocal(module, readLocal(module).map((row) => row.id === id ? { ...row, archived_at: archived, updated_at: archived } : row));
  } else {
    const { error } = await supabase.from(config.table).update({ archived_at: archived, updated_at: archived }).eq("id", id);
    if (error) throw toDataError(error);
  }
  await logActivity("entity archived", module, id, "Запись перемещена в архив");
}

export async function addRelation(sourceType: string, sourceId: string, relationType: string, targetType: string, targetId: string) {
  const record = { id: crypto.randomUUID(), owner_id: ownerKey(), source_type: sourceType, source_id: sourceId, relation_type: relationType, target_type: targetType, target_id: targetId, created_at: new Date().toISOString() };
  if (!supabase) {
    const rows = JSON.parse(window.localStorage.getItem("bcc-hub:relations") ?? "[]") as AnyRecord[];
    window.localStorage.setItem("bcc-hub:relations", JSON.stringify([record, ...rows]));
  } else {
    const user = await supabase.auth.getUser();
    if (user.error) throw toDataError(user.error);
    if (!user.data.user) throw new Error("Нужна авторизация");
    const { error } = await supabase.from("entity_relations").insert({ ...record, owner_id: user.data.user?.id });
    if (error) throw toDataError(error);
  }
  await logActivity("relation added", sourceType, sourceId, `Связь ${relationType} добавлена`);
}

export async function loadRelations(entityType?: string, entityId?: string): Promise<EntityRelation[]> {
  if (!supabase) {
    const rows = JSON.parse(window.localStorage.getItem("bcc-hub:relations") ?? "[]") as EntityRelation[];
    return rows.filter((row) => !entityType || !entityId ||
      (row.source_type === entityType && row.source_id === entityId) ||
      (row.target_type === entityType && row.target_id === entityId));
  }

  if (!entityType || !entityId) {
    const { data, error } = await supabase.from("entity_relations").select("*").order("created_at", { ascending: false }).limit(250);
    if (error) throw toDataError(error);
    return (data ?? []) as EntityRelation[];
  }

  const [source, target] = await Promise.all([
    supabase.from("entity_relations").select("*").eq("source_type", entityType).eq("source_id", entityId).limit(100),
    supabase.from("entity_relations").select("*").eq("target_type", entityType).eq("target_id", entityId).limit(100)
  ]);
  if (source.error) throw toDataError(source.error);
  if (target.error) throw toDataError(target.error);
  return [...(source.data ?? []), ...(target.data ?? [])].filter((row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index) as EntityRelation[];
}

export async function loadSubtasks(parentTaskId: string): Promise<AnyRecord[]> {
  if (!supabase) return readLocal("tasks").filter((row) => row.parent_task_id === parentTaskId && !row.archived_at);
  const { data, error } = await supabase.from("tasks").select("*").eq("parent_task_id", parentTaskId).is("archived_at", null).order("updated_at", { ascending: false }).limit(100);
  if (error) throw toDataError(error);
  return (data ?? []) as AnyRecord[];
}

export async function createSubtask(parentTaskId: string, input: Record<string, unknown>): Promise<AnyRecord> {
  const parent = await loadRecord("tasks", parentTaskId);
  if (!parent) throw new Error("Родительская задача не найдена");
  return createRecord("tasks", {
    ...input,
    parent_task_id: parentTaskId,
    project_id: parent.project_id ?? null,
    event_id: parent.event_id ?? null
  });
}

export async function loadTaskReadiness(taskId: string): Promise<TaskReadiness> {
  return calculateTaskReadiness(await loadSubtasks(taskId));
}

export async function loadComments(entityType: string, entityId: string): Promise<EntityComment[]> {
  if (!supabase) {
    const rows = JSON.parse(window.localStorage.getItem("bcc-hub:comments") ?? "[]") as EntityComment[];
    return rows.filter((row) => row.entity_type === entityType && row.entity_id === entityId);
  }
  const comments: EntityComment[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("entity_comments").select("*").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw toDataError(error);
    const page = (data ?? []) as EntityComment[];
    comments.push(...page);
    if (page.length < pageSize) return comments;
  }
}

export async function addComment(entityType: string, entityId: string, body: string): Promise<EntityComment> {
  const text = body.trim().slice(0, 10000);
  if (!text) throw new Error("Комментарий не может быть пустым");
  const now = new Date().toISOString();
  if (!supabase) {
    const comment: EntityComment = { id: crypto.randomUUID(), owner_id: ownerKey(), entity_type: entityType, entity_id: entityId, body: text, author_name: "Локальный режим", created_at: now, updated_at: now };
    const rows = JSON.parse(window.localStorage.getItem("bcc-hub:comments") ?? "[]") as EntityComment[];
    window.localStorage.setItem("bcc-hub:comments", JSON.stringify([...rows, comment]));
    await logActivity("comment added", entityType, entityId, "Добавлен комментарий");
    return comment;
  }
  const user = await supabase.auth.getUser();
  if (user.error) throw toDataError(user.error);
  if (!user.data.user) throw new Error("Нужна авторизация");
  const { data, error } = await supabase.from("entity_comments").insert({ owner_id: user.data.user.id, entity_type: entityType, entity_id: entityId, body: text, author_name: user.data.user.email ?? "Пользователь" }).select().single();
  if (error) throw toDataError(error);
  await logActivity("comment added", entityType, entityId, "Добавлен комментарий");
  return data as EntityComment;
}

const CONTACT_LINKS_KEY = "bcc-hub:entity-contact-links";

function readLocalContactLinks(): EntityContactLink[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(CONTACT_LINKS_KEY) ?? "[]") as EntityContactLink[]; } catch { return []; }
}

function writeLocalContactLinks(rows: EntityContactLink[]) {
  window.localStorage.setItem(CONTACT_LINKS_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("bcc:data-changed", { detail: "entity-contact-links" }));
}

export async function loadEntityContactLinks(entityType?: string, entityId?: string): Promise<EntityContactLink[]> {
  if (!supabase) {
    return readLocalContactLinks().filter((row) => (!entityType || row.entity_type === entityType) && (!entityId || row.entity_id === entityId));
  }
  let request = supabase.from("entity_contact_links").select("*").order("created_at", { ascending: true }).limit(500);
  if (entityType) request = request.eq("entity_type", entityType);
  if (entityId) request = request.eq("entity_id", entityId);
  const { data, error } = await request;
  if (error) throw toDataError(error);
  return (data ?? []) as EntityContactLink[];
}

export async function loadEntityContacts(entityType: string, entityId: string): Promise<AnyRecord[]> {
  const links = await loadEntityContactLinks(entityType, entityId);
  const ids = [...new Set(links.map((link) => link.contact_id))];
  if (!ids.length) return [];
  const rows = !supabase
    ? readLocal("people").filter((row) => ids.includes(row.id) && !row.archived_at)
    : await (async () => {
      const { data, error } = await supabase.from("contacts").select("*").in("id", ids).is("archived_at", null);
      if (error) throw toDataError(error);
      return (data ?? []) as AnyRecord[];
    })();
  const order = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

export async function replaceEntityContacts(entityType: string, entityId: string, contactIds: string[], role = "participant") {
  const ids = [...new Set(contactIds.filter(Boolean))];
  if (!supabase) {
    const now = new Date().toISOString();
    const kept = readLocalContactLinks().filter((row) => row.entity_type !== entityType || row.entity_id !== entityId);
    const next = ids.map((contactId) => ({ id: crypto.randomUUID(), owner_id: ownerKey(), entity_type: entityType, entity_id: entityId, contact_id: contactId, role, created_at: now } satisfies EntityContactLink));
    writeLocalContactLinks([...next, ...kept]);
  } else {
    const user = await supabase.auth.getUser();
    if (user.error) throw toDataError(user.error);
    if (!user.data.user) throw new Error("Нужна авторизация");
    const ownerId = user.data.user.id;
    const { error: deleteError } = await supabase.from("entity_contact_links").delete().eq("entity_type", entityType).eq("entity_id", entityId);
    if (deleteError) throw toDataError(deleteError);
    if (ids.length) {
      const { error: insertError } = await supabase.from("entity_contact_links").insert(ids.map((contactId) => ({ owner_id: ownerId, entity_type: entityType, entity_id: entityId, contact_id: contactId, role })));
      if (insertError) throw toDataError(insertError);
    }
  }
  await logActivity("contacts linked", entityType, entityId, `${ids.length} контакт(ов) привязано`);
}

export async function importEmployeeContacts(rows: EmployeeImportRow[]) {
  const existing = await loadAllRecords("people");
  const known = new Set(existing.map((row) => employeeIdentity(row)));
  const pending = rows.filter((row) => {
    const key = employeeIdentity(row);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  let created = 0;
  for (let index = 0; index < pending.length; index += 100) {
    const batch = pending.slice(index, index + 100);
    await createRecords("people", batch);
    created += batch.length;
  }
  if (created) await logActivity("employee import", "people", "directory", `${created} сотрудников импортировано; дубликаты пропущены`);
  return { total: rows.length, created, skipped: rows.length - created };
}

function isModuleKey(value: string): value is ModuleKey {
  return Boolean(getModule(value));
}

function connectionKey(module: string, id: string) {
  return `${module}:${id}`;
}

export async function loadConnectionGraph(module: ModuleKey, id: string): Promise<{ nodes: ConnectionNode[]; edges: ConnectionEdge[] }> {
  const rootRecord = await loadRecord(module, id);
  if (!rootRecord) return { nodes: [], edges: [] };
  const rootKey = connectionKey(module, id);
  const nodeCandidates = new Map<string, { module: ModuleKey; id: string; relation?: string }>();
  const edges: ConnectionEdge[] = [];
  const rootNode: ConnectionNode = { key: rootKey, module, id, title: displayName(rootRecord), subtitle: String(rootRecord.description ?? rootRecord.topic ?? ""), status: rootRecord.status, root: true };
  nodeCandidates.set(rootKey, { module, id });

  const addEdge = (sourceModule: string, sourceId: string, targetModule: string, targetId: string, relation: string, edgeKey: string) => {
    if (!isModuleKey(sourceModule) || !isModuleKey(targetModule) || sourceId === targetId && sourceModule === targetModule) return;
    const source = connectionKey(sourceModule, sourceId);
    const target = connectionKey(targetModule, targetId);
    nodeCandidates.set(source, { module: sourceModule, id: sourceId, relation });
    nodeCandidates.set(target, { module: targetModule, id: targetId, relation });
    edges.push({ key: edgeKey, source, target, relation });
  };

  const relations = await loadRelations(module, id);
  relations.forEach((relation) => {
    const sourceIsRoot = relation.source_type === module && relation.source_id === id;
    const targetIsRoot = relation.target_type === module && relation.target_id === id;
    if (sourceIsRoot) addEdge(module, id, relation.target_type, relation.target_id, relation.relation_type, relation.id);
    else if (targetIsRoot) addEdge(relation.source_type, relation.source_id, module, id, relation.relation_type, relation.id);
  });

  const contactLinks = await loadEntityContactLinks(module, id);
  contactLinks.forEach((link) => addEdge(module, id, "people", link.contact_id, link.role ?? "PARTICIPANT", `contact:${link.id}`));

  if (isHierarchyNodeType(module)) {
    const [parentLinks, childLinks] = await Promise.all([
      loadEntityParentLinks({ childType: module, childId: id }),
      loadEntityParentLinks({ parentType: module, parentId: id })
    ]);
    parentLinks.forEach((link) => {
      if (isHierarchyNodeType(link.parent_type)) addEdge(link.parent_type, link.parent_id, module, id, link.relation_type, `hierarchy-parent:${link.id}`);
    });
    childLinks.forEach((link) => {
      if (isHierarchyNodeType(link.child_type)) addEdge(module, id, link.child_type, link.child_id, link.relation_type, `hierarchy-child:${link.id}`);
    });
  }

  if (module === "tasks") {
    const children = await loadSubtasks(id);
    children.forEach((child) => addEdge(module, id, "tasks", child.id, "SUBTASK_OF", `subtask:${child.id}`));
    if (rootRecord.parent_task_id) addEdge("tasks", String(rootRecord.parent_task_id), module, id, "SUBTASK_OF", `parent:${rootRecord.parent_task_id}`);
  }

  const forwardLinks: Array<[string, ModuleKey]> = [
    ["project_id", "projects"], ["task_id", "tasks"], ["event_id", "events"],
    ["contact_id", "people"], ["ambassador_id", "ambassadors"], ["community_id", "communities"]
  ];
  forwardLinks.forEach(([field, targetModule]) => {
    const targetId = rootRecord[field];
    if (targetId && targetModule !== module) addEdge(module, id, targetModule, String(targetId), "CONTEXT", `context:${field}:${targetId}`);
  });

  const reverseLinks: Partial<Record<ModuleKey, Array<[ModuleKey, string]>>> = {
    projects: [["tasks", "project_id"], ["interactions", "project_id"], ["commitments", "project_id"], ["events", "project_id"], ["content", "project_id"], ["documents", "project_id"], ["decisions", "project_id"], ["knowledge", "project_id"]],
    tasks: [["documents", "task_id"], ["decisions", "task_id"], ["knowledge", "task_id"]],
    people: [["commitments", "contact_id"], ["ambassadors", "contact_id"]],
    interactions: [["commitments", "interaction_id"]],
    events: [["content", "event_id"], ["documents", "event_id"], ["knowledge", "event_id"]],
    communities: [["content", "community_id"]],
    ambassadors: [["content", "ambassador_id"], ["documents", "ambassador_id"]]
  };
  const reverseRows = await Promise.all((reverseLinks[module] ?? []).map(async ([childModule, field]) => {
    const rows = await loadRecords(childModule, { pageSize: 100 });
    return { childModule, field, rows: rows.filter((row) => String(row[field] ?? "") === id) };
  }));
  reverseRows.forEach(({ childModule, field, rows }) => rows.forEach((row) => addEdge(module, id, childModule, row.id, "CONTEXT", `reverse:${childModule}:${field}:${row.id}`)));

  const endpointKeys = [...nodeCandidates.keys()].filter((key) => key !== rootKey).slice(0, 30);
  const endpointGroups = new Map<ModuleKey, Set<string>>();
  endpointKeys.forEach((key) => {
    const [endpointModule, endpointId] = key.split(":");
    if (!isModuleKey(endpointModule) || !endpointId) return;
    const ids = endpointGroups.get(endpointModule) ?? new Set<string>();
    ids.add(endpointId);
    endpointGroups.set(endpointModule, ids);
  });
  const endpointRecords = (await Promise.all([...endpointGroups.entries()].map(async ([endpointModule, ids]) => {
    const records = await loadRecords(endpointModule, { pageSize: 100 });
    return [...ids].map((endpointId) => {
      const record = records.find((candidate) => candidate.id === endpointId);
      return record ? { key: connectionKey(endpointModule, endpointId), module: endpointModule, id: endpointId, record } : null;
    });
  }))).flat();
  const nodes: ConnectionNode[] = [rootNode];
  for (const endpoint of endpointRecords) {
    if (!endpoint) continue;
    const record = endpoint.record;
    nodes.push({ key: endpoint.key, module: endpoint.module, id: endpoint.id, title: displayName(record), subtitle: String(record.description ?? record.topic ?? record.position ?? ""), status: record.status != null ? String(record.status) : record.ring != null ? String(record.ring) : record.relationship_state != null ? String(record.relationship_state) : null });
  }

  const taskNodes = nodes.filter((node) => node.module === "tasks");
  if (taskNodes.length) {
    const taskRows = await loadRecords("tasks", { pageSize: 100 });
    taskNodes.forEach((node) => {
      node.readiness = calculateTaskReadiness(taskRows.filter((task) => task.parent_task_id === node.id));
    });
  }
  return { nodes, edges: edges.filter((edge, index, all) => all.findIndex((candidate) => candidate.key === edge.key) === index) };
}

export async function addAmbassadorContribution(ambassadorId: string, input: { type: string; base_xp: number; multiplier?: number; final_xp: number; date?: string; status?: string; review_note?: string }) {
  const contribution = { id: crypto.randomUUID(), ambassador_id: ambassadorId, owner_id: ownerKey(), type: input.type, base_xp: input.base_xp, multiplier: input.multiplier ?? 1, final_xp: input.final_xp, date: input.date ?? new Date().toISOString().slice(0, 10), status: input.status ?? "Approved", review_note: input.review_note, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!supabase) {
    const contributionKey = "bcc-hub:ambassador_contributions";
    const contributions = JSON.parse(window.localStorage.getItem(contributionKey) ?? "[]") as AnyRecord[];
    window.localStorage.setItem(contributionKey, JSON.stringify([contribution, ...contributions]));
    const rows = readLocal("ambassadors").map((row) => row.id === ambassadorId ? { ...row, total_xp: Number(row.total_xp ?? 0) + input.final_xp, current_quarter_xp: Number(row.current_quarter_xp ?? 0) + input.final_xp, last_contribution_at: contribution.date, updated_at: contribution.updated_at } : row);
    writeLocal("ambassadors", rows);
  } else {
    const user = await supabase.auth.getUser();
    if (user.error) throw toDataError(user.error);
    if (!user.data.user) throw new Error("Нужна авторизация");
    contribution.owner_id = user.data.user.id;
    const { error: atomicError } = await supabase.rpc("apply_ambassador_contribution", {
      p_ambassador_id: ambassadorId,
      p_type: contribution.type,
      p_base_xp: contribution.base_xp,
      p_multiplier: contribution.multiplier,
      p_final_xp: contribution.final_xp,
      p_date: contribution.date,
      p_status: contribution.status,
      p_review_note: contribution.review_note ?? null
    });
    if (atomicError) throw toDataError(atomicError);
    await logActivity("XP added", "ambassadors", ambassadorId, `${input.final_xp} XP добавлено через атомарный ledger`);
    return;
  }
  await logActivity("XP added", "ambassadors", ambassadorId, `${input.final_xp} XP добавлено через contribution ledger`);
}

export async function addWorkLog(taskId: string, input: { done: string; people?: string; discussed?: string; result?: string; next?: string }) {
  const message = [input.done, input.people && `С кем: ${input.people}`, input.discussed && `Обсудили: ${input.discussed}`, input.result && `Результат: ${input.result}`, input.next && `Дальше: ${input.next}`].filter(Boolean).join("\n");
  await logActivity("work log added", "tasks", taskId, message);
}

function resultTitle(row: AnyRecord): string {
  return displayName(row);
}

export async function searchAll(query: string, limit = 40, signal?: AbortSignal): Promise<WorkspaceSearchResult[]> {
  const normalized = query.trim().slice(0, MAX_SEARCH_LENGTH);
  if (!normalized) return [];
  if (signal?.aborted) throw new DOMException("Поиск отменён", "AbortError");
  if (supabase) {
    const request = supabase.rpc("workspace_search", { search_text: normalized, result_limit: limit });
    const { data, error } = await (signal ? request.abortSignal(signal) : request);
    if (!error && data) return data as WorkspaceSearchResult[];
  }
  if (signal?.aborted) throw new DOMException("Поиск отменён", "AbortError");
  const modules = Object.keys(SEED_DATA) as ModuleKey[];
  const perModule = Math.max(3, Math.ceil(limit / modules.length));
  const pages = await Promise.all(modules.map(async (module) => ({ module, rows: await loadRecords(module, { q: normalized, pageSize: perModule }) })));
  if (signal?.aborted) throw new DOMException("Поиск отменён", "AbortError");
  return pages.flatMap(({ module, rows }) => rows.flatMap((row) => {
    const rank = rankSearchRecord(row, getModule(module)?.searchFields ?? [], normalized);
    return rank > 0 ? [{ module, id: String(row.id), title: resultTitle(row), subtitle: String(row.description ?? row.position ?? row.category ?? ""), rank }] : [];
  })).sort((a, b) => b.rank - a.rank).slice(0, limit);
}

export async function findPotentialDuplicates(module: ModuleKey, input: Record<string, string>, limit = 5): Promise<AnyRecord[]> {
  const lookupValues = module === "people"
    ? [input.email, input.phone, [input.first_name, input.last_name].filter(Boolean).join(" "), input.organization_name]
    : [input.title ?? input.name];
  const uniqueLookups = [...new Set(lookupValues.map((value) => value?.trim()).filter((value): value is string => Boolean(value && value.length >= 2)))].slice(0, 4);
  const rows = uniqueLookups.length
    ? (await Promise.all(uniqueLookups.map((value) => listRecords(module, { q: value, pageSize: 25 })))).flatMap((page) => page.items).filter((row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index)
    : await loadRecords(module, { pageSize: MAX_PAGE_SIZE });
  return findDuplicateCandidates(module, rows, input, limit);
}

export async function findPotentialDuplicate(module: ModuleKey, input: Record<string, string>): Promise<AnyRecord | null> {
  return (await findPotentialDuplicates(module, input, 1))[0] ?? null;
}
