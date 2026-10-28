// Contoh kalimat untuk petugas bank (PRD 8.6, AC-05.7).
import type { Incident } from '@scamguard/shared';
import { formatDate, formatRupiah, formatTime } from './format';

export function bankScript(i: Pick<Incident, 'amount' | 'transferAt' | 'recipientAccount' | 'recipientBank'>): string {
  const nominal = i.amount ? formatRupiah(i.amount) : '[NOMINAL]';
  const tanggal = i.transferAt ? formatDate(i.transferAt) : '[TANGGAL]';
  const jam = i.transferAt ? formatTime(i.transferAt) : '[JAM]';
  const rek = i.recipientAccount || '[NO. REKENING]';
  const bank = i.recipientBank || '[NAMA BANK]';
  return `Saya korban penipuan. Saya transfer ${nominal} pada ${tanggal} pukul ${jam} ke rekening ${rek} di ${bank}. Mohon dana di rekening tujuan ditahan.`;
}
