"use client";

import { Loader2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "brand" | "secondary" | "ghost" }) {
  const classes = { primary: "button-primary", brand: "button-brand", secondary: "button-secondary", ghost: "button-ghost" };
  return <button className={`${classes[variant]} ${className}`} {...props} />;
}

export function IconButton({ label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`touch-target inline-flex items-center justify-center rounded-full text-[#74747C] transition-[background-color,color,opacity] hover:bg-bcc-soft hover:text-bcc-ink focus:outline-none focus:ring-4 focus:ring-bcc-lilac ${className}`} {...props} />;
}

export function Modal({ open, title, description, onClose, children, wide = false }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="motion-overlay fixed inset-0 z-50 bg-[#1D1D1D]/30 backdrop-blur-[2px]" />
      <Dialog.Content className={`modal-surface fixed inset-x-0 bottom-0 z-50 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-popover outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6 ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e8e7ec] sm:hidden" aria-hidden="true" />
        <div className="mb-5 flex items-start justify-between gap-4"><div className="min-w-0"><Dialog.Title className="text-xl font-semibold tracking-[-0.025em] text-pretty">{title}</Dialog.Title>{description && <Dialog.Description className="mt-1 text-sm text-[#74747C]">{description}</Dialog.Description>}</div><Dialog.Close asChild><IconButton label="Закрыть"><X size={18} /></IconButton></Dialog.Close></div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="block text-sm font-medium text-bcc-ink">{label}</span>{children}{hint && <span className="block text-xs text-[#8A8A90]">{hint}</span>}</label>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={`input ${className}`} {...props} />; }
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = "", ...props }, ref) { return <textarea ref={ref} className={`textarea ${className}`} {...props} />; });
export function Select({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`input ${className}`} {...props}>{children}</select>; }

export function LoadingState({ label = "Загружаем рабочие данные" }: { label?: string }) { return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#74747C]" role="status" aria-live="polite"><Loader2 className="animate-spin" size={18} />{label}</div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="surface-muted flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center" role="alert"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FDECEC] text-xl font-semibold text-[#AF3030]">!</div><p className="max-w-md text-sm text-[#74747C]">{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Повторить</Button>}</div>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="surface-muted flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bcc-lilac text-2xl text-bcc-deep" aria-hidden="true">+</div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-[#74747C]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }
