import { DEMO_INVESTASI } from '@scamguard/shared';
import type { Metadata } from 'next';
import { DemoBanner } from '../DemoBanner';
import { Countdown } from './Countdown';

export const metadata: Metadata = { title: { absolute: DEMO_INVESTASI.title }, robots: { index: false } };

/** Halaman simulasi berisiko (PRD 16.5) — memuat kata pemicu agar demo tidak bergantung pada situs nyata. */
export default function DemoInvestasi() {
  const d = DEMO_INVESTASI;
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <DemoBanner />
      <main className="mx-auto max-w-[880px] px-5 py-12">
        <p className="text-[14px] font-bold uppercase tracking-[0.2em] text-[#FACC15]">CuanHarian88</p>
        <h1 className="mt-3 text-[38px] font-extrabold leading-tight">{d.headline}</h1>
        {d.paragraphs.map((p) => <p key={p} className="mt-4 text-[18px] leading-relaxed text-[#CBD5E1]">{p}</p>)}

        <div className="mt-8 rounded-2xl border border-[#FACC15]/40 bg-[#FACC15]/10 p-5">
          <p className="text-[14px] font-semibold text-[#FACC15]">Promo berakhir dalam</p>
          <Countdown />
        </div>

        <form className="mt-8 grid gap-4 rounded-2xl bg-white/5 p-6" action="#" aria-label="Formulir deposit simulasi">
          <label className="grid gap-1.5 text-[15px] font-semibold">
            Nominal deposit
            <input name="nominal" placeholder="Rp500.000" className="h-12 rounded-xl px-4 text-ink" />
          </label>
          <label className="grid gap-1.5 text-[15px] font-semibold">
            Nomor rekening Anda
            <input name="rekening" placeholder="1234567890" className="h-12 rounded-xl px-4 text-ink" />
          </label>
          <button type="button" className="h-14 rounded-xl bg-[#FACC15] text-[18px] font-extrabold text-[#0B1120]">{d.cta}</button>
        </form>
      </main>
    </div>
  );
}
