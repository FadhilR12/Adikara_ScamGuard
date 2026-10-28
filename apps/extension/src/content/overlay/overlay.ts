// Overlay "Tahan Dulu" (AC-04.x, PRD 8.5). Dirender di Shadow DOM tertutup agar CSS halaman
// tidak merusak tampilan. Menampilkan skor & alasan langsung dari risk engine.
import type { RiskResult } from '@scamguard/shared';
import { LEVEL_LABEL } from '@scamguard/shared';
import font400 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2?url';
import font600 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2?url';
import font700 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2?url';
import font800 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2?url';
import { COOLDOWN_SECONDS } from '../../config';
import { html } from '../../lib/dom';
import { icon } from '../../lib/icons';
import css from './overlay.css?inline';

export interface OverlayHandlers {
  onSafe(): void;
  onDetail(): void;
  onProceed(): void;
  onEmergency(): void;
}

const LEVEL_COLOR = { low: '#16A34A', medium: '#F59E0B', high: '#DC2626' } as const;
const PILL = {
  low: 'bg-low-bg border-low-border text-low-text',
  medium: 'bg-medium-bg border-medium-border text-medium-text',
  high: 'bg-high-bg border-high-border text-high-text',
} as const;

let current: { host: HTMLElement; cleanup: () => void } | null = null;

/** @font-face tidak berlaku dari dalam Shadow DOM, jadi didaftarkan sekali di dokumen. */
function ensureFonts(): void {
  if (document.getElementById('scamguard-fonts')) return;
  const faces = [[font400, 400], [font600, 600], [font700, 700], [font800, 800]] as const;
  const style = document.createElement('style');
  style.id = 'scamguard-fonts';
  style.textContent = faces
    .map(([src, w]) => `@font-face{font-family:'ScamGuard Jakarta';font-weight:${w};font-display:swap;src:url(${chrome.runtime.getURL(src)}) format('woff2');}`)
    .join('');
  (document.head ?? document.documentElement).appendChild(style);
}

function scoreRing(result: RiskResult) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const filled = (result.score / 100) * c;
  return html`
    <div class="relative h-[88px] w-[88px]" role="img" aria-label="Skor risiko ${result.score} dari 100">
      <svg width="88" height="88" viewBox="0 0 88 88" class="-rotate-90">
        <circle cx="44" cy="44" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="8"/>
        <circle cx="44" cy="44" r="${r}" fill="none" stroke="${LEVEL_COLOR[result.level]}" stroke-width="8"
          stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${c.toFixed(1)}"/>
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-[26px] font-extrabold leading-none text-ink">${result.score}</span>
        <span class="mt-1 text-[11px] font-medium text-ink-3">dari 100</span>
      </div>
    </div>`;
}

export function isOverlayOpen(): boolean {
  return !!current;
}

export function removeOverlay(): void {
  current?.cleanup();
  current = null;
}

