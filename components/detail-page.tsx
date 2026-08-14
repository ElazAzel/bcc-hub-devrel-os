"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Archive, ArrowLeft, CalendarClock, CheckCircle2, ChevronRight, Edit3, ExternalLink, Link2, MessageCircle, Network, Plus, Save, Sparkles, UserRound } from "lucide-react";
import { addAmbassadorContribution, addComment, addRelation, addWorkLog, archiveRecord, createSubtask, loadActivity, loadComments, loadConnectionGraph, loadEntityContacts, loadHierarchyChildren, loadHierarchyPath, loadRecord, loadRecords, loadSubtasks, replaceEntityContacts, updateRecord } from "@/lib/data";
import { fieldLabel, formatDateRu, localizeOptions, moduleCopy, ru } from "@/lib/i18n";
import { calculateProjectHealth } from "@/lib/health";
import { calculateEventReadiness, calculateTaskReadiness, readinessLabel } from "@/lib/readiness";
import { calculateTaskTiming } from "@/lib/task-timing";
import { taskUrgency, type TaskUrgency } from "@/lib/task-urgency";
import { displayName, getModule, isFieldVisible, type AnyRecord, type ConnectionNode, type EntityComment, type EventReadiness as EventReadinessResult, type FieldConfig, type ModuleKey, type TaskReadiness } from "@/lib/types";
import { hierarchySupports, hierarchyTypeLabel, parentSelectionForRecord, recordFieldsForParent, type HierarchyChild, type HierarchyNodeType, type HierarchyPathItem, type ParentSelection } from "@/lib/hierarchy";
import { PageHeader } from "./page-header";
import { StatusChip } from "./status-chip";
import { Button, EmptyState, ErrorState, Field, Input, LoadingState, Modal, Select, Textarea } from "./ui";
import { ContactPicker } from "./contact-picker";
import { ContextPicker } from "./context-picker";
import { CreateNoteModal } from "./create-note-modal";
import { MentionTextarea, RichTextWithMentions } from "./mentions";

type DetailView = "overview" | "connections";
type ConnectionGraph = Awaited<ReturnType<typeof loadConnectionGraph>>;

