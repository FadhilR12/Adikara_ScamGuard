// Pemetaan baris DB → objek Incident + kelengkapan laporan (AC-09.5).
import { computeCompleteness, type Checklist, type Evidence, type Incident, type OcrFields } from '@scamguard/shared';
import type { DB } from '../db/client';
import { AppError } from '../middleware/errors';
import { parseJson } from './util';

export interface IncidentRow {
  id: string; code: string; user_id: string; status: Incident['status']; current_step: number; checklist: string;
  source: string | null; related_domain: string | null; scam_type: string | null; contact_channel: string | null;
  transfer_at: string | null; amount: number | null; recipient_bank: string | null; recipient_account: string | null;
  recipient_name: string | null; related_accounts: string | null; chronology: string | null; bank_ticket: string | null;
  iasc_report_no: string | null; pack_generated_at: string | null; created_at: string; updated_at: string;
}

export interface EvidenceRow {
  id: string; incident_id: string; category: Evidence['category']; file_name: string; storage_path: string;
  mime: string; size_bytes: number; sha256: string; ocr_text: string | null; ocr_fields: string | null; created_at: string;
}

export function toEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id, incidentId: row.incident_id, category: row.category, fileName: row.file_name, mime: row.mime,
    size: row.size_bytes, sha256: row.sha256, ocrText: row.ocr_text, ocrFields: parseJson<OcrFields | null>(row.ocr_fields, null),
    createdAt: row.created_at, url: `/api/v1/evidence/${row.id}/file`,
  };
}

export function toIncident(row: IncidentRow, evidenceRows: EvidenceRow[] = []): Incident {
  const evidence = evidenceRows.map(toEvidence);
  const incident: Incident = {
    id: row.id, code: row.code, status: row.status, currentStep: row.current_step,
    checklist: parseJson<Checklist>(row.checklist, {}), source: row.source, relatedDomain: row.related_domain,
    scamType: row.scam_type, contactChannel: row.contact_channel, transferAt: row.transfer_at, amount: row.amount,
    recipientBank: row.recipient_bank, recipientAccount: row.recipient_account, recipientName: row.recipient_name,
    relatedAccounts: parseJson<string[]>(row.related_accounts, []), chronology: row.chronology, bankTicket: row.bank_ticket,
    iascReportNo: row.iasc_report_no, packGeneratedAt: row.pack_generated_at, createdAt: row.created_at,
    updatedAt: row.updated_at, evidence,
  };
  incident.completeness = computeCompleteness(incident, evidence);
  return incident;
}

/** Ambil incident milik device; 404 bila tidak ada, 401 bila milik device lain (KNF-04, FT-14). */
export function getOwnedIncident(db: DB, id: string, deviceId: string): IncidentRow {
  const row = db.prepare('SELECT * FROM incident_reports WHERE id = ?').get(id) as IncidentRow | undefined;
  if (!row) throw new AppError('NOT_FOUND', 'Laporan tidak ditemukan.');
  if (row.user_id !== deviceId) throw new AppError('UNAUTHORIZED_DEVICE', 'Laporan ini bukan milik perangkat Anda.');
  return row;
}

export function loadIncident(db: DB, row: IncidentRow): Incident {
  const evidence = db.prepare('SELECT * FROM evidence WHERE incident_id = ? ORDER BY created_at').all(row.id) as EvidenceRow[];
  return toIncident(row, evidence);
}
