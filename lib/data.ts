import { getSupabaseBrowserClient } from "./supabase/client";
import { SEED_DATA } from "./seed";
import { findDuplicateCandidates, normalizeText, rankSearchRecord } from "./search";
import { toDataError } from "./errors";
import { displayName, getModule, type AnyRecord, type ConnectionEdge, type ConnectionNode, type EntityComment, type EntityRelation, type ModuleKey, type RecordListQuery, type RecordPage, type TaskReadiness, type WorkspaceSearchResult } from "./types";
import { calculateTaskReadiness } from "./readiness";

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
  projects: ["health_score", "health_state", "last_activity_at", "project_type", "goal", "expected_result", "actual_result"],
  tasks: ["project_id", "parent_task_id", "source_date", "requested_by_contact_id", "expected_result", "blocker", "actual_result", "retrospective", "completed_at"],
  people: ["name", "phone", "relationship_score", "relationship_state", "last_interaction_at"],
  organizations: ["notes"],
  interactions: ["project_id", "event_id", "what_i_said", "what_they_said", "follow_up_date"],
  commitments: ["contact_id", "project_id", "interaction_id"],
  events: ["project_id", "format", "capacity", "registrations", "confirmed", "attended", "nps", "budget_planned", "budget_actual"],
  content: ["author_contact_id", "ambassador_id", "project_id", "event_id", "community_id", "published_at", "views", "reach", "likes", "comments", "shares"],
  communities: ["owner_contact_id", "last_activity_at"],
  ambassadors: ["contact_id", "start_date", "training_progress", "last_contribution_at"],
  "tech-radar": ["slug", "domain", "rationale", "owner_contact_id"],
  documents: ["storage_path", "project_id", "task_id", "event_id", "contact_id", "ambassador_id", "version", "last_updated_at"],
  decisions: ["date", "problem", "options", "consequences", "review_date", "project_id", "task_id"],
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
    return { items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize, hasMore: start + pageSize < rows.length };
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
  return { items: (data ?? []) as unknown as AnyRecord[], total, page, pageSize, hasMore: start + pageSize < total };
}

export async function loadRecords(module: ModuleKey, query: RecordListQuery = {}): Promise<AnyRecord[]> {
  const result = await listRecords(module, { pageSize: MAX_PAGE_SIZE, ...query });
  return result.items;
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

export async function createRecords(module: ModuleKey, inputs: Array<Record<string, unknown>>): Promise<AnyRecord[]> {
  const config = getModule(module);
  if (!config) throw new Error("Неизвестный раздел");
  if (!inputs.length) return [];
  const timestamp = new Date().toISOString();
  if (!supabase) {
    const records = inputs.map((input) => ({ id: crypto.randomUUID(), owner_id: ownerKey(), created_at: timestamp, updated_at: timestamp, ...input }));
    writeLocal(module, [...records, ...readLocal(module)]);
    await logActivities(records.map((record) => ({ action: "entity created", entityType: module, entityId: record.id, message: `${displayName(record)} создано` })));
    return records;
  }
  const user = await supabase.auth.getUser();
  if (user.error) throw toDataError(user.error);
  if (!user.data.user) throw new Error("Нужна авторизация");
  const ownerId = user.data.user.id;
  const { data, error } = await supabase.from(config.table).insert(inputs.map((input) => ({ ...input, owner_id: ownerId, created_at: timestamp, updated_at: timestamp }))).select();
  if (error) throw toDataError(error);
  const records = (data ?? []) as AnyRecord[];
  await logActivities(records.map((record) => ({ action: "entity created", entityType: module, entityId: record.id, message: `${displayName(record)} создано` })));
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
  const timestamp = new Date().toISOString();
  if (!supabase) {
    const rows = readLocal(module).map((row) => row.id === id ? { ...row, ...input, updated_at: timestamp } : row);
    writeLocal(module, rows);
    const updated = rows.find((row) => row.id === id);
    if (!updated) throw new Error("Запись не найдена");
    await logActivity("entity updated", module, id, `${displayName(updated)} обновлено`);
    return updated;
  }
  const { data, error } = await supabase.from(config.table).update({ ...input, updated_at: timestamp }).eq("id", id).select().single();
  if (error) throw toDataError(error);
  await logActivity("entity updated", module, id, `${displayName(data as AnyRecord)} обновлено`);
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
  return createRecord("tasks", { ...input, parent_task_id: parentTaskId });
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
  const endpointRecords = await Promise.all(endpointKeys.map(async (key) => {
    const [endpointModule, endpointId] = key.split(":");
    if (!isModuleKey(endpointModule) || !endpointId) return null;
    const record = await loadRecord(endpointModule, endpointId);
    return record ? { key, module: endpointModule, id: endpointId, record } : null;
  }));
  const nodes: ConnectionNode[] = [rootNode];
  for (const endpoint of endpointRecords) {
    if (!endpoint) continue;
    const record = endpoint.record;
    nodes.push({ key: endpoint.key, module: endpoint.module, id: endpoint.id, title: displayName(record), subtitle: String(record.description ?? record.topic ?? record.position ?? ""), status: record.status ?? record.ring ?? record.relationship_state });
  }

  const taskNodes = nodes.filter((node) => node.module === "tasks");
  await Promise.all(taskNodes.map(async (node) => {
    const children = await loadSubtasks(node.id);
    node.readiness = calculateTaskReadiness(children);
  }));
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
