'use client';
import { Eye, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Footer, Header } from '@/components/Header';
import { Button } from '@/components/ui';
import { getDeviceId } from '@/lib/device';

const CARDS = [
  { icon: ShieldCheck, title: 'Apa yang dilakukan ScamGuard', text: 'Memeriksa halaman yang Anda buka dan memberi jeda "Tahan Dulu" bila terindikasi berisiko. Anda juga bisa memeriksa tautan, nomor, atau teks secara manual.' },
  { icon: Eye, title: 'Data apa yang dibaca & tidak dikirim', text: 'Isi halaman dianalisis di perangkat Anda dan tidak dikirim ke server. Yang tercatat hanya domain, skor, dan jenis tanda yang ditemukan — tanpa akun atau login.' },
  { icon: Sparkles, title: 'Keputusan tetap di tangan Anda', text: 'Peringatan selalu disertai alasan dan bisa dilewati setelah jeda singkat. ScamGuard tidak membatalkan transfer atau memblokir rekening.' },
];

export default function Welcome() {
  const router = useRouter();
  useEffect(() => void getDeviceId(), []);
  return (
    <>
      <Header crumbs={[{ label: 'Selamat datang' }]} />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-12 sm:px-8">
        <h1 className="text-center text-[30px] font-extrabold tracking-tight">ScamGuard sudah aktif</h1>
        <p className="mt-2 text-center text-[16px] text-ink-2">Tidak ada pengaturan yang wajib. Begini cara kerjanya:</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {CARDS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-card border border-line bg-white p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-primary-soft text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
              <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-primary">Langkah {i + 1}</p>
              <h2 className="mt-1 text-[17px] font-bold">{title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 text-center">
          <Button className="h-[52px] px-8 text-[16px]" onClick={() => { localStorage.setItem('sg_onboarding', '1'); router.push('/'); }}>Mulai</Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
