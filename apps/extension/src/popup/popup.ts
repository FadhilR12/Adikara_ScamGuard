// Router popup ScamGuard.
import './popup.css';
import { send } from '../lib/messaging';
import { state } from './state';
import { renderHelp } from './views/help';
import { renderHistory } from './views/history';
import { renderHome } from './views/home';
import { renderResult } from './views/result';
import { renderSettings } from './views/settings';

export type View = 'home' | 'result' | 'history' | 'settings' | 'help';
export type Navigate = (view: View) => void;

const app = document.getElementById('app')!;

const navigate: Navigate = (view) => {
  const render = {
    home: () => renderHome(app, navigate),
    result: () => renderResult(app, navigate),
    history: () => renderHistory(app),
    settings: () => renderSettings(app, navigate),
    help: () => renderHelp(app),
  }[view];
  void Promise.resolve(render()).then(() => {
    // Pindahkan fokus ke judul tampilan baru (beranda memfokuskan kolom input sendiri).
    app.querySelector<HTMLElement>('h1[tabindex]')?.focus({ preventScroll: true });
  });
};

app.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
  if (target) navigate(target.dataset.nav as View);
});

/** Buka hasil halaman milik tab tertentu (dari tombol "Lihat detail" di overlay). */
async function openTabDetail(tabId: number): Promise<boolean> {
  const status = await send({ type: 'GET_TAB_STATUS', tabId });
  if (!status?.tab) return false;
  state.last = { result: status.tab.result, inputType: 'page', target: status.tab.domain, value: status.tab.url };
  navigate('result');
  return true;
}

async function init(): Promise<void> {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isOwnTab = active?.url?.startsWith(chrome.runtime.getURL(''));
  state.activeTabId = active?.id !== undefined && !isOwnTab ? active.id : null;

  const hashTab = /^#result\?tab=(\d+)/.exec(location.hash)?.[1];
  if (hashTab && (await openTabDetail(Number(hashTab)))) return;

  const { detailTab } = await chrome.storage.session.get('detailTab');
  if (typeof detailTab === 'number') {
    await chrome.storage.session.remove('detailTab');
    if (detailTab === state.activeTabId && (await openTabDetail(detailTab))) return;
  }
  navigate('home');
}

void init();
