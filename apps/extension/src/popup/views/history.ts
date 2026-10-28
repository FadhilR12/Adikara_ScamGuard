// Riwayat pemeriksaan lokal (maks. 20, AC-01.9).
import { html } from '../../lib/dom';
import { icon } from '../../lib/icons';
import { send } from '../../lib/messaging';
import { getLocal } from '../../lib/storage';
import { header, pill, timeAgo } from '../ui';

const TYPE_LABEL = { url: 'Tautan', number: 'Nomor', text: 'Teks', page: 'Halaman' } as const;

export async function renderHistory(app: HTMLElement): Promise<void> {
  const { history = [] } = await getLocal('history');
  app.innerHTML = html`
    ${header('Riwayat pemeriksaan', 'Tersimpan di perangkat ini')}
    <div class="flex-1 overflow-y-auto px-4 py-2">
      ${history.length
        ? html`<ul>${history.map((h) => html`
            <li class="flex items-center gap-3 border-b border-divider py-3 last:border-0">
              <div class="min-w-0 flex-1">
                <p class="truncate text-[13.5px] font-medium" title="${h.value}">${h.value}</p>
                <p class="text-[11.5px] text-ink-3">${TYPE_LABEL[h.type]} · skor ${h.score} · ${timeAgo(h.at)}</p>
              </div>
              ${pill(h.level, { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }[h.level])}
            </li>`)}</ul>`
        : html`<div class="flex flex-col items-center px-6 py-16 text-center">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-divider text-ink-3">${icon('history', 26)}</span>
            <p class="mt-3 text-[14px] text-ink-2">Belum ada pemeriksaan. Coba periksa tautan pertama Anda.</p>
          </div>`}
    </div>
    <footer class="border-t border-divider px-4 py-3">
      <button data-web class="btn-secondary h-11 w-full text-[14px]">${icon('monitor', 16)} Lihat semua di aplikasi web</button>
    </footer>`.value;
  app.querySelector('[data-web]')!.addEventListener('click', () => void send({ type: 'OPEN_WEB', path: '/riwayat' }));
}
