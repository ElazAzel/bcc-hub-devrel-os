"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Plus, Sparkles } from "lucide-react";
import { createRecord, createRecords, findPotentialDuplicates, replaceEntityContacts } from "@/lib/data";
import { fieldLabel, localizeOptions, moduleCopy, ru } from "@/lib/i18n";
import { hierarchySupports, recordFieldsForParent, type ParentSelection } from "@/lib/hierarchy";
import { calculateTaskTiming } from "@/lib/task-timing";
import { getModule, isFieldVisible, type AnyRecord, type FieldConfig, type ModuleKey } from "@/lib/types";
import { Button, Field, Input, Modal, Select } from "./ui";
import { ContactPicker } from "./contact-picker";
import { ContextPicker } from "./context-picker";
import { MentionTextarea } from "./mentions";

const quickTypes: ModuleKey[] = ["tasks", "projects", "people", "interactions", "commitments", "events", "content", "decisions", "knowledge"];
const meetupChecklist = ["Аудитория", "Тема и стек", "Подтверждение спикера", "Проверка доклада", "Репетиция", "Лендинг", "Анонс", "Регистрация", "Проверка площадки", "Резервный ноутбук", "Финальная проверка", "QR для обратной связи", "Спасибо участникам", "Ретроспектива"];

function initialValues(module: ModuleKey) {
  const config = getModule(module);
  return Object.fromEntries((config?.fields ?? []).map((field) => [field.key, field.type === "select" && field.key !== "meeting_mode" ? field.options?.[0] ?? "" : ""]));
}

function recordName(record: AnyRecord) {
  return String(record.title ?? record.name ?? ([record.first_name, record.last_name].filter(Boolean).join(" ") || "Без названия"));
}

