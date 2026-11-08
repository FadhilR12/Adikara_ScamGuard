'use client';
// Helper untuk menginisialisasi sesi Dynamic Island Co-Pilot ke IASC (PRD 4 / KF-ISLAND-01)
import type { Incident, ReportingSession } from '@scamguard/shared';
import { IASC_DEMO_URL, IASC_URL } from './config';
import { generateEvidencePack, packFileName, type PackFile } from './pdf';

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

  // Kirim payload ke content script ekstensi
  window.postMessage({ type: 'SCAMGUARD_START_IASC_REPORT', payload: session }, '*');

  // Buka URL target di tab baru
  const destUrl = target === 'demo' ? IASC_DEMO_URL : (IASC_URL || IASC_DEMO_URL);
  window.open(destUrl, '_blank', 'noopener,noreferrer');
}
