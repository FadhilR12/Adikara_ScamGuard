// Kunci chrome.storage (PRD 10.3).
import { defaultRules, isUsableRuleSet } from '@scamguard/risk-engine';
import type { RiskHistoryItem, RiskResult, RuleSet } from '@scamguard/shared';
import { HISTORY_LIMIT } from '../config';

export interface LocalState {
  deviceId: string;
  enabled: boolean;
  rules: RuleSet;
  history: RiskHistoryItem[];
  allowedDomains: Record<string, number>;
  onboardingDone: boolean;
}

export interface TabResult {
  url: string;
  domain: string;
  result: RiskResult;
  hasPaymentForm: boolean;
}

const local = chrome.storage.local;

export async function getLocal<K extends keyof LocalState>(...keys: K[]): Promise<Pick<LocalState, K>> {
  return (await local.get(keys)) as Pick<LocalState, K>;
}

export async function setLocal(values: Partial<LocalState>): Promise<void> {
  await local.set(values);
}

export async function getDeviceId(): Promise<string> {
  const { deviceId } = await getLocal('deviceId');
  if (deviceId) return deviceId;
  const id = crypto.randomUUID();
  await setLocal({ deviceId: id });
  return id;
}

export async function isEnabled(): Promise<boolean> {
  const { enabled } = await getLocal('enabled');
  return enabled !== false;
}

export async function getRules(): Promise<RuleSet> {
  const { rules } = await getLocal('rules');
  return rules && isUsableRuleSet(rules) ? rules : defaultRules;
}

export async function pushHistory(item: RiskHistoryItem): Promise<void> {
  const { history = [] } = await getLocal('history');
  await setLocal({ history: [item, ...history].slice(0, HISTORY_LIMIT) });
}

/** Hapus izin yang sudah kedaluwarsa, kembalikan yang masih berlaku. */
export async function getAllowedDomains(): Promise<Record<string, number>> {
  const { allowedDomains = {} } = await getLocal('allowedDomains');
  const now = Date.now();
  const valid = Object.fromEntries(Object.entries(allowedDomains).filter(([, exp]) => exp > now));
  if (Object.keys(valid).length !== Object.keys(allowedDomains).length) await setLocal({ allowedDomains: valid });
  return valid;
}

export async function getTabResult(tabId: number): Promise<TabResult | null> {
  const key = `tab:${tabId}`;
  const data = await chrome.storage.session.get(key);
  return (data[key] as TabResult | undefined) ?? null;
}

export async function setTabResult(tabId: number, value: TabResult | null): Promise<void> {
  const key = `tab:${tabId}`;
  if (value) await chrome.storage.session.set({ [key]: value });
  else await chrome.storage.session.remove(key);
}
