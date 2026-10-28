'use client';
import type { OcrFields } from '@scamguard/shared';
import { ScanText } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { Button } from '../ui';

const LABELS: [keyof OcrFields, string][] = [
  ['amount', 'Nominal'], ['date', 'Tanggal'], ['time', 'Jam'], ['account', 'Rekening tujuan'], ['name', 'Nama penerima'], ['bank', 'Bank'], ['ref', 'No. referensi'],
];

export function OcrResultBox({ fields, confidence, onApply }: { fields: OcrFields; confidence: string; onApply: () => void }) {
  const rows = LABELS.filter(([k]) => fields[k] !== undefined);
  if (!rows.length) {
    return <p className="rounded-btn border border-line bg-bg p-3 text-[13.5px] text-ink-2">Teks tidak terbaca otomatis. Silakan isi manual.</p>;
  }
  return (
    <div className="rounded-btn border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[14px] font-bold text-primary"><ScanText className="h-4 w-4" aria-hidden />Terbaca otomatis dari gambar</p>
        <span className="text-[12px] text-ink-3">Keyakinan {confidence}</span>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
        {rows.map(([k, label]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[12px] text-ink-3">{label}</dt>
            <dd className="truncate font-semibold">{k === 'amount' ? formatRupiah(fields.amount) : String(fields[k])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12px] text-ink-3">Periksa kembali. Hasil baca otomatis bisa keliru.</p>
      <Button variant="secondary" className="mt-3 !min-h-[40px] text-[14px]" onClick={onApply}>Isi ke formulir</Button>
    </div>
  );
}
