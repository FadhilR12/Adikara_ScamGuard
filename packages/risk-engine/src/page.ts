// Aturan tambahan halaman (PRD 9.3 C).
import type { PageInput, RiskReason, RuleSet } from '@scamguard/shared';

export function matchPageRules(page: PageInput, text: string, hits: RiskReason[], rules: RuleSet): RiskReason[] {
  const out: RiskReason[] = [];
  const pressured = hits.some((h) => h.category === 'profit' || h.category === 'urgency');
  if (page.hasPaymentForm && pressured) {
    const m = rules.weights.PG_PAYMENT_FORM;
    out.push({ ruleId: 'PG_PAYMENT_FORM', category: m.category, title: m.title, evidence: 'Ada kolom nominal/rekening', weight: m.weight });
  }
  if (page.hasCountdown && /\b(promo|slot|kuota)\b/.test(text)) {
    const m = rules.weights.PG_COUNTDOWN;
    out.push({ ruleId: 'PG_COUNTDOWN', category: m.category, title: m.title, evidence: 'Ada penghitung waktu mundur', weight: m.weight });
  }
  return out;
}
