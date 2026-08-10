import { AnalyticsPage } from "@/components/analytics-page";
import { CalendarPage } from "@/components/calendar-page";
import { ModulePage } from "@/components/module-page";
import { getModule, type ModuleKey } from "@/lib/types";

export default function DynamicModulePage({ params }: { params: { module: string } }) {
  if (params.module === "analytics") return <AnalyticsPage />;
  if (params.module === "calendar") return <CalendarPage />;
  if (params.module === "more") return <MorePage />;
  if (params.module === "settings") return <SettingsPage />;
  const module = params.module as ModuleKey;
  return getModule(module) ? <ModulePage module={module} /> : <div className="surface p-8">Страница не найдена</div>;
}

function MorePage() { return <div className="space-y-5"><div><div className="eyebrow">Workspace</div><h1 className="page-title mt-2">More</h1><p className="body-muted mt-2">Второстепенные разделы, которые остаются рядом, но не мешают ежедневной навигации.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[{ href: "/events", label: "Events" }, { href: "/content", label: "Content" }, { href: "/ambassadors", label: "Ambassadors" }, { href: "/communities", label: "Communities" }, { href: "/tech-radar", label: "Tech Radar" }, { href: "/knowledge", label: "Knowledge" }, { href: "/analytics", label: "Analytics" }, { href: "/documents", label: "Documents" }, { href: "/settings", label: "Settings" }].map((item) => <a key={item.href} href={item.href} className="surface flex min-h-20 items-center justify-between p-4 font-medium transition hover:border-bcc-violet/40 hover:bg-bcc-soft">{item.label}<span className="text-bcc-violet">→</span></a>)}</div></div>; }
function SettingsPage() { return <div className="space-y-6"><div><div className="eyebrow">Workspace preferences</div><h1 className="page-title mt-2">Settings</h1><p className="body-muted mt-2">Тихие настройки, которые помогают системе оставаться личной и объяснимой.</p></div><section className="surface max-w-2xl p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bcc-lilac text-bcc-deep">⌘</div><div><h2 className="font-semibold">Keyboard shortcuts</h2><p className="mt-1 text-sm text-[#74747C]">Ctrl+K поиск · C создание · / поиск · Esc закрытие</p></div></div><div className="mt-5 space-y-3 border-t border-bcc-border pt-5 text-sm"><div className="flex items-center justify-between"><span>Single-user workspace</span><span className="chip chip-active">Enabled</span></div><div className="flex items-center justify-between"><span>Cloud-first persistence</span><span className="chip chip-active">Supabase</span></div><div className="flex items-center justify-between"><span>Local drafts / cache</span><span className="chip">Allowed</span></div></div></section></div>; }
