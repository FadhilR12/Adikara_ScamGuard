// Identitas anonim perangkat via header X-Device-Id (PRD 6.3).
import type { RequestHandler } from 'express';
import type { DB } from '../db/client';
import { AppError } from './errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      deviceId: string;
    }
  }
}

export function deviceId(db: DB): RequestHandler {
  const upsert = db.prepare(`
    INSERT INTO users (id, last_seen_at, ext_version) VALUES (?, datetime('now'), ?)
    ON CONFLICT(id) DO UPDATE SET last_seen_at = datetime('now'), ext_version = COALESCE(excluded.ext_version, users.ext_version)`);
  return (req, _res, next) => {
    const id = req.header('x-device-id');
    if (!id || !UUID.test(id)) return next(new AppError('UNAUTHORIZED_DEVICE', 'Header X-Device-Id tidak valid.'));
    upsert.run(id.toLowerCase(), req.header('x-ext-version') ?? null);
    req.deviceId = id.toLowerCase();
    next();
  };
}
