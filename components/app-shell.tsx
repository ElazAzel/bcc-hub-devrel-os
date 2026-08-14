"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, CalendarDays, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Database, FileText, FolderKanban, Home, LogOut, Menu, MoreHorizontal, Newspaper, Plus, Radar, Search, Settings, Users, X, Zap } from "lucide-react";
import { Dialog } from "radix-ui";
import { signOut } from "@/lib/data";
import { moduleCopy } from "@/lib/i18n";
import { type ModuleKey } from "@/lib/types";
import { requestQuickAdd } from "@/lib/ui-events";
import { CommandPalette } from "./command-palette";
import { IconButton } from "./ui";
import { QuickAdd } from "./quick-add";

const mainNav: Array<{ href: string; label: string; icon: typeof Home; module?: ModuleKey }> = [
  { href: "/", label: "Обзор", icon: Home },
  { href: "/projects", label: moduleCopy("projects").label, icon: FolderKanban, module: "projects" },
  { href: "/tasks", label: moduleCopy("tasks").label, icon: CheckSquare, module: "tasks" },
  { href: "/people", label: moduleCopy("people").label, icon: Users, module: "people" },
  { href: "/events", label: moduleCopy("events").label, icon: CalendarDays, module: "events" },
  { href: "/content", label: moduleCopy("content").label, icon: Newspaper, module: "content" },
  { href: "/ambassadors", label: moduleCopy("ambassadors").label, icon: Zap, module: "ambassadors" },
  { href: "/communities", label: moduleCopy("communities").label, icon: Users, module: "communities" },
  { href: "/tech-radar", label: moduleCopy("tech-radar").label, icon: Radar, module: "tech-radar" },
  { href: "/knowledge", label: moduleCopy("knowledge").label, icon: Database, module: "knowledge" }
];

const secondaryNav = [
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/settings", label: "Настройки", icon: Settings }
];

