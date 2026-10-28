// Konten halaman simulasi (PRD 16.5). Dipakai oleh web /demo/* dan unit test risk engine,
// supaya yang diuji persis sama dengan yang didemokan.

export const DEMO_LABEL = 'HALAMAN SIMULASI UNTUK DEMO SCAMGUARD';

export const DEMO_INVESTASI = {
  title: 'CuanHarian88 — Investasi Profit Tetap',
  headline: 'Investasi Profit Tetap 30% per Minggu',
  paragraphs: [
    'Gabung sekarang dan nikmati profit tetap 30% per minggu. Jaminan 100% tanpa risiko, modal kembali penuh!',
    'Slot terbatas! Promo berakhir malam ini, segera transfer sebelum kuota habis.',
    'Untuk aktivasi akun, kirimkan kode OTP yang Anda terima ke admin resmi kami melalui WhatsApp.',
    'Deposit minimal Rp500.000 ditransfer ke rekening a.n. pengelola.',
  ],
  cta: 'Transfer sekarang',
};

export const DEMO_AMAN = {
  title: 'Tips Mengelola Keuangan Keluarga',
  headline: 'Lima Kebiasaan Sederhana untuk Keuangan yang Sehat',
  paragraphs: [
    'Catat pengeluaran harian agar Anda tahu ke mana uang pergi setiap bulan.',
    'Sisihkan dana darurat minimal tiga kali pengeluaran bulanan di rekening terpisah.',
    'Bandingkan harga sebelum membeli barang besar dan hindari belanja impulsif.',
    'Bank resmi tidak pernah meminta kode OTP atau PIN Anda. Jangan bagikan kepada siapa pun.',
  ],
  cta: 'Baca artikel lainnya',
};

export function demoPageText(demo: typeof DEMO_INVESTASI): string {
  return [demo.headline, ...demo.paragraphs, demo.cta].join('\n');
}
