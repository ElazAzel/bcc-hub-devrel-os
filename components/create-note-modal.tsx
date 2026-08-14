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
    setSaving(true); setError("");
    try {
      await createRecord("knowledge", { title: values.title.trim(), situation: values.situation.trim(), trigger: "Manual", ...recordFieldsForParent("knowledge", parent) });
      setValues({ title: "", situation: "" });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить заметку."); } finally { setSaving(false); }
  }

  return <Modal open={open} onClose={onClose} title="Добавить заметку" description="Заполни только то, что хочешь сохранить в текущем контексте."><form onSubmit={submit} className="space-y-4"><Field label="Заголовок"><Input autoFocus value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} placeholder="Например, что решили после встречи" /></Field><Field label="Текст заметки"><Textarea rows={6} value={values.situation} onChange={(event) => setValues({ ...values, situation: event.target.value })} placeholder="Зафиксируй факт, решение или наблюдение…" /></Field>{error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" variant="brand" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить заметку"}</Button></div></form></Modal>;
}
