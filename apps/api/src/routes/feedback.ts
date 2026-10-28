// POST /feedback (PRD 12.5) — tombol "Laporkan" mengisi reported_entities.
import { entityHash, normalizeNumber, normalizeText, sha256Hex } from '@scamguard/risk-engine';
import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/client';
import { invalidateRules } from '../lib/rules';
import { hostOf, maskNumber, newId } from '../lib/util';
import { AppError } from '../middleware/errors';

const body = z.object({
  targetType: z.enum(['url', 'number', 'text']),
  targetValue: z.string().trim().min(1).max(5000),
  kind: z.enum(['report', 'false_positive', 'helpful']),
  note: z.string().trim().max(500).optional(),
  riskCheckId: z.string().max(64).optional(),
});

export function feedbackRouter(db: DB): Router {
  const router = Router();
  router.post('/feedback', (req, res) => {
    const input = body.parse(req.body);
    let hash: string;
    let display: string | null;
    if (input.targetType === 'url') {
      const host = hostOf(input.targetValue);
      if (!host) throw new AppError('VALIDATION_ERROR', 'Format tautan belum benar.', 'targetValue');
      hash = entityHash('domain', host);
      display = host;
    } else if (input.targetType === 'number') {
      hash = entityHash('number', normalizeNumber(input.targetValue));
      display = maskNumber(input.targetValue);
    } else {
      hash = sha256Hex(`text:${normalizeText(input.targetValue)}`);
      display = null;
    }

    const riskCheckId = input.riskCheckId && db.prepare('SELECT 1 FROM risk_checks WHERE id = ? AND user_id = ?').get(input.riskCheckId, req.deviceId)
      ? input.riskCheckId
      : null;

    db.transaction(() => {
      db.prepare(`INSERT INTO feedback (id, user_id, risk_check_id, target_type, target_hash, target_display, kind, note)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(newId('fb_'), req.deviceId, riskCheckId, input.targetType, hash, display, input.kind, input.note ?? null);
      if (input.kind !== 'helpful') {
        const col = input.kind === 'report' ? 'report_count' : 'fp_count';
        db.prepare(`INSERT INTO reported_entities (target_hash, target_type, target_display, ${col}) VALUES (?, ?, ?, 1)
                    ON CONFLICT(target_hash) DO UPDATE SET ${col} = ${col} + 1, updated_at = datetime('now')`)
          .run(hash, input.targetType, display);
      }
    })();
    invalidateRules();
    res.status(201).json({ ok: true });
  });
  return router;
}
