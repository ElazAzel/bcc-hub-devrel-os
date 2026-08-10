"use client";

import { Loader2, X } from "lucide-react";
import { useEffect } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "brand" | "secondary" | "ghost" }) {
  const classes = { primary: "button-primary", brand: "button-brand", secondary: "button-secondary", ghost: "button-ghost" };
  return <button className={`${classes[variant]} ${className}`} {...props} />;
}

export function IconButton({ label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-[#74747C] transition hover:bg-bcc-soft hover:text-bcc-ink focus:outline-none focus:ring-4 focus:ring-bcc-lilac ${className}`} {...props} />;
}

export function Modal({ open, title, description, onClose, children, wide = false }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1D1D1D]/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-popover sm:rounded-3xl sm:p-6 ${wide ? "max-w-2xl" : "max-w-lg"}`}>
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>{description && <p className="mt-1 text-sm text-[#74747C]">{description}</p>}</div><IconButton label="Закрыть" onClick={onClose}><X size={18} /></IconButton></div>
      {children}
    </div>
  </div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="block text-sm font-medium text-bcc-ink">{label}</span>{children}{hint && <span className="block text-xs text-[#8A8A90]">{hint}</span>}</label>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={`input ${className}`} {...props} />; }
export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={`textarea ${className}`} {...props} />; }
export function Select({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`input ${className}`} {...props}>{children}</select>; }

export function LoadingState({ label = "Загружаем рабочие данные" }: { label?: string }) { return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#74747C]"><Loader2 className="animate-spin" size={18} />{label}</div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="surface-muted flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"><div className="text-3xl">!</div><p className="max-w-md text-sm text-[#74747C]">{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Повторить</Button>}</div>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="surface-muted flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bcc-lilac text-2xl text-bcc-deep">+</div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-[#74747C]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }
