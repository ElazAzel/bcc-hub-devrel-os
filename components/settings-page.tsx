"use client";

import { useState } from "react";
import { Check, Copy, Link2, Send, ShieldCheck } from "lucide-react";
import { Button } from "./ui";

export function SettingsPage() {
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateCode() {
    setLoading(true);
    setMessage("");
    setCopied(false);
    try {
      const response = await fetch("/api/telegram/link-code", { method: "POST" });
      const result = await response.json() as { code?: string; expiresAt?: string; error?: string };
      if (!response.ok || !result.code) throw new Error(result.error || "Не удалось создать код подключения.");
      setCode(result.code);
      setExpiresAt(result.expiresAt || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать код подключения.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(`/start ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return <div className="space-y-6">
    <div>
      <div className="eyebrow">Настройки рабочего пространства</div>
      <h1 className="page-title mt-2">Настройки</h1>
      <p className="body-muted mt-2">Параметры, которые помогают системе оставаться понятной и личной.</p>
    </div>
    <section className="surface max-w-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bcc-lilac text-bcc-deep"><span className="text-lg">⌘</span></div>
        <div><h2 className="font-semibold">Сочетания клавиш</h2><p className="mt-1 text-sm text-[#74747C]">Ctrl+K — поиск · C — создание · / — поиск · Esc — закрыть</p></div>
      </div>
      <div className="mt-5 space-y-3 border-t border-bcc-border pt-5 text-sm"><div className="flex items-center justify-between"><span>Личное рабочее пространство</span><span className="chip chip-active">Включено</span></div><div className="flex items-center justify-between"><span>Облачное хранение</span><span className="chip chip-active">Supabase</span></div><div className="flex items-center justify-between"><span>Локальный режим для разработки</span><span className="chip">Доступен</span></div></div>
    </section>
    <section className="surface max-w-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8E0FF] text-bcc-deep"><Send size={18} /></div>
        <div><h2 className="font-semibold">Telegram-ассистент</h2><p className="mt-1 text-sm leading-6 text-[#74747C]">Подключи личный чат, чтобы быстро сохранять задачи и заметки, смотреть фокус дня и закрывать задачи.</p></div>
      </div>
      <div className="mt-5 rounded-2xl bg-bcc-soft p-4 text-sm leading-6 text-[#5F4A73]"><ShieldCheck className="mr-2 inline text-bcc-deep" size={16} />Код действует 15 минут, используется один раз и привязывает только твой Telegram-чат.</div>
      <div className="mt-5 flex flex-wrap gap-2"><Button variant="brand" onClick={generateCode} disabled={loading}><Link2 size={16} />{loading ? "Создаём код…" : "Создать код подключения"}</Button>{code && <Button variant="secondary" onClick={copyCode}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Скопировано" : "Скопировать /start"}</Button>}</div>
      {code && <div className="mt-4 rounded-2xl border border-bcc-violet/20 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E8A9D]">Одноразовая команда</div><code className="mt-2 block break-all text-lg font-semibold tracking-wide text-bcc-deep">/start {code}</code>{expiresAt && <p className="mt-2 text-xs text-[#74747C]">Действует до {new Date(expiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.</p>}<p className="mt-3 text-sm leading-6 text-[#5F5F68]">Открой @DevRelAssistbot в Telegram и отправь эту команду. После подключения используй /help.</p></div>}
      {message && <p className="mt-4 rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#AF3030]" role="alert">{message}</p>}
    </section>
  </div>;
}
