'use client';
import { useEffect, useState } from 'react';
import { parseRupiah } from '@/lib/format';

export function MoneyInput({ id, value, onChange, warn, describedBy }: { id: string; value: number | null | undefined; onChange: (v: number | null) => void; warn?: boolean; describedBy?: string }) {
  const fmt = (n: number | null | undefined) => (n ? n.toLocaleString('id-ID') : '');
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    if (parseRupiah(text) !== (value ?? null)) setText(fmt(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`flex h-12 overflow-hidden rounded-btn border bg-white focus-within:ring-2 ${warn ? 'border-medium focus-within:ring-medium-border' : 'border-inputline focus-within:border-primary focus-within:ring-primary-strong'}`}>
      <span className="flex items-center border-r border-line bg-bg px-3.5 text-[15px] font-semibold text-ink-2">Rp</span>
      <input id={id} inputMode="numeric" autoComplete="off" value={text} aria-describedby={describedBy} placeholder="0"
        className="min-w-0 flex-1 px-3.5 text-[15px] focus:outline-none"
        onChange={(e) => {
          const n = parseRupiah(e.target.value);
          setText(n ? n.toLocaleString('id-ID') : '');
          onChange(n);
        }} />
    </div>
  );
}
