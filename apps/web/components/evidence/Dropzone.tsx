'use client';
import { Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

export const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_BYTES = 10 * 1024 * 1024;

/** Validasi AC-06.1 / AC-06.5. Mengembalikan pesan penolakan atau null. */
export function rejectReason(file: File, maxBytes = MAX_BYTES, accept = ACCEPT): string | null {
  if (!accept.includes(file.type)) return `${file.name}: tipe file tidak didukung.`;
  if (file.size > maxBytes) return `${file.name}: file lebih dari ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  return null;
}

export function Dropzone({ id, title, subtitle, icon, onFiles, multiple = true, accept = ACCEPT, disabled }: {
  id: string; title: string; subtitle: string; icon?: ReactNode; onFiles: (files: File[]) => void; multiple?: boolean; accept?: string[]; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) onFiles(Array.from(e.dataTransfer.files)); }}
      className={`flex flex-col items-center rounded-card border-2 border-dashed px-4 py-6 text-center transition ${over ? 'border-primary bg-primary-soft' : 'border-inputline bg-bg'} ${disabled ? 'opacity-60' : ''}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">{icon ?? <Upload className="h-5 w-5" aria-hidden />}</span>
      <p className="mt-2.5 text-[15px] font-bold">{title}</p>
      <p className="mt-0.5 text-[13px] text-ink-3">
        Tarik berkas ke sini atau{' '}
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="font-semibold text-primary underline underline-offset-2">pilih file</button>
      </p>
      <p className="mt-0.5 text-[12px] text-ink-3">{subtitle}</p>
      <input ref={input} id={id} type="file" className="sr-only" multiple={multiple} accept={accept.join(',')}
        onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} tabIndex={-1} aria-hidden />
    </div>
  );
}
