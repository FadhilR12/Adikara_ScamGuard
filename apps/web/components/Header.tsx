import { ChevronRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-btn" aria-label="ScamGuard — Beranda">
      <span className="flex h-10 w-10 items-center justify-center rounded-btn border border-primary-border bg-primary-soft text-primary">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-[20px] font-extrabold tracking-tight text-ink">ScamGuard</span>
      <span className="rounded-md border border-primary-strong bg-primary-soft px-1.5 text-[11px] font-bold text-primary">ID</span>
    </Link>
  );
}

export interface Crumb { label: string; href?: string }

export function Header({ crumbs = [], right }: { crumbs?: Crumb[]; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8">
        <Logo />
        {right ?? (
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-[14px] sm:flex">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-4 w-4 text-ink-3" aria-hidden />}
                {c.href ? (
                  <Link href={c.href} className="text-ink-3 hover:text-primary">{c.label}</Link>
                ) : (
                  <span aria-current="page" className="rounded-md border border-primary-strong bg-primary-soft px-2.5 py-1 font-semibold text-primary">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© 2026 ScamGuard · Tim Yuri Time, Universitas Telkom.</p>
        <nav className="flex gap-5">
          <Link href="/tentang#privasi" className="hover:text-primary">Kebijakan Privasi</Link>
          <Link href="/tentang" className="hover:text-primary">Tentang</Link>
          <Link href="/riwayat" className="hover:text-primary">Riwayat</Link>
        </nav>
      </div>
    </footer>
  );
}
