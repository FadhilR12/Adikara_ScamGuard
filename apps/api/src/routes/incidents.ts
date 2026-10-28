// Incident report (PRD 12.3, 12.5)
import { CONTACT_CHANNELS, SCAM_TYPES as SCAM_TYPE_OPTIONS } from '@scamguard/shared';
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { DB } from '../db/client';
import { env } from '../env';
import { getOwnedIncident, loadIncident, type IncidentRow } from '../lib/incidents';

const SCAM_TYPES = SCAM_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const CHANNELS = CONTACT_CHANNELS.map((o) => o.value) as [string, ...string[]];

const createBody = z.object({
  source: z.enum(['popup', 'overlay', 'result', 'web']).default('web'),
  relatedDomain: z.string().trim().max(253).optional(),
  transferAt: z.string().datetime({ offset: true }).optional(),
});

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

const patchBody = z
  .object({
    currentStep: z.number().int().min(0).max(4),
    status: z.enum(['draft', 'in_progress', 'reported', 'closed']),
    checklist: z.record(z.boolean()),
    scamType: z.enum(SCAM_TYPES).nullable(),
    contactChannel: z.enum(CHANNELS).nullable(),
    transferAt: z
      .string()
      .datetime({ offset: true })
      .refine((v) => new Date(v).getTime() <= Date.now() + 60_000, 'Waktu transfer tidak boleh di masa depan.')
      .nullable(),
    amount: z.number().int().positive('Nominal harus lebih dari 0.').max(1e13).nullable(),
    recipientBank: nullableText(60),
    recipientAccount: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v === '' || /^[a-z0-9]{6,20}$/i.test(v.replace(/[\s-]/g, '')), 'Nomor rekening/akun 6–20 karakter alfanumerik.')
      .nullable(),
    recipientName: nullableText(100),
    relatedAccounts: z.array(z.string().trim().max(300)).max(20),
    chronology: nullableText(3000),
    bankTicket: nullableText(60),
    iascReportNo: nullableText(60),
  })
  .partial()
  .strict();

const COLUMN: Record<string, string> = {
  currentStep: 'current_step', status: 'status', checklist: 'checklist', scamType: 'scam_type',
  contactChannel: 'contact_channel', transferAt: 'transfer_at', amount: 'amount', recipientBank: 'recipient_bank',
  recipientAccount: 'recipient_account', recipientName: 'recipient_name', relatedAccounts: 'related_accounts',
  chronology: 'chronology', bankTicket: 'bank_ticket', iascReportNo: 'iasc_report_no',
};

export function incidentsRouter(db: DB): Router {
  const router = Router();

  router.post('/incidents', (req, res) => {
    const input = createBody.parse(req.body ?? {});
    const year = new Date().getFullYear();
    const create = db.transaction(() => {
      const { n } = db.prepare("SELECT COUNT(*) AS n FROM incident_reports WHERE code LIKE ?").get(`SG-${year}-%`) as { n: number };
      const id = crypto.randomUUID();
      const code = `SG-${year}-${String(n + 1).padStart(4, '0')}`;
      db.prepare(`INSERT INTO incident_reports (id, code, user_id, source, related_domain, transfer_at, related_accounts)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(id, code, req.deviceId, input.source, input.relatedDomain ?? null, input.transferAt ?? null,
          JSON.stringify(input.relatedDomain ? [input.relatedDomain] : []));
      return id;
    });
    const id = create();
    res.status(201).json(loadIncident(db, getOwnedIncident(db, id, req.deviceId)));
  });

  router.get('/incidents', (req, res) => {
    const rows = db.prepare('SELECT * FROM incident_reports WHERE user_id = ? ORDER BY created_at DESC').all(req.deviceId) as IncidentRow[];
    res.json(rows.map((r) => ({ id: r.id, code: r.code, status: r.status, amount: r.amount, currentStep: r.current_step, createdAt: r.created_at, updatedAt: r.updated_at })));
  });

  router.get('/incidents/:id', (req, res) => {
    res.json(loadIncident(db, getOwnedIncident(db, req.params.id, req.deviceId)));
  });

  router.patch('/incidents/:id', (req, res) => {
    const row = getOwnedIncident(db, req.params.id, req.deviceId);
    const input = patchBody.parse(req.body ?? {});
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(input)) {
      sets.push(`${COLUMN[key]} = ?`);
      if (key === 'checklist') values.push(JSON.stringify({ ...JSON.parse(row.checklist || '{}'), ...(value as object) }));
      else if (key === 'relatedAccounts') values.push(JSON.stringify(value));
      else if (key === 'recipientAccount' && typeof value === 'string') values.push(value.replace(/[\s-]/g, ''));
      else values.push(value === '' ? null : value);
    }
    // Draft yang mulai diisi menjadi in_progress.
    if (row.status === 'draft' && !input.status && sets.length) sets.push("status = 'in_progress'");
    if (sets.length) {
      db.prepare(`UPDATE incident_reports SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values, row.id);
    }
    res.json(loadIncident(db, getOwnedIncident(db, row.id, req.deviceId)));
  });

  router.delete('/incidents/:id', (req, res) => {
    const row = getOwnedIncident(db, req.params.id, req.deviceId);
    db.prepare('DELETE FROM incident_reports WHERE id = ?').run(row.id);
    fs.rmSync(path.join(env.uploadDir, row.id), { recursive: true, force: true });
    res.status(204).end();
  });

  router.post('/incidents/:id/pack-generated', (req, res) => {
    const row = getOwnedIncident(db, req.params.id, req.deviceId);
    db.prepare(`UPDATE incident_reports SET pack_generated_at = datetime('now'), updated_at = datetime('now'),
                status = CASE WHEN status IN ('draft','in_progress') THEN 'pack_generated' ELSE status END WHERE id = ?`).run(row.id);
    db.prepare('INSERT INTO events (user_id, name, props) VALUES (?, ?, ?)')
      .run(req.deviceId, 'evidence_pack_generated', JSON.stringify(req.body ?? {}));
    res.json(loadIncident(db, getOwnedIncident(db, row.id, req.deviceId)));
  });

  return router;
}
