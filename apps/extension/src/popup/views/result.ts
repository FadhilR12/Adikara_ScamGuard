// Layar 2 — Hasil pemeriksaan (desain reference/Extension Container Check.png).
import { LEVEL_SUMMARY, NO_RISK_MESSAGE } from '@scamguard/shared';
import { html } from '../../lib/dom';
import { icon } from '../../lib/icons';
import { send } from '../../lib/messaging';
import { state, type LastCheck } from '../state';
import { header, pill, reasonRow, scoreRing, toast } from '../ui';
import type { Navigate } from '../popup';

const TYPE_LABEL: Record<LastCheck['inputType'], string> = { url: 'Tautan', number: 'Nomor', text: 'Teks', page: 'Halaman' };
const SUBJECT: Record<LastCheck['inputType'], string> = { url: 'Tautan ini', number: 'Nomor ini', text: 'Teks ini', page: 'Halaman ini' };

export function renderResult(app: HTMLElement, navigate: Navigate): void {
  const last = state.last;
  if (!last) return navigate('home');
  const { result } = last;
  let expanded = false;

  const summary =
    result.level === 'high'
      ? html`${SUBJECT[last.inputType]} <strong class="font-bold text-ink">terindikasi berisiko</strong>. Sebaiknya tunda transfer dan cek ulang.`
      : html`${LEVEL_SUMMARY[result.level]}`;

  const draw = () => {
    const visible = expanded ? result.reasons : result.reasons.slice(0, 4);
    const more = result.reasons.length - visible.length;
    app.innerHTML = html`
      ${header('Hasil pemeriksaan', `${TYPE_LABEL[last.inputType]} · ${last.target}`)}
      <div class="flex flex-1 flex-col gap-3 overflow-y-auto bg-bg px-4 py-4">
        <section class="flex items-center gap-4 rounded-card border border-line bg-white p-4 shadow-card">
          ${scoreRing(result)}
          <div class="min-w-0">
            ${pill(result.level)}
            <p class="mt-2 text-[14px] leading-relaxed text-ink-2">${summary}</p>
          </div>
        </section>

        <section class="rounded-card border border-line bg-white px-4 py-3 shadow-card">
          ${result.reasons.length
            ? html`
              <h2 class="text-[13px] font-semibold text-ink-2">Tanda yang kami temukan</h2>
              <ul class="mt-1">${visible.map(reasonRow)}</ul>
              ${more > 0 ? html`<button data-more class="mt-1 text-[13px] font-semibold text-primary">+${more} tanda lainnya</button>` : ''}`
            : html`<p class="flex gap-2 text-[13.5px] text-ink-2"><span class="text-low">${icon('checkCircle', 18)}</span>${NO_RISK_MESSAGE}</p>`}
        </section>

        ${result.offline ? html`<p class="text-center text-[12px] text-ink-3">Diperiksa offline dengan aturan bawaan.</p>` : ''}
        <p class="text-center text-[11.5px] leading-snug text-ink-3">Hasil ini bantuan awal berdasarkan tanda-tanda umum, bukan keputusan akhir.</p>
      </div>

      <footer class="border-t border-divider bg-white px-4 pb-3 pt-3">
        <div class="grid grid-cols-[1.3fr_1fr] gap-2.5">
          <button data-delay class="btn-primary">Tunda transfer</button>
          <button data-report class="btn-secondary">${icon('flag', 16)} Laporkan</button>
        </div>
        <p class="mt-2.5 text-center text-[13px] text-ink-2">Sudah terlanjur transfer?
          <button data-guide class="font-bold text-primary hover:text-primary-hover">Lihat panduan</button></p>
      </footer>`.value;

    app.querySelector('[data-more]')?.addEventListener('click', () => {
      expanded = true;
      draw();
    });
    app.querySelector('[data-delay]')!.addEventListener('click', () => {
      toast('Langkah yang tepat. Cek ulang dengan tenang sebelum transfer.');
      navigate('home');
    });
    app.querySelector('[data-guide]')!.addEventListener('click', () => {
      const domain = last.inputType === 'page' || last.inputType === 'url' ? last.target.split('/')[0] : undefined;
      void send({ type: 'OPEN_EMERGENCY', src: 'result', domain });
    });
    const reportBtn = app.querySelector<HTMLButtonElement>('[data-report]')!;
    reportBtn.addEventListener('click', async () => {
      reportBtn.disabled = true;
      const res = await send({
        type: 'REPORT',
        targetType: last.inputType === 'page' ? 'url' : last.inputType,
        targetValue: last.value,
        kind: 'report',
        riskCheckId: last.riskCheckId,
      });
      toast(res?.ok ? 'Terima kasih, laporan Anda terkirim.' : 'Terjadi kendala. Coba lagi sebentar lagi.');
      if (!res?.ok) reportBtn.disabled = false;
    });
  };
  draw();
}
