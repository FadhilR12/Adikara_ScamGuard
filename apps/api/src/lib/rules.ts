// Membangun RuleSet dari tabel risk_rules + reported_entities (sumber aturan terbaru, PRD 9.6).
import { defaultRules, sha256Hex } from '@scamguard/risk-engine';
import type { RiskCategory, RuleSet } from '@scamguard/shared';
import type { DB } from '../db/client';
import { parseJson } from './util';

interface RuleRow {
  id: string;
  scope: string;
  category: string;
  pattern: string | null;
  params: string | null;
  weight: number;
  title: string;
  version: string;
}

let cached: RuleSet | null = null;

export function invalidateRules(): void {
  cached = null;
}

export function loadRules(db: DB): RuleSet {
  if (cached) return cached;
  const rows = db.prepare('SELECT * FROM risk_rules WHERE is_active = 1 ORDER BY id').all() as RuleRow[];
  const lists = parseJson<Partial<RuleSet>>(rows.find((r) => r.id === 'CFG_LISTS')?.params, {});
  const baseVersion = rows.reduce((v, r) => (r.version > v ? r.version : v), defaultRules.version);

  const reportedRows = db
    .prepare('SELECT target_hash, report_count FROM reported_entities WHERE report_count > fp_count AND report_count >= 1')
    .all() as { target_hash: string; report_count: number }[];
  const reported = Object.fromEntries(reportedRows.map((r) => [r.target_hash, r.report_count]));
  // Versi berubah bila daftar laporan berubah, agar klien mengambil ulang (bukan 304).
  const reportedTag = sha256Hex(JSON.stringify(reportedRows)).slice(0, 8);

  cached = {
    version: `${baseVersion}.r${reportedTag}`,
    schemaVersion: defaultRules.schemaVersion,
    fromServer: true,
    text: rows
      .filter((r) => r.scope === 'text' && r.pattern)
      .map((r) => ({
        id: r.id,
        category: r.category as RiskCategory,
        patterns: parseJson<string[]>(r.pattern, []),
        strip: parseJson<{ strip?: string[] }>(r.params, {}).strip,
        weight: r.weight,
        title: r.title,
      })),
    weights: Object.fromEntries(
      rows.filter((r) => !r.pattern && r.id !== 'CFG_LISTS').map((r) => [r.id, { weight: r.weight, title: r.title, category: r.category as RiskCategory }]),
    ),
    brands: lists.brands ?? defaultRules.brands,
    brandDomains: lists.brandDomains ?? defaultRules.brandDomains,
    allowlist: lists.allowlist ?? defaultRules.allowlist,
    shorteners: lists.shorteners ?? defaultRules.shorteners,
    riskyTlds: lists.riskyTlds ?? defaultRules.riskyTlds,
    lowRiskTlds: lists.lowRiskTlds ?? defaultRules.lowRiskTlds,
    moneyWords: lists.moneyWords ?? defaultRules.moneyWords,
    reported,
  };
  return cached;
}
