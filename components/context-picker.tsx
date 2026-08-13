"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderTree } from "lucide-react";
import { loadRecords } from "@/lib/data";
import { allowedParentTypes, hierarchyTitle, hierarchyTypeLabel, type HierarchyNodeType, type ParentSelection } from "@/lib/hierarchy";
import type { AnyRecord, ModuleKey } from "@/lib/types";
import { Field, Select } from "./ui";

type ContextPickerProps = {
  module: ModuleKey;
  value: ParentSelection;
  onChange: (value: ParentSelection) => void;
  currentId?: string;
  required?: boolean;
};

export function ContextPicker({ module, value, onChange, currentId, required = false }: ContextPickerProps) {
  const parentTypes = useMemo(() => allowedParentTypes(module), [module]);
  const [rows, setRows] = useState<Record<HierarchyNodeType, AnyRecord[]>>({} as Record<HierarchyNodeType, AnyRecord[]>);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!parentTypes.length) return () => { active = false; };
    setLoading(true);
    setError("");
    Promise.all(parentTypes.map(async (parentType) => [parentType, await loadRecords(parentType, { pageSize: 80 })] as const))
      .then((entries) => { if (active) setRows(Object.fromEntries(entries) as Record<HierarchyNodeType, AnyRecord[]>); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Не удалось загрузить контекст"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [parentTypes]);

  const selectedType = value.parentType && parentTypes.includes(value.parentType) ? value.parentType : "";
  const visibleRows = (selectedType ? rows[selectedType] ?? [] : []).filter((row) => !(selectedType === module && row.id === currentId));

  if (!parentTypes.length) return null;
  return <Field label={`Контекст${required ? " *" : ""}`} hint={required ? "Новая запись должна быть внутри проекта, события или задачи." : "Выбери, к чему относится эта запись. Это сохранит её в рабочем дереве."}>
    <div className="flex items-center gap-2 rounded-2xl bg-bcc-soft p-3">
      <FolderTree size={17} className="shrink-0 text-bcc-violet" aria-hidden="true" />
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(130px,0.7fr)_minmax(0,1.5fr)]">
        <Select aria-label="Тип контекста" value={selectedType} onChange={(event) => onChange(event.target.value ? { parentType: event.target.value as HierarchyNodeType, parentId: "" } : {})}>
          <option value="">Без родителя</option>
          {parentTypes.map((type) => <option key={type} value={type}>{hierarchyTypeLabel(type)}</option>)}
        </Select>
        <Select aria-label="Запись контекста" disabled={!selectedType || loading} value={value.parentId ?? ""} onChange={(event) => onChange({ parentType: selectedType || undefined, parentId: event.target.value || undefined })}>
          <option value="">{loading ? "Загружаем записи…" : "Выбери запись"}</option>
          {visibleRows.map((row) => <option key={row.id} value={row.id}>{hierarchyTitle(row)}</option>)}
        </Select>
      </div>
    </div>
    {error && <span className="block text-xs text-[#AF3030]" role="alert">{error}</span>}
  </Field>;
}
