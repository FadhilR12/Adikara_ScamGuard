// Komponen kecil yang dipakai beberapa tampilan popup.
import type { RiskLevel, RiskReason, RiskResult } from '@scamguard/shared';
import { LEVEL_LABEL } from '@scamguard/shared';
import { html, type Raw } from '../lib/dom';
import { CATEGORY_ICON, icon } from '../lib/icons';

export const LEVEL_COLOR: Record<RiskLevel, string> = { low: '#16A34A', medium: '#F59E0B', high: '#DC2626' };

export function pill(level: RiskLevel, label = LEVEL_LABEL[level]): Raw {
  return html`<span class="pill pill-${level}"><span class="dot dot-${level}"></span>${label}</span>`;
}

export function scoreRing(result: RiskResult, size = 80): Raw {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return html`
    <div class="relative shrink-0" style="width:${size}px;height:${size}px" role="img" aria-label="Skor ${result.score} dari 100">
      <svg width="${size}" height="${size}" class="-rotate-90">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="${stroke}"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${LEVEL_COLOR[result.level]}" stroke-width="${stroke}"
          stroke-linecap="round" stroke-dasharray="${((result.score / 100) * c).toFixed(1)} ${c.toFixed(1)}"/>
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-[24px] font-extrabold leading-none">${result.score}</span>
        <span class="mt-0.5 text-[11px] text-ink-3">dari 100</span>
      </div>
    </div>`;
}

export function reasonRow(r: RiskReason): Raw {
  return html`
    <li class="flex gap-3 border-b border-divider py-2.5 last:border-0">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-divider text-ink-2">${icon(CATEGORY_ICON[r.category] ?? 'info', 16)}</span>
      <div class="min-w-0">
        <p class="text-[14px] font-bold leading-snug">${r.title}</p>
        ${r.evidence ? html`<p class="mt-0.5 truncate text-[12px] text-ink-2" title="${r.evidence}">${r.evidence}</p>` : ''}
      </div>
    </li>`;
}

export function header(title: string, sub?: string): Raw {
  return html`
    <header class="flex items-center gap-1 border-b border-divider px-3 py-3">
      <button class="icon-btn" data-nav="home" aria-label="Kembali">${icon('chevronLeft', 20)}</button>
      <div class="min-w-0">
        <h1 tabindex="-1" class="text-[17px] font-bold leading-tight focus:outline-none">${title}</h1>
        ${sub ? html`<p class="truncate text-[12px] text-ink-3">${sub}</p>` : ''}
      </div>
    </header>`;
}

let toastTimer: number | undefined;
export function toast(message: string): void {
  const el = document.getElementById('toast')!;
  el.innerHTML = html`<div role="status" class="rounded-btn bg-ink px-4 py-3 text-center text-[13px] font-medium text-white shadow-dialog">${message}</div>`.value;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.innerHTML = ''), 3000);
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
