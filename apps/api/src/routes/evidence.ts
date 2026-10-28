// Bukti (PRD 12.4, KF-06, AC-10.4)
import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { DB } from '../db/client';
import { env } from '../env';
import { getOwnedIncident, toEvidence, type EvidenceRow } from '../lib/incidents';
import { sniff } from '../lib/magic';
import { sha256 } from '../lib/util';
import { AppError } from '../middleware/errors';
import { uploadLimiter } from '../middleware/rateLimit';

const CATEGORIES = ['transfer', 'chat', 'profile', 'other'] as const;
const ocrFields = z
  .object({
    amount: z.number().optional(), date: z.string().max(40).optional(), time: z.string().max(20).optional(),
    account: z.string().max(40).optional(), name: z.string().max(80).optional(), bank: z.string().max(40).optional(),
    ref: z.string().max(40).optional(),
  })
  .strict();

const uploadBody = z.object({
  category: z.enum(CATEGORIES).default('other'),
  ocrText: z.string().max(20_000).optional(),
  ocrFields: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      try {
        return ocrFields.parse(JSON.parse(v));
      } catch {
        ctx.addIssue({ code: 'custom', message: 'ocrFields tidak valid.' });
        return z.NEVER;
      }
    }),
});

function safeName(name: string): string {
  const base = path.basename(name).normalize('NFKC').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120);
  return base || 'bukti';
}

export function evidenceRouter(db: DB): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 } });

  function ownedEvidence(id: string, deviceId: string): EvidenceRow {
    const row = db.prepare('SELECT * FROM evidence WHERE id = ?').get(id) as EvidenceRow | undefined;
    if (!row) throw new AppError('NOT_FOUND', 'Bukti tidak ditemukan.');
    getOwnedIncident(db, row.incident_id, deviceId);
    return row;
  }

  router.post('/incidents/:id/evidence', uploadLimiter, upload.single('file'), (req, res) => {
    const incident = getOwnedIncident(db, req.params.id, req.deviceId);
    const file = req.file;
    if (!file) throw new AppError('VALIDATION_ERROR', 'Pilih file yang ingin diunggah.', 'file');
    const input = uploadBody.parse(req.body);

    const { n } = db.prepare('SELECT COUNT(*) AS n FROM evidence WHERE incident_id = ?').get(incident.id) as { n: number };
    if (n >= env.maxFilesPerIncident) throw new AppError('VALIDATION_ERROR', `Maksimal ${env.maxFilesPerIncident} file per laporan.`, 'file');

    const type = sniff(file.buffer);
    if (!type) throw new AppError('VALIDATION_ERROR', 'Tipe file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.', 'file');

    const id = crypto.randomUUID();
    const dir = path.join(env.uploadDir, incident.id);
    fs.mkdirSync(dir, { recursive: true });
    const storagePath = path.join(dir, `${crypto.randomUUID()}.${type.ext}`);
    fs.writeFileSync(storagePath, file.buffer);

    db.prepare(`INSERT INTO evidence (id, incident_id, category, file_name, storage_path, mime, size_bytes, sha256, ocr_text, ocr_fields)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, incident.id, input.category, safeName(file.originalname), path.relative(env.uploadDir, storagePath), type.mime,
        file.size, sha256(file.buffer), input.ocrText ?? null, input.ocrFields ? JSON.stringify(input.ocrFields) : null);
    db.prepare("UPDATE incident_reports SET updated_at = datetime('now') WHERE id = ?").run(incident.id);

    res.status(201).json(toEvidence(db.prepare('SELECT * FROM evidence WHERE id = ?').get(id) as EvidenceRow));
  });

  router.get('/evidence/:id/file', (req, res) => {
    const row = ownedEvidence(req.params.id, req.deviceId);
    const file = path.join(env.uploadDir, row.storage_path);
    if (!file.startsWith(env.uploadDir) || !fs.existsSync(file)) throw new AppError('NOT_FOUND', 'File tidak ditemukan.');
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    fs.createReadStream(file).pipe(res);
  });

  router.patch('/evidence/:id', (req, res) => {
    const row = ownedEvidence(req.params.id, req.deviceId);
    const { category } = z.object({ category: z.enum(CATEGORIES) }).parse(req.body);
    db.prepare('UPDATE evidence SET category = ? WHERE id = ?').run(category, row.id);
    res.json(toEvidence({ ...row, category }));
  });

  router.delete('/evidence/:id', (req, res) => {
    const row = ownedEvidence(req.params.id, req.deviceId);
    db.prepare('DELETE FROM evidence WHERE id = ?').run(row.id);
    fs.rmSync(path.join(env.uploadDir, row.storage_path), { force: true });
    res.status(204).end();
  });

  return router;
}