export function QuickAdd({ open, onClose, initialModule }: { open: boolean; onClose: () => void; initialModule?: ModuleKey }) {
  const [module, setModule] = useState<ModuleKey | null>(initialModule ?? null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [meetupTemplate, setMeetupTemplate] = useState(true);
  const [duplicates, setDuplicates] = useState<AnyRecord[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [parent, setParent] = useState<ParentSelection>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<AnyRecord | null>(null);
  const config = (module ? getModule(module) : getModule("tasks"))!;

  useEffect(() => {
    if (!open) return;
    savingRef.current = false;
    setModule(initialModule ?? null);
    setValues(initialModule ? initialValues(initialModule) : {});
    setShowDetails(false);
    setMeetupTemplate(true);
    setDuplicates([]);
    setDuplicateAcknowledged(false);
    setContactIds([]);
    setParent({});
    setError("");
    setCreated(null);
  }, [open, initialModule]);

  useEffect(() => {
    if (!open || !module) return;
    const frame = window.requestAnimationFrame(() => {
      const firstField = config.fields.find((field) => field.type !== "select" || field.required) ?? config.fields[0];
      document.getElementById(`quick-${firstField?.key ?? ""}`)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [config, module, open]);

  const fields = useMemo(() => {
    const all = (config?.fields ?? []).filter((field) => isFieldVisible(module ?? "tasks", field, values));
    return showDetails ? all : all.slice(0, 6);
  }, [config, module, showDetails, values]);

  function setField(key: string, value: string) { setValues((current) => ({ ...current, [key]: value })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!module || !config || savingRef.current) return;
    const missing = config.fields.find((field) => field.required && !values[field.key]?.trim());
    if (missing) {
      setError(`Заполни поле «${fieldLabel(missing)}».`);
      window.requestAnimationFrame(() => document.getElementById(`quick-${missing.key}`)?.focus());
      return;
    }
    if ((module === "tasks" || module === "knowledge") && (!parent.parentType || !parent.parentId)) {
      setError(module === "knowledge" ? "Привяжи заметку к проекту, событию или задаче." : "Привяжи задачу к проекту, событию или другой задаче.");
      return;
    }
    const recordInput = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    if (module === "tasks") {
      if (recordInput.meeting_mode === "online") recordInput.location = "";
      if (recordInput.meeting_mode === "offline") recordInput.meeting_url = "";
      if (calculateTaskTiming(recordInput).requiresReason) {
        setShowDetails(true);
        setError("Добавь комментарий, почему задача завершилась раньше или позже срока.");
        return;
      }
    }
    const normalizedInput = { ...recordInput, ...recordFieldsForParent(module, parent) };
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      if (!duplicateAcknowledged) {
        const matches = await findPotentialDuplicates(module, recordInput);
        if (matches.length) { setDuplicates(matches); savingRef.current = false; setSaving(false); return; }
      }
      const createdRecord = await createRecord(module, normalizedInput);
      if (module !== "people" && contactIds.length) await replaceEntityContacts(module, createdRecord.id, contactIds);
      if (module === "events" && recordInput.type === "Meetup" && meetupTemplate) {
        await createRecords("tasks", meetupChecklist.map((title) => ({ title, status: "Planned", priority: "Normal", due_date: values.date_start || undefined, source_type: "Event", source_label: recordName(createdRecord), event_id: createdRecord.id })));
      }
      setCreated(createdRecord);
      window.dispatchEvent(new CustomEvent("bcc:data-changed", { detail: module }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить запись. Проверь соединение и повтори попытку.");
    } finally { savingRef.current = false; setSaving(false); }
  }

  if (!config && module) return null;
  return <Modal open={open} onClose={onClose} title={created ? "Запись создана" : module ? `Новый ${moduleCopy(module).singular}` : "Быстрое добавление"} description={created ? "Запись уже доступна в рабочем пространстве." : module ? "Заполни только главное. Остальное можно добавить позже." : "Выбери тип записи и сохрани следующий шаг за несколько секунд."} wide>
    {created && module ? <div className="flex flex-col items-center gap-4 py-8 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F7ED] text-[#18723B]"><Check /></div><p className="text-sm text-[#74747C]">Готово. Данные сохранены.</p><div className="flex flex-wrap justify-center gap-2"><Link href={`/${module}/${created.id}`} onClick={onClose} className="button-brand">Открыть запись <ExternalLink size={15} /></Link><Button variant="secondary" onClick={onClose}>Закрыть</Button></div></div> : !module ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{quickTypes.map((key) => <button key={key} type="button" onClick={() => { setModule(key); setValues(initialValues(key)); setParent({}); }} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-bcc-border p-3 text-center transition hover:border-bcc-violet/50 hover:bg-bcc-soft focus:outline-none focus:ring-4 focus:ring-bcc-lilac"><Plus size={18} className="text-bcc-violet" /><span className="text-sm font-medium">{moduleCopy(key).singular}</span></button>)}<div className="col-span-2 rounded-2xl bg-bcc-soft p-3 text-xs leading-5 text-[#74747C] sm:col-span-3"><Sparkles className="mr-1 inline text-bcc-violet" size={14} />Подсказки появляются после сохранения и не требуют сложных настроек.</div></div> : <form onSubmit={submit} className="space-y-4"><button type="button" onClick={() => { setModule(null); setDuplicates([]); setParent({}); }} className="button-ghost -ml-3"><ArrowLeft size={16} />Другой тип</button>{fields.map((field) => <QuickField key={field.key} field={field} value={values[field.key] ?? ""} onChange={(value) => setField(field.key, value)} />)}{hierarchySupports(module) && <ContextPicker module={module} value={parent} onChange={setParent} required={module === "tasks" || module === "knowledge"} />}{module !== "people" && <ContactPicker value={contactIds} onChange={setContactIds} />}{config.fields.length > fields.length && <button type="button" className="button-ghost" onClick={() => setShowDetails(true)}>Показать дополнительные поля ({config.fields.length - fields.length})</button>}{module === "events" && values.type === "Meetup" && <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-bcc-lilac/50 p-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#8934F9]" checked={meetupTemplate} onChange={(event) => setMeetupTemplate(event.target.checked)} /><span><span className="block font-medium text-bcc-deep">Добавить чек-лист митапа</span><span className="mt-1 block text-xs leading-5 text-[#5F4A73]">14 задач создадутся одной операцией после события.</span></span></label>}{duplicates.length > 0 && <div className="rounded-2xl border border-[#F3D58A] bg-[#FFF9E8] p-3 text-sm" role="alert"><p className="font-semibold text-[#765300]">Похоже, такая запись уже есть</p><div className="mt-2 space-y-2">{duplicates.map((duplicate) => <div key={duplicate.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2"><span className="min-w-0 truncate">{recordName(duplicate)}</span><Link href={`/${module}/${duplicate.id}`} onClick={onClose} className="shrink-0 text-xs font-semibold text-bcc-deep">Открыть</Link></div>)}</div><button type="button" className="mt-3 text-xs font-semibold text-[#765300] underline" onClick={() => { setDuplicateAcknowledged(true); setDuplicates([]); }}>Создать всё равно</button></div>}{error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" variant="brand" disabled={saving}>{saving ? "Сохраняем…" : "Создать"}</Button></div></form>}
  </Modal>;
}

function QuickField({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (value: string) => void }) {
  const id = `quick-${field.key}`;
  const common = { id, name: field.key, required: field.required };
  return <Field label={fieldLabel(field)}>{field.type === "textarea" ? <MentionTextarea {...common} value={value} onChange={onChange} placeholder={field.placeholder ? ru(field.placeholder) : undefined} /> : field.type === "select" ? <Select {...common} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Выбрать…</option>{localizeOptions(field.options).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : <Input {...common} type={field.type === "date" ? "date" : field.type === "time" ? "time" : field.type === "number" ? "number" : field.type === "url" ? "url" : field.key === "email" ? "email" : "text"} inputMode={field.type === "number" ? "decimal" : undefined} spellCheck={field.key === "email" || field.type === "url" ? false : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder ? ru(field.placeholder) : undefined} />}</Field>;
}
