import type { Metadata } from 'next';
import { Footer, Header } from '@/components/Header';

export const metadata: Metadata = { title: 'Tentang' };

export default function Tentang() {
  return (
    <>
      <Header crumbs={[{ label: 'Beranda', href: '/' }, { label: 'Tentang' }]} />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10 text-[16px] leading-relaxed text-ink-2 sm:px-8 [&_h2]:mt-10 [&_h2]:text-[21px] [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3">
        <h1 className="text-[30px] font-extrabold tracking-tight text-ink">Tentang ScamGuard</h1>
        <p>ScamGuard adalah ekstensi Chrome dan aplikasi web pendamping yang membantu Anda pada dua momen penting: <strong className="text-ink">sebelum transfer</strong> (pemeriksaan risiko dan jeda &quot;Tahan Dulu&quot;) dan <strong className="text-ink">setelah transfer</strong> (Mode Darurat dan Evidence Pack).</p>

        <h2>Cara kerja</h2>
        <ul className="list-disc pl-5">
          <li>Setiap halaman yang Anda buka diperiksa di perangkat Anda dengan aturan berbasis tanda-tanda umum: janji keuntungan tidak wajar, desakan transfer, permintaan OTP/PIN, dan nama domain yang mirip layanan resmi.</li>
          <li>Hasilnya berupa skor 0–100 beserta alasannya. Skor 70 ke atas memunculkan jeda &quot;Tahan Dulu&quot;.</li>
          <li>Hasil adalah bantuan awal, bukan keputusan akhir. Peringatan dapat dilewati setelah jeda singkat.</li>
        </ul>

        <h2>Batasan</h2>
        <ul className="list-disc pl-5">
          <li>ScamGuard tidak dapat membatalkan transfer, membekukan rekening, atau menjamin pengembalian dana.</li>
          <li>ScamGuard tidak terhubung langsung dengan bank, e-wallet, aparat, atau IASC. ScamGuard mengarahkan Anda ke kanal resmi dengan bukti yang lebih rapi.</li>
          <li>Modus baru bisa saja belum dikenali. Tetap waspada meski hasil pemeriksaan rendah.</li>
        </ul>

        <h2 id="privasi">Privasi</h2>
        <ul className="list-disc pl-5">
          <li><strong className="text-ink">Isi halaman tidak dikirim ke server.</strong> Yang dicatat hanya domain, alamat tanpa parameter, skor, dan jenis tanda yang ditemukan.</li>
          <li>Teks dan nomor yang Anda periksa manual disimpan dalam bentuk hash (nomor ditampilkan tersamarkan).</li>
          <li>Tidak ada akun atau login. Identitas Anda berupa ID perangkat acak.</li>
          <li>Screenshot dibaca (OCR) di peramban Anda; gambar tidak dikirim ke layanan OCR pihak ketiga.</li>
          <li>Laporan dan bukti hanya dapat diakses dari perangkat Anda dan dapat dihapus kapan saja dari halaman Riwayat atau Evidence Pack.</li>
          <li>Tidak ada pelacak pihak ketiga.</li>
        </ul>

        <h2 id="instal">Memasang ekstensi (demo)</h2>
        <ol className="list-decimal pl-5">
          <li>Jalankan <code className="rounded bg-divider px-1.5 py-0.5 text-[14px]">pnpm --filter @scamguard/extension build</code>.</li>
          <li>Buka <code className="rounded bg-divider px-1.5 py-0.5 text-[14px]">chrome://extensions</code> lalu aktifkan <em>Developer mode</em>.</li>
          <li>Pilih <em>Load unpacked</em> dan arahkan ke folder <code className="rounded bg-divider px-1.5 py-0.5 text-[14px]">apps/extension/dist</code>.</li>
        </ol>

        <h2>Tim</h2>
        <p>Tim Yuri Time — Universitas Telkom: Fadhil Rahman Yuriana (Ketua) dan Wildan Bugi Rivansyah.</p>
      </main>
      <Footer />
    </>
  );
}
