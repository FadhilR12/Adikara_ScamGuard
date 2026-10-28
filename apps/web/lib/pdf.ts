'use client';
// Evidence Pack PDF (KF-09, PRD 11.5): A4 portrait, margin 20 mm, Helvetica bawaan jsPDF.
import { CONTACT_CHANNELS, EVIDENCE_CATEGORIES, SCAM_TYPES, computeCompleteness, type Evidence, type Incident } from '@scamguard/shared';
import { IASC_URL } from './config';
import { formatDateTime, formatRupiah } from './format';

export interface PackFile {
  meta: Pick<Evidence, 'fileName' | 'category' | 'createdAt' | 'sha256' | 'mime'>;
  blob?: Blob;
}

const PAGE_W = 210;
const PAGE_H = 297;
const M = 20;
const W = PAGE_W - 2 * M; // 170 mm
const TEAL: [number, number, number] = [15, 118, 110];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

/** Helvetica bawaan hanya mendukung Latin-1. */
function latin1(s: string): string {
  return s
    .replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/•/g, '-')
    .replace(/[^\x00-\xFF]/g, '');
}

const label = <T extends { value: string; label: string }>(list: readonly T[], v?: string | null) =>
  list.find((x) => x.value === v)?.label ?? v ?? '';

async function toJpeg(blob: Blob): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 1600 / bmp.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL('image/jpeg', 0.7), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

export function packFileName(incident: Pick<Incident, 'code'>, date = new Date()): string {
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const last4 = (incident.code.match(/\d+/g)?.pop() ?? '0000').slice(-4).padStart(4, '0');
  return `EvidencePack_ScamGuard_${ymd}_${last4}.pdf`;
}

