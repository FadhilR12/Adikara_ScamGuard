'use client';
// Helper untuk menginisialisasi sesi Dynamic Island Co-Pilot ke IASC (PRD 4 / KF-ISLAND-01)
import type { Incident, ReportingSession } from '@scamguard/shared';
import { IASC_DEMO_URL, IASC_URL } from './config';
import { generateEvidencePack, packFileName, type PackFile } from './pdf';

const EXTENSION_ACK_TIMEOUT_MS = 1500;

export async function startIascReporting(
  incident: Incident,
  files: PackFile[] = [],
  target: 'official' | 'demo' = 'official'
): Promise<void> {
  const fileName = packFileName(incident);
  let base64 = '';
  let sizeBytes = 0;

  try {
    const blob = await generateEvidencePack(incident, files);
    sizeBytes = blob.size;
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[ScamGuard] PDF generation fallback for reporting session:', err);
  }

  const session: ReportingSession = {
    incidentId: incident.id,
    incidentCode: incident.code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000,
    status: 'active',
    target: {
      bankName: incident.recipientBank || undefined,
      accountNumber: incident.recipientAccount || undefined,
      accountHolder: incident.recipientName || undefined,
      perpetratorPhone: incident.relatedAccounts?.[0] || undefined,
      perpetratorPlatform: incident.contactChannel || undefined,
      lossAmount: incident.amount || undefined,
      incidentDate: incident.transferAt || incident.createdAt,
      chronology: incident.chronology || '',
    },
    evidenceFile: {
      fileName,
      mimeType: 'application/pdf',
      base64,
      sizeBytes,
    },
  };

  // Tujuan: portal resmi atau simulasi demo (URL absolut agar bisa dibuka oleh ekstensi).
  const destUrl = new URL(target === 'demo' ? IASC_DEMO_URL : IASC_URL || IASC_DEMO_URL, window.location.origin).toString();

  // Kirim payload ke content script ekstensi (hanya ke origin sendiri). Bila ekstensi terpasang,
  // ekstensi menyimpan sesi lalu membuka tab IASC sendiri (AC-01.2 & AC-01.3) dan membalas ACK.
  const acked = await new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onAck);
      resolve(false);
    }, EXTENSION_ACK_TIMEOUT_MS);
    function onAck(e: MessageEvent) {
      if (e.source !== window || e.origin !== window.location.origin) return;
      if (e.data?.type !== 'SCAMGUARD_IASC_REPORT_ACK' || e.data.incidentId !== incident.id) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onAck);
      resolve(true);
    }
    window.addEventListener('message', onAck);
    window.postMessage({ type: 'SCAMGUARD_START_IASC_REPORT', payload: session, openUrl: destUrl }, window.location.origin);
  });

  // Ekstensi tidak terpasang → buka manual (tanpa Co-Pilot).
  if (!acked) window.open(destUrl, '_blank', 'noopener,noreferrer');
}

/** Dengarkan nomor laporan IASC yang ditangkap ekstensi (AC-06.4). Mengembalikan fungsi unsubscribe. */
export function onIascReportSaved(incidentId: string, cb: (reportNo: string) => void): () => void {
  const handler = (e: MessageEvent) => {
    if (e.source !== window || e.origin !== window.location.origin) return;
    if (e.data?.type !== 'SCAMGUARD_IASC_REPORT_SAVED' || e.data.incidentId !== incidentId) return;
    if (typeof e.data.reportNo === 'string' && e.data.reportNo) cb(e.data.reportNo);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
