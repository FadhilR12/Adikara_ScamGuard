import Link from 'next/link';
import { Footer, Header } from '@/components/Header';
import { buttonClass } from '@/lib/styles';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-[26px] font-extrabold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-2">Alamat yang Anda buka tidak tersedia.</p>
        <Link href="/" className={buttonClass('primary', 'mt-6')}>Ke beranda</Link>
      </main>
      <Footer />
    </>
  );
}
