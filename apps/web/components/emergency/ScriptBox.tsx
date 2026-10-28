'use client';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../ui';

/** Contoh kalimat + tombol Salin (AC-05.7). */
export function ScriptBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Tidak dapat menyalin otomatis. Blok teks lalu salin manual.');
    }
  };
  return (
    <div className="rounded-btn border border-line bg-bg p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">Contoh kalimat untuk petugas</p>
      <blockquote className="mt-2 text-[15.5px] leading-relaxed text-ink">“{text}”</blockquote>
      <button onClick={copy}
        className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-btn border-[1.5px] border-inputline bg-white px-3.5 text-[14px] font-bold hover:bg-white/60">
        {copied ? <Check className="h-4 w-4 text-low" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? 'Tersalin' : 'Salin kalimat'}
      </button>
      <p className="mt-2 text-[12.5px] text-ink-3">Bagian dalam [kurung] belum terisi. Lengkapi di Evidence Pack atau sebutkan langsung.</p>
    </div>
  );
}
