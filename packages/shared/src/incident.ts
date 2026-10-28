// Kelengkapan laporan (AC-09.5) — dipakai API dan web agar hasilnya sama.
import type { CompletenessItem, Evidence, Incident } from './index';

export function computeCompleteness(
  i: Pick<Incident, 'transferAt' | 'amount' | 'recipientBank' | 'recipientAccount' | 'chronology' | 'contactChannel' | 'scamType'>,
  evidence: Pick<Evidence, 'category'>[],
): NonNullable<Incident['completeness']> {
  const items: CompletenessItem[] = [
    { key: 'transfer', label: 'Waktu & nominal transfer', done: !!i.transferAt && !!i.amount && i.amount > 0 },
    { key: 'recipient', label: 'Data rekening penerima', done: !!i.recipientBank && !!i.recipientAccount },
    { key: 'proof', label: 'Bukti transfer', done: evidence.some((e) => e.category === 'transfer') },
    { key: 'chat', label: 'Screenshot percakapan', done: evidence.some((e) => e.category === 'chat') },
    { key: 'chronology', label: 'Kronologi kejadian', done: (i.chronology?.trim().length ?? 0) >= 30 },
    { key: 'context', label: 'Media kontak & jenis modus', done: !!i.contactChannel && !!i.scamType },
  ];
  return { items, done: items.filter((x) => x.done).length, total: items.length };
}

export const SCAM_TYPES = [
  { value: 'investasi', label: 'Investasi' },
  { value: 'belanja', label: 'Belanja online' },
  { value: 'lowongan', label: 'Lowongan kerja' },
  { value: 'undian', label: 'Undian/hadiah' },
  { value: 'impersonasi', label: 'Mengaku petugas/bank' },
  { value: 'pinjaman', label: 'Pinjaman' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const CONTACT_CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'sms', label: 'SMS' },
  { value: 'telepon', label: 'Telepon' },
  { value: 'situs', label: 'Situs web' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const EVIDENCE_CATEGORIES = [
  { value: 'transfer', label: 'Bukti transfer' },
  { value: 'chat', label: 'Percakapan' },
  { value: 'profile', label: 'Profil/akun terkait' },
  { value: 'other', label: 'Lainnya' },
] as const;
