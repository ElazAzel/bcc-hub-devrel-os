import { Plus, Search } from "lucide-react";
import { Button } from "./ui";

export function PageHeader({ eyebrow, title, description, action, onSearch, searchValue = "" }: { eyebrow?: string; title: string; description?: string; action?: { label: string; onClick: () => void }; onSearch?: (value: string) => void; searchValue?: string }) {
  return <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow">{eyebrow ?? "Рабочее пространство"}</div><h1 className="page-title mt-2">{title}</h1>{description && <p className="body-muted mt-2 max-w-2xl">{description}</p>}</div><div className="flex flex-col gap-2 sm:flex-row">{onSearch && <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A90]" size={16} /><input aria-label="Фильтр списка" value={searchValue} className="input w-full pl-9 sm:w-60" placeholder="Фильтр списка" onChange={(event) => onSearch(event.target.value)} /></label>}{action && <Button variant="brand" onClick={action.onClick}><Plus size={17} />{action.label}</Button>}</div></div>;
}
