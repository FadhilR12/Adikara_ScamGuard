// Ekstraksi field dari teks OCR bukti transfer (PRD 11.4). Hasil hanya usulan — tidak pernah
// menimpa isian pengguna secara otomatis.
import type { OcrFields } from '@scamguard/shared';

export const RE = {
  amount: /(?:rp\.?\s?|idr\s?)(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:,\d{2})?/i,
  date: /(\d{1,2})[\/\-\s](\d{1,2}|jan|feb|mar|apr|mei|jun|jul|agu|agt|aug|sep|okt|oct|nov|des|dec)[a-z]*[\/\-\s](\d{2,4})/i,
  time: /(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s?(wib|wita|wit)?/i,
  account: /(?:rek(?:ening)?|no\.?\s?rek|account|tujuan)[^\d]{0,15}(\d[\d\s-]{5,19}\d)/i,
  name: /(?:nama penerima|penerima|a\.n\.?|atas nama)\s*[:\-]?\s*([a-z .']{3,40})/i,
  ref: /(?:no\.?\s?ref(?:erensi)?|reference|id transaksi)\s*[:\-]?\s*([a-z0-9]{6,30})/i,
  bank: /\b(bca|bri|bni|mandiri|bsi|cimb|permata|danamon|btn|ocbc|jago|seabank|dana|ovo|gopay|shopeepay|linkaja)\b/i,
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

const BANK_LABEL: Record<string, string> = {
  bca: 'BCA', bri: 'BRI', bni: 'BNI', mandiri: 'Mandiri', bsi: 'BSI', cimb: 'CIMB Niaga', permata: 'Permata', danamon: 'Danamon',
  btn: 'BTN', ocbc: 'OCBC', jago: 'Bank Jago', seabank: 'SeaBank', dana: 'DANA', ovo: 'OVO', gopay: 'GoPay', shopeepay: 'ShopeePay', linkaja: 'LinkAja',
};

export interface Extracted {
  fields: OcrFields;
  /** Jumlah field yang terbaca; 'rendah' bila hanya sedikit yang cocok. */
  found: number;
  confidence: 'tinggi' | 'sedang' | 'rendah';
}

export function extractFields(text: string): Extracted {
  const t = text.replace(/[ \t]+/g, ' ');
  const fields: OcrFields = {};

  const amount = RE.amount.exec(t);
  if (amount) fields.amount = Number(amount[1].replace(/[.,]/g, ''));

  const date = RE.date.exec(t);
  if (date) {
    const day = Number(date[1]);
    const m = /^\d+$/.test(date[2]) ? Number(date[2]) : MONTHS[date[2].toLowerCase().slice(0, 3)];
    let y = Number(date[3]);
    if (y < 100) y += 2000;
    if (day >= 1 && day <= 31 && m >= 1 && m <= 12) fields.date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const time = RE.time.exec(t);
  if (time && Number(time[1]) < 24) fields.time = `${time[1].padStart(2, '0')}:${time[2]}`;

  const account = RE.account.exec(t);
  if (account) fields.account = account[1].replace(/[\s-]/g, '');

  const name = RE.name.exec(t);
  if (name) fields.name = name[1].trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const ref = RE.ref.exec(t);
  if (ref) fields.ref = ref[1].toUpperCase();

  const bank = RE.bank.exec(t);
  if (bank) fields.bank = BANK_LABEL[bank[1].toLowerCase()];

  const found = Object.keys(fields).length;
  return { fields, found, confidence: found >= 4 ? 'tinggi' : found >= 2 ? 'sedang' : 'rendah' };
}

/** Tebakan kategori dari teks OCR (AC-06.2). */
export function guessCategory(text: string): 'transfer' | 'chat' {
  return /(transfer|berhasil|sukses|rp\s?\d|nominal)/i.test(text) ? 'transfer' : 'chat';
}
