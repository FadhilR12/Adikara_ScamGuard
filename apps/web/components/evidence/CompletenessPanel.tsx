import type { Incident } from '@scamguard/shared';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function CompletenessPanel({ completeness }: { completeness: NonNullable<Incident['completeness']> }) {
  const pct = Math.round((completeness.done / completeness.total) * 100);
  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-card" aria-labelledby="comp-title">
      <div className="flex items-baseline justify-between">
        <h2 id="comp-title" className="text-[17px] font-bold">Kelengkapan laporan</h2>
        <span className="text-[14px] font-bold text-primary">{completeness.done}/{completeness.total}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-divider" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Kelengkapan laporan">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 space-y-2.5">
        {completeness.items.map((it) => (
          <li key={it.key} className="flex items-center gap-2.5 text-[14px]">
            {it.done ? <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-low" aria-hidden /> : <AlertCircle className="h-[18px] w-[18px] shrink-0 text-medium" aria-hidden />}
            <span className={it.done ? 'text-ink' : 'text-ink-2'}>{it.label}</span>
            <span className="sr-only">{it.done ? 'lengkap' : 'belum lengkap'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
