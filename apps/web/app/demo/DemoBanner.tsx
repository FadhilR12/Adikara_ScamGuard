import { DEMO_LABEL } from '@scamguard/shared';

export function DemoBanner() {
  return (
    <div role="note" className="sticky top-0 z-40 border-b-2 border-dashed border-ink bg-[#FEF9C3] px-4 py-2.5 text-center text-[13px] font-extrabold tracking-wide text-ink">
      {DEMO_LABEL} — bukan situs sungguhan, jangan masukkan data asli.
    </div>
  );
}
