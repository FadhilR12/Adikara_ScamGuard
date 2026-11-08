'use client';
// Mode Darurat 4 langkah (KF-05, PRD 8.6) — tata letak mengikuti reference/ScamGuard/Emergency Mode.png:
// daftar 4 kartu langkah + tombol "Lanjut ke Pengumpulan Bukti". Klik kartu untuk membuka detailnya.
import { ArrowRight, Check, CheckCircle2, Clock, FileText, FolderOpen, Phone, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { fromLocalInput, hms, toLocalInput } from '@/lib/format';
import { onIascReportSaved, startIascReporting } from '@/lib/reporting-session';
import { bankScript } from '@/lib/script';
import { useIncident } from '@/lib/useIncident';
import { Footer, Header } from '../Header';
import { Button, Modal, OfflineBanner, Pill, WhyBox, buttonClass, inputClass } from '../ui';
import { ChecklistItem } from './ChecklistItem';
import { ScriptBox } from './ScriptBox';
import { NumberedStep } from './StepCard';

const STEPS = [
  { title: 'Hentikan Transfer Lanjutan', desc: 'Jangan kirim uang lagi atau bagikan OTP/PIN.', icon: ShieldX },
  { title: 'Hubungi Bank atau E-Wallet', desc: 'Laporkan transaksi dan minta pemblokiran jika memungkinkan.', icon: Phone },
  { title: 'Kumpulkan Bukti', desc: 'Simpan bukti transfer, screenshot percakapan, dan data rekening pelaku.', icon: FolderOpen },
  { title: 'Siapkan Laporan', desc: 'Susun kronologi dan siapkan dokumen untuk kanal resmi.', icon: FileText },
];

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function EmergencyMode({ id }: { id: string }) {
  const { incident, loadError, save, update, flush, local } = useIncident(id);
  const [askTime, setAskTime] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const openInit = useRef(false);
  const now = useNow();
  const iascInputRef = useRef<HTMLInputElement>(null);

  // Nomor laporan yang ditangkap ScamGuard Co-Pilot di tab IASC → simpan ke insiden (API + localStorage).
  useEffect(() => {
    if (!incident?.id) return;
    return onIascReportSaved(incident.id, (reportNo) => {
      update({ iascReportNo: reportNo });
      if (iascInputRef.current) iascInputRef.current.value = reportNo;
    });
  }, [incident?.id, update]);

  useEffect(() => {
    if (!incident) return;
    // Kembali di tengah alur (mis. dari Evidence Pack) → buka langkah terakhir.
    if (!openInit.current) {
      openInit.current = true;
      if (incident.currentStep > 0) setOpen(Math.min(incident.currentStep, 3));
    }
    const askedKey = `sg_asked_${incident.id}`;
    if (!incident.transferAt && !localStorage.getItem(askedKey)) {
      setTimeInput(toLocalInput(new Date().toISOString()));
      setAskTime(true);
    }
    const startedKey = `sg_started_${incident.id}`;
    if (!sessionStorage.getItem(startedKey)) {
      sessionStorage.setItem(startedKey, '1');
      void api.track('emergency_started', { src: incident.source ?? 'web' });
    }
  }, [incident?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <p className="text-[16px] text-ink-2">{loadError}</p>
        <Link href="/darurat" className={buttonClass('primary', 'mt-6')}>Mulai panduan baru</Link>
      </div>
    );
  }
  if (!incident) {
    return <div className="mx-auto mt-24 h-64 w-full max-w-[720px] animate-pulse rounded-card bg-divider" aria-label="Memuat…" />;
  }

  const c = incident.checklist ?? {};
  const comp = incident.completeness!;
  const isDone = (k: string) => comp.items.find((x) => x.key === k)?.done ?? false;
  const since = (now - new Date(incident.transferAt ?? incident.createdAt).getTime()) / 1000;
  const evidenceHref = `/evidence/${incident.id}`;

  const stepDone = (i: number) =>
    i === 0 ? !!(c.stopTransfer && c.noOtp)
      : i === 1 ? !!incident.bankTicket || !!c.contactedBank
        : i === 2 ? comp.done === comp.total || !!incident.packGeneratedAt
          : !!incident.iascReportNo;

  const toggle = (i: number) => {
    const next = open === i ? null : i;
    setOpen(next);
    if (next !== null) update({ currentStep: next });
  };

  const finish = (i: number) => {
    void api.track('emergency_step_completed', { step: i + 1 });
    const next = Math.min(i + 1, 3);
    setOpen(next);
    update({ currentStep: next });
  };

  const detail: Record<number, { why: string; body: ReactNode; next?: ReactNode }> = {
    0: {
      why: 'Pihak yang menghubungi Anda sering meminta uang tambahan dengan alasan "biaya pencairan". Berhenti sekarang mencegah kerugian bertambah.',
      body: (
        <div className="flex flex-col gap-2.5">
          <ChecklistItem id="c1" checked={!!c.stopTransfer} onChange={(v) => update({ checklist: { stopTransfer: v } })}>Jangan kirim uang lagi, apa pun alasannya.</ChecklistItem>
          <ChecklistItem id="c2" checked={!!c.noOtp} onChange={(v) => update({ checklist: { noOtp: v } })}>Jangan bagikan kode OTP, PIN, atau kata sandi ke siapa pun.</ChecklistItem>
          <ChecklistItem id="c3" checked={!!c.changePin} onChange={(v) => update({ checklist: { changePin: v } })}>Jika sempat dibagikan, ganti PIN lewat aplikasi resmi bank Anda.</ChecklistItem>
        </div>
      ),
      next: <Button onClick={() => finish(0)}>Sudah, lanjut <ArrowRight className="h-4 w-4" aria-hidden /></Button>,
    },
    1: {
      why: 'Bank bisa mencoba menahan dana di rekening tujuan jika Anda melapor dengan cepat.',
      body: (
        <>
          {since < 3600 && (
            <p className="mb-3 inline-flex items-center gap-2 rounded-btn border border-medium-border bg-medium-bg px-3.5 py-2 text-[13.5px] font-semibold text-medium-text">
              <Clock className="h-4 w-4" aria-hidden /> Usahakan hubungi bank dalam 1 jam pertama · {hms(since)} sejak transfer
            </p>
          )}
          <ol className="divide-y divide-divider">
            <NumberedStep n={1} title="Telepon call center resmi bank atau e-wallet Anda.">
              <Button variant="secondary" onClick={() => setContactsOpen(true)}><Phone className="h-4 w-4" aria-hidden /> Lihat kontak resmi bank</Button>
            </NumberedStep>
            <NumberedStep n={2} title="Sampaikan kalimat ini ke petugas.">
              <ScriptBox text={bankScript(incident)} />
            </NumberedStep>
            <NumberedStep n={3} title="Catat nomor tiket atau nomor laporan dari bank.">
              <label htmlFor="bankTicket" className="sr-only">Nomor tiket bank</label>
              <input id="bankTicket" className={`${inputClass()} w-full max-w-[360px]`} placeholder="Contoh: 2026102800123"
                defaultValue={incident.bankTicket ?? ''} onChange={(e) => update({ bankTicket: e.target.value, checklist: { contactedBank: !!e.target.value } })} />
            </NumberedStep>
          </ol>
        </>
      ),
      next: <Button onClick={() => finish(1)}>Sudah, lanjut <ArrowRight className="h-4 w-4" aria-hidden /></Button>,
    },
    2: {
      why: 'Satu dokumen PDF berisi bukti dan kronologi. Laporan dengan bukti lengkap lebih mudah diproses bank dan IASC.',
      body: (
        <>
          <ul className="divide-y divide-divider rounded-btn border border-line">
            {[
              { label: 'Bukti transfer', done: isDone('proof') },
              { label: 'Screenshot percakapan', done: isDone('chat') },
              { label: 'Nomor rekening penerima', done: isDone('recipient') },
              { label: 'Kronologi singkat', done: isDone('chronology'), partial: !!incident.chronology?.trim() },
            ].map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[15px] font-medium">{item.label}</span>
                {item.done ? <Pill tone="low">Sudah</Pill> : item.partial ? <Pill tone="medium">Sedang diisi</Pill> : <Pill tone="neutral">Belum</Pill>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[14px] text-ink-3">Kelengkapan saat ini: {comp.done} dari {comp.total}.</p>
        </>
      ),
      next: (
        <Link href={evidenceHref} onClick={() => void flush()} className={buttonClass('primary')}>
          <FileText className="h-4 w-4" aria-hidden /> Buka Evidence Pack
        </Link>
      ),
    },
    3: {
      why: 'Indonesia Anti-Scam Centre (IASC) adalah kanal resmi untuk melaporkan penipuan keuangan agar bisa ditindaklanjuti.',
      body: (
        <ol className="divide-y divide-divider">
          <NumberedStep n={1} title="Pastikan Evidence Pack (PDF) sudah siap.">
            <Link href={evidenceHref} onClick={() => void flush()} className={buttonClass('secondary')}><FileText className="h-4 w-4" aria-hidden /> Buka Evidence Pack</Link>
          </NumberedStep>
          <NumberedStep n={2} title="Laporkan ke IASC — ScamGuard Co-Pilot membantu mengisi formulirnya.">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" className={buttonClass('primary', 'w-full sm:w-auto')}
                onClick={() => {
                  void api.track('iasc_link_clicked');
                  update({ checklist: { openedIasc: true } });
                  void startIascReporting(incident, [], 'official');
                }}>
                Buka IASC dengan Co-Pilot ↗
              </button>
              <button type="button" className={buttonClass('secondary', 'w-full sm:w-auto')}
                title="Simulasi portal IASC untuk demonstrasi"
                onClick={() => {
                  void api.track('iasc_demo_clicked');
                  update({ checklist: { openedIasc: true } });
                  void startIascReporting(incident, [], 'demo');
                }}>
                Simulasi Demo IASC ↗
              </button>
            </div>
          </NumberedStep>
          <NumberedStep n={3} title="Simpan nomor laporan IASC Anda.">
            <label htmlFor="iasc" className="sr-only">Nomor laporan IASC</label>
            <input ref={iascInputRef} id="iasc" className={`${inputClass()} w-full max-w-[360px]`} placeholder="Nomor laporan IASC"
              defaultValue={incident.iascReportNo ?? ''} onChange={(e) => update({ iascReportNo: e.target.value })} />
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">Terisi otomatis bila Anda melapor lewat ScamGuard Co-Pilot.</p>
          </NumberedStep>
        </ol>
      ),
    },
  };

  const allDone = [0, 1, 2, 3].every(stepDone);

  return (
    <>
      <Header crumbs={[{ label: 'Beranda', href: '/' }, { label: 'Mode Darurat', plain: true }]} />
      <OfflineBanner show={save === 'offline' && !local} />
      {local && (
        <div role="status" className="border-b border-medium-border bg-medium-bg px-4 py-2 text-center text-[13px] font-medium text-medium-text">
          Server tidak dapat dihubungi. Progres disimpan di perangkat ini saja.
        </div>
      )}

      <main className="mx-auto w-full max-w-[752px] flex-1 px-4 pb-16 pt-14 sm:px-4">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-strong bg-primary-soft px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />Panduan tanggap darurat
          </span>
          <h1 className="mt-5 text-[34px] font-extrabold leading-tight tracking-tight sm:text-[42px]">Mode Darurat</h1>
          <p className="mx-auto mt-3 max-w-[480px] text-[18px] leading-relaxed text-ink-2">Tenang. Ikuti langkah berikut untuk melindungi diri Anda.</p>
        </div>

        <ol className="mt-10 flex flex-col gap-5" aria-label="Langkah darurat">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isOpen = open === i;
            const done = stepDone(i);
            const d = detail[i];
            return (
              <li key={s.title} className={`rounded-card border bg-white shadow-card transition ${isOpen ? 'border-primary-strong' : 'border-line'}`}>
                <button type="button" onClick={() => toggle(i)} aria-expanded={isOpen} aria-controls={`step-${i}`}
                  className="flex w-full items-center gap-5 rounded-card px-6 py-6 text-left sm:px-7">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[17px] font-bold text-white ${done ? 'bg-low' : 'bg-primary'}`}>
                    {done ? <Check className="h-5 w-5" aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[18px] font-bold leading-snug">{s.title}</span>
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink-2">{s.desc}</span>
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-primary-border bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                </button>
                {isOpen && (
                  <div id={`step-${i}`} className="border-t border-divider px-6 pb-6 pt-5 sm:px-7">
                    <WhyBox>{d.why}</WhyBox>
                    <h3 className="mt-5 text-[15px] font-bold">Caranya</h3>
                    <div className="mt-3">{d.body}</div>
                    {d.next && <div className="mt-5 flex justify-end">{d.next}</div>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {allDone && (
          <div className="mt-6 rounded-card border border-low-border bg-low-bg p-5 text-[15px] text-low-text">
            <p className="font-bold">Semua langkah selesai.</p>
            <p className="mt-1 text-ink-2">Nomor tiket bank: <strong className="font-mono">{incident.bankTicket || '—'}</strong> · Nomor laporan IASC: <strong className="font-mono">{incident.iascReportNo || '—'}</strong></p>
          </div>
        )}

        <Link href={evidenceHref} onClick={() => { update({ currentStep: Math.max(incident.currentStep, 2) }); void flush(); }}
          className={buttonClass('primary', 'mt-9 h-[58px] w-full text-[17px]')}>
          Lanjut ke Pengumpulan Bukti <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>

        <p className="mt-9 flex items-center justify-center gap-2 text-center text-[13.5px] text-ink-2">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> ScamGuard membantu Anda bertindak cepat dan terstruktur.
        </p>
        <p className="mt-2 text-center text-[12px] text-ink-3" aria-live="polite">
          {save === 'saving' ? 'Menyimpan… · ' : save === 'saved' ? 'Tersimpan · ' : ''}ID {incident.code}
        </p>
      </main>
      <Footer />

      <Modal open={contactsOpen} onClose={() => setContactsOpen(false)} title="Cari kontak resmi bank Anda">
        <p className="text-[15px] text-ink-2">Gunakan nomor dari sumber resmi berikut — jangan dari pesan, komentar, atau iklan media sosial.</p>
        <ul className="mt-4 space-y-2.5 text-[15px]">
          <li className="rounded-btn border border-line p-3.5"><strong>Aplikasi resmi bank/e-wallet</strong> — menu Bantuan atau Hubungi Kami.</li>
          <li className="rounded-btn border border-line p-3.5"><strong>Balik kartu ATM/debit</strong> — nomor call center tercetak di sana.</li>
          <li className="rounded-btn border border-line p-3.5"><strong>Situs resmi bank</strong> — ketik alamatnya sendiri, jangan dari tautan kiriman.</li>
        </ul>
        <Button className="mt-5 w-full" onClick={() => setContactsOpen(false)}>Mengerti</Button>
      </Modal>

      <Modal open={askTime} onClose={() => { localStorage.setItem(`sg_asked_${incident.id}`, '1'); setAskTime(false); }} title="Kapan Anda transfer?">
        <p className="text-[15px] text-ink-2">Opsional. Dipakai untuk penghitung waktu dan contoh kalimat ke bank.</p>
        <label htmlFor="ask-time" className="mt-4 block text-[14px] font-semibold">Waktu transfer</label>
        <input id="ask-time" type="datetime-local" className={`${inputClass()} mt-1.5`} value={timeInput}
          max={toLocalInput(new Date().toISOString())} onChange={(e) => setTimeInput(e.target.value)} />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => { localStorage.setItem(`sg_asked_${incident.id}`, '1'); setAskTime(false); }}>Lewati</Button>
          <Button onClick={() => {
            const iso = fromLocalInput(timeInput);
            if (iso && new Date(iso).getTime() <= Date.now() + 60_000) update({ transferAt: iso });
            localStorage.setItem(`sg_asked_${incident.id}`, '1');
            setAskTime(false);
          }}>Simpan</Button>
        </div>
      </Modal>
    </>
  );
}
