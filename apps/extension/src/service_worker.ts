// Service worker ScamGuard (PRD 10): pesan, badge, pembaruan aturan, logging anonim.
import { analyze, isUsableRuleSet, normalizeNumber, parseUrl } from '@scamguard/risk-engine';
import type { RiskResult, RuleSet } from '@scamguard/shared';
import { ALLOW_HOURS, RULES_REFRESH_MINUTES, WEB_APP_URL } from './config';
import { api, stripQuery, track } from './lib/api';
import { fetchPage } from './lib/fetch-page';
import type { CheckResponse, Message, TabStatus } from './lib/messaging';
import {
  getAllowedDomains, getDeviceId, getRules, getTabResult, isEnabled, pushHistory, setLocal, setTabResult,
} from './lib/storage';

const BADGE: Record<RiskResult['level'], { text: string; color: string }> = {
  low: { text: '', color: '#16A34A' },
  medium: { text: '!', color: '#F59E0B' },
  high: { text: '!', color: '#DC2626' },
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isSupported(url?: string): boolean {
  return !!url && /^https?:/.test(url) && !/^https:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/.test(url);
}

async function setBadge(tabId: number, level: RiskResult['level'] | null): Promise<void> {
  const b = level ? BADGE[level] : BADGE.low;
  await chrome.action.setBadgeText({ tabId, text: b.text }).catch(() => {});
  await chrome.action.setBadgeBackgroundColor({ tabId, color: b.color }).catch(() => {});
}

async function webUrl(path: string, params: Record<string, string | undefined> = {}): Promise<string> {
  const url = new URL(path, WEB_APP_URL);
  url.searchParams.set('d', await getDeviceId());
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

async function refreshRules(): Promise<void> {
  const current = await getRules();
  const next = await api<RuleSet>(`/rules?since=${encodeURIComponent(current.fromServer ? current.version : '')}`);
  // Aturan baru hanya dipakai bila skemanya cocok dan valid (PRD 9.6); jika tidak, tetap versi lama.
  if (next && isUsableRuleSet(next)) await setLocal({ rules: { ...next, fromServer: true } });
}

/** Tampilan target yang aman disimpan di riwayat lokal. */
function displayTarget(inputType: string, value: string): string {
  if (inputType === 'url') return parseUrl(value)?.href.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? value;
  if (inputType === 'number') return normalizeNumber(value);
  return value.replace(/\s+/g, ' ').slice(0, 80);
}

async function check(inputType: 'url' | 'text' | 'number', value: string): Promise<CheckResponse> {
  const t0 = performance.now();
  const rules = await getRules();
  let result: RiskResult;
  if (inputType === 'url') {
    const parsed = parseUrl(value);
    const page = parsed ? await fetchPage(parsed.href) : null;
    result = analyze({ type: 'url', value: parsed?.href ?? value, page: page ?? undefined }, rules);
  } else {
    result = analyze({ type: inputType, value }, rules);
  }

  // Log ke backend (sekaligus tahu online/offline). Gagal → hasil lokal tetap dipakai (AC-01.8).
  const server = await api<RiskResult & { id: string }>(
    '/risk/check',
    { method: 'POST', body: JSON.stringify({ type: inputType, value, source: 'popup', score: result.score, ruleHits: result.reasons.map((r) => r.ruleId) }) },
    1500,
  );
  if (server && server.rulesVersion !== result.rulesVersion && server.score > result.score) {
    result = { ...server, offline: false };
  } else {
    result = { ...result, offline: !server };
  }

  const target = displayTarget(inputType, value);
  await pushHistory({ value: target, type: inputType, score: result.score, level: result.level, at: result.analyzedAt });
  track('check_performed', { inputType, level: result.level, ms: Math.round(performance.now() - t0) });
  return { result, riskCheckId: server?.id, target };
}

async function tabStatus(tabId: number): Promise<TabStatus> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const url = tab?.url ?? null;
  return {
    supported: isSupported(url ?? undefined),
    loading: tab?.status === 'loading',
    enabled: await isEnabled(),
    domain: url ? hostOf(url) : null,
    url,
    tab: await getTabResult(tabId),
  };
}

async function handle(msg: Message, sender: chrome.runtime.MessageSender): Promise<unknown> {
  const tabId = sender.tab?.id;
  switch (msg.type) {
    case 'PAGE_RESULT': {
      if (tabId === undefined) return { ok: true };
      const domain = hostOf(msg.url) ?? msg.url;
      await setTabResult(tabId, { url: msg.url, domain, result: msg.result, hasPaymentForm: msg.hasPaymentForm });
      await setBadge(tabId, msg.result.level);
      if (msg.result.score > 0) {
        // Hanya domain, URL tanpa query, skor, dan rule_id — teks halaman tidak dikirim (AC-02.4).
        void api('/risk/check', {
          method: 'POST',
          body: JSON.stringify({
            type: 'page', source: 'auto', url: stripQuery(msg.url), score: msg.result.score,
            ruleHits: msg.result.reasons.map((r) => r.ruleId),
          }),
        });
      }
      return { ok: true };
    }
    case 'CHECK':
      return check(msg.inputType, msg.value);
    case 'GET_TAB_STATUS':
      return tabStatus(msg.tabId);
    case 'SET_ENABLED':
      await setLocal({ enabled: msg.enabled });
      return { ok: true };
    case 'ALLOW_DOMAIN': {
      const allowed = await getAllowedDomains();
      allowed[msg.domain] = Date.now() + (msg.hours || ALLOW_HOURS) * 3_600_000;
      await setLocal({ allowedDomains: allowed });
      return { ok: true };
    }
    case 'GO_SAFE': {
      if (tabId !== undefined) {
        await chrome.tabs.create({ index: (sender.tab?.index ?? 0) + 1, active: true });
        await chrome.tabs.remove(tabId);
      }
      return { ok: true };
    }
    case 'OPEN_EMERGENCY':
      await chrome.tabs.create({ url: await webUrl('/darurat', { src: msg.src, domain: msg.domain }) });
      track('emergency_opened', { src: msg.src });
      return { ok: true };
    case 'OPEN_WEB':
      await chrome.tabs.create({ url: await webUrl(msg.path) });
      return { ok: true };
    case 'OPEN_DETAIL': {
      if (tabId === undefined) return { ok: true };
      await chrome.storage.session.set({ detailTab: tabId });
      try {
        await chrome.action.openPopup();
      } catch {
        // Popup tidak selalu bisa dibuka secara programatik (AC-04.7) → buka di tab baru.
        await chrome.tabs.create({ url: chrome.runtime.getURL(`src/popup/popup.html#result?tab=${tabId}`) });
      }
      return { ok: true };
    }
    case 'REPORT': {
      const res = await api('/feedback', {
        method: 'POST',
        body: JSON.stringify({ targetType: msg.targetType, targetValue: msg.targetValue, kind: msg.kind, riskCheckId: msg.riskCheckId }),
      });
      return { ok: !!res };
    }
    case 'EVENT':
      track(msg.name, msg.props);
      return { ok: true };
  }
}

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse, (err) => {
    console.error('[ScamGuard]', err);
    sendResponse(null);
  });
  return true; // respons async
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await getDeviceId();
  chrome.alarms.create('rules-refresh', { periodInMinutes: RULES_REFRESH_MINUTES });
  void refreshRules();
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    await setLocal({ enabled: true, history: [], allowedDomains: {}, onboardingDone: false });
    track('ext_installed', { version: chrome.runtime.getManifest().version });
    await chrome.tabs.create({ url: await webUrl('/selamat-datang') });
  }
});

chrome.runtime.onStartup.addListener(() => void refreshRules());
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'rules-refresh') void refreshRules();
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading' && info.url) {
    void setTabResult(tabId, null);
    void setBadge(tabId, null);
  }
});
chrome.tabs.onRemoved.addListener((tabId) => void setTabResult(tabId, null));

// Saat perlindungan dijeda, kosongkan badge semua tab.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled?.newValue === false) {
    void chrome.tabs.query({}).then((tabs) => tabs.forEach((t) => t.id !== undefined && setBadge(t.id, null)));
  }
});
