// Format error standar (PRD 12).
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

const STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED_DEVICE: 401,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof STATUS;

export class AppError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly field?: string) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, _res, next) => next(new AppError('NOT_FOUND', 'Alamat tidak ditemukan.'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error: AppError;
  if (err instanceof AppError) error = err;
  else if (err instanceof ZodError) {
    const issue = err.issues[0];
    error = new AppError('VALIDATION_ERROR', issue?.message ?? 'Data tidak valid.', issue?.path.join('.'));
  } else if (err instanceof MulterError) {
    error = err.code === 'LIMIT_FILE_SIZE'
      ? new AppError('PAYLOAD_TOO_LARGE', 'File lebih dari 10 MB.', 'file')
      : new AppError('VALIDATION_ERROR', 'Unggahan tidak valid.', 'file');
  } else if (err?.type === 'entity.too.large') {
    error = new AppError('PAYLOAD_TOO_LARGE', 'Data terlalu besar.');
  } else if (err?.type === 'entity.parse.failed') {
    error = new AppError('VALIDATION_ERROR', 'Format JSON tidak valid.');
  } else {
    console.error(err);
    error = new AppError('INTERNAL', 'Terjadi kendala. Coba lagi sebentar lagi.');
  }
  res.status(STATUS[error.code]).json({ error: { code: error.code, message: error.message, field: error.field } });
};