function TaskTimingPanel({ row }: { row: AnyRecord }) {
  const timing = calculateTaskTiming(row);
  const stateLabel = { early: "Раньше срока", "on-time": "В срок", late: "Позже срока", open: "В работе", unmeasured: "Нет даты старта" }[timing.state];
  const stateClass = timing.state === "late" ? "text-[#AF3030]" : timing.state === "early" ? "text-[#177479]" : "text-bcc-deep";
  return <section className="mb-6 rounded-2xl border border-bcc-border bg-white p-4 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="eyebrow">План и факт</div><div className={`mt-1 text-lg font-semibold ${stateClass}`}>{stateLabel}</div></div><span className="chip">{timing.durationDays !== null ? `${timing.durationDays} дн. фактически` : "Факт не измерен"}</span></div><div className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><div className="text-xs text-[#8A8A90]">Период</div><div className="mt-1 font-medium">{formatDateRu(row.start_date)} — {formatDateRu(row.end_date ?? row.due_date)}</div></div><div><div className="text-xs text-[#8A8A90]">Плановая длительность</div><div className="mt-1 font-medium">{timing.plannedDays !== null ? `${timing.plannedDays} дн.` : "—"}</div></div><div><div className="text-xs text-[#8A8A90]">Отклонение</div><div className={`mt-1 font-medium ${stateClass}`}>{timing.varianceDays === null ? "—" : timing.varianceDays === 0 ? "0 дн." : `${Math.abs(timing.varianceDays)} дн. ${timing.varianceDays < 0 ? "раньше" : "позже"}`}</div></div></div>{timing.requiresReason && <p className="mt-3 rounded-xl bg-[#FFF9E8] px-3 py-2 text-xs font-medium text-[#765300]">Добавь в поле «Почему срок изменился» комментарий о причине отклонения.</p>}{row.schedule_variance_reason && <p className="mt-3 whitespace-pre-wrap text-sm text-[#5F5F68]">Причина: {String(row.schedule_variance_reason)}</p>}</section>;
}

export function DetailPage({ module, id }: { module: ModuleKey; id: string }) {
  const router = useRouter();
  const config = getModule(module)!;
  const copy = moduleCopy(module);
  const [record, setRecord] = useState<AnyRecord | null>(null);
  const [activity, setActivity] = useState<AnyRecord[]>([]);
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [contacts, setContacts] = useState<AnyRecord[]>([]);
  const [subtasks, setSubtasks] = useState<AnyRecord[]>([]);
  const [readiness, setReadiness] = useState<TaskReadiness | null>(null);
  const [eventReadiness, setEventReadiness] = useState<EventReadinessResult | null>(null);
  const [health, setHealth] = useState<{ score: number; state: string; reasons: string[] } | null>(null);
  const [graph, setGraph] = useState<ConnectionGraph | null>(null);
  const [hierarchyPath, setHierarchyPath] = useState<HierarchyPathItem[]>([]);
  const [hierarchyChildren, setHierarchyChildren] = useState<HierarchyChild[]>([]);
  const [view, setView] = useState<DetailView>("overview");
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState("");
  const [commentsError, setCommentsError] = useState("");
  const [contactsError, setContactsError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [relationOpen, setRelationOpen] = useState(false);
  const [workLogOpen, setWorkLogOpen] = useState(false);
  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const next = await loadRecord(module, id);
      setRecord(next);
      if (!next) return;
      setCommentsError("");
      setContactsError("");
      const [log, nextComments, nextContacts] = await Promise.all([
        loadActivity(module, id),
        loadComments(module, id).catch(() => {
          setCommentsError("Комментарии пока недоступны. Проверь миграцию слоя комментариев в Supabase.");
          return [];
        }),
        module === "people" ? Promise.resolve([]) : loadEntityContacts(module, id).catch(() => {
          setContactsError("Не удалось загрузить связанные контакты. Повтори попытку после применения миграции.");
          return [];
        })
      ]);
      setActivity(log);
      setComments(nextComments);
      setContacts(nextContacts);
      if (hierarchySupports(module)) {
        const [path, children] = await Promise.all([loadHierarchyPath(module as HierarchyNodeType, id), loadHierarchyChildren(module as HierarchyNodeType, id)]);
        setHierarchyPath(path);
        setHierarchyChildren(children);
      } else {
        setHierarchyPath([]);
        setHierarchyChildren([]);
      }
      if (module === "tasks") {
        const children = await loadSubtasks(id);
        setSubtasks(children);
        setReadiness(calculateTaskReadiness(children));
      } else {
        setSubtasks([]);
        setReadiness(null);
      }
      if (module === "projects") {
        const [tasks, commitments] = await Promise.all([loadRecords("tasks", { pageSize: 100 }), loadRecords("commitments", { pageSize: 100 })]);
        setHealth(calculateProjectHealth(next, tasks, commitments));
      } else {
        setHealth(null);
      }
      if (module === "events") {
        const tasks = await loadRecords("tasks", { pageSize: 100 });
        setEventReadiness(calculateEventReadiness(next, tasks.filter((task) => task.event_id === id)));
      } else {
        setEventReadiness(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть запись.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshGraph() {
    setGraphLoading(true);
    try {
      setGraph(await loadConnectionGraph(module, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить связи.");
    } finally {
      setGraphLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [module, id]);
  useEffect(() => { if (view === "connections" && !graph) void refreshGraph(); }, [view, graph, module, id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!record) return <EmptyState title="Запись не найдена" description="Возможно, она архивирована или ссылка устарела." action={<Link href={`/${module}`} className="button-secondary">Вернуться к списку</Link>} />;

  const details = config.fields.filter((field) => isFieldVisible(module, field, record) && record[field.key] !== undefined && record[field.key] !== null && record[field.key] !== "");
  const parentTask = module === "tasks" && record.parent_task_id ? hierarchyPath.find((item) => item.module === "tasks" && item.id === String(record.parent_task_id)) : undefined;
  return <div>
    <Link href={`/${module}`} className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#74747C] hover:text-bcc-deep"><ArrowLeft size={16} />Назад к {copy.label.toLowerCase()}</Link>
    <PageHeader eyebrow={copy.singular} title={displayName(record)} description={String(record.description ?? record.notes ?? record.summary ?? record.situation ?? "Рабочая запись и её контекст.")} action={{ label: "Редактировать", onClick: () => setEditOpen(true) }} />
    {hierarchyPath.length > 1 && <HierarchyBreadcrumbs path={hierarchyPath} />}
    {module === "tasks" && record.parent_task_id && <div className="mb-6 flex items-center gap-2 rounded-2xl border border-bcc-violet/20 bg-bcc-lilac/40 px-4 py-3 text-sm text-bcc-deep"><span className="font-semibold">Субзадача</span><span>основной задачи{parentTask ? `: ${parentTask.title}` : ""}</span></div>}
    {module === "tasks" && <TaskUrgencyBadge row={record} />}
    {module === "tasks" && <TaskTimingPanel row={record} />}

    <div className="mb-6 flex min-h-11 gap-1 overflow-x-auto rounded-2xl border border-bcc-border bg-white p-1 shadow-card" role="tablist" aria-label="Разделы записи">
      <TabButton active={view === "overview"} onClick={() => setView("overview")} icon={<Edit3 size={15} />}>Обзор</TabButton>
      <TabButton active={view === "connections"} onClick={() => setView("connections")} icon={<Network size={15} />}>Связи и карта</TabButton>
    </div>

      {view === "connections" ? <ConnectionsPanel graph={graph} loading={graphLoading} onRetry={refreshGraph} /> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-6">
      <section className="surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex flex-wrap items-center gap-2"><StatusChip value={record.status ?? record.ring ?? record.change_state ?? record.relationship_state} /><StatusChip value={record.priority} tone="brand" />{record.direction && <span className="chip">{ru(record.direction)}</span>}{record.due_date && <span className="chip"><CalendarClock size={13} />{formatDateRu(record.due_date)}</span>}{module === "tasks" && (record.start_time || record.end_time) && <span className="chip"><CalendarClock size={13} />{String(record.start_time ?? "")} {record.end_time ? `— ${record.end_time}` : ""}</span>}{module === "tasks" && record.meeting_mode && <span className="chip">{ru(record.meeting_mode)}</span>}</div><div className="flex flex-wrap gap-1"><Button variant="ghost" onClick={() => setRelationOpen(true)}><Link2 size={16} />Связать</Button><Button variant="ghost" onClick={() => setArchiveOpen(true)}><Archive size={16} />Архив</Button></div></div>{health && <HealthPanel details={health} />}{module === "tasks" && readiness && <TaskReadinessPanel readiness={readiness} />}{module === "tech-radar" && <RadarPanel record={record} />}{module === "events" && eventReadiness && <EventReadiness readiness={eventReadiness} />}{module === "people" && <RelationshipPanel record={record} />}{module === "ambassadors" && <AmbassadorPanel record={record} onUpdate={async (xp) => { await addAmbassadorContribution(id, { type: "Manual contribution", base_xp: xp, final_xp: xp, status: "Approved" }); await refresh(); }} />}</section>
      {hierarchySupports(module) && <HierarchySection module={module} childrenRows={hierarchyChildren} onAddNote={() => setNoteOpen(true)} />}
      {module === "tasks" && <SubtasksSection subtasks={subtasks} readiness={readiness ?? calculateTaskReadiness([])} onAdd={() => setSubtaskOpen(true)} onChanged={refresh} />}
      {module === "tasks" && <WorkLogSection activity={activity} onAdd={() => setWorkLogOpen(true)} />}
      {module !== "people" && <ParticipantsSection contacts={contacts} error={contactsError} onChanged={async (ids) => { await replaceEntityContacts(module, id, ids); setContacts(await loadEntityContacts(module, id)); }} />}
      <CommentsSection entityType={module} entityId={id} comments={comments} error={commentsError} onSaved={(comment) => { setComments((current) => [...current, comment]); setCommentsError(""); }} />
      <section className="surface p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">История изменений</div><h2 className="mt-1 text-xl font-semibold">Всё, что происходило</h2></div><span className="chip">{activity.length}</span></div>{activity.length ? <div className="mt-5 space-y-4">{activity.map((item) => <div key={item.id} className="flex gap-3"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bcc-lilac text-bcc-deep"><CheckCircle2 size={14} /></span><div><div className="whitespace-pre-wrap text-sm font-medium">{String(item.message ?? item.action)}</div><div className="mt-0.5 text-xs text-[#8A8A90]">{formatDateTime(item.created_at)}</div></div></div>)}</div> : <p className="mt-5 text-sm text-[#74747C]">История появится после изменений и связанных действий.</p>}</section>
      <section className="surface p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">Контекст</div><h2 className="mt-1 text-xl font-semibold">Детали записи</h2></div><Button variant="ghost" onClick={() => setEditOpen(true)}><Edit3 size={16} />Изменить</Button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{details.length ? details.map((field) => <DetailField key={field.key} field={field} value={record[field.key]} />) : <p className="text-sm text-[#74747C]">Пока нет дополнительных полей.</p>}</div></section>
    </div><aside className="space-y-4"><div className="surface p-5"><div className="eyebrow">Быстрый контекст</div><div className="mt-4 space-y-3"><ContextRow label="Создано" value={formatDateTime(record.created_at)} /><ContextRow label="Обновлено" value={formatDateTime(record.updated_at)} />{record.next_action && <ContextRow label="Следующий шаг" value={String(record.next_action)} accent />}{record.external_url && <a className="flex items-center gap-2 text-sm font-medium text-bcc-deep" href={String(record.external_url)} target="_blank" rel="noreferrer"><ExternalLink size={15} />Открыть внешний источник</a>}</div></div><div className="surface-muted p-5"><div className="flex items-center gap-2 text-bcc-deep"><Sparkles size={16} /><span className="text-sm font-semibold">Следующий шаг</span></div><p className="mt-3 text-sm leading-6 text-[#5F4A73]">{record.next_action ? String(record.next_action) : "Добавь следующий шаг, чтобы запись не потерялась в контексте."}</p><Button variant="secondary" className="mt-4 w-full" onClick={() => setEditOpen(true)}>Добавить шаг</Button></div></aside></div>}

    <EditModal open={editOpen} onClose={() => setEditOpen(false)} module={module} record={record} onSaved={(updated) => { setRecord(updated); setEditOpen(false); void refresh(); }} />
    <RelationModal open={relationOpen} onClose={() => { setRelationOpen(false); if (view === "connections") void refreshGraph(); }} sourceModule={module} sourceId={id} />
    {module === "tasks" && <><TaskWorkLogModal open={workLogOpen} onClose={() => setWorkLogOpen(false)} taskId={id} onSaved={() => { setWorkLogOpen(false); void refresh(); }} /><CreateSubtaskModal open={subtaskOpen} onClose={() => setSubtaskOpen(false)} parentId={id} onSaved={() => { setSubtaskOpen(false); void refresh(); }} /></>}
    {["projects", "events", "tasks"].includes(module) && <CreateNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} parent={{ parentType: module as HierarchyNodeType, parentId: id }} onSaved={() => { setNoteOpen(false); void refresh(); }} />}
    <Modal open={archiveOpen} onClose={() => setArchiveOpen(false)} title="Переместить в архив?" description="Рабочая история останется доступной в архиве."><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setArchiveOpen(false)}>Отмена</Button><Button variant="primary" onClick={async () => { await archiveRecord(module, id); router.push(`/${module}`); }}>Архивировать</Button></div></Modal>
  </div>;
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${active ? "bg-bcc-ink text-white" : "text-[#74747C] hover:bg-bcc-soft hover:text-bcc-ink"}`}>{icon}{children}</button>;
}

function HierarchyBreadcrumbs({ path }: { path: HierarchyPathItem[] }) {
  return <nav className="mb-6 rounded-2xl border border-bcc-border bg-white px-4 py-3 shadow-card" aria-label="Иерархия записи"><div className="eyebrow">Рабочий контекст</div><div className="mt-2 flex min-w-0 items-center gap-1 overflow-x-auto text-sm">{path.map((item, index) => <span key={`${item.module}:${item.id}`} className="flex min-w-0 shrink-0 items-center gap-1"><span className="text-[#B0ADB7]">{index ? "→" : ""}</span>{index === path.length - 1 ? <span className="max-w-[240px] truncate font-semibold text-bcc-ink">{item.title}</span> : <Link href={`/${item.module}/${item.id}`} className="max-w-[220px] truncate font-medium text-bcc-deep hover:underline">{item.title}</Link>}</span>)}</div></nav>;
}

function HierarchySection({ module, childrenRows, onAddNote }: { module: ModuleKey; childrenRows: HierarchyChild[]; onAddNote?: () => void }) {
  const canAddNote = ["projects", "events", "tasks"].includes(module);
  const visibleRows = childrenRows.filter((child) => !(module === "tasks" && child.module === "tasks"));
  if (!visibleRows.length && !canAddNote) return null;
  return <section className="surface p-5 sm:p-6" aria-labelledby="hierarchy-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow">Структура и контекст</div><h2 id="hierarchy-title" className="mt-1 text-xl font-semibold">Рабочее дерево</h2><p className="mt-1 text-sm text-[#74747C]">Здесь собраны записи, которые относятся к текущему проекту, событию или задаче.</p></div>{canAddNote && onAddNote && <Button variant="secondary" onClick={onAddNote}><Plus size={16} />Добавить заметку</Button>}</div>{visibleRows.length ? <div className="mt-5 divide-y divide-bcc-border rounded-2xl border border-bcc-border">{visibleRows.map((child) => <Link key={`${child.module}:${child.id}`} href={`/${child.module}/${child.id}`} className="flex min-h-14 items-center gap-3 px-3 py-3 transition hover:bg-bcc-soft sm:px-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bcc-lilac text-xs font-semibold text-bcc-deep">{hierarchyTypeLabel(child.module).slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{child.title}</span><span className="mt-0.5 block truncate text-xs text-[#8A8A90]">{hierarchyTypeLabel(child.module)} · {child.relation === "NOTE_ON" ? "заметка" : "часть контекста"}</span></span>{child.status && <StatusChip value={child.status} />}<ChevronRight size={16} className="shrink-0 text-[#8A8A90]" /></Link>)}</div> : <p className="mt-5 rounded-2xl bg-bcc-soft px-4 py-4 text-sm text-[#74747C]">Пока нет вложенных заметок и материалов.</p>}</section>;
}

function ParticipantsSection({ contacts, error, onChanged }: { contacts: AnyRecord[]; error: string; onChanged: (ids: string[]) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function change(next: string[]) {
    setSaving(true); setMessage("");
    try { await onChanged(next); setMessage("Контакты сохранены."); } catch (err) { setMessage(err instanceof Error ? err.message : "Не удалось сохранить контакты."); } finally { setSaving(false); }
  }
  return <section className="surface p-5 sm:p-6" aria-labelledby="participants-title"><div className="mb-4"><div className="eyebrow">Связи записи</div><h2 id="participants-title" className="mt-1 text-xl font-semibold">С кем взаимодействовал</h2><p className="mt-1 text-sm text-[#74747C]">Эти контакты будут видны в карте связей и помогут восстановить контекст.</p></div><ContactPicker value={contacts.map((contact) => contact.id)} onChange={(ids) => void change(ids)} disabled={saving} />{error && <p className="mt-3 rounded-xl bg-[#FFF4DE] px-3 py-2 text-sm text-[#76551A]">{error}</p>}{message && <p className="mt-3 text-sm text-[#18723B]" role="status">{message}</p>}</section>;
}

function SubtasksSection({ subtasks, readiness, onAdd, onChanged }: { subtasks: AnyRecord[]; readiness: TaskReadiness; onAdd: () => void; onChanged: () => Promise<void> }) {
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  async function changeStatus(id: string, status: string) {
    setUpdating(id);
    setError("");
    try { await updateRecord("tasks", id, { status }); await onChanged(); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось обновить статус субзадачи."); } finally { setUpdating(""); }
  }
  return <section className="surface p-5 sm:p-6" aria-labelledby="subtasks-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow">Структура задачи</div><h2 id="subtasks-title" className="mt-1 text-xl font-semibold">Субзадачи</h2><p className="mt-1 text-sm text-[#74747C]">Их статус автоматически показывает готовность основной задачи.</p></div><Button variant="brand" onClick={onAdd}><Plus size={16} />Добавить субзадачу</Button></div><div className="mt-5 rounded-2xl bg-bcc-soft p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-semibold">Готовность: {readiness.percent}%</div><div className="mt-1 text-xs text-[#74747C]">{readinessLabel(readiness)}{readiness.inProgress ? ` · ${readiness.inProgress} в работе` : ""}{readiness.blocked ? ` · ${readiness.blocked} заблокировано` : ""}</div></div><span className="text-sm font-semibold text-bcc-deep">{readiness.done}/{readiness.total}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-bcc-primary transition-[width] duration-500" style={{ width: `${readiness.percent}%` }} /></div></div>{subtasks.length ? <div className="mt-5 divide-y divide-bcc-border rounded-2xl border border-bcc-border">{subtasks.map((task) => <div key={task.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.status === "Done" ? "bg-[#2BA36B]" : task.status === "In Progress" ? "bg-bcc-primary" : task.status === "Blocked" ? "bg-[#D95D5D]" : "bg-[#B8B4C2]"}`} /><Link href={`/tasks/${task.id}`} className="min-w-0 flex-1"><span className="block truncate text-sm font-medium hover:text-bcc-deep">{displayName(task)}</span><span className="mt-0.5 block truncate text-xs text-[#8A8A90]">{task.next_action ?? task.description ?? "Без дополнительного описания"}</span></Link><Select aria-label={`Статус субзадачи ${displayName(task)}`} disabled={updating === task.id} value={String(task.status ?? "Inbox")} onChange={(event) => void changeStatus(task.id, event.target.value)} className="w-auto min-w-[128px] py-2 text-xs"><option>Inbox</option><option>Planned</option><option>In Progress</option><option>Waiting</option><option>Blocked</option><option>Done</option><option>Cancelled</option></Select><Link href={`/tasks/${task.id}`} aria-label={`Открыть субзадачу ${displayName(task)}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-[#8A8A90] hover:bg-bcc-soft hover:text-bcc-deep"><ChevronRight size={17} /></Link></div>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-bcc-border px-4 py-8 text-center"><p className="text-sm font-medium">Субзадач пока нет</p><p className="mt-1 text-sm text-[#74747C]">Разбей задачу на маленькие шаги — прогресс станет виден автоматически.</p></div>}</section>;
}

function CommentsSection({ entityType, entityId, comments, error, onSaved }: { entityType: ModuleKey; entityId: string; comments: EntityComment[]; error: string; onSaved: (comment: EntityComment) => void }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) { setMessage("Напиши комментарий перед сохранением."); return; }
    setSaving(true); setMessage("");
    try {
      const comment = await addComment(entityType, entityId, draft);
      onSaved(comment);
      setDraft("");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Не удалось сохранить комментарий."); } finally { setSaving(false); }
  }
  return <section className="surface p-5 sm:p-6" aria-labelledby="comments-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="eyebrow">Взаимодействие</div><h2 id="comments-title" className="mt-1 text-xl font-semibold">Комментарии и рабочие заметки</h2></div><span className="chip"><MessageCircle size={13} />{comments.length}</span></div>{error && <p className="mt-4 rounded-xl bg-[#FFF4DE] px-3 py-2 text-sm text-[#76551A]">{error}</p>}<form onSubmit={submit} className="mt-5 space-y-3"><Textarea aria-label="Новый комментарий" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Зафиксируй мысль, решение или договорённость…" rows={3} /><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[#8A8A90]">Комментарий останется в контексте этой записи.</span><Button variant="brand" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Добавить комментарий"}</Button></div>{message && <p className="text-sm text-[#AF3030]" role="alert">{message}</p>}</form>{comments.length ? <div className="mt-6 space-y-3">{comments.map((comment) => <article key={comment.id} className="rounded-2xl bg-bcc-soft p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-bcc-deep">{comment.author_name ?? "Пользователь"}</span><time className="text-xs text-[#8A8A90]">{formatDateTime(comment.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-bcc-ink">{comment.body}</p></article>)}</div> : <p className="mt-5 text-sm text-[#74747C]">Комментариев пока нет. Добавь первую заметку, чтобы сохранить контекст.</p>}</section>;
}

function ConnectionsPanel({ graph, loading, onRetry }: { graph: ConnectionGraph | null; loading: boolean; onRetry: () => void }) {
  if (loading || !graph) return <section className="surface p-6"><LoadingState label="Собираем карту связей" /></section>;
  const root = graph.nodes.find((node) => node.root);
  const related = graph.nodes.filter((node) => !node.root);
  const left = related.filter((_, index) => index % 2 === 0);
  const right = related.filter((_, index) => index % 2 === 1);
  return <section className="surface overflow-hidden p-5 sm:p-6" aria-labelledby="connections-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow">Логическая карта</div><h2 id="connections-title" className="mt-1 text-xl font-semibold">Связи записи</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#74747C]">Здесь собраны субзадачи, связанные записи и рабочий контекст. Нажми на узел, чтобы открыть его детали.</p></div><Button variant="secondary" onClick={onRetry}><Network size={16} />Обновить карту</Button></div>{root ? <div className="mt-6 rounded-3xl bg-bcc-soft/70 p-4 sm:p-6"><div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)_minmax(0,1fr)]"><div className="space-y-3">{left.map((node) => <ConnectionNodeCard key={node.key} node={node} relation={relationForNode(graph, node.key)} />)}{!left.length && <p className="px-2 text-sm text-[#8A8A90]">Связи появятся здесь</p>}</div><div className="relative rounded-3xl border-2 border-bcc-primary bg-white p-5 text-center shadow-popover"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-bcc-lilac text-bcc-deep"><Network size={21} /></div><div className="mt-3 line-clamp-3 text-base font-semibold">{root.title}</div><div className="mt-2 flex flex-wrap justify-center gap-2"><span className="chip">Центр карты</span>{root.status && <StatusChip value={root.status} />}</div>{root.readiness && <MiniReadiness readiness={root.readiness} />}</div><div className="space-y-3">{right.map((node) => <ConnectionNodeCard key={node.key} node={node} relation={relationForNode(graph, node.key)} />)}{!right.length && <p className="px-2 text-sm text-[#8A8A90]">Связи появятся здесь</p>}</div></div></div> : <EmptyState title="Не удалось построить карту" description="Попробуй обновить связи." action={<Button variant="secondary" onClick={onRetry}>Повторить</Button>} />}<div className="mt-5 flex flex-wrap gap-2 text-xs text-[#74747C]"><span className="chip">{graph.nodes.length} узлов</span><span className="chip">{graph.edges.length} связей</span><span className="chip">Статус и прогресс обновляются из записей</span></div></section>;
}

function ConnectionNodeCard({ node, relation }: { node: ConnectionNode; relation: string }) {
  return <Link href={`/${node.module}/${node.id}`} className="group block rounded-2xl border border-bcc-border bg-white p-4 transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-bcc-primary hover:shadow-card"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bcc-lilac text-xs font-semibold text-bcc-deep">{node.title.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold group-hover:text-bcc-deep">{node.title}</span><span className="mt-1 block text-xs text-[#8A8A90]">{relationLabel(relation)} · {moduleLabel(node.module)}</span>{node.status && <span className="mt-2 block"><StatusChip value={node.status} /></span>}{node.readiness && <MiniReadiness readiness={node.readiness} />}</span><ChevronRight size={16} className="mt-1 shrink-0 text-[#8A8A90]" /></div></Link>;
}

function MiniReadiness({ readiness }: { readiness: TaskReadiness }) {
  return <div className="mt-3"><div className="flex justify-between text-[11px] text-[#74747C]"><span>Готовность</span><span>{readiness.percent}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bcc-soft"><div className="h-full rounded-full bg-bcc-primary" style={{ width: `${readiness.percent}%` }} /></div></div>;
}

function relationForNode(graph: ConnectionGraph, key: string) { return graph.edges.find((edge) => edge.source === key || edge.target === key)?.relation ?? "RELATED_TO"; }
function relationLabel(value: string) { return ({ SUBTASK_OF: "Субзадача", RELATED_TO: "Связано", BLOCKS: "Блокирует", DEPENDS_ON: "Зависит от", MENTIONS: "Упоминает", CONTEXT: "Контекст" } as Record<string, string>)[value] ?? value.replaceAll("_", " "); }
function moduleLabel(module: ModuleKey) { return ({ projects: "проект", tasks: "задача", people: "контакт", interactions: "взаимодействие", commitments: "договорённость", events: "событие", content: "материал", documents: "документ", knowledge: "кейс" } as Partial<Record<ModuleKey, string>>)[module] ?? module; }

function WorkLogSection({ activity, onAdd }: { activity: AnyRecord[]; onAdd: () => void }) { const logs = activity.filter((item) => item.action === "work log added"); return <section className="surface p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Рабочий журнал</div><h2 className="mt-1 text-xl font-semibold">Что произошло по задаче</h2></div><Button variant="brand" onClick={onAdd}><Plus size={16} />Добавить запись</Button></div>{logs.length ? <div className="mt-5 space-y-4">{logs.map((item) => <div key={item.id} className="rounded-2xl bg-bcc-soft p-4"><div className="whitespace-pre-wrap text-sm font-medium">{String(item.message)}</div><div className="mt-1 text-xs text-[#8A8A90]">{formatDateTime(item.created_at)}</div></div>)}</div> : <p className="mt-5 text-sm text-[#74747C]">Добавляй результат, обсуждение и следующий шаг — это сохраняет рабочую память.</p>}</section>; }

function CreateSubtaskModal({ open, onClose, parentId, onSaved }: { open: boolean; onClose: () => void; parentId: string; onSaved: () => void }) { const [values, setValues] = useState({ title: "", description: "", status: "Inbox", priority: "Normal", due_date: "" }); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await createSubtask(parentId, values); setValues({ title: "", description: "", status: "Inbox", priority: "Normal", due_date: "" }); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось создать субзадачу."); } finally { setSaving(false); } } return <Modal open={open} onClose={onClose} title="Добавить субзадачу" description="Она будет связана с текущей задачей и войдёт в расчёт готовности."><form onSubmit={submit} className="space-y-4"><Field label="Название"><Input autoFocus value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} placeholder="Например, собрать обратную связь" /></Field><Field label="Описание"><Textarea value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Статус"><Select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value })}><option>Inbox</option><option>Planned</option><option>In Progress</option><option>Waiting</option><option>Blocked</option><option>Done</option></Select></Field><Field label="Приоритет"><Select value={values.priority} onChange={(event) => setValues({ ...values, priority: event.target.value })}><option>Low</option><option>Normal</option><option>High</option><option>Critical</option></Select></Field></div><Field label="Срок"><Input type="date" value={values.due_date} onChange={(event) => setValues({ ...values, due_date: event.target.value })} /></Field>{error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" variant="brand" disabled={saving}>{saving ? "Создаём…" : "Создать субзадачу"}</Button></div></form></Modal>; }

function EditModal({ open, onClose, module, record, onSaved }: { open: boolean; onClose: () => void; module: ModuleKey; record: AnyRecord; onSaved: (record: AnyRecord) => void }) { const config = getModule(module)!; const [values, setValues] = useState<Record<string, string>>({}); const [parent, setParent] = useState<ParentSelection>({}); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); useEffect(() => { if (open) { setValues(Object.fromEntries(config.fields.map((field) => [field.key, String(record[field.key] ?? "")] ))); setParent(parentSelectionForRecord(module, record)); } }, [open, config, module, record]); async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { onSaved(await updateRecord(module, record.id, { ...values, ...recordFieldsForParent(module, parent) })); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить"); } finally { setSaving(false); } } return <Modal open={open} onClose={onClose} title={`Редактировать ${moduleCopy(module).singular}`} description="Изменения попадут в облачную базу и историю изменений."><form onSubmit={submit} className="space-y-4">{config.fields.map((field) => <RecordField key={field.key} field={field} value={values[field.key] ?? ""} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />)}{hierarchySupports(module) && <ContextPicker module={module} value={parent} currentId={record.id} onChange={setParent} />}{error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" variant="brand" disabled={saving}><Save size={16} />{saving ? "Сохраняем…" : "Сохранить"}</Button></div></form></Modal>; }

function TaskWorkLogModal({ open, onClose, taskId, onSaved }: { open: boolean; onClose: () => void; taskId: string; onSaved: () => void }) { const [values, setValues] = useState({ done: "", people: "", discussed: "", result: "", next: "" }); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); try { await addWorkLog(taskId, values); setValues({ done: "", people: "", discussed: "", result: "", next: "" }); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить запись"); } finally { setSaving(false); } } return <Modal open={open} onClose={onClose} title="Рабочий журнал" description="Короткая запись о том, что произошло."><form onSubmit={submit} className="space-y-4"><Field label="Что сделал?"><Textarea value={values.done} onChange={(event) => setValues({ ...values, done: event.target.value })} /></Field><Field label="С кем взаимодействовал?"><Input value={values.people} onChange={(event) => setValues({ ...values, people: event.target.value })} /></Field><Field label="Что обсудили?"><Textarea value={values.discussed} onChange={(event) => setValues({ ...values, discussed: event.target.value })} /></Field><Field label="Какой результат?"><Textarea value={values.result} onChange={(event) => setValues({ ...values, result: event.target.value })} /></Field><Field label="Что дальше?"><Input value={values.next} onChange={(event) => setValues({ ...values, next: event.target.value })} /></Field>{error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}<div className="flex justify-end"><Button type="submit" variant="brand" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить запись"}</Button></div></form></Modal>; }

function RelationModal({ open, onClose, sourceModule, sourceId }: { open: boolean; onClose: () => void; sourceModule: ModuleKey; sourceId: string }) { const [targetModule, setTargetModule] = useState<ModuleKey>("projects"); const [targetId, setTargetId] = useState(""); const [rows, setRows] = useState<AnyRecord[]>([]); const [relation, setRelation] = useState("RELATED_TO"); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); useEffect(() => { if (open) loadRecords(targetModule, { pageSize: 50 }).then((next) => setRows(next.filter((row) => !(targetModule === sourceModule && row.id === sourceId)))).catch(() => setRows([])); }, [open, targetModule, sourceId, sourceModule]); async function submit(event: FormEvent) { event.preventDefault(); if (!targetId) return; setSaving(true); try { await addRelation(sourceModule, sourceId, relation, targetModule, targetId); setMessage("Связь сохранена"); setTimeout(onClose, 450); } catch (err) { setMessage(err instanceof Error ? err.message : "Не удалось сохранить связь"); } finally { setSaving(false); } } return <Modal open={open} onClose={onClose} title="Добавить связь" description="Связь будет видна в карте и истории записи."><form onSubmit={submit} className="space-y-4"><Field label="Тип связи"><Select value={relation} onChange={(event) => setRelation(event.target.value)}><option value="RELATED_TO">Связано с</option><option value="BLOCKS">Блокирует</option><option value="DEPENDS_ON">Зависит от</option><option value="MENTIONS">Упоминает</option></Select></Field><Field label="Сущность"><Select value={targetModule} onChange={(event) => { setTargetModule(event.target.value as ModuleKey); setTargetId(""); }}><option value="projects">Проект</option><option value="tasks">Задача</option><option value="people">Контакт</option><option value="interactions">Взаимодействие</option><option value="commitments">Договорённость</option><option value="events">Событие</option><option value="content">Материал</option><option value="documents">Документ</option><option value="knowledge">Кейс</option></Select></Field><Field label="Запись"><Select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Выбери запись</option>{rows.map((row) => <option key={row.id} value={row.id}>{displayName(row)}</option>)}</Select></Field>{message && <p className="rounded-xl bg-bcc-soft px-3 py-2 text-sm text-[#5F5F68]">{message}</p>}<div className="flex justify-end"><Button variant="brand" type="submit" disabled={saving || !targetId}><Link2 size={16} />{saving ? "Сохраняем…" : "Связать"}</Button></div></form></Modal>; }

function RecordField({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (value: string) => void }) {
  const wrapperClass = field.key === "meeting_url" ? "task-meeting-url" : field.key === "location" ? "task-meeting-location" : "";
  return <div className={wrapperClass}><Field label={fieldLabel(field)}>{field.type === "textarea" ? <MentionTextarea name={field.key} value={value} onChange={onChange} placeholder={field.placeholder} /> : field.type === "select" ? <Select name={field.key} value={value} onChange={(event) => onChange(event.target.value)}>{field.key === "meeting_mode" && <option value="">Не указано</option>}{localizeOptions(field.options).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : <Input name={field.key} type={field.type === "date" ? "date" : field.type === "time" ? "time" : field.type === "number" ? "number" : field.type === "url" ? "url" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} />}</Field></div>;
}
function DetailField({ field, value }: { field: FieldConfig; value: unknown }) { return <div><div className="text-xs uppercase tracking-[0.08em] text-[#8A8A90]">{fieldLabel(field)}</div><div className="mt-1 text-sm leading-6 text-bcc-ink">{field.type === "url" ? <a href={String(value)} target="_blank" rel="noreferrer" className="text-bcc-deep underline">{String(value)}</a> : field.type === "date" ? formatDateRu(value) : field.type === "select" ? ru(value) : <RichTextWithMentions value={String(value ?? "")} />}</div></div>; }
function ContextRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div><div className="text-xs text-[#8A8A90]">{label}</div><div className={`mt-0.5 text-sm leading-5 ${accent ? "font-medium text-bcc-deep" : "text-bcc-ink"}`}>{value}</div></div>; }
function TaskUrgencyBadge({ row }: { row: AnyRecord }) { const urgency = taskUrgency(row); if (urgency === "none") return null; const labels: Record<Exclude<TaskUrgency, "none">, string> = { overdue: "Просрочено", today: "Дедлайн сегодня", soon: "Дедлайн скоро" }; const classes: Record<Exclude<TaskUrgency, "none">, string> = { overdue: "border-[#F2B8B8] bg-[#FFF1F1] text-[#AF3030]", today: "border-[#F2B8B8] bg-[#FFF1F1] text-[#AF3030]", soon: "border-[#F1D28C] bg-[#FFF9E8] text-[#A56600]" }; return <div className={`mb-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${classes[urgency]}`} role="status"><CalendarClock size={16} />{labels[urgency]}: {formatDateRu(row.due_date)}</div>; }
function TaskReadinessPanel({ readiness }: { readiness: TaskReadiness }) { return <div className="mt-6 rounded-2xl bg-bcc-soft p-4"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Готовность по субзадачам</div><div className="mt-1 text-3xl font-semibold">{readiness.percent}%</div></div><span className="chip">{readiness.done}/{readiness.total} готово</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-bcc-primary" style={{ width: `${readiness.percent}%` }} /></div><p className="mt-3 text-xs text-[#74747C]">{readinessLabel(readiness)}{readiness.inProgress ? ` · ${readiness.inProgress} в работе` : ""}{readiness.blocked ? ` · ${readiness.blocked} заблокировано` : ""}</p></div>; }
function HealthPanel({ details }: { details: { score: number; state: string; reasons: string[] } }) { return <div className="mt-6 rounded-2xl bg-bcc-soft p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="eyebrow">Здоровье проекта</div><div className="mt-1 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-[-0.06em]">{details.score}</span><StatusChip value={details.state} /></div></div><div className="h-16 w-16 rounded-full p-1" style={{ background: `conic-gradient(#8934F9 ${details.score * 3.6}deg, #E8E7EC 0deg)` }}><div className="flex h-full w-full items-center justify-center rounded-full bg-bcc-soft text-xs font-semibold">{details.score}%</div></div></div><div className="mt-4 space-y-1 text-sm text-[#5F5F68]">{details.reasons.map((reason) => <div key={reason}>• {reason}</div>)}</div></div>; }
function RadarPanel({ record }: { record: AnyRecord }) { return <div className="mt-6 rounded-2xl bg-bcc-lilac/60 p-4"><div className="flex items-center gap-2 text-bcc-deep"><Sparkles size={16} /><span className="font-semibold">Рекомендация</span></div><p className="mt-2 text-sm leading-6 text-[#5F4A73]">{String(record.recommendation ?? "Добавь прозрачную рекомендацию для команды.")}</p><div className="mt-3 flex flex-wrap gap-2"><StatusChip value={record.ring} /><StatusChip value={record.change_state} /></div></div>; }
function EventReadiness({ readiness }: { readiness: EventReadinessResult }) { return <div className="mt-6 rounded-2xl bg-bcc-cyan/50 p-4"><div className="flex items-center justify-between"><div><div className="eyebrow">Готовность события</div><div className="mt-1 text-3xl font-semibold">{readiness.percent}%</div></div><CalendarClock className="text-[#177479]" /></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-[#177479]" style={{ width: `${readiness.percent}%` }} /></div><p className="mt-3 text-xs text-[#3E6B6E]">Регистрации: {readiness.registrationPercent}% · критичные задачи: {readiness.criticalTaskPercent}%.</p></div>; }
function RelationshipPanel({ record }: { record: AnyRecord }) { const days = record.last_interaction_at ? Math.floor((Date.now() - new Date(String(record.last_interaction_at)).getTime()) / 86400000) : 999; const score = Math.max(0, Math.min(100, (days < 14 ? 60 : days < 30 ? 42 : 20) + (record.next_follow_up_at ? 25 : 0) + (record.relationship_type ? 15 : 0))); const state = score >= 75 ? "Active" : score >= 50 ? "Warm" : score >= 25 ? "Cooling" : "Dormant"; return <div className="mt-6 rounded-2xl bg-bcc-cyan/50 p-4"><div className="flex items-center justify-between"><div><div className="eyebrow">Активность связи</div><div className="mt-1 flex items-baseline gap-2"><span className="text-3xl font-semibold">{score}</span><StatusChip value={state} /></div></div><UserRound className="text-[#177479]" /></div><p className="mt-3 text-xs leading-5 text-[#3E6B6E]">Показатель учитывает давность контакта, follow-up и тип связи. Это не оценка человека.</p></div>; }
function AmbassadorPanel({ record, onUpdate }: { record: AnyRecord; onUpdate: (xp: number) => Promise<void> }) { const [open, setOpen] = useState(false); return <div className="mt-6 rounded-2xl bg-bcc-lilac/60 p-4"><div className="flex items-center justify-between"><div><div className="eyebrow">Журнал XP</div><div className="mt-1 text-3xl font-semibold">{Number(record.total_xp ?? 0)} XP</div></div><UserRound className="text-bcc-deep" /></div><div className="mt-2 text-sm text-[#5F4A73]">{ru(record.track ?? "Трек не указан")} · {ru(record.level ?? "LV.0 Newcomer")}</div><Button variant="brand" className="mt-4" onClick={() => setOpen(true)}><Plus size={16} />Начислить XP</Button><XpModal open={open} onClose={() => setOpen(false)} onSave={async (xp) => { await onUpdate(xp); setOpen(false); }} /></div>; }
function XpModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (xp: number) => Promise<void> }) { const [xp, setXp] = useState("20"); return <Modal open={open} onClose={onClose} title="Добавить вклад" description="Запись сохранится в XP-журнале как источник истины."><form onSubmit={async (event) => { event.preventDefault(); await onSave(Number(xp)); }} className="space-y-4"><Field label="XP"><Input type="number" min="1" required value={xp} onChange={(event) => setXp(event.target.value)} /></Field><p className="text-xs leading-5 text-[#74747C]">Итоговый XP подтверждает пользователь, автоматические множители не применяются.</p><div className="flex justify-end"><Button variant="brand" type="submit">Сохранить вклад</Button></div></form></Modal>; }
function formatDateTime(value: unknown) { if (!value) return "—"; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date); }
