import type { Incident } from '@scamguard/shared';
import { ShieldCheck } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

function Bars({ widths }: { widths: number[] }) {
  return <div className="space-y-1.5">{widths.map((w, i) => <div key={i} className="h-1.5 rounded-full bg-divider" style={{ width: `${w}%` }} />)}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l border-line pl-3">
      <p className="-ml-[17px] flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-wide text-ink"><span className="h-2 w-2 rounded-full bg-primary" />{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Miniatur dokumen PDF dengan isi nyata dari formulir (AC-09.6). */
export function PdfPreview({ incident, files }: { incident: Incident; files: number }) {
  return (
    <div className="rounded-card border border-line bg-bg p-4" aria-label="Pratinjau dokumen">
      <div className="rounded-lg bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-2 border-b border-divider pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /></span>
            <div>
              <p className="text-[11px] font-bold">Evidence Pack ScamGuard</p>
              <p className="text-[9px] text-ink-3">ID Berkas: {incident.code}</p>
            </div>
          </div>
          <span className="rounded bg-divider px-1.5 py-0.5 text-[8.5px] text-ink-3">PDF · A4</span>
        </div>
        <div className="mt-3 space-y-3.5 text-[10px] text-ink-2">
          <Section title="Ringkasan kasus">
            {incident.amount || incident.recipientBank ? (
              <p className="truncate">{[formatRupiah(incident.amount), incident.recipientBank, incident.recipientAccount].filter(Boolean).join(' · ')}</p>
            ) : <Bars widths={[85, 60]} />}
          </Section>
          <Section title="Kronologi kejadian">
            {incident.chronology ? <p className="line-clamp-3">{incident.chronology}</p> : <Bars widths={[100, 90, 70]} />}
          </Section>
          <Section title="Daftar bukti lampiran">
            {files ? <p>{files} file terlampir</p> : <Bars widths={[45, 45]} />}
          </Section>
          <Section title="Checklist pelaporan resmi">
            <p>{incident.completeness?.done ?? 0} dari {incident.completeness?.total ?? 6} lengkap</p>
          </Section>
        </div>
      </div>
    </div>
  );
}
