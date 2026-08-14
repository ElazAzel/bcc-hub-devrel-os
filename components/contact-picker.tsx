"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import { createRecord, loadRecord, loadRecords } from "@/lib/data";
import { displayName, type AnyRecord } from "@/lib/types";
import { Button, Field, Input, Select } from "./ui";

type ContactPickerProps = {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
};

function contactLabel(contact: AnyRecord) {
  return displayName(contact) || String(contact.email ?? "Контакт");
}

export function ContactPicker({ value, onChange, label = "С кем взаимодействовал?", hint = "Выбери существующий контакт или создай новый.", disabled = false }: ContactPickerProps) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AnyRecord[]>([]);
  const [selected, setSelected] = useState<AnyRecord[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", position: "", phone: "", email: "", contact_kind: "External" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadRecords("people", { q: query.trim() || undefined, pageSize: 40 })
      .then((next) => { if (active) setRows(next); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Не удалось загрузить контакты."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  useEffect(() => {
    let active = true;
    const missing = value.filter((id) => !selected.some((contact) => contact.id === id));
    if (!missing.length) return;
    Promise.all(missing.map((id) => loadRecord("people", id).catch(() => null))).then((contacts) => {
      if (!active) return;
      setSelected((current) => [...current, ...contacts.filter((contact): contact is AnyRecord => Boolean(contact))].filter((contact, index, all) => all.findIndex((item) => item.id === contact.id) === index));
    });
    return () => { active = false; };
  }, [value, selected]);

  const visibleRows = useMemo(() => rows.filter((row) => !value.includes(row.id)), [rows, value]);

  function toggle(id: string) {
    if (disabled) return;
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else onChange([...value, id]);
  }

  function remove(id: string) {
    onChange(value.filter((item) => item !== id));
    setSelected((current) => current.filter((contact) => contact.id !== id));
  }

  async function createContact() {
    setSaving(true);
    setError("");
    try {
      const parts = newContact.name.trim().split(/\s+/);
      const contact = await createRecord("people", {
        name: newContact.name.trim(),
        first_name: parts.shift() ?? newContact.name.trim(),
        last_name: parts.join(" "),
        position: newContact.position.trim(),
        phone: newContact.phone.trim(),
        email: newContact.email.trim(),
        contact_kind: newContact.contact_kind
      });
      setSelected((current) => [...current, contact]);
      onChange([...value, contact.id]);
      setRows((current) => [contact, ...current]);
      setNewContact({ name: "", position: "", phone: "", email: "", contact_kind: "External" });
      setCreateOpen(false);
      window.dispatchEvent(new CustomEvent("bcc:data-changed", { detail: "people" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать контакт.");
    } finally { setSaving(false); }
  }

  return <div className="space-y-2">
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {selected.filter((contact) => value.includes(contact.id)).map((contact) => <span key={contact.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-bcc-lilac px-3 py-1.5 text-sm text-bcc-deep"><UserRound size={14} /><span className="max-w-[220px] truncate">{contactLabel(contact)}</span><button type="button" disabled={disabled} aria-label={`Убрать ${contactLabel(contact)}`} className="rounded-full p-0.5 hover:bg-white/70" onClick={() => remove(contact.id)}><X size={14} /></button></span>)}
      </div>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A90]" size={16} />
        <Input disabled={disabled} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти контакт…" className="pl-9" />
      </div>
    </Field>
    {!disabled && <div className="max-h-44 overflow-y-auto rounded-2xl border border-bcc-border bg-white">
      {loading ? <p className="px-3 py-3 text-sm text-[#74747C]">Загружаем контакты…</p> : visibleRows.length ? visibleRows.slice(0, 12).map((contact) => <button type="button" key={contact.id} onClick={() => toggle(contact.id)} className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bcc-soft"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bcc-soft text-bcc-violet"><UserRound size={14} /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{contactLabel(contact)}</span><span className="block truncate text-xs text-[#8A8A90]">{[contact.position, contact.phone, contact.email].filter(Boolean).join(" · ")}</span></span><Check className="text-bcc-primary" size={16} /></button>) : <p className="px-3 py-3 text-sm text-[#74747C]">Контакты не найдены.</p>}
    </div>}
    {!disabled && <Button type="button" variant="ghost" onClick={() => setCreateOpen((open) => !open)}><Plus size={16} />Создать контакт</Button>}
    {createOpen && !disabled && <div className="space-y-3 rounded-2xl bg-bcc-soft p-3">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Имя"><Input autoFocus value={newContact.name} onChange={(event) => setNewContact({ ...newContact, name: event.target.value })} placeholder="Имя и фамилия" /></Field><Field label="Тип"><Select value={newContact.contact_kind} onChange={(event) => setNewContact({ ...newContact, contact_kind: event.target.value })}><option value="External">Внешний контакт</option><option value="Employee">Сотрудник</option></Select></Field><Field label="Роль"><Input value={newContact.position} onChange={(event) => setNewContact({ ...newContact, position: event.target.value })} /></Field><Field label="Телефон"><Input type="tel" value={newContact.phone} onChange={(event) => setNewContact({ ...newContact, phone: event.target.value })} /></Field><Field label="Почта"><Input type="email" value={newContact.email} onChange={(event) => setNewContact({ ...newContact, email: event.target.value })} /></Field></div>
      <div className="flex justify-end"><Button type="button" variant="brand" disabled={saving} onClick={() => void createContact()}>{saving ? "Создаём…" : "Создать и выбрать"}</Button></div>
    </div>}
    {error && <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}
  </div>;
}
