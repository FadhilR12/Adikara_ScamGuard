'use client';
import { FileText, History, LifeBuoy, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Footer, Header } from '@/components/Header';
import { ConfirmDialog, Pill, buttonClass, useToast } from '@/components/ui';
import { api, NetworkError } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { clearIncidentBackup } from '@/lib/useIncident';

type Checks = Awaited<ReturnType<typeof api.listChecks>>;
type Incidents = Awaited<ReturnType<typeof api.listIncidents>>;

const STATUS: Record<string, string> = { draft: 'Draf', in_progress: 'Sedang diisi', pack_generated: 'PDF dibuat', reported: 'Dilaporkan', closed: 'Selesai' };
const TYPE: Record<string, string> = { url: 'Tautan', text: 'Teks', number: 'Nomor', page: 'Halaman' };
const LEVEL: Record<string, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };

export default function Riwayat() {
  const [checks, setChecks] = useState<Checks | null>(null);
  const [incidents, setIncidents] = useState<Incidents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    getDeviceId();
    try {
      const [c, i] = await Promise.all([api.listChecks(), api.listIncidents()]);
      setChecks(c);
      setIncidents(i);
      setError(null);
    } catch (e) {
      setError(e instanceof NetworkError ? 'Anda sedang offline atau server tidak dapat dihubungi.' : 'Terjadi kendala. Coba lagi sebentar lagi.');
    }
  }, []);
  useEffect(() => void load(), [load]);

  return (
    <>
      <Header crumbs={[{ label: 'Beranda', href: '/' }, { label: 'Riwayat' }]} />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-10 sm:px-8">
        <h1 className="text-[28px] font-extrabold tracking-tight">Riwayat</h1>
        <p className="mt-1 text-[15px] text-ink-2">Laporan dan pemeriksaan dari perangkat ini.</p>

        {error && (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-medium-border bg-medium-bg p-4 text-[14px] text-medium-text">
            {error}<button onClick={() => void load()} className="font-bold underline">Coba lagi</button>
          </div>
        )}

        <section className="mt-8" aria-labelledby="lap">
          <h2 id="lap" className="text-[19px] font-bold">Laporan darurat</h2>
          {incidents === null && !error ? <div className="mt-3 h-24 animate-pulse rounded-card bg-divider" /> : incidents?.length ? (
            <ul className="mt-3 divide-y divide-divider rounded-card border border-line bg-white shadow-card">
              {incidents.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[15px] font-bold">{i.code}</p>
                    <p className="text-[13px] text-ink-3">{formatDateTime(i.createdAt)}{i.amount ? ` · ${formatRupiah(i.amount)}` : ''}</p>
                  </div>
                  <Pill tone={i.status === 'pack_generated' || i.status === 'reported' ? 'low' : 'info'}>{STATUS[i.status] ?? i.status}</Pill>
                  <div className="flex gap-2">
                    <Link href={`/darurat/${i.id}`} className={buttonClass('secondary', '!min-h-[40px] !px-3 text-[14px]')}><LifeBuoy className="h-4 w-4" aria-hidden />Panduan</Link>
                    <Link href={`/evidence/${i.id}`} className={buttonClass('secondary', '!min-h-[40px] !px-3 text-[14px]')}><FileText className="h-4 w-4" aria-hidden />Evidence</Link>
                    <button onClick={() => setToDelete(i.id)} aria-label={`Hapus laporan ${i.code}`} className="rounded-btn p-2.5 text-high-text hover:bg-high-bg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !error && <p className="mt-3 rounded-card border border-line bg-white p-5 text-[15px] text-ink-2">Belum ada laporan. Semoga tetap begitu.</p>}
        </section>

        <section className="mt-10" aria-labelledby="cek">
          <h2 id="cek" className="text-[19px] font-bold">Pemeriksaan</h2>
          {checks === null && !error ? <div className="mt-3 h-24 animate-pulse rounded-card bg-divider" /> : checks?.length ? (
            <ul className="mt-3 divide-y divide-divider rounded-card border border-line bg-white shadow-card">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium">{c.target ?? '(teks — tidak disimpan)'}</p>
                    <p className="text-[12.5px] text-ink-3">{TYPE[c.inputType]} · {c.source === 'auto' ? 'otomatis' : 'manual'} · skor {c.score} · {formatDateTime(c.createdAt)}</p>
                  </div>
                  <Pill tone={c.level}>{LEVEL[c.level]}</Pill>
                </li>
              ))}
            </ul>
          ) : !error && (
            <div className="mt-3 flex flex-col items-center rounded-card border border-line bg-white px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-divider text-ink-3"><History className="h-6 w-6" aria-hidden /></span>
              <p className="mt-3 text-[15px] text-ink-2">Belum ada pemeriksaan. Coba periksa tautan pertama Anda.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
      <ConfirmDialog open={!!toDelete} danger title="Hapus laporan ini?" message="Laporan dan semua bukti terkait akan dihapus permanen."
        confirmLabel="Hapus permanen" cancelLabel="Batal" onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const id = toDelete!;
          setToDelete(null);
          try {
            await api.deleteIncident(id);
            clearIncidentBackup(id);
            setIncidents((xs) => xs?.filter((x) => x.id !== id) ?? null);
            toast('Laporan dihapus.');
          } catch {
            toast('Terjadi kendala. Coba lagi sebentar lagi.');
          }
        }} />
    </>
  );
}
