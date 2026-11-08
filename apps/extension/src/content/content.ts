// Content script ScamGuard (PRD 10.4): membaca isi halaman, menjalankan risk engine
// langsung di halaman, dan menampilkan "Tahan Dulu" bila skornya tinggi.
import { analyze } from '@scamguard/risk-engine';
import type { ReportingSession, RiskResult } from '@scamguard/shared';
import { ALLOW_HOURS, OVERLAY_SCORE, OVERLAY_SCORE_WITH_PAYMENT, WEB_APP_URL } from '../config';
import { send } from '../lib/messaging';
import { getLocal, getRules } from '../lib/storage';
import { extractPage } from './extract';
import { mountIsland, ScamGuardIsland } from './island/island';
import { isOverlayOpen, removeOverlay, renderOverlay } from './overlay/overlay';

const RESCAN_INTERVAL_MS = 3000;
const RESCAN_MIN_NEW_CHARS = 500;

const domain = location.hostname.replace(/^www\./, '');
let overlayHandled = false; // overlay hanya sekali per muat halaman
let shownAt = 0;
let islandInstance: ScamGuardIsland | null = null;

export function isIascPage(): boolean {
  const host = location.hostname.toLowerCase();
  const path = location.pathname.toLowerCase();
  return host === 'iasc.ojk.go.id' || path.startsWith('/demo/iasc-portal') || path.includes('/guest/laporanv2');
}

const WEB_ORIGIN = (() => {
  try {
    return new URL(WEB_APP_URL).origin;
  } catch {
    return '';
  }
})();
const isWebApp = location.origin === WEB_ORIGIN;

async function checkAndMountIsland(): Promise<void> {
  if (!isIascPage() || islandInstance) return;
  const session = await send({ type: 'GET_REPORTING_SESSION' }).catch(() => null);
  if (session && !islandInstance) {
    islandInstance = mountIsland(session);
  }
}

// KF-ISLAND-01: terima payload dari Web ScamGuard (klik "Buka IASC dengan Co-Pilot").
// Hanya dari origin web app ScamGuard agar situs lain tidak bisa menyuntik sesi palsu.
window.addEventListener('message', async (e) => {
  if (e.source !== window || e.origin !== WEB_ORIGIN || !e.data || e.data.type !== 'SCAMGUARD_START_IASC_REPORT') return;
  const session = e.data.payload as ReportingSession | undefined;
  if (!session?.incidentId) return;
  const openUrl = typeof e.data.openUrl === 'string' ? e.data.openUrl : undefined;
  const res = await send({ type: 'START_REPORTING_SESSION', session, openUrl }).catch(() => null);
  if (res?.ok) window.postMessage({ type: 'SCAMGUARD_IASC_REPORT_ACK', incidentId: session.incidentId }, WEB_ORIGIN);
});

// Sesi bisa tersimpan setelah tab IASC selesai dimuat → mount saat itu juga.
// Di tab web app, teruskan nomor laporan yang tertangkap agar tersimpan ke insiden (AC-06.4).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.scamguard_active_reporting) return;
  const next = changes.scamguard_active_reporting.newValue as ReportingSession | null | undefined;
  const prev = changes.scamguard_active_reporting.oldValue as ReportingSession | null | undefined;
  if (next && isIascPage() && !islandInstance) void checkAndMountIsland();
  const reportNo = next?.result?.iascReportNo;
  if (isWebApp && reportNo && reportNo !== prev?.result?.iascReportNo) {
    window.postMessage({ type: 'SCAMGUARD_IASC_REPORT_SAVED', incidentId: next.incidentId, reportNo }, WEB_ORIGIN);
  }
});

function isExcluded(): boolean {
  if (!/^https?:$/.test(location.protocol)) return true;
  if (isIascPage()) return true; // Halaman IASC tidak discan sebagai phishing
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

// Inisialisasi Dynamic Island Co-Pilot bila berada di portal IASC / mock demo
void checkAndMountIsland();
