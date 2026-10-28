// Bantuan & tautan ke aplikasi web.
import { html } from '../../lib/dom';
import { icon, type IconName } from '../../lib/icons';
import { send } from '../../lib/messaging';
import { header } from '../ui';

const TIPS = [
  'Bank dan instansi resmi tidak pernah meminta kode OTP atau PIN Anda.',
  'Keuntungan tetap dan tinggi dalam waktu singkat adalah tanda yang perlu dicek ulang.',
  'Desakan "transfer sekarang" bertujuan membuat Anda tidak sempat berpikir.',
  'Cek nama domain dengan teliti: huruf yang mirip bisa menyamar sebagai layanan resmi.',
];

function row(action: string, iconName: IconName, title: string, sub: string) {
  return html`
    <button data-action="${action}" class="flex w-full items-center gap-3 rounded-card border border-line px-3.5 py-3 text-left transition hover:bg-bg">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-soft text-primary">${icon(iconName, 18)}</span>
      <span class="min-w-0 flex-1"><span class="block text-[14px] font-bold">${title}</span><span class="block text-[12px] text-ink-3">${sub}</span></span>
      <span class="text-ink-3">${icon('externalLink', 15)}</span>
    </button>`;
}

export function renderHelp(app: HTMLElement): void {
  app.innerHTML = html`
    ${header('Bantuan')}
    <div class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      <section class="rounded-card border border-primary-border bg-primary-soft p-3.5">
        <p class="flex items-center gap-2 text-[13px] font-bold text-primary">${icon('lightbulb', 16)} Tips aman bertransaksi</p>
        <ul class="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-ink-2">${TIPS.map((t) => html`<li>${t}</li>`)}</ul>
      </section>
      ${row('emergency', 'lifeBuoy', 'Saya sudah transfer', 'Panduan langkah darurat')}
      ${row('web', 'monitor', 'Buka aplikasi web', 'Kelola laporan & panduan')}
      ${row('about', 'info', 'Tentang ScamGuard', 'Cara kerja, batasan, dan privasi')}
    </div>`.value;

  app.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'emergency') void send({ type: 'OPEN_EMERGENCY', src: 'popup' });
      if (a === 'web') void send({ type: 'OPEN_WEB', path: '/riwayat' });
      if (a === 'about') void send({ type: 'OPEN_WEB', path: '/tentang' });
    }),
  );
}
