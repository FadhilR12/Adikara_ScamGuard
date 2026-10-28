// Pengaturan: proteksi, domain yang diizinkan, hapus riwayat.
import { html } from '../../lib/dom';
import { icon } from '../../lib/icons';
import { send } from '../../lib/messaging';
import { getAllowedDomains, getDeviceId, getRules, isEnabled, setLocal } from '../../lib/storage';
import { header, toast } from '../ui';
import type { Navigate } from '../popup';

export async function renderSettings(app: HTMLElement, navigate: Navigate): Promise<void> {
  const [enabled, allowed, rules, deviceId] = await Promise.all([isEnabled(), getAllowedDomains(), getRules(), getDeviceId()]);
  const domains = Object.entries(allowed);

  app.innerHTML = html`
    ${header('Pengaturan')}
    <div class="flex-1 space-y-5 overflow-y-auto px-4 py-4">
      <section class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[14px] font-bold">Peringatan otomatis</p>
          <p class="text-[12.5px] text-ink-3">Periksa setiap halaman yang Anda buka.</p>
        </div>
        <button role="switch" aria-checked="${String(enabled)}" aria-label="Peringatan otomatis" data-toggle
          class="relative h-[30px] w-[52px] shrink-0 rounded-full transition ${enabled ? 'bg-primary' : 'bg-[#CBD5E1]'}">
          <span class="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[25px]' : 'left-[3px]'}"></span>
        </button>
      </section>

      <section>
        <p class="section-label">Domain yang Anda izinkan (24 jam)</p>
        ${domains.length
          ? html`<ul class="mt-1">${domains.map(([d, exp]) => html`
              <li class="flex items-center gap-2 border-b border-divider py-2 last:border-0">
                <span class="min-w-0 flex-1 truncate font-mono text-[12.5px]">${d}</span>
                <span class="text-[11px] text-ink-3">s.d. ${new Date(exp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                <button class="icon-btn h-9 w-9" data-remove="${d}" aria-label="Hapus izin ${d}">${icon('trash', 15)}</button>
              </li>`)}</ul>`
          : html`<p class="mt-1 text-[12.5px] text-ink-3">Belum ada. Domain muncul di sini setelah Anda memilih "Tetap lanjutkan".</p>`}
      </section>

      <section>
        <p class="section-label">Data di perangkat</p>
        <button data-clear class="btn-secondary mt-2 h-10 w-full text-[13.5px]">${icon('trash', 15)} Hapus riwayat pemeriksaan</button>
      </section>

      <section class="rounded-card bg-bg p-3 text-[12px] text-ink-3">
        <p>Versi aturan: <span class="font-mono">${rules.version}</span>${rules.fromServer ? '' : ' (bawaan)'}</p>
        <p>ID perangkat anonim: <span class="font-mono">${deviceId.slice(0, 8)}…</span></p>
      </section>
    </div>`.value;

  app.querySelector('[data-toggle]')!.addEventListener('click', async () => {
    await send({ type: 'SET_ENABLED', enabled: !enabled });
    navigate('settings');
  });
  app.querySelectorAll<HTMLElement>('[data-remove]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const next = { ...allowed };
      delete next[btn.dataset.remove!];
      await setLocal({ allowedDomains: next });
      navigate('settings');
    }),
  );
  app.querySelector('[data-clear]')!.addEventListener('click', async () => {
    await setLocal({ history: [] });
    toast('Riwayat pemeriksaan dihapus.');
  });
}
