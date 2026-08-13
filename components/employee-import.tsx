"use client";

import { useRef, useState } from "react";
import { Check, FileUp, UsersRound } from "lucide-react";
import { importEmployeeContacts } from "@/lib/data";
import { parseEmployeeDirectory } from "@/lib/employee-import";
import type { EmployeeImportRow } from "@/lib/types";
import { Button } from "./ui";

export function EmployeeImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EmployeeImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function selectFile(file?: File) {
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const parsed = parseEmployeeDirectory(await file.text());
      setRows(parsed);
      setFileName(file.name);
      if (!parsed.length) setError("Не нашли сотрудников. Проверь, что выбран экспорт в формате .md или .txt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось прочитать файл.");
    }
  }

  async function importRows() {
    if (!rows.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await importEmployeeContacts(rows);
      setMessage(`Готово: добавлено ${result.created}, пропущено дубликатов ${result.skipped}.`);
      setRows([]);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      window.dispatchEvent(new CustomEvent("bcc:data-changed", { detail: "people" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось импортировать сотрудников.");
    } finally { setBusy(false); }
  }

  return <section className="surface mb-5 p-4 sm:p-5" aria-labelledby="employee-import-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bcc-lilac text-bcc-deep"><UsersRound size={18} /></span><div><h2 id="employee-import-title" className="font-semibold">Импорт сотрудников</h2><p className="mt-1 max-w-2xl text-sm leading-5 text-[#74747C]">Загрузи экспорт коллег. Мы добавим сотрудников в контакты, сохраним телефоны и пропустим уже существующие записи по почте.</p></div></div>
      <input ref={inputRef} className="sr-only" type="file" accept=".md,.txt,text/markdown,text/plain" onChange={(event) => void selectFile(event.target.files?.[0])} />
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}><FileUp size={16} />Выбрать файл</Button>
    </div>
    {fileName && rows.length > 0 && <div className="mt-4 rounded-2xl bg-bcc-soft p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><span><strong>{fileName}</strong> · распознано сотрудников: {rows.length}</span><Button type="button" variant="brand" disabled={busy} onClick={() => void importRows()}>{busy ? "Импортируем…" : "Импортировать"}</Button></div><div className="mt-3 flex flex-wrap gap-2">{rows.slice(0, 3).map((row) => <span key={row.email} className="chip">{row.name}</span>)}{rows.length > 3 && <span className="chip">и ещё {rows.length - 3}</span>}</div></div>}
    {message && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#E8F7ED] px-3 py-2 text-sm text-[#18723B]" role="status"><Check size={16} />{message}</p>}
    {error && <p className="mt-3 rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{error}</p>}
  </section>;
}
