'use client';
import { Check } from 'lucide-react';

export interface StepMeta { title: string; short: string }

/** Stepper 4 langkah (AC-05.3): Selesai / Anda di sini / Berikutnya. 2×2 di layar < 640 px. */
export function EmergencyStepper({ steps, current, done, onSelect }: {
  steps: StepMeta[]; current: number; done: (i: number) => boolean; onSelect: (i: number) => void;
}) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Langkah darurat">
      {steps.map((s, i) => {
        const active = i === current;
        const finished = !active && done(i);
        return (
          <li key={s.title}>
            <button
              onClick={() => onSelect(i)}
              aria-current={active ? 'step' : undefined}
              className={`flex w-full items-center gap-3 rounded-card border p-3 text-left transition ${
                active ? 'border-primary-strong bg-primary-soft' : 'border-line bg-white hover:bg-bg'
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-bold ${
                  finished ? 'bg-low text-white' : active ? 'bg-primary text-white' : 'border-2 border-inputline bg-white text-ink-2'
                }`}
              >
                {finished ? <Check className="h-5 w-5" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-bold">{s.short}</span>
                <span className={`block text-[12px] font-semibold ${finished ? 'text-low-text' : active ? 'text-primary' : 'text-ink-3'}`}>
                  {finished ? 'Selesai' : active ? 'Anda di sini' : 'Berikutnya'}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
