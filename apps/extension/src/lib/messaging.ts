// Skema pesan antar komponen ekstensi (PRD 10.2).
import type { InputType, ReportingSession, RiskResult } from '@scamguard/shared';
import type { TabResult } from './storage';

export type CheckInputType = Exclude<InputType, 'page'>;

export type Message =
  | { type: 'PAGE_RESULT'; url: string; result: RiskResult; hasPaymentForm: boolean; ms: number }
  | { type: 'CHECK'; inputType: CheckInputType; value: string }
  | { type: 'GET_TAB_STATUS'; tabId: number }
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'ALLOW_DOMAIN'; domain: string; hours: number }
  | { type: 'GO_SAFE' }
  | { type: 'OPEN_EMERGENCY'; src: string; domain?: string }
  | { type: 'OPEN_DETAIL' }
  | { type: 'OPEN_WEB'; path: string }
  | { type: 'REPORT'; targetType: 'url' | 'number' | 'text'; targetValue: string; kind: 'report' | 'false_positive' | 'helpful'; riskCheckId?: string }
  | { type: 'EVENT'; name: string; props?: Record<string, unknown> }
  | { type: 'START_REPORTING_SESSION'; session: ReportingSession; openUrl?: string }
  | { type: 'GET_REPORTING_SESSION' }
  | { type: 'CLEAR_REPORTING_SESSION' }
  | { type: 'SAVE_IASC_REPORT_NO'; incidentId?: string; reportNo: string }
  | { type: 'PAGE_SET'; ops: PageSetOp[] };

/** Operasi yang dijalankan di MAIN world halaman (akses jQuery/select2/flatpickr milik IASC). */
export interface PageSetOp {
  kind: 'flatpickr' | 'select2';
  selector: string;
  value: string;
}

export interface TabStatus {
  supported: boolean;
  loading: boolean;
  enabled: boolean;
  domain: string | null;
  url: string | null;
  tab: TabResult | null;
}

export interface CheckResponse {
  result: RiskResult;
  riskCheckId?: string;
  target: string;
}

export interface Responses {
  PAGE_RESULT: { ok: true };
  CHECK: CheckResponse;
  GET_TAB_STATUS: TabStatus;
  SET_ENABLED: { ok: true };
  ALLOW_DOMAIN: { ok: true };
  GO_SAFE: { ok: true };
  OPEN_EMERGENCY: { ok: true };
  OPEN_DETAIL: { ok: true };
  OPEN_WEB: { ok: true };
  REPORT: { ok: boolean };
  EVENT: { ok: true };
  START_REPORTING_SESSION: { ok: true };
  GET_REPORTING_SESSION: ReportingSession | null;
  CLEAR_REPORTING_SESSION: { ok: true };
  SAVE_IASC_REPORT_NO: { ok: boolean };
  PAGE_SET: { ok: boolean; results: boolean[] };
}

export function send<M extends Message>(message: M): Promise<Responses[M['type']]> {
  return chrome.runtime.sendMessage(message);
}
