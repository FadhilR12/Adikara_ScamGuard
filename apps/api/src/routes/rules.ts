// GET /rules?since=<version> (PRD 12.2)
import { Router } from 'express';
import type { DB } from '../db/client';
import { loadRules } from '../lib/rules';

export function rulesRouter(db: DB): Router {
  const router = Router();
  router.get('/rules', (req, res) => {
    const rules = loadRules(db);
    if (req.query.since && req.query.since === rules.version) return res.status(304).end();
    res.json(rules);
  });
  return router;
}
