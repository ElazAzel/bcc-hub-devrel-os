import { AnalyticsPage } from "@/components/analytics-page";
import { CalendarPage } from "@/components/calendar-page";
import { ModulePage } from "@/components/module-page";
import { getModule, type ModuleKey } from "@/lib/types";

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
function SettingsPage() { return <div className="space-y-6"><div><div className="eyebrow">Настройки рабочего пространства</div><h1 className="page-title mt-2">Настройки</h1><p className="body-muted mt-2">Параметры, которые помогают системе оставаться понятной и личной.</p></div><section className="surface max-w-2xl p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bcc-lilac text-bcc-deep">⌘</div><div><h2 className="font-semibold">Сочетания клавиш</h2><p className="mt-1 text-sm text-[#74747C]">Ctrl+K — поиск · C — создание · / — поиск · Esc — закрыть</p></div></div><div className="mt-5 space-y-3 border-t border-bcc-border pt-5 text-sm"><div className="flex items-center justify-between"><span>Личное рабочее пространство</span><span className="chip chip-active">Включено</span></div><div className="flex items-center justify-between"><span>Облачное хранение</span><span className="chip chip-active">Supabase</span></div><div className="flex items-center justify-between"><span>Локальный режим для разработки</span><span className="chip">Доступен</span></div></div></section></div>; }
