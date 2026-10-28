// Aturan nomor HP/rekening (PRD 9.3 D).
import type { RiskReason, RuleSet } from '@scamguard/shared';
import { entityHash } from './hash';

export function isValidPhone(digits: string): boolean {
  return /^08[1-9]\d{7,10}$/.test(digits);
}

export function isValidAccount(digits: string): boolean {
  return /^\d{6,16}$/.test(digits) && !digits.startsWith('08');
}

/** `digits` harus sudah dinormalisasi dengan normalizeNumber(). `raw` dipakai untuk mendeteksi awalan +62. */
export function matchNumberRules(digits: string, raw: string, rules: RuleSet): RiskReason[] {
  const hits: RiskReason[] = [];
  const reports = rules.reported?.[entityHash('number', digits)] ?? 0;
  if (reports >= 1) {
    const m = rules.weights.NUM_REPORTED;
    hits.push({
      ruleId: 'NUM_REPORTED',
      category: m.category,
      title: m.title,
      evidence: `${reports} laporan dari pengguna ScamGuard`,
      weight: reports >= 3 ? 60 : m.weight,
    });
  }
  const phoneLike = /^\s*(\+?62|08)/.test(raw);
  const valid = phoneLike ? isValidPhone(digits) : isValidPhone(digits) || isValidAccount(digits);
  if (!valid) {
    const m = rules.weights.NUM_INVALID_FORMAT;
    hits.push({ ruleId: 'NUM_INVALID_FORMAT', category: m.category, title: m.title, evidence: 'Bukan pola nomor HP/rekening yang umum', weight: m.weight });
  }
  return hits;
}
