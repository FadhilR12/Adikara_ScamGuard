import type { Evidence, Incident } from '@scamguard/shared';
import { ShieldCheck } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

function Bar({ w, strong }: { w: number; strong?: boolean }) {
  return <div className={`h-1.5 rounded-full ${strong ? 'bg-[#94A3B8]' : 'bg-line'}`} style={{ width: `${w}%` }} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l border-line pl-4">
      <p className="-ml-[21px] flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-wide text-ink">
        <span className="h-2 w-2 rounded-full bg-primary" />{title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 rounded-md border border-divider bg-bg px-2.5 py-2">{children}</div>;
}

/** Miniatur dokumen PDF dengan isi nyata dari formulir (AC-09.6) — gaya mengikuti referensi. */
export function PdfPreview({ incident, evidence }: { incident: Incident; evidence: Evidence[] }) {
  const comp = incident.completeness;
  const files = evidence.slice(0, 2);
  return (
    <div className="rounded-card border border-line bg-[#EEF2F6] p-5" aria-label="Pratinjau dokumen">
      <div className="relative overflow-hidden rounded-lg bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-2 border-b border-divider pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
            <div>
              <p className="text-[12.5px] font-bold">Evidence Pack ScamGuard</p>
              <p className="text-[9.5px] text-ink-3">ID Berkas: {incident.code}</p>
            </div>
          </div>
          <span className="rounded bg-divider px-1.5 py-0.5 text-[8.5px] text-ink-3">Hal 1 dari 2</span>
        </div>

        <div className="mt-4 space-y-4 text-[10px] text-ink-2">
          <Section title="Ringkasan kasus">
            {incident.amount || incident.recipientBank ? (
              <p className="truncate">{[formatRupiah(incident.amount), incident.recipientBank, incident.recipientAccount].filter(Boolean).join(' · ')}</p>
            ) : <div className="space-y-1.5"><Bar w={88} /><Bar w={62} /></div>}
          </Section>
          <Section title="Kronologi kejadian">
            {incident.chronology ? <p className="line-clamp-3 leading-relaxed">{incident.chronology}</p> : <div className="space-y-1.5"><Bar w={100} /><Bar w={84} /><Bar w={68} /></div>}
          </Section>
          <Section title="Data transaksi">
            <div className="grid grid-cols-2 gap-2">
              <Box>{incident.amount ? <p className="truncate font-semibold text-ink">{formatRupiah(incident.amount)}</p> : <div className="space-y-1"><Bar w={50} /><Bar w={80} strong /></div>}</Box>
              <Box>{incident.recipientAccount ? <p className="truncate font-semibold text-ink">{incident.recipientBank} {incident.recipientAccount}</p> : <div className="space-y-1"><Bar w={50} /><Bar w={80} strong /></div>}</Box>
            </div>
          </Section>
          <Section title="Daftar bukti lampiran">
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <Box key={i}>
                  {files[i] ? <p className="truncate">{files[i].fileName}</p> : <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-line" /><Bar w={55} /></div>}
                </Box>
              ))}
            </div>
            {evidence.length > 2 && <p className="mt-1.5">+{evidence.length - 2} file lainnya</p>}
          </Section>
          <Section title="Checklist pelaporan resmi">
            <ul className="space-y-1.5">
              {(comp?.items ?? []).slice(0, 3).map((it) => (
                <li key={it.key} className="flex items-center gap-2">
                  <span className={`flex h-2.5 w-2.5 items-center justify-center rounded-sm border ${it.done ? 'border-primary bg-primary' : 'border-inputline'}`} />
                  <span className="truncate">{it.label}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <span aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 flex h-24 w-24 rotate-[-18deg] items-center justify-center rounded-full border border-divider text-[9px] font-bold tracking-[0.2em] text-divider">
          SCAMGUARD
        </span>
      </div>
    </div>
  );
}
