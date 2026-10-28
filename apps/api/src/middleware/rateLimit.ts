import rateLimit from 'express-rate-limit';
import { AppError } from './errors';

function limiter(limit: number) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `${req.header('x-device-id') ?? '-'}|${req.ip}`,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.')),
  });
}

export const riskLimiter = limiter(60);
export const uploadLimiter = limiter(20);
export const generalLimiter = limiter(240);