const mobileNav = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/tasks", label: "Задачи", icon: CheckSquare }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickModule, setQuickModule] = useState<ModuleKey | undefined>();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const currentLabel = useMemo(() => {
    const hit = [...mainNav, ...secondaryNav].find((item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href)));
    return hit?.label ?? "Рабочее пространство";
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(tag)) { event.preventDefault(); setPaletteOpen(true); }
      const target = event.target as HTMLElement | null;
      if (event.key.toLowerCase() === "c" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat && !["INPUT", "TEXTAREA", "SELECT"].includes(tag) && !target?.isContentEditable) setQuickOpen(true);
    };
    const onQuickAdd = (event: Event) => {
      setQuickModule((event as CustomEvent<ModuleKey | undefined>).detail);
      setQuickOpen(true);
    };
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("keydown", onKey);
    window.addEventListener("bcc:quick-add", onQuickAdd);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    setOnline(navigator.onLine);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=5").catch(() => undefined);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bcc:quick-add", onQuickAdd);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => { setMobileOpen(false); setPaletteOpen(false); }, [pathname]);

  async function logout() { await signOut(); router.push("/login"); }

  return <div className="app-shell min-h-screen pb-24 lg:pb-0">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-bcc-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">Перейти к содержимому</a>
    <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#ebe8f3] bg-white transition-[width] duration-300 lg:block ${sidebarCollapsed ? "w-[78px]" : "w-[256px]"}`}>
      <div className="flex h-full flex-col px-3 py-4">
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between px-2"}`}>
          <Link href="/" className="flex items-center gap-2.5" aria-label="BCC HUB DevRel OS">
            <BrandMark />
            {!sidebarCollapsed && <span className="text-[13px] font-semibold tracking-[-0.02em] text-bcc-ink" translate="no">BCC HUB <span className="font-normal text-[#92909a]">DevRel OS</span></span>}
          </Link>
          {!sidebarCollapsed && <IconButton label="Свернуть навигацию" onClick={() => setSidebarCollapsed(true)}><ChevronLeft size={17} /></IconButton>}
        </div>
        {sidebarCollapsed && <IconButton label="Развернуть навигацию" className="mx-auto mt-3" onClick={() => setSidebarCollapsed(false)}><ChevronRight size={17} /></IconButton>}

        <div className={`mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#aaa7b2] ${sidebarCollapsed ? "sr-only" : ""}`}>Рабочее пространство</div>
        <nav aria-label="Основная навигация" className="scrollbar-thin mt-2 flex-1 space-y-1 overflow-y-auto">
          {mainNav.map((item) => <NavItem key={item.href} {...item} collapsed={sidebarCollapsed} active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)} />)}
          <div className="my-4 border-t border-[#eeeaf4]" />
          {secondaryNav.map((item) => <NavItem key={item.href} {...item} collapsed={sidebarCollapsed} active={pathname.startsWith(item.href)} />)}
        </nav>

        {!sidebarCollapsed && <Link href="/knowledge" className="mb-3 block rounded-2xl bg-[linear-gradient(145deg,#8934f9,#4c04a5)] p-4 text-white shadow-[0_12px_24px_rgba(76,4,165,0.18)] transition hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold"><BookIcon /><span>Память рабочего пространства</span></div>
          <p className="mt-3 text-xs leading-5 text-white/70">Связывай решения, события и следующие шаги.</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 text-[11px] font-medium">Открыть память <ChevronRight size={13} /></span>
        </Link>}
        <div className={`${sidebarCollapsed ? "items-center" : ""} flex flex-col gap-1 border-t border-[#eeeaf4] pt-3`}>
          <button onClick={() => setPaletteOpen(true)} className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-sm text-[#74747C] transition hover:bg-bcc-soft hover:text-bcc-ink ${sidebarCollapsed ? "justify-center" : ""}`} title="Помощь и сочетания клавиш"><CircleHelp size={17} />{!sidebarCollapsed && "Помощь и сочетания"}</button>
          <button onClick={logout} className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-sm text-[#74747C] transition hover:bg-bcc-soft hover:text-bcc-ink ${sidebarCollapsed ? "justify-center" : ""}`} title="Выйти"><LogOut size={17} />{!sidebarCollapsed && "Выйти"}</button>
        </div>
      </div>
    </aside>

    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-overlay fixed inset-0 z-40 bg-[#21102d]/20 backdrop-blur-sm lg:hidden" />
        <Dialog.Content className="modal-surface fixed inset-y-0 left-0 z-50 w-[min(292px,85vw)] overflow-y-auto bg-white p-4 shadow-popover outline-none lg:hidden">
          <Dialog.Title className="sr-only">Навигация рабочего пространства</Dialog.Title>
          <Dialog.Description className="sr-only">Разделы приложения и настройки.</Dialog.Description>
          <div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}><BrandMark /><span className="text-[13px] font-semibold" translate="no">BCC HUB <span className="font-normal text-[#92909a]">DevRel OS</span></span></Link><Dialog.Close asChild><IconButton label="Закрыть меню"><X size={18} /></IconButton></Dialog.Close></div>
          <div className="mt-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#aaa7b2]">Рабочее пространство</div>
          <nav aria-label="Навигация рабочего пространства" className="mt-2 space-y-1">{[...mainNav, ...secondaryNav].map((item) => <NavItem key={item.href} {...item} collapsed={false} active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)} onClick={() => setMobileOpen(false)} />)}</nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <div className={`transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-[78px]" : "lg:pl-[256px]"}`}>
      <header className="app-header sticky top-0 z-30">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <IconButton label="Открыть меню" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={19} /></IconButton>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden shrink-0 text-sm font-semibold text-bcc-ink sm:block lg:hidden">{currentLabel}</div>
            <button onClick={() => setPaletteOpen(true)} className="command-search w-full max-w-[390px]">
              <Search size={16} className="shrink-0 text-[#8e8a9d]" /><span className="hidden truncate sm:inline">Найти запись или действие…</span><span className="truncate sm:hidden">Поиск по рабочему пространству</span><kbd className="ml-auto hidden rounded-md bg-[#f5f1fb] px-1.5 py-0.5 text-[10px] text-[#8e8a9d] sm:inline">⌘ K</kbd>
            </button>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#74747C] transition hover:bg-bcc-soft hover:text-bcc-ink" aria-label="Уведомления" title="Уведомления"><Bell size={18} /><span className="notification-dot absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ff4b5c]" /></button>
            <div className="mx-1 h-7 w-px bg-[#eeeaf4]" />
            <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-bcc-soft" aria-label="Открыть профиль"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eadcff] text-xs font-semibold text-bcc-deep">DW</span><span className="hidden lg:block"><span className="block text-xs font-semibold leading-4 text-bcc-ink" translate="no">BCC HUB</span><span className="block text-[10px] leading-4 text-[#92909a]">Владелец пространства</span></span><ChevronDown size={14} className="text-[#92909a]" /></button>
          </div>
          <button onClick={() => requestQuickAdd()} className="button-brand hidden min-h-10 px-3.5 text-sm sm:inline-flex sm:px-4" aria-label="Быстро добавить"><Plus size={16} /><span>Добавить</span></button>
        </div>
        {!online && <div className="bg-[#FFF6DD] px-4 py-1.5 text-center text-xs font-medium text-[#876000]" role="status">Нет сети — проверь подключение перед сохранением изменений.</div>}
      </header>
      <main id="main-content" className="page-wrap"><div key={pathname} className="page-enter">{children}</div></main>
    </div>

    <nav aria-label="Мобильная навигация" className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[#ebe8f3] bg-white/95 px-2 pt-1 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end">
        {mobileNav.slice(0, 2).map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] transition ${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "bg-[#f0e5ff] font-semibold text-bcc-deep" : "text-[#74747C]"}`}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span></Link>)}
        <button onClick={() => requestQuickAdd()} className="touch-target relative -mt-5 flex min-h-[76px] flex-col items-center justify-end gap-1 rounded-2xl text-[10px] font-semibold text-bcc-deep focus:outline-none focus:ring-4 focus:ring-bcc-lilac" aria-label="Быстро добавить" title="Быстро добавить"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-bcc-violet text-white shadow-[0_10px_22px_rgba(137,52,249,0.32)] transition-transform active:scale-95"><Plus size={21} /></span><span>Добавить</span></button>
        {mobileNav.slice(2).map((item) => <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] transition ${pathname.startsWith(item.href) ? "bg-[#f0e5ff] font-semibold text-bcc-deep" : "text-[#74747C]"}`}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span></Link>)}
        <button onClick={() => setMobileOpen(true)} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] transition ${mobileOpen ? "bg-[#f0e5ff] font-semibold text-bcc-deep" : "text-[#74747C]"}`} aria-label="Открыть ещё разделы"><MoreHorizontal size={18} strokeWidth={1.8} /><span>Ещё</span></button>
      </div>
    </nav>

    <QuickAdd open={quickOpen} onClose={() => { setQuickOpen(false); setQuickModule(undefined); }} initialModule={quickModule} />
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onCreate={(module) => { setPaletteOpen(false); setQuickModule(module); setQuickOpen(true); }} />
  </div>;
}

function BrandMark() {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-[0_7px_16px_rgba(137,52,249,0.2)]"><Image src="/icons/icon.svg" alt="" width={36} height={36} sizes="36px" className="h-9 w-9 rounded-xl" /></span>;
}

function BookIcon() { return <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15"><Database size={13} /></span>; }

function NavItem({ href, label, icon: Icon, collapsed, active, onClick }: { href: string; label: string; icon: typeof Home; collapsed: boolean; active: boolean; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} title={collapsed ? label : undefined} className={`group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition duration-200 ${collapsed ? "justify-center" : ""} ${active ? "bg-[#f1e7ff] font-semibold text-bcc-deep" : "text-[#74747C] hover:bg-[#f8f5fc] hover:text-bcc-ink"}`}><span className={`absolute left-0 h-5 w-0.5 rounded-full bg-bcc-violet transition ${active ? "opacity-100" : "opacity-0"}`} /><Icon size={17} strokeWidth={active ? 2 : 1.8} />{!collapsed && <span>{label}</span>}</Link>;
}
