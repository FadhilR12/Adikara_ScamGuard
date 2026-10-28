import type { ReactNode } from 'react';
import { WhyBox } from '../ui';

/** Pola kartu langkah (AC-05.4): label → judul → Kenapa penting? → Caranya → aksi. */
export function StepCard({ index, title, why, children, actions }: {
  index: number; title: string; why: string; children: ReactNode; actions: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-8" aria-labelledby="step-title">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary">Langkah {index + 1} dari 4</p>
      <h2 id="step-title" className="mt-1.5 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[26px]">{title}</h2>
      <div className="mt-4"><WhyBox>{why}</WhyBox></div>
      <h3 className="mt-6 text-[16px] font-bold">Caranya</h3>
      <div className="mt-3">{children}</div>
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-divider pt-5 sm:flex-row sm:items-center sm:justify-between">{actions}</div>
    </section>
  );
}

export function NumberedStep({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3.5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[14px] font-bold text-primary">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="pt-1 text-[15px] font-semibold leading-snug">{title}</p>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}
