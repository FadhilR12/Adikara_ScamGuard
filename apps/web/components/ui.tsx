'use client';
export { buttonClass, inputClass } from '@/lib/styles';
import type { RiskLevel } from '@scamguard/shared';
import { Lightbulb, X } from 'lucide-react';
import { VARIANT, type Variant } from '@/lib/styles';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-btn px-5 py-2.5 text-[15px] font-bold transition disabled:cursor-not-allowed ${VARIANT[variant]} ${className}`}
    />
  );
}

const PILL: Record<RiskLevel | 'info' | 'neutral', string> = {
  low: 'border-low-border bg-low-bg text-low-text',
  medium: 'border-medium-border bg-medium-bg text-medium-text',
  high: 'border-high-border bg-high-bg text-high-text',
  info: 'border-primary-strong bg-primary-soft text-primary',
  neutral: 'border-line bg-bg text-ink-2',
};
const DOT: Record<keyof typeof PILL, string> = { low: 'bg-low', medium: 'bg-medium', high: 'bg-high', info: 'bg-primary', neutral: 'bg-[#94A3B8]' };

export function Pill({ tone, children }: { tone: keyof typeof PILL; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-bold ${PILL[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-card border border-line bg-white shadow-card ${className}`}>{children}</section>;
}

export function WhyBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-btn border border-primary-border bg-primary-soft p-4">
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <p className="text-[15px] leading-relaxed text-ink-2">
        <strong className="font-bold text-ink">Kenapa penting? </strong>
        {children}
      </p>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  warning?: string | null;
  children: ReactNode;
}

/** Field wajib yang kosong ditandai kuning, bukan merah (AC-07.1). */
export function Field({ id, label, required, hint, warning, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold text-ink">
        {label} {required && <span className="text-high" aria-hidden>*</span>}
      </label>
      {children}
      {warning ? (
        <p id={`${id}-msg`} className="text-[12.5px] font-medium text-medium-text">{warning}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-[12.5px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Modal({ open, onClose, title, children, labelledBy = 'modal-title' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, a, input, select, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,.55)] p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className="w-full max-w-[480px] rounded-dialog bg-white p-6 shadow-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={labelledBy} className="text-[18px] font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="-m-2 rounded-btn p-2 text-ink-3 hover:bg-bg"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog(props: {
  open: boolean; title: string; message: ReactNode; confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <Modal open={props.open} onClose={props.onCancel} title={props.title} labelledBy="confirm-title">
      <div className="text-[15px] leading-relaxed text-ink-2">{props.message}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={props.onCancel}>{props.cancelLabel}</Button>
        <Button variant={props.danger ? 'danger' : 'primary'} onClick={props.onConfirm}>{props.confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ---- Toast -----------------------------------------------------------------------------------

interface ToastItem { id: number; message: string; action?: { label: string; onClick: () => void } }
const ToastContext = createContext<(message: string, action?: ToastItem['action']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, action?: ToastItem['action']) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, message, action }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto flex items-center gap-3 rounded-btn bg-ink px-4 py-3 text-[14px] text-white shadow-dialog">
            {t.message}
            {t.action && <button onClick={t.action.onClick} className="font-bold text-primary-strong underline">{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function OfflineBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div role="status" className="border-b border-medium-border bg-medium-bg px-4 py-2 text-center text-[13px] font-medium text-medium-text">
      Anda sedang offline. Pemeriksaan memakai aturan bawaan; data akan disimpan saat online.
    </div>
  );
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden />;
}
