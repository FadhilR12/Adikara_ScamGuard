// Content script ScamGuard (PRD 10.4): membaca isi halaman, menjalankan risk engine
// langsung di halaman, dan menampilkan "Tahan Dulu" bila skornya tinggi.
import { analyze } from '@scamguard/risk-engine';
import type { RiskResult } from '@scamguard/shared';
import { ALLOW_HOURS, OVERLAY_SCORE, OVERLAY_SCORE_WITH_PAYMENT } from '../config';
import { send } from '../lib/messaging';
import { getLocal, getRules } from '../lib/storage';
import { extractPage } from './extract';
import { isOverlayOpen, removeOverlay, renderOverlay } from './overlay/overlay';

const RESCAN_INTERVAL_MS = 3000;
const RESCAN_MIN_NEW_CHARS = 500;

const domain = location.hostname.replace(/^www\./, '');
let overlayHandled = false; // overlay hanya sekali per muat halaman
let shownAt = 0;

function isExcluded(): boolean {
  if (!/^https?:$/.test(location.protocol)) return true;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  // localhost dikecualikan (AC-02.1), kecuali halaman simulasi demo ScamGuard.
  return local && !location.pathname.startsWith('/demo/');
}

export function shouldShowOverlay(result: RiskResult, hasPaymentForm: boolean): boolean {
  return result.score >= OVERLAY_SCORE || (hasPaymentForm && result.score >= OVERLAY_SCORE_WITH_PAYMENT);
}

function event(name: string, props: Record<string, unknown>): void {
  void send({ type: 'EVENT', name, props }).catch(() => {});
}

function closeWith(action: string): void {
  event('overlay_action', { action, secondsOnScreen: Math.round((Date.now() - shownAt) / 1000) });
  removeOverlay();
}

function showOverlay(result: RiskResult, hasPaymentForm: boolean): void {
  overlayHandled = true;
  shownAt = Date.now();
  event('overlay_shown', { score: result.score, ruleCount: result.reasons.length, hasPaymentForm });
  renderOverlay(result, {
    onSafe() {
      closeWith('go_safe');
      const before = location.href;
      if (history.length > 1) {
        history.back();
        // Jika tidak ada halaman sebelumnya yang bisa dituju, tutup tab lewat service worker.
        window.setTimeout(() => {
          if (location.href === before) void send({ type: 'GO_SAFE' });
        }, 700);
      } else {
        void send({ type: 'GO_SAFE' });
      }
    },
    onDetail() {
      event('overlay_action', { action: 'detail', secondsOnScreen: Math.round((Date.now() - shownAt) / 1000) });
      void send({ type: 'OPEN_DETAIL' });
    },
    onProceed() {
      closeWith('proceed');
      void send({ type: 'ALLOW_DOMAIN', domain, hours: ALLOW_HOURS });
    },
    onEmergency() {
      event('overlay_action', { action: 'emergency', secondsOnScreen: Math.round((Date.now() - shownAt) / 1000) });
      void send({ type: 'OPEN_EMERGENCY', src: 'overlay', domain });
    },
  });
}

async function scan(): Promise<void> {
  const { enabled, allowedDomains = {} } = await getLocal('enabled', 'allowedDomains');
  if (enabled === false) return; // Dijeda (AC-02.5)

  const t0 = performance.now();
  const page = extractPage();
  const result = analyze({ type: 'page', page }, await getRules());
  const ms = Math.round(performance.now() - t0);
  if (import.meta.env.DEV) console.debug(`[ScamGuard] skor ${result.score} (${result.level}) dalam ${ms} ms`, result.reasons);

  await send({ type: 'PAGE_RESULT', url: location.href, result, hasPaymentForm: page.hasPaymentForm, ms }).catch(() => {});

  const allowedUntil = allowedDomains[domain] ?? 0;
  if (!overlayHandled && allowedUntil < Date.now() && shouldShowOverlay(result, page.hasPaymentForm)) {
    showOverlay(result, page.hasPaymentForm);
  }
}

/** Analisis ulang untuk SPA: maks 1× per 3 detik bila > 500 karakter baru (AC-02.3). */
function observe(): void {
  let added = 0;
  let last = Date.now();
  let pending: number | undefined;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof HTMLElement && node.tagName === 'SCAMGUARD-OVERLAY') continue;
        added += node.textContent?.length ?? 0;
      }
    }
    if (added < RESCAN_MIN_NEW_CHARS || pending !== undefined) return;
    const wait = Math.max(0, RESCAN_INTERVAL_MS - (Date.now() - last));
    pending = window.setTimeout(() => {
      pending = undefined;
      added = 0;
      last = Date.now();
      void scan();
    }, wait);
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.enabled?.newValue === false && isOverlayOpen()) removeOverlay();
  if (changes.enabled?.newValue === true) {
    overlayHandled = false;
    void scan();
  }
});

if (!isExcluded()) {
  void scan();
  observe();
}
