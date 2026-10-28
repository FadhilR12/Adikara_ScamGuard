// Rumus skor (PRD 9.4).
import type { RiskLevel, RiskReason } from '@scamguard/shared';

export function dedupe(hits: RiskReason[]): RiskReason[] {
  const best = new Map<string, RiskReason>();
  for (const h of hits) {
    const prev = best.get(h.ruleId);
    if (!prev || h.weight > prev.weight) best.set(h.ruleId, h);
  }
  return [...best.values()];
}

export function computeScore(hits: RiskReason[]): number {
  const byCategory = new Map<string, number[]>();
  for (const h of hits) {
    const list = byCategory.get(h.category) ?? [];
    list.push(h.weight);
    byCategory.set(h.category, list);
  }
  let raw = 0;
  for (const weights of byCategory.values()) {
    weights.sort((a, b) => b - a);
    raw += weights[0] + 0.5 * weights.slice(1).reduce((s, w) => s + w, 0);
  }
  const cats = new Set(byCategory.keys());
  let bonus = 0;
  if (cats.size >= 3) bonus += 10;
  if (cats.has('credential') && (cats.has('profit') || cats.has('urgency'))) bonus += 10;
  return Math.min(100, Math.round(raw + bonus));
}

export function toLevel(score: number): RiskLevel {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}
