// Aturan URL (PRD 9.3 B).
import type { RiskReason, RuleSet } from '@scamguard/shared';
import { entityHash } from './hash';
import { hostMatches, type ParsedUrl } from './normalize';

const SUSPICIOUS_WORDS = ['login', 'promo', 'hadiah', 'verifikasi', 'verify', 'bonus', 'undian', 'klaim', 'claim', 'secure', 'update', 'akun'];

/** Optimal String Alignment distance (Levenshtein + transposisi). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function reason(rules: RuleSet, ruleId: string, evidence?: string, weight?: number): RiskReason {
  const meta = rules.weights[ruleId];
  return { ruleId, category: meta.category, title: meta.title, evidence, weight: weight ?? meta.weight };
}

function lookalike(url: ParsedUrl, rules: RuleSet): string | null {
  if (hostMatches(url.host, rules.brandDomains)) return null;
  const tokens = url.tokens.slice(0, -1); // abaikan TLD
  const hasSuspiciousWord = tokens.some((t) => SUSPICIOUS_WORDS.includes(t));
  for (const brand of rules.brands) {
    for (const token of tokens) {
      if (token === brand) {
        // Nama brand persis di domain bukan resmi + kata pancingan, mis. "bca-promo-hadiah.top".
        if (hasSuspiciousWord || tokens.length >= 2) return brand;
        continue;
      }
      // Kemiripan huruf hanya untuk brand ≥ 5 huruf agar "bri"/"bni" tidak salah cocok.
      if (brand.length < 5 || Math.abs(token.length - brand.length) > 2) continue;
      const max = brand.length >= 7 ? 2 : 1;
      if (editDistance(token, brand) <= max) return brand;
    }
  }
  return null;
}

export interface UrlContext {
  hasPaymentForm?: boolean;
  /** Host tujuan setelah redirect (untuk alasan tautan pendek). */
  finalHost?: string;
}

export function matchUrlRules(url: ParsedUrl, rules: RuleSet, ctx: UrlContext = {}): RiskReason[] {
  const hits: RiskReason[] = [];

  if (rules.shorteners.includes(url.host)) {
    const ev = ctx.finalHost && ctx.finalHost !== url.host ? `Mengarah ke ${ctx.finalHost}` : 'Alamat tujuan tidak terlihat';
    hits.push(reason(rules, 'URL_SHORTENER', ev));
  }
  if (url.tld && rules.riskyTlds.includes(url.tld)) {
    hits.push(reason(rules, 'URL_RISKY_TLD', `Domain .${url.tld}`));
  } else if (url.tld && rules.lowRiskTlds.includes(url.tld)) {
    hits.push(reason(rules, 'URL_RISKY_TLD', `Domain .${url.tld}`, 5));
  }
  if (url.labels.length >= 5) hits.push(reason(rules, 'URL_MANY_SUBDOMAIN', url.host));
  if (url.isIp) hits.push(reason(rules, 'URL_IP_HOST', url.host));
  if (url.host.includes('xn--')) hits.push(reason(rules, 'URL_PUNYCODE', url.host));

  const brand = lookalike(url, rules);
  if (brand) hits.push(reason(rules, 'URL_LOOKALIKE', `Mirip “${brand}”, bukan domain resmi`));

  const brandy = url.tokens.find((t) => /^[a-z]+\d{2,}$/.test(t) && rules.moneyWords.some((w) => t.includes(w)));
  if (brandy) hits.push(reason(rules, 'URL_NUMERIC_BRANDY', `“${brandy}”`));

  if (url.protocol === 'http:' && ctx.hasPaymentForm) hits.push(reason(rules, 'URL_HTTP', 'Halaman pembayaran tanpa HTTPS'));

  const reports = rules.reported?.[entityHash('domain', url.host)] ?? 0;
  if (reports >= 3) hits.push(reason(rules, 'URL_REPORTED', `${reports} laporan`));

  return hits;
}
