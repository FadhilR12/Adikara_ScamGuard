// POST /risk/check (PRD 12.1)
import { analyze, entityHash, normalizeNumber, normalizeText, sha256Hex } from '@scamguard/risk-engine';
import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/client';
import { loadRules } from '../lib/rules';
import { hostOf, maskNumber, newId, urlWithoutQuery } from '../lib/util';
import { riskLimiter } from '../middleware/rateLimit';

const body = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['url', 'text', 'number']),
    value: z.string().trim().min(1, 'Isi nilai yang ingin diperiksa.').max(5000, 'Teks maksimal 5.000 karakter.'),
    source: z.enum(['popup', 'auto', 'web']).default('popup'),
    score: z.number().int().min(0).max(100).optional(),
    ruleHits: z.array(z.string().max(64)).max(50).optional(),
  }),
  z.object({
    type: z.literal('page'),
    url: z.string().max(2048),
    source: z.enum(['popup', 'auto', 'web']).default('auto'),
    score: z.number().int().min(0).max(100),
    ruleHits: z.array(z.string().max(64)).max(50),
  }),
]);

const level = (score: number) => (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low');

export function riskRouter(db: DB): Router {
  const router = Router();
  const insert = db.prepare(`
    INSERT INTO risk_checks (id, user_id, input_type, source, target_hash, target_display, score, level, rule_hits, rules_version)
    VALUES (@id, @userId, @type, @source, @hash, @display, @score, @level, @hits, @version)`);

  router.post('/risk/check', riskLimiter, (req, res) => {
    const input = body.parse(req.body);
    const rules = loadRules(db);
    const id = newId('rc_');

    if (input.type === 'page') {
      // Hanya hasil lokal untuk logging — teks halaman tidak pernah dikirim (AC-02.4).
      const host = hostOf(input.url) ?? input.url;
      insert.run({
        id, userId: req.deviceId, type: 'page', source: input.source, hash: entityHash('domain', host),
        display: urlWithoutQuery(input.url), score: input.score, level: level(input.score),
        hits: JSON.stringify(input.ruleHits), version: rules.version,
      });
      return res.json({ id, score: input.score, level: level(input.score), reasons: [], rulesVersion: rules.version, analyzedAt: new Date().toISOString(), offline: false });
    }

    const result = analyze({ type: input.type, value: input.value }, rules);
    const hash =
      input.type === 'url' ? entityHash('domain', hostOf(input.value) ?? input.value)
      : input.type === 'number' ? entityHash('number', normalizeNumber(input.value))
      : sha256Hex(`text:${normalizeText(input.value)}`);
    const display = input.type === 'url' ? urlWithoutQuery(input.value) : input.type === 'number' ? maskNumber(input.value) : null;
    // Simpan skor yang benar-benar dilihat pengguna (klien bisa menganalisis isi halaman tujuan).
    const shownScore = Math.max(result.score, input.score ?? 0);
    insert.run({
      id, userId: req.deviceId, type: input.type, source: input.source, hash, display, score: shownScore,
      level: level(shownScore), hits: JSON.stringify(input.ruleHits ?? result.reasons.map((r) => r.ruleId)), version: rules.version,
    });
    res.json({ id, ...result, offline: false });
  });

  router.get('/risk/checks', (req, res) => {
    const rows = db
      .prepare(`SELECT id, input_type, source, target_display, score, level, created_at FROM risk_checks
                WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`)
      .all(req.deviceId) as Record<string, unknown>[];
    res.json(rows.map((r) => ({
      id: r.id, inputType: r.input_type, source: r.source, target: r.target_display, score: r.score, level: r.level, createdAt: r.created_at,
    })));
  });

  return router;
}
