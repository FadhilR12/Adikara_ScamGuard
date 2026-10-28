// ScamGuard risk engine — analyze(input, rules) → RiskResult (PRD 9).
// Murni (tanpa API Node/DOM) agar dipakai bersama oleh content script, service worker, web, dan API.
import type { RiskInput, RiskReason, RiskResult, RuleSet } from '@scamguard/shared';
import defaultRulesJson from './rules.default.json';
import { hostMatches, normalizeNumber, normalizeText, parseUrl, type ParsedUrl } from './normalize';
import { matchNumberRules } from './number';
import { matchPageRules } from './page';
import { computeScore, dedupe, toLevel } from './score';
import { matchTextRules } from './text';
import { matchUrlRules } from './url';

export const defaultRules = defaultRulesJson as unknown as RuleSet;
export const SCHEMA_VERSION = 1;

/** Batas teks halaman yang dianalisis (AC-02.2). */
export const MAX_PAGE_TEXT = 20_000;

export function isAllowlisted(url: ParsedUrl | null, rules: RuleSet): boolean {
  return !!url && !url.isIp && hostMatches(url.host, rules.allowlist);
}

export function analyze(input: RiskInput, rules: RuleSet = defaultRules): RiskResult {
  let hits: RiskReason[] = [];
  const page = input.page;

  const rawText =
    input.type === 'text' ? input.value ?? '' : page ? `${page.title}\n${page.text}`.slice(0, MAX_PAGE_TEXT + 500) : '';
  const text = rawText ? normalizeText(rawText) : '';

  // Untuk tipe url: value = tautan yang ditempel, page (opsional) = hasil membuka tautan itu.
  const primaryUrl = parseUrl(input.type === 'url' ? input.value ?? '' : page?.url ?? '');
  const sourceUrl = input.type === 'url' ? null : page?.sourceUrl ? parseUrl(page.sourceUrl) : null;
  const finalUrl = input.type === 'url' && page?.url ? parseUrl(page.url) : null;

  if (text) hits.push(...matchTextRules(text, rules));

  const urls = [primaryUrl, sourceUrl, finalUrl].filter((u): u is ParsedUrl => !!u);
  const landing = finalUrl ?? primaryUrl;
  for (const u of urls) {
    hits.push(...matchUrlRules(u, rules, { hasPaymentForm: page?.hasPaymentForm, finalHost: landing?.host }));
  }

  if (page) hits.push(...matchPageRules(page, text, hits, rules));
  if (input.type === 'number' && input.value) {
    hits.push(...matchNumberRules(normalizeNumber(input.value), input.value, rules));
  }

  hits = dedupe(hits);
  let score = computeScore(hits);
  if (isAllowlisted(landing, rules)) {
    hits = hits.filter((h) => h.category !== 'url' && h.ruleId !== 'URL_LOOKALIKE');
    score = Math.min(computeScore(hits), 20);
  }

  return {
    score,
    level: toLevel(score),
    reasons: hits.sort((a, b) => b.weight - a.weight),
    rulesVersion: rules.version,
    analyzedAt: new Date().toISOString(),
    offline: !rules.fromServer,
  };
}

/** Validasi RuleSet dari server sebelum dipakai (PRD 9.6). */
export function isUsableRuleSet(value: unknown): value is RuleSet {
  const r = value as RuleSet;
  return (
    !!r && r.schemaVersion === SCHEMA_VERSION && typeof r.version === 'string' && Array.isArray(r.text) &&
    typeof r.weights === 'object' && Array.isArray(r.brands) && Array.isArray(r.allowlist) &&
    r.text.every((t) => t.patterns.every((p) => { try { new RegExp(p); return true; } catch { return false; } }))
  );
}

export { sha256Hex, entityHash } from './hash';
export { normalizeText, normalizeNumber, parseUrl, looksLikeUrl, looksLikeNumber, hostMatches, quote } from './normalize';
export { isValidPhone, isValidAccount } from './number';
export { toLevel, computeScore } from './score';
export { editDistance } from './url';
