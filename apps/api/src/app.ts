import cors from 'cors';
import express from 'express';
import type { DB } from './db/client';
import { env } from './env';
import { loadRules } from './lib/rules';
import { deviceId } from './middleware/deviceId';
import { errorHandler, notFound } from './middleware/errors';
import { generalLimiter } from './middleware/rateLimit';
import { evidenceRouter } from './routes/evidence';
import { eventsRouter } from './routes/events';
import { feedbackRouter } from './routes/feedback';
import { incidentsRouter } from './routes/incidents';
import { riskRouter } from './routes/risk';
import { rulesRouter } from './routes/rules';

export function createApp(db: DB) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, cb) {
        const ok = !origin || env.corsOrigins.includes(origin) || (env.allowAnyExtension && origin.startsWith('chrome-extension://'));
        cb(null, ok);
      },
      allowedHeaders: ['Content-Type', 'X-Device-Id', 'X-Ext-Version'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok', rulesVersion: loadRules(db).version }));
  api.use(deviceId(db), generalLimiter);
  api.use(riskRouter(db), rulesRouter(db), incidentsRouter(db), evidenceRouter(db), feedbackRouter(db), eventsRouter(db));

  app.use('/api/v1', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
