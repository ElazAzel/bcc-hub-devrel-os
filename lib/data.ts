import { getSupabaseBrowserClient } from "./supabase/client";
import { SEED_DATA } from "./seed";
import { displayName, getModule, type AnyRecord, type ModuleKey } from "./types";

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
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
}

export async function signIn(email: string, password: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signUp(email: string, password: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signUp({ email, password });
  return { error };
}

export async function signOut() { if (supabase) await supabase.auth.signOut(); }

export async function loadRecords(module: ModuleKey): Promise<AnyRecord[]> {
  const config = getModule(module);
  if (!config) return [];
  if (!supabase) return readLocal(module).filter((row) => !row.archived_at);
  const { data, error } = await supabase.from(config.table).select("*").is("archived_at", null).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AnyRecord[];
}

export async function loadRecord(module: ModuleKey, id: string): Promise<AnyRecord | null> {
  const config = getModule(module);
  if (!config) return null;
  if (!supabase) return readLocal(module).find((row) => row.id === id && !row.archived_at) ?? null;
  const { data, error } = await supabase.from(config.table).select("*").eq("id", id).is("archived_at", null).maybeSingle();
  if (error) throw new Error(error.message);
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
  const { data } = await query;
  return (data ?? []) as AnyRecord[];
}

export async function createRecord(module: ModuleKey, input: Record<string, unknown>): Promise<AnyRecord> {
  const config = getModule(module);
  if (!config) throw new Error("Unknown module");
  const timestamp = new Date().toISOString();
  if (!supabase) {
    const record: AnyRecord = { id: crypto.randomUUID(), owner_id: ownerKey(), created_at: timestamp, updated_at: timestamp, ...input };
    writeLocal(module, [record, ...readLocal(module)]);
    await logActivity("entity created", module, record.id, `${displayName(record)} создано`);
    return record;
  }
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error("Нужна авторизация");
  const { data, error } = await supabase.from(config.table).insert({ ...input, owner_id: user.data.user.id, created_at: timestamp, updated_at: timestamp }).select().single();
  if (error) throw new Error(error.message);
  await logActivity("entity created", module, data.id, `${displayName(data as AnyRecord)} создано`);
  return data as AnyRecord;
}

export async function updateRecord(module: ModuleKey, id: string, input: Record<string, unknown>): Promise<AnyRecord> {
  const config = getModule(module);
  if (!config) throw new Error("Unknown module");
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
  if (error) throw new Error(error.message);
  await logActivity("entity updated", module, id, `${displayName(data as AnyRecord)} обновлено`);
  return data as AnyRecord;
}

export async function archiveRecord(module: ModuleKey, id: string) {
  const config = getModule(module);
  if (!config) throw new Error("Unknown module");
  const archived = new Date().toISOString();
  if (!supabase) {
    writeLocal(module, readLocal(module).map((row) => row.id === id ? { ...row, archived_at: archived, updated_at: archived } : row));
  } else {
    const { error } = await supabase.from(config.table).update({ archived_at: archived, updated_at: archived }).eq("id", id);
    if (error) throw new Error(error.message);
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
    const { error } = await supabase.from("entity_relations").insert({ ...record, owner_id: user.data.user?.id });
    if (error) throw new Error(error.message);
  }
  await logActivity("relation added", sourceType, sourceId, `Связь ${relationType} добавлена`);
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
    if (!user.data.user) throw new Error("Нужна авторизация");
    contribution.owner_id = user.data.user.id;
    const { error } = await supabase.from("ambassador_contributions").insert(contribution);
    if (error) throw new Error(error.message);
    const { data: ledger } = await supabase.from("ambassador_contributions").select("final_xp").eq("ambassador_id", ambassadorId).eq("status", "Approved");
    const total = (ledger ?? []).reduce((sum, row) => sum + Number(row.final_xp ?? 0), 0);
    const { error: updateError } = await supabase.from("ambassadors").update({ total_xp: total, last_contribution_at: contribution.date, updated_at: contribution.updated_at }).eq("id", ambassadorId);
    if (updateError) throw new Error(updateError.message);
  }
  await logActivity("XP added", "ambassadors", ambassadorId, `${input.final_xp} XP добавлено через contribution ledger`);
}

export async function addWorkLog(taskId: string, input: { done: string; people?: string; discussed?: string; result?: string; next?: string }) {
  const message = [input.done, input.people && `С кем: ${input.people}`, input.discussed && `Обсудили: ${input.discussed}`, input.result && `Результат: ${input.result}`, input.next && `Дальше: ${input.next}`].filter(Boolean).join("\n");
  await logActivity("work log added", "tasks", taskId, message);
}

export async function searchAll(query: string): Promise<Array<AnyRecord & { module: ModuleKey }>> {
  const modules = Object.keys(SEED_DATA) as ModuleKey[];
  const records = (await Promise.all(modules.map(async (module) => ({ module, rows: await loadRecords(module) })))).flatMap(({ module, rows }) => rows.map((row) => ({ ...row, module })));
  const normalized = query.trim().toLowerCase();
  return records.filter((row) => !normalized || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(normalized))).slice(0, 40);
}

export async function findPotentialDuplicate(module: ModuleKey, input: Record<string, string>): Promise<AnyRecord | null> {
  const rows = await loadRecords(module);
  const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const email = normalize(input.email);
  const phone = normalize(input.phone);
  const name = normalize([input.first_name, input.last_name].filter(Boolean).join(" "));
  const title = normalize(input.title ?? input.name);
  return rows.find((row) => {
    if (module === "people" && email && normalize(row.email) === email) return true;
    if (module === "people" && phone && normalize(row.phone) === phone) return true;
    if (module === "people" && name && normalize([row.first_name, row.last_name].filter(Boolean).join(" ")) === name && normalize(row.organization_name) === normalize(input.organization_name)) return true;
    if (module === "organizations" && title && normalize(row.name) === title) return true;
    if (module === "projects" && title && normalize(row.title) === title) return true;
    return false;
  }) ?? null;
}
