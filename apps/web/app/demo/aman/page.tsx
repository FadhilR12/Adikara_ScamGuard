import { DEMO_AMAN } from '@scamguard/shared';
import type { Metadata } from 'next';
import { DemoBanner } from '../DemoBanner';

export const metadata: Metadata = { title: { absolute: DEMO_AMAN.title }, robots: { index: false } };

/** Halaman simulasi aman (PRD 16.5) — tidak boleh memunculkan overlay. */
export default function DemoAman() {
  const d = DEMO_AMAN;
  return (
    <div className="min-h-screen bg-white">
      <DemoBanner />
      <main className="mx-auto max-w-[720px] px-5 py-12">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Artikel · Keuangan</p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-tight text-ink">{d.headline}</h1>
        {d.paragraphs.map((p) => <p key={p} className="mt-4 text-[17px] leading-relaxed text-ink-2">{p}</p>)}
        <button type="button" className="mt-8 h-12 rounded-btn border border-inputline px-5 font-bold">{d.cta}</button>
      </main>
    </div>
  );
}
