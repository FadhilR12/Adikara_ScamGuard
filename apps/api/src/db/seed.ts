// Mengisi risk_rules dari rules.default.json dan contoh reported_entities untuk demo (is_demo = 1).
import { defaultRules, entityHash } from '@scamguard/risk-engine';
import { pathToFileURL } from 'node:url';
import { openDb, type DB } from './client';

const LISTS_ID = 'CFG_LISTS';

export function seedRules(db: DB): void {
  const r = defaultRules;
  const upsert = db.prepare(`
    INSERT INTO risk_rules (id, scope, category, pattern, params, weight, title, version)
    VALUES (@id, @scope, @category, @pattern, @params, @weight, @title, @version)
    ON CONFLICT(id) DO UPDATE SET scope=excluded.scope, category=excluded.category, pattern=excluded.pattern,
      params=excluded.params, weight=excluded.weight, title=excluded.title, version=excluded.version, updated_at=datetime('now')`);

  db.transaction(() => {
    for (const t of r.text) {
      upsert.run({
        id: t.id, scope: 'text', category: t.category, pattern: JSON.stringify(t.patterns),
        params: t.strip ? JSON.stringify({ strip: t.strip }) : null, weight: t.weight, title: t.title, version: r.version,
      });
    }
    for (const [id, w] of Object.entries(r.weights)) {
      const scope = id.startsWith('URL_') ? 'url' : id.startsWith('PG_') ? 'page' : id.startsWith('NUM_') ? 'number' : 'text';
      upsert.run({ id, scope, category: w.category, pattern: null, params: null, weight: w.weight, title: w.title, version: r.version });
    }
    upsert.run({
      id: LISTS_ID, scope: 'url', category: 'config', pattern: null, weight: 0, title: 'Daftar referensi', version: r.version,
      params: JSON.stringify({
        brands: r.brands, brandDomains: r.brandDomains, allowlist: r.allowlist, shorteners: r.shorteners,
        riskyTlds: r.riskyTlds, lowRiskTlds: r.lowRiskTlds, moneyWords: r.moneyWords,
      }),
    });
  })();
}

/** Entitas contoh untuk demo aturan URL_REPORTED / NUM_REPORTED. Bukan data IASC. */
export const DEMO_REPORTED = [
  { type: 'domain', value: 'investasi-cuan88.xyz', count: 5 },
  { type: 'number', value: '081299990000', count: 3 },
] as const;

export function seedDemo(db: DB): void {
  const stmt = db.prepare(`
    INSERT INTO reported_entities (target_hash, target_type, target_display, report_count, is_demo)
    VALUES (?, ?, ?, ?, 1) ON CONFLICT(target_hash) DO NOTHING`);
  for (const e of DEMO_REPORTED) {
    stmt.run(entityHash(e.type, e.value), e.type === 'domain' ? 'url' : 'number', e.value, e.count);
  }
}

export function seed(db: DB): void {
  seedRules(db);
  seedDemo(db);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const db = openDb();
  seed(db);
  console.log('Seed selesai:', db.prepare('SELECT COUNT(*) AS n FROM risk_rules').get());
}
