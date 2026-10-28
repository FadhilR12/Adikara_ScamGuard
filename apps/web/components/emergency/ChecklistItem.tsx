'use client';
import { Check } from 'lucide-react';

export function ChecklistItem({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <label htmlFor={id}
      className={`flex min-h-[56px] cursor-pointer items-center gap-3.5 rounded-btn border px-4 py-3 transition ${checked ? 'border-low-border bg-low-bg' : 'border-line bg-white hover:bg-bg'}`}>
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary-strong ${checked ? 'border-low bg-low text-white' : 'border-inputline bg-white'}`}>
        {checked && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
      <span className="text-[15px] leading-snug">{children}</span>
    </label>
  );
}