export async function generateEvidencePack(incident: Incident, files: PackFile[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = M;

  const ensure = (h: number) => {
    if (y + h > PAGE_H - M - 8) {
      doc.addPage();
      y = M;
    }
  };
  const text = (s: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; x?: number; width?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10);
    doc.setTextColor(...(opts.color ?? INK));
    const lines = doc.splitTextToSize(latin1(s), opts.width ?? W) as string[];
    const lh = (opts.size ?? 10) * 0.45;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, opts.x ?? M, y + lh * 0.8);
      y += lh;
    }
  };
  const section = (n: number, title: string) => {
    ensure(16);
    y += 5;
    doc.setFillColor(...TEAL);
    doc.rect(M, y, 1.2, 5.5, 'F');
    text(`${n}. ${title.toUpperCase()}`, { size: 11, bold: true, x: M + 3.5 });
    y += 2.5;
  };
  const table = (rows: [string, string][], col = 55) => {
    for (const [k, v] of rows) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(latin1(v || '-'), W - col - 4) as string[];
      const h = Math.max(7, lines.length * 4.5 + 2.5);
      ensure(h);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(M, y, col, h, 'FD');
      doc.rect(M + col, y, W - col, h, 'S');
      doc.setTextColor(...MUTED);
      doc.text(latin1(k), M + 2.5, y + 4.8);
      doc.setTextColor(...INK);
      doc.text(lines, M + col + 2.5, y + 4.8);
      y += h;
    }
  };

  // 1. Header
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  y = M - 4;
  text('EVIDENCE PACK - Laporan Penipuan Digital', { size: 16, bold: true });
  y += 1;
  text(`ID laporan: ${incident.code}   |   Dibuat: ${formatDateTime(new Date().toISOString())}   |   Dibuat dengan ScamGuard`, { size: 9, color: MUTED });
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, M + W, y);

  // 2. Ringkasan kasus
  section(1, 'Ringkasan kasus');
  table([
    ['Jenis modus', label(SCAM_TYPES, incident.scamType)],
    ['Waktu transfer', formatDateTime(incident.transferAt)],
    ['Nominal', formatRupiah(incident.amount)],
    ['Bank / e-wallet penerima', incident.recipientBank ?? ''],
    ['Nomor rekening / akun', incident.recipientAccount ?? ''],
    ['Nama pemilik rekening', incident.recipientName ?? ''],
    ['Media kontak pertama', label(CONTACT_CHANNELS, incident.contactChannel)],
    ['Tautan / akun terkait', (incident.relatedAccounts ?? []).join(', ')],
  ]);

  // 3. Kronologi
  section(2, 'Kronologi kejadian');
  text(incident.chronology?.trim() || '-', { size: 10 });

  // 4. Tindakan
  section(3, 'Tindakan yang sudah dilakukan');
  const c = incident.checklist ?? {};
  table([
    ['Berhenti mengirim uang', c.stopTransfer ? 'Sudah' : 'Belum dikonfirmasi'],
    ['Tidak membagikan OTP/PIN', c.noOtp ? 'Sudah' : 'Belum dikonfirmasi'],
    ['Ganti PIN (bila sempat dibagikan)', c.changePin ? 'Sudah' : 'Belum dikonfirmasi'],
    ['Nomor tiket bank / e-wallet', incident.bankTicket ?? ''],
    ['Nomor laporan IASC', incident.iascReportNo ?? ''],
  ]);

  // 5. Daftar bukti
  section(4, 'Daftar bukti');
  if (files.length) {
    table(
      files.map((f, i) => [
        `${i + 1}. ${label(EVIDENCE_CATEGORIES, f.meta.category)}`,
        `${f.meta.fileName}  -  ${formatDateTime(f.meta.createdAt)}  -  SHA-256 ${f.meta.sha256.slice(0, 8)}`,
      ]),
      48,
    );
  } else {
    text('Belum ada bukti yang diunggah.', { color: MUTED });
  }

  // 6. Checklist kelengkapan
  section(5, 'Checklist kelengkapan');
  const comp = computeCompleteness(incident, files.map((f) => f.meta));
  table(comp.items.map((it) => [it.label, it.done ? '[v] Lengkap' : '[ ] Belum lengkap']));
  y += 1;
  text(`Kelengkapan: ${comp.done} dari ${comp.total}`, { size: 9, color: MUTED });

  // 7. Kanal resmi
  section(6, 'Kanal pelaporan resmi');
  table([
    ['Indonesia Anti-Scam Centre (OJK)', IASC_URL || '[URL resmi IASC - diverifikasi tim]'],
    ['Bank / e-wallet pelapor', 'Call center resmi yang tertera di aplikasi resmi, balik kartu, atau situs resmi'],
    ['Kepolisian (siber)', '[Kanal resmi pengaduan siber - diverifikasi tim]'],
  ]);

  // 8. Pernyataan
  section(7, 'Pernyataan');
  text(
    'Dokumen ini disusun oleh pelapor dengan bantuan ScamGuard. Kebenaran isi menjadi tanggung jawab pelapor. ' +
      'ScamGuard tidak menjamin pemblokiran rekening maupun pengembalian dana.',
    { size: 10 },
  );

  // 9. Lampiran gambar, 1-2 per halaman (lebar maks. 170 mm, JPEG 0,7)
  const images = files.filter((f) => f.blob && f.meta.mime.startsWith('image/'));
  let perPage = 0;
  for (const [i, f] of images.entries()) {
    const img = await toJpeg(f.blob!);
    if (!img) continue;
    let w = W;
    let h = (img.h / img.w) * w;
    const maxH = (PAGE_H - 2 * M - 30) / 2;
    if (h > maxH) {
      h = maxH;
      w = (img.w / img.h) * h;
    }
    if (perPage === 0 || perPage === 2 || y + h + 14 > PAGE_H - M - 8) {
      doc.addPage();
      y = M;
      perPage = 0;
      if (i === 0) text('LAMPIRAN', { size: 11, bold: true, color: TEAL });
    }
    y += 3;
    text(`Lampiran ${i + 1} - ${label(EVIDENCE_CATEGORIES, f.meta.category)}: ${f.meta.fileName}`, { size: 9, color: MUTED });
    y += 1;
    doc.addImage(img.data, 'JPEG', M + (W - w) / 2, y, w, h);
    doc.setDrawColor(226, 232, 240);
    doc.rect(M + (W - w) / 2, y, w, h, 'S');
    y += h + 4;
    perPage += 1;
  }
  const pdfs = files.filter((f) => f.meta.mime === 'application/pdf');
  if (pdfs.length) {
    y += 3;
    text(`Bukti berformat PDF (${pdfs.map((f) => f.meta.fileName).join(', ')}) dilampirkan terpisah.`, { size: 9, color: MUTED });
  }

  // 10. Footer setiap halaman
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Halaman ${p} dari ${total}  -  ID ${incident.code}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' });
  }

  return doc.output('blob');
}
