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

export function Dropzone({ id, title, subtitle, icon, onFiles, multiple = true, accept = ACCEPT, disabled, children }: {
  id: string; title: string; subtitle: string; icon?: ReactNode; onFiles: (files: File[]) => void; multiple?: boolean; accept?: string[]; disabled?: boolean;
  /** Daftar file (chip) yang ditampilkan di dalam kotak, seperti pada referensi desain. */
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) onFiles(Array.from(e.dataTransfer.files)); }}
      className={`flex h-full flex-col items-center rounded-card border-2 border-dashed px-4 py-6 text-center transition ${over ? 'border-primary bg-primary-soft' : 'border-inputline bg-white'} ${disabled ? 'opacity-60' : ''}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">{icon ?? <Upload className="h-5 w-5" aria-hidden />}</span>
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      <p className="mt-0.5 text-[13px] text-ink-3">
        {subtitle ? `${subtitle} · ` : ''}Tarik berkas atau{' '}
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="font-semibold text-primary underline underline-offset-2">pilih file</button>
      </p>
      {children && <div className="mt-3 flex w-full flex-col items-center gap-2">{children}</div>}
      <input ref={input} id={id} type="file" className="sr-only" multiple={multiple} accept={accept.join(',')}
        onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} tabIndex={-1} aria-hidden />
    </div>
  );
}
