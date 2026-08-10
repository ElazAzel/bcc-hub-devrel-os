"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Plus, Sparkles } from "lucide-react";
import { createRecord, findPotentialDuplicate } from "@/lib/data";
import { getModule, MODULES, type FieldConfig, type ModuleKey } from "@/lib/types";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";

const quickTypes: ModuleKey[] = ["tasks", "projects", "people", "interactions", "commitments", "events", "content", "decisions"];
const meetupChecklist = ["Target audience", "Topic / stack", "Speaker confirmation", "Talk review", "Rehearsal #1", "Landing", "Announcement", "Registration", "Venue audit", "Backup laptop", "Final tech check", "Feedback QR", "Thank-you", "Retrospective"];

function initialValues(module: ModuleKey) { const config = getModule(module); return Object.fromEntries((config?.fields ?? []).map((field) => [field.key, field.type === "select" ? field.options?.[0] ?? "" : ""])); }

export function QuickAdd({ open, onClose, initialModule }: { open: boolean; onClose: () => void; initialModule?: ModuleKey }) {
  const [module, setModule] = useState<ModuleKey | null>(initialModule ?? null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [meetupTemplate, setMeetupTemplate] = useState(true);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const config = module ? getModule(module) : undefined;
  useEffect(() => { if (open) { setModule(initialModule ?? null); setValues(initialModule ? initialValues(initialModule) : {}); setMeetupTemplate(true); setDuplicate(null); setDuplicateConfirmed(false); setError(""); setSuccess(false); } }, [open, initialModule]);
  const fields = useMemo(() => (config?.fields ?? []).slice(0, 4), [config]);
  const setField = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!module || !config) return;
    if (config.fields.find((field) => field.required && !values[field.key]?.trim())) { setError("Заполни обязательное поле."); return; }
    setSaving(true); setError("");
    try {
      if (!duplicateConfirmed) {
        const match = await findPotentialDuplicate(module, values);
        if (match) { const matchName = String(match.title ?? match.name ?? `${match.first_name ?? ""} ${match.last_name ?? ""}`); setDuplicate(matchName); setDuplicateConfirmed(true); setError(`Возможно, такой объект уже существует: ${matchName}. Нажми «Создать» ещё раз, если это отдельная запись.`); setSaving(false); return; }
      }
      const created = await createRecord(module, values);
      if (module === "events" && values.type === "Meetup" && meetupTemplate) {
        for (const title of meetupChecklist) await createRecord("tasks", { title, status: "Planned", priority: "Normal", due_date: values.date_start || undefined, source_type: "Event", source_label: String(created.title ?? "Meetup") });
      }
      setSuccess(true); window.setTimeout(onClose, 650);
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить запись"); } finally { setSaving(false); }
  }

  return <Modal open={open} onClose={onClose} title={success ? "Сохранено" : module ? `Новый ${config?.singular}` : "Быстрое добавление"} description={success ? "Запись доступна в общем списке и после обновления страницы." : module ? "Только необходимое сейчас. Детали можно добавить позже." : "Сохрани следующий шаг, контакт или рабочий контекст за несколько секунд."}>
    {success ? <div className="flex flex-col items-center gap-3 py-10 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F7ED] text-[#18723B]"><Check /></div><p className="text-sm text-[#74747C]">Синхронизация завершена</p></div> : !module ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{quickTypes.map((key) => { const item = MODULES[key]; return <button key={key} onClick={() => { setModule(key); setValues(initialValues(key)); }} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-bcc-border p-3 text-center transition hover:border-bcc-violet/50 hover:bg-bcc-soft focus:outline-none focus:ring-4 focus:ring-bcc-lilac"><Plus size={18} className="text-bcc-violet" /><span className="text-sm font-medium">{item.singular}</span></button>; })}<div className="col-span-2 rounded-2xl bg-bcc-soft p-3 text-xs leading-5 text-[#74747C] sm:col-span-3"><Sparkles className="mr-1 inline text-bcc-violet" size={14} />Rule-based suggestions appear in context after you save — without pretending to be AI.</div></div> : <form onSubmit={submit} className="space-y-4"><button type="button" onClick={() => setModule(null)} className="button-ghost -ml-3"><ArrowLeft size={16} />Другой тип</button>{fields.map((field) => <QuickField key={field.key} field={field} value={values[field.key] ?? ""} onChange={(value) => setField(field.key, value)} />)}{module === "events" && values.type === "Meetup" && <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-bcc-lilac/50 p-3 text-sm"><input type="checkbox" className="mt-1 accent-[#8934F9]" checked={meetupTemplate} onChange={(event) => setMeetupTemplate(event.target.checked)} /><span><span className="block font-medium text-bcc-deep">Применить BCC HUB Meetup template</span><span className="mt-1 block text-xs leading-5 text-[#5F4A73]">Создаст checklist задач Strategy, Content, Marketing, Infrastructure, Event Day и Post-event.</span></span></label>}{error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]">{error}</p>}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" variant="brand" disabled={saving}>{saving ? "Сохраняем…" : "Создать"}</Button></div></form>}
  </Modal>;
}

function QuickField({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (value: string) => void }) { return <Field label={field.label}>{field.type === "textarea" ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} /> : field.type === "select" ? <Select value={value} onChange={(event) => onChange(event.target.value)}>{field.options?.map((option) => <option key={option}>{option}</option>)}</Select> : <Input type={field.type === "date" ? "date" : field.type === "number" ? "number" : field.type === "url" ? "url" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} />}</Field>; }
