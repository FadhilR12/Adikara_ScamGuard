// POST /events — analitik anonim (PRD 14.2), batch maks 20.
import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/client';

const NAMES = [
  'ext_installed', 'check_performed', 'overlay_shown', 'overlay_action', 'emergency_opened', 'emergency_started',
  'emergency_step_completed', 'ocr_used', 'evidence_pack_generated', 'iasc_link_clicked',
] as const;

const body = z.object({
  events: z
    .array(z.object({ name: z.enum(NAMES), props: z.record(z.union([z.string().max(100), z.number(), z.boolean()])).optional() }))
    .min(1)
    .max(20),
});

export function eventsRouter(db: DB): Router {
  const router = Router();
  router.post('/events', (req, res) => {
    const { events } = body.parse(req.body);
    const insert = db.prepare('INSERT INTO events (user_id, name, props) VALUES (?, ?, ?)');
    db.transaction(() => events.forEach((e) => insert.run(req.deviceId, e.name, JSON.stringify(e.props ?? {}))))();
    res.status(202).json({ ok: true });
  });
  return router;
}
