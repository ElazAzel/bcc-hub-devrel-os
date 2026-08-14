"use client";

import { useState, type ChangeEvent, type FormEvent, type TextareaHTMLAttributes } from "react";
import { createRecord } from "@/lib/data";
import { recordFieldsForParent, type ParentSelection } from "@/lib/hierarchy";
import { Button, Field, Input, Modal } from "./ui";
import { MentionTextarea } from "./mentions";

function Textarea({ value = "", onChange, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <MentionTextarea {...props} value={String(value)} onChange={(next) => onChange?.({ target: { value: next } } as ChangeEvent<HTMLTextAreaElement>)} />;
}

export function CreateNoteModal({ open, onClose, parent, onSaved }: { open: boolean; onClose: () => void; parent: ParentSelection; onSaved: () => void }) {
  const [values, setValues] = useState({ title: "", situation: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values.title.trim() || !values.situation.trim()) { setError("Укажи заголовок и текст заметки."); return; }
    if (!parent.parentType || !parent.parentId) { setError("Не найден родительский контекст."); return; }
    setSaving(true); setError("");
    try {
      await createRecord("knowledge", { title: values.title.trim(), situation: values.situation.trim(), trigger: "Manual", ...recordFieldsForParent("knowledge", parent) });
      setValues({ title: "", situation: "" });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить заметку."); } finally { setSaving(false); }
  }

  return <Modal open={open} onClose={onClose} title="Добавить заметку" description="Заметка будет вложена в текущий контекст и появится в карте связей."><form onSubmit={submit} className="space-y-4"><Field label="Заголовок"><Input autoFocus required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} placeholder="Например, что решили после встречи" /></Field><Field label="Текст заметки"><Textarea required rows={6} value={values.situation} onChange={(event) => setValues({ ...values, situation: event.target.value })} placeholder="Зафиксируй факт, решение или наблюдение…" /></Field>{error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" variant="brand" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить заметку"}</Button></div></form></Modal>;
}
