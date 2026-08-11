import { AnalyticsPage } from "@/components/analytics-page";
import { CalendarPage } from "@/components/calendar-page";
import { ModulePage } from "@/components/module-page";
import { getModule, type ModuleKey } from "@/lib/types";
import { SettingsPage } from "@/components/settings-page";

export default async function DynamicModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleParam } = await params;
  if (moduleParam === "analytics") return <AnalyticsPage />;
  if (moduleParam === "calendar") return <CalendarPage />;
  if (moduleParam === "more") return <MorePage />;
  if (moduleParam === "settings") return <SettingsPage />;
  const module = moduleParam as ModuleKey;
  return getModule(module) ? <ModulePage module={module} /> : <div className="surface p-8">Страница не найдена</div>;
}

function MorePage() { const items = ["events", "content", "ambassadors", "communities", "tech-radar", "knowledge", "analytics", "documents", "settings"] as const; return <div className="space-y-5"><div><div className="eyebrow">Рабочее пространство</div><h1 className="page-title mt-2">Ещё разделы</h1><p className="body-muted mt-2">Все дополнительные инструменты — в одном понятном месте.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((key) => { const item = key in { analytics: true, documents: true, settings: true } ? { label: ({ analytics: "Аналитика", documents: "Документы", settings: "Настройки" } as Record<string, string>)[key] } : { label: getModule(key)?.label ?? key }; return <a key={key} href={`/${key}`} className="surface flex min-h-20 items-center justify-between p-4 font-medium transition hover:border-bcc-violet/40 hover:bg-bcc-soft">{item.label}<span className="text-bcc-violet">→</span></a>; })}</div></div>; }