export function renderOverlay(result: RiskResult, handlers: OverlayHandlers): void {
  if (current) return;
  ensureFonts();

  const host = document.createElement('scamguard-overlay');
  host.style.cssText = 'position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const shown = result.reasons.slice(0, 4);
  const more = result.reasons.length - shown.length;

  shadow.innerHTML = html`
    <style>${css}</style>
    <div class="sg-root fixed inset-0 flex items-center justify-center overflow-y-auto p-4"
         style="background:rgba(15,23,42,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)">
      <div class="sg-dialog my-auto w-[540px] max-w-full overflow-hidden rounded-dialog bg-white shadow-dialog"
           role="alertdialog" aria-modal="true" aria-labelledby="sg-title" aria-describedby="sg-desc">
        <div class="px-6 pb-5 pt-6 sm:px-9">
          <div class="flex items-center justify-center gap-2 text-[15px] font-semibold text-ink-2">
            <span class="text-primary">${icon('shield', 18)}</span> ScamGuard
          </div>
          <div class="mt-4 flex justify-center">${scoreRing(result)}</div>
          <h2 id="sg-title" class="mt-3 text-center text-[28px] font-extrabold leading-tight tracking-tight text-ink">Tahan dulu sebentar</h2>
          <p id="sg-desc" class="mx-auto mt-2 max-w-[440px] text-center text-[16px] leading-relaxed text-ink-2">
            Halaman ini <strong class="font-bold text-ink">terindikasi berisiko</strong>. Ambil napas dan cek dulu sebelum mengirim uang.
          </p>

          <div class="mt-5 rounded-card border border-line bg-bg p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="text-[14px] font-semibold text-ink-2">Tanda yang ditemukan</span>
              <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-bold ${PILL[result.level]}">
                <span class="h-1.5 w-1.5 rounded-full" style="background:${LEVEL_COLOR[result.level]}"></span>${LEVEL_LABEL[result.level]}
              </span>
            </div>
            <ul class="mt-3 flex flex-wrap gap-2" aria-label="Daftar tanda risiko">
              ${shown.map(
                (r) => html`<li class="rounded-full border border-line bg-white px-3 py-1.5 text-[14px] font-medium text-ink" title="${r.evidence ?? ''}">${r.title}</li>`,
              )}
              ${more > 0 ? html`<li class="px-1 py-1.5 text-[13px] font-medium text-ink-3">+${more} tanda lainnya</li>` : ''}
            </ul>
          </div>

          <button data-action="safe" class="mt-5 h-[52px] w-full rounded-btn bg-primary text-[16px] font-bold text-white transition hover:bg-primary-hover">
            Kembali ke halaman aman
          </button>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <button data-action="detail" class="h-[50px] rounded-btn border-[1.5px] border-inputline bg-white text-[16px] font-bold text-ink transition hover:bg-bg">
              Lihat detail
            </button>
            <button data-action="proceed" disabled aria-live="polite"
              class="h-[50px] rounded-btn border-[1.5px] border-inputline bg-white text-[16px] font-bold text-ink transition hover:bg-bg disabled:cursor-not-allowed disabled:border-line disabled:text-[#94A3B8] disabled:hover:bg-white">
              Tetap lanjut (${COOLDOWN_SECONDS})
            </button>
          </div>
          <p class="mt-3 text-center text-[14px] text-ink-3">Jeda singkat ini membantu Anda memutuskan dengan tenang.</p>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-bg px-6 py-4 sm:px-9">
          <span class="text-[15px] text-ink-2">Sudah terlanjur mengirim uang?</span>
          <button data-action="emergency" class="inline-flex items-center gap-1.5 rounded-md text-[15px] font-bold text-primary hover:text-primary-hover">
            Lihat panduan darurat ${icon('arrowRight', 18)}
          </button>
        </div>
      </div>
    </div>`.value;

  const dialog = shadow.querySelector<HTMLElement>('[role=alertdialog]')!;
  const proceed = shadow.querySelector<HTMLButtonElement>('[data-action=proceed]')!;
  const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));

  // Hitung mundur tombol "Tetap lanjut" (AC-04.4). Berbasis jam dinding, karena timer
  // di tab latar belakang diperlambat peramban.
  const unlockAt = Date.now() + COOLDOWN_SECONDS * 1000;
  const timer = window.setInterval(() => {
    const remaining = Math.ceil((unlockAt - Date.now()) / 1000);
    if (remaining > 0) {
      proceed.textContent = `Tetap lanjut (${remaining})`;
    } else {
      window.clearInterval(timer);
      proceed.disabled = false;
      proceed.textContent = 'Tetap lanjutkan';
    }
  }, 1000);

  // Focus trap + Esc (AC-04.2).
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handlers.onSafe();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    const active = shadow.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active) : -1;
    e.preventDefault();
    const next = e.shiftKey ? (idx <= 0 ? items.length - 1 : idx - 1) : (idx + 1) % items.length;
    items[next]?.focus();
  };
  // Cegah halaman merebut fokus selama dialog terbuka.
  const onFocusIn = (e: FocusEvent) => {
    if (e.target !== host) focusables()[0]?.focus();
  };

  dialog.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'safe') handlers.onSafe();
    else if (action === 'detail') handlers.onDetail();
    else if (action === 'proceed' && !proceed.disabled) handlers.onProceed();
    else if (action === 'emergency') handlers.onEmergency();
  });

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  shadow.addEventListener('keydown', onKey as EventListener);
  document.addEventListener('focusin', onFocusIn, true);
  document.documentElement.appendChild(host);
  shadow.querySelector<HTMLButtonElement>('[data-action=safe]')!.focus();

  current = {
    host,
    cleanup: () => {
      window.clearInterval(timer);
      document.removeEventListener('focusin', onFocusIn, true);
      document.documentElement.style.overflow = prevOverflow;
      host.remove();
    },
  };
}
