'use client';
import { EVIDENCE_CATEGORIES, type EvidenceCategory } from '@scamguard/shared';
import { FileText, RotateCw, X } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { Spinner } from '../ui';

export interface FileCardProps {
  name: string;
  size: number;
  mime: string;
  previewUrl?: string;
  category: EvidenceCategory;
  status: 'ocr' | 'uploading' | 'done' | 'error';
  progress?: number;
  ocrPct?: number;
  error?: string;
  onCategory: (c: EvidenceCategory) => void;
  onRemove: () => void;
  onRetry?: () => void;
}

export function EvidenceFileCard(p: FileCardProps) {
  const selectId = `cat-${p.name}-${p.size}`;
  return (
    <li className="flex gap-3 rounded-btn border border-line bg-white p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-bg">
        {p.previewUrl && p.mime.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-7 w-7 text-ink-3" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[14px] font-semibold" title={p.name}>{p.name}</p>
          <button onClick={p.onRemove} aria-label={`Hapus ${p.name}`} className="-m-1.5 shrink-0 rounded-btn p-1.5 text-ink-3 hover:bg-bg hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[12px] text-ink-3">{formatBytes(p.size)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <label htmlFor={selectId} className="sr-only">Kategori {p.name}</label>
          <select id={selectId} value={p.category} onChange={(e) => p.onCategory(e.target.value as EvidenceCategory)}
            disabled={p.status === 'uploading' || p.status === 'ocr'}
            className="h-9 rounded-lg border border-inputline bg-white px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-strong">
            {EVIDENCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {p.status === 'ocr' && <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><Spinner /> Membaca gambar… ({p.ocrPct ?? 0}%)</span>}
          {p.status === 'error' && (
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-medium-text">
              {p.error ?? 'Gagal mengunggah. Coba lagi.'}
              {p.onRetry && <button onClick={p.onRetry} className="inline-flex items-center gap-1 font-bold text-primary"><RotateCw className="h-3.5 w-3.5" aria-hidden />Coba lagi</button>}
            </span>
          )}
        </div>
        {p.status === 'uploading' && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-divider" role="progressbar" aria-valuenow={p.progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Mengunggah ${p.name}`}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress ?? 0}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}
