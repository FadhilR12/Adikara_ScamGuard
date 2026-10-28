// State ringan popup (hidup selama popup terbuka).
import type { RiskResult } from '@scamguard/shared';
import type { CheckInputType } from '../lib/messaging';

export interface LastCheck {
  result: RiskResult;
  inputType: CheckInputType | 'page';
  target: string;
  /** Nilai mentah untuk tombol Laporkan. */
  value: string;
  riskCheckId?: string;
}

export const state: { activeTabId: number | null; draft: string; last: LastCheck | null } = {
  activeTabId: null,
  draft: '',
  last: null,
};
