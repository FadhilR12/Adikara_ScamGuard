import { ArrowRight, FileText, LifeBuoy, PauseCircle, ScanSearch, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Footer, Header } from '@/components/Header';
import { buttonClass } from '@/lib/styles';

const FEATURES = [
  { icon: ScanSearch, title: 'Scam Risk Check', text: 'Periksa tautan, nomor, teks penawaran, atau screenshot sebelum transfer — lengkap dengan alasannya.' },
  { icon: PauseCircle, title: 'Tahan Dulu', text: 'Saat halaman terindikasi berisiko, ScamGuard memberi jeda singkat agar Anda memutuskan dengan tenang.' },
  { icon: LifeBuoy, title: 'Mode Darurat', text: 'Sudah terlanjur transfer? Empat langkah terpandu, termasuk contoh kalimat untuk petugas bank.' },
  { icon: FileText, title: 'Evidence Pack', text: 'Satu PDF berisi kronologi dan bukti, siap dilampirkan ke laporan bank dan IASC.' },
];

export default function Home() {
  return (
    <>
      <Header crumbs={[{ label: 'Beranda' }]} />
      <main className="flex-1">
        <section className="mx-auto max-w-[1040px] px-4 pb-10 pt-14 text-center sm:px-8 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-strong bg-primary-soft px-3.5 py-1.5 text-[13px] font-bold text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Ekstensi Chrome + aplikasi web
          </span>
          <h1 className="mx-auto mt-5 max-w-[760px] text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[46px]">Cek dulu sebelum transfer.</h1>
          <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-relaxed text-ink-2">
            ScamGuard mendampingi Anda sebelum mengirim uang dan memandu langkah pertama bila terlanjur menjadi korban penipuan digital.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/darurat?src=web" className={buttonClass('primary', 'h-[52px] px-6 text-[16px]')}>
              <LifeBuoy className="h-5 w-5" aria-hidden /> Saya sudah transfer
            </Link>
            <Link href="/tentang#instal" className={buttonClass('secondary', 'h-[52px] px-6 text-[16px]')}>Pasang ekstensi <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1040px] gap-4 px-4 pb-14 sm:grid-cols-2 sm:px-8">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-card border border-line bg-white p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-primary-soft text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
              <h2 className="mt-4 text-[18px] font-bold">{title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{text}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-[1040px] px-4 pb-16 sm:px-8">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[17px] font-bold">Punya screenshot chat yang mencurigakan?</h2>
              <p className="mt-1 text-[15px] text-ink-2">Gambar dibaca di perangkat Anda, lalu diperiksa tanda risikonya.</p>
            </div>
            <Link href="/periksa-gambar" className={buttonClass('secondary', 'shrink-0')}><ScanSearch className="h-4 w-4" aria-hidden /> Periksa screenshot</Link>
          </div>
          <p className="mt-6 text-center text-[13.5px] text-ink-3">
            Halaman simulasi untuk demo: <Link href="/demo/investasi" className="font-semibold text-primary underline">investasi (berisiko)</Link> ·{' '}
            <Link href="/demo/aman" className="font-semibold text-primary underline">artikel (aman)</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
