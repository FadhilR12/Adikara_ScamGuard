'use client';
import { useEffect, useState } from 'react';
import { hms } from '@/lib/format';

export function Countdown() {
  const [left, setLeft] = useState(2 * 3600 + 14 * 60 + 9);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return <span id="countdown" className="font-mono text-[28px] font-extrabold tabular-nums">{hms(left)}</span>;
}
