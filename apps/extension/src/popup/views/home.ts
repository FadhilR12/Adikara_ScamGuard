// Layar 1A — Beranda popup (desain reference/Extension Container.png).
import { looksLikeNumber, looksLikeUrl, parseUrl } from '@scamguard/risk-engine';
import { LEVEL_LABEL } from '@scamguard/shared';
import { EXT_VERSION } from '../../config';
import { $, html, type Raw } from '../../lib/dom';
import { icon } from '../../lib/icons';
import { send, type CheckInputType, type TabStatus } from '../../lib/messaging';
import { getLocal } from '../../lib/storage';
import { state } from '../state';
import { pill, timeAgo, toast } from '../ui';
import type { Navigate } from '../popup';

const MAX_TEXT = 5000;
const TYPE_LABEL: Record<CheckInputType, string> = { url: 'Tautan', number: 'Nomor', text: 'Teks' };

export function detectType(value: string): CheckInputType {
  if (looksLikeUrl(value)) return 'url';
  if (looksLikeNumber(value)) return 'number';
  return 'text';
}

/** Validasi AC-01.2–01.6. Mengembalikan pesan kesalahan atau null. */
export function validate(value: string, type: CheckInputType): string | null {
  const v = value.trim();
  if (!v) return 'Isi dulu tautan, nomor, atau teks yang ingin diperiksa.';
  if (type === 'url' && !parseUrl(v)) return 'Format tautan belum benar. Contoh: https://contoh.com';
  if (type === 'text' && (/^[a-z]+:\/\//i.test(v) || /^www\./i.test(v)) && !/\s/.test(v)) {
    return 'Format tautan belum benar. Contoh: https://contoh.com';
  }
  if (type === 'number') {
    const digits = v.replace(/\D/g, '').replace(/^62/, '0');
    if (digits.length < 6 || digits.length > 16) return 'Nomor HP 10–13 digit atau nomor rekening 6–16 digit.';
  }
  if (v.length > MAX_TEXT) return `Teks maksimal ${MAX_TEXT.toLocaleString('id-ID')} karakter.`;
  return null;
}

function toggle(enabled: boolean): Raw {
  return html`
    <button role="switch" aria-checked="${String(enabled)}" aria-label="Perlindungan otomatis" data-toggle
      class="relative h-[30px] w-[52px] shrink-0 rounded-full transition ${enabled ? 'bg-primary' : 'bg-[#CBD5E1]'}">
      <span class="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[25px]' : 'left-[3px]'}"></span>
    </button>`;
}

function protectionCard(enabled: boolean): Raw {
  return enabled
    ? html`
      <section class="rounded-card border border-primary-border bg-primary-soft p-3.5">
        <div class="flex items-center justify-between">
          <span class="section-label">Proteksi</span>
          <div class="flex items-center gap-2.5"><span class="text-[14px] font-bold text-primary">Aktif</span>${toggle(true)}</div>
        </div>
        <p class="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <span class="text-primary">${icon('checkCircle', 15)}</span> ScamGuard aktif melindungi peramban Anda.
        </p>
      </section>`
    : html`
      <section class="rounded-card border border-line bg-bg p-3.5">
        <div class="flex items-center justify-between">
          <span class="section-label">Proteksi</span>
          <div class="flex items-center gap-2.5"><span class="text-[14px] font-bold text-ink-3">Dijeda</span>${toggle(false)}</div>
        </div>
        <p class="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <span class="h-2 w-2 rounded-full bg-[#94A3B8]"></span> Peringatan otomatis tidak ditampilkan.
        </p>
      </section>`;
}

function pageCard(s: TabStatus): Raw {
  const neutral = (title: string, desc: string) => html`
    <div class="rounded-card border border-line bg-bg px-3.5 py-3">
      <p class="flex items-center gap-2 text-[14px] font-bold text-ink-2"><span class="h-2 w-2 rounded-full bg-[#94A3B8]"></span>${title}</p>
      <p class="mt-0.5 text-[12.5px] text-ink-3">${desc}</p>
    </div>`;

  if (!s.supported) return neutral('Halaman ini tidak diperiksa', 'Halaman internal peramban tidak dianalisis.');
  if (!s.enabled) return neutral('Pemeriksaan otomatis dijeda', 'Aktifkan proteksi untuk memeriksa halaman ini.');
  if (!s.tab) {
    return s.loading
      ? neutral('Memeriksa…', 'Menganalisis isi halaman.')
      : neutral('Halaman ini tidak diperiksa', 'Belum ada hasil untuk halaman ini. Muat ulang halaman bila perlu.');
  }

  const { result } = s.tab;
  const tone = {
    low: 'border-low-border bg-low-bg',
    medium: 'border-medium-border bg-medium-bg',
    high: 'border-high-border bg-high-bg',
  }[result.level];
  const title = { low: 'Aman sejauh ini', medium: 'Waspada', high: 'Terindikasi berisiko' }[result.level];
  const desc = result.reasons[0] ? `Tanda utama: ${result.reasons[0].title}.` : 'Tidak ditemukan tanda risiko yang kuat.';
  return html`
    <button data-page-detail class="block w-full rounded-card border px-3.5 py-3 text-left transition hover:brightness-[.98] ${tone}"
      aria-label="${LEVEL_LABEL[result.level]}, skor ${result.score} dari 100. Lihat detail">
      <div class="flex items-center justify-between gap-2">
        <p class="flex items-center gap-2 text-[14px] font-bold"><span class="dot dot-${result.level} !h-2 !w-2"></span>${title}</p>
        <span class="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2">Skor ${result.score}/100</span>
      </div>
      <p class="mt-0.5 text-[12.5px] text-ink-2">${desc}</p>
    </button>`;
}

export async function renderHome(app: HTMLElement, navigate: Navigate): Promise<void> {
  const tabId = state.activeTabId;
  const status: TabStatus = tabId !== null
    ? await send({ type: 'GET_TAB_STATUS', tabId })
    : { supported: false, loading: false, enabled: true, domain: null, url: null, tab: null };
  const { history = [] } = await getLocal('history');

  // Prefill cerdas: halaman aktif Sedang/Tinggi → isi URL-nya (PRD 8.3).
  if (!state.draft && status.tab && status.tab.result.level !== 'low') state.draft = status.tab.url;

  app.innerHTML = html`
    <header class="flex items-start gap-3 border-b border-divider px-4 pb-3 pt-4">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-primary-border bg-primary-soft text-primary">${icon('shieldCheck', 22)}</span>
      <div class="min-w-0 flex-1">
        <p class="flex items-center gap-2 text-[19px] font-extrabold leading-tight">ScamGuard
          <span class="rounded-md border border-primary-strong bg-primary-soft px-1.5 text-[10px] font-bold text-primary">ID</span></p>
        <p class="text-[12.5px] text-ink-2">Cek dulu sebelum transfer.</p>
      </div>
      <button class="icon-btn -mr-2 -mt-1.5" data-close aria-label="Tutup">${icon('x', 18)}</button>
    </header>

    <div class="flex flex-1 flex-col gap-4 px-4 py-4">
      ${protectionCard(status.enabled)}

      <section>
        <div class="mb-1.5 flex items-center justify-between gap-3">
          <span class="section-label">Halaman ini</span>
          <span class="max-w-[200px] truncate font-mono text-[11px] text-ink-3" title="${status.domain ?? ''}">${status.domain ?? '—'}</span>
        </div>
        ${pageCard(status)}
      </section>

      <section>
        <label for="manual" class="section-label mb-1.5 block">Periksa manual</label>
        <textarea id="manual" rows="3" maxlength="${MAX_TEXT}"
          class="w-full resize-none rounded-btn border border-inputline bg-bg px-3 py-2.5 text-[13.5px] leading-snug placeholder:text-[#94A3B8] focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-strong"
          placeholder="Tempel URL, nomor HP/rekening, atau teks penawaran yang mencurigakan di sini…"
          aria-describedby="manual-hint manual-error">${state.draft}</textarea>
        <div class="mt-1 flex min-h-[18px] justify-between gap-2 text-[12px]">
          <p id="manual-error" class="font-medium text-medium-text" role="alert"></p>
          <p id="manual-hint" class="shrink-0 text-ink-3"></p>
        </div>
        <button data-upload class="btn-secondary mt-1 h-10 w-full text-[13.5px] font-semibold">${icon('upload', 16)} Unggah Screenshot</button>
        <button data-check class="btn-primary mt-2.5 w-full">${icon('search', 17)} Periksa Risiko</button>
      </section>

      <button data-emergency class="flex items-center gap-3 rounded-card border border-line px-3.5 py-3 text-left transition hover:bg-bg">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-high-bg text-high">${icon('lifeBuoy', 18)}</span>
        <span class="min-w-0 flex-1">
          <span class="block text-[14px] font-bold">Saya sudah transfer</span>
          <span class="block text-[12px] text-ink-3">Panduan langkah darurat</span>
        </span>
        <span class="text-ink-3">${icon('chevronRight', 18)}</span>
      </button>

      ${history.length
        ? html`<section>
            <p class="section-label mb-1">Pemeriksaan terakhir</p>
            <ul>${history.slice(0, 2).map((h) => html`
              <li class="flex items-center gap-2 border-b border-divider py-2 last:border-0">
                <span class="min-w-0 flex-1 truncate text-[13px]" title="${h.value}">${h.value}</span>
                <span class="text-[11px] text-ink-3">${timeAgo(h.at)}</span>${pill(h.level, { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }[h.level])}
              </li>`)}</ul>
          </section>`
        : ''}
    </div>

    <footer class="flex items-center justify-center gap-3 border-t border-divider px-4 py-3 text-[12.5px] text-ink-2">
      <button data-nav="history" class="rounded px-1 hover:text-primary">Riwayat</button><span class="text-line">|</span>
      <button data-nav="settings" class="rounded px-1 hover:text-primary">Pengaturan</button><span class="text-line">|</span>
      <button data-nav="help" class="rounded px-1 hover:text-primary">Bantuan</button>
      <span class="ml-auto text-[11px] text-ink-3">v${EXT_VERSION}</span>
    </footer>`.value;

  const input = $(app, '#manual') as HTMLTextAreaElement;
  const error = $(app, '#manual-error');
  const hint = $(app, '#manual-hint');
  const checkBtn = $(app, '[data-check]') as HTMLButtonElement;

  const updateHint = () => {
    const v = input.value.trim();
    const parts: string[] = [];
    if (v) parts.push(`Terdeteksi: ${TYPE_LABEL[detectType(v)]}`);
    if (input.value.length > 4000) parts.push(`${input.value.length.toLocaleString('id-ID')}/5.000`);
    hint.textContent = parts.join(' · ');
  };
  updateHint();
  input.addEventListener('input', () => {
    state.draft = input.value;
    error.textContent = '';
    updateHint();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) checkBtn.click();
  });

  checkBtn.addEventListener('click', async () => {
    const value = input.value.trim();
    const type = detectType(value);
    const problem = validate(value, type);
    if (problem) {
      error.textContent = problem;
      input.focus();
      return;
    }
    checkBtn.disabled = true;
    checkBtn.innerHTML = html`<span class="spinner"></span> Memeriksa…`.value;
    const res = await send({ type: 'CHECK', inputType: type, value });
    if (!res) {
      checkBtn.disabled = false;
      checkBtn.innerHTML = html`${icon('search', 17)} Periksa Risiko`.value;
      toast('Terjadi kendala. Coba lagi sebentar lagi.');
      return;
    }
    state.last = { result: res.result, inputType: type, target: res.target, value, riskCheckId: res.riskCheckId };
    navigate('result');
  });

  app.querySelector('[data-toggle]')?.addEventListener('click', async () => {
    await send({ type: 'SET_ENABLED', enabled: !status.enabled });
    navigate('home');
  });
  app.querySelector('[data-page-detail]')?.addEventListener('click', () => {
    if (!status.tab) return;
    state.last = { result: status.tab.result, inputType: 'page', target: status.tab.domain, value: status.tab.url };
    navigate('result');
  });
  $(app, '[data-upload]').addEventListener('click', () => void send({ type: 'OPEN_WEB', path: '/periksa-gambar' }));
  $(app, '[data-emergency]').addEventListener('click', () => void send({ type: 'OPEN_EMERGENCY', src: 'popup', domain: status.tab?.domain }));
  $(app, '[data-close]').addEventListener('click', () => window.close());
  if (!state.draft) input.focus();
}
