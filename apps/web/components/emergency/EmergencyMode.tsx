'use client';
// Mode Darurat 4 langkah (KF-05, PRD 8.6).
import { ArrowLeft, ArrowRight, Clock, ExternalLink, FileText, Home, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { IASC_URL } from '@/lib/config';
import { fromLocalInput, hms, toLocalInput } from '@/lib/format';
import { bankScript } from '@/lib/script';
import { useIncident } from '@/lib/useIncident';
import { Footer, Logo } from '../Header';
import { Button, Modal, OfflineBanner, Pill, buttonClass, inputClass } from '../ui';
import { ChecklistItem } from './ChecklistItem';
import { EmergencyStepper } from './EmergencyStepper';
import { ScriptBox } from './ScriptBox';
import { NumberedStep, StepCard } from './StepCard';

const STEPS = [
  { title: 'Hentikan transfer lanjutan', short: 'Hentikan transfer' },
  { title: 'Hubungi bank atau e-wallet Anda', short: 'Hubungi bank' },
  { title: 'Siapkan Evidence Pack', short: 'Evidence Pack' },
  { title: 'Laporkan ke IASC', short: 'Lapor IASC' },
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
  const now = useNow();

  useEffect(() => {
    if (!incident) return;
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

  const goTo = useCallback(
    (step: number) => {
      update({ currentStep: step });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [update],
  );

  if (loadError) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <p className="text-[16px] text-ink-2">{loadError}</p>
        <Link href="/darurat" className={buttonClass('primary', 'mt-6')}>Mulai panduan baru</Link>
      </div>
    );
  }
  if (!incident) {
    return <div className="mx-auto mt-24 h-64 w-full max-w-[1040px] animate-pulse rounded-card bg-divider" aria-label="Memuat…" />;
  }

  const step = Math.min(incident.currentStep, 4);
  const c = incident.checklist ?? {};
  const comp = incident.completeness!;
  const isDone = (k: string) => comp.items.find((x) => x.key === k)?.done ?? false;
  const since = (now - new Date(incident.transferAt ?? incident.createdAt).getTime()) / 1000;

  const next = (from: number) => {
    void api.track('emergency_step_completed', { step: from + 1 });
    goTo(from + 1);
  };

  const stepDone = (i: number) =>
    i === 0 ? !!(c.stopTransfer && c.noOtp) : i === 1 ? !!incident.bankTicket || !!c.contactedBank : i === 2 ? comp.done === comp.total || !!incident.packGeneratedAt : !!incident.iascReportNo;

  const navActions = (i: number, primaryLabel = 'Sudah, lanjut') => (
    <>
      {i > 0 ? (
        <Button variant="secondary" onClick={() => goTo(i - 1)} className="w-full sm:w-auto"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali</Button>
      ) : <span />}
      <Button onClick={() => next(i)} className="w-full sm:w-auto">
        {primaryLabel} <ArrowRight className="h-4 w-4" aria-hidden />
        <span className="sr-only">. Berikutnya: {i < 3 ? STEPS[i + 1].title : 'Selesai'}</span>
      </Button>
    </>
  );

  const evidenceHref = `/evidence/${incident.id}`;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <Pill tone="high">Mode Darurat</Pill>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-btn border border-line bg-bg px-3 py-2" aria-live="off">
              <Clock className="h-4 w-4 text-ink-3" aria-hidden />
              <span className="text-[12px] text-ink-3">Sejak transfer</span>
              <span className="font-mono text-[15px] font-bold tabular-nums" aria-label={`Sejak transfer ${hms(since)}`}>{hms(since)}</span>
            </div>
            <Link href="/" className={buttonClass('secondary', '!min-h-[40px] !px-3')} aria-label="Beranda"><Home className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Beranda</span></Link>
          </div>
        </div>
      </header>
      <OfflineBanner show={save === 'offline' && !local} />
      {local && (
        <div role="status" className="border-b border-medium-border bg-medium-bg px-4 py-2 text-center text-[13px] font-medium text-medium-text">
          Server tidak dapat dihubungi. Progres disimpan di perangkat ini saja.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-strong bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />Panduan tanggap darurat
          </span>
          <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[34px]">Kami pandu Anda dalam 4 langkah</h1>
          <p className="mx-auto mt-2 max-w-[560px] text-[16px] text-ink-2">Tenang. Ikuti satu langkah dalam satu waktu.</p>
          {since < 3600 && step < 2 && (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-btn border border-medium-border bg-medium-bg px-4 py-2 text-[14px] font-semibold text-medium-text">
              <Clock className="h-4 w-4" aria-hidden /> Usahakan hubungi bank dalam 1 jam pertama.
            </p>
          )}
        </div>

        <div className="mt-8"><EmergencyStepper steps={STEPS} current={step} done={stepDone} onSelect={goTo} /></div>

        <div className="mt-6">
          {step === 0 && (
            <StepCard index={0} title={STEPS[0].title}
              why={'Pihak yang menghubungi Anda sering meminta uang tambahan dengan alasan "biaya pencairan". Berhenti sekarang mencegah kerugian bertambah.'}
              actions={navActions(0)}>
              <div className="flex flex-col gap-2.5">
                <ChecklistItem id="c1" checked={!!c.stopTransfer} onChange={(v) => update({ checklist: { stopTransfer: v } })}>Jangan kirim uang lagi, apa pun alasannya.</ChecklistItem>
                <ChecklistItem id="c2" checked={!!c.noOtp} onChange={(v) => update({ checklist: { noOtp: v } })}>Jangan bagikan kode OTP, PIN, atau kata sandi ke siapa pun.</ChecklistItem>
                <ChecklistItem id="c3" checked={!!c.changePin} onChange={(v) => update({ checklist: { changePin: v } })}>Jika sempat dibagikan, ganti PIN lewat aplikasi resmi bank Anda.</ChecklistItem>
              </div>
            </StepCard>
          )}

          {step === 1 && (
            <StepCard index={1} title={STEPS[1].title}
              why="Bank bisa mencoba menahan dana di rekening tujuan jika Anda melapor dengan cepat."
              actions={navActions(1)}>
              <ol className="divide-y divide-divider">
                <NumberedStep n={1} title="Telepon call center resmi bank atau e-wallet Anda.">
                  <Button variant="secondary" onClick={() => setContactsOpen(true)}><Phone className="h-4 w-4" aria-hidden /> Lihat kontak resmi bank</Button>
                </NumberedStep>
                <NumberedStep n={2} title="Sampaikan kalimat ini ke petugas.">
                  <ScriptBox text={bankScript(incident)} />
                </NumberedStep>
                <NumberedStep n={3} title="Catat nomor tiket atau nomor laporan dari bank.">
                  <label htmlFor="bankTicket" className="sr-only">Nomor tiket bank</label>
                  <input id="bankTicket" className={`${inputClass()} max-w-[360px]`} placeholder="Contoh: 2026102800123"
                    defaultValue={incident.bankTicket ?? ''} onChange={(e) => update({ bankTicket: e.target.value, checklist: { contactedBank: !!e.target.value } })} />
                </NumberedStep>
              </ol>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard index={2} title={STEPS[2].title}
              why="Satu dokumen PDF berisi bukti dan kronologi. Laporan dengan bukti lengkap lebih mudah diproses bank dan IASC."
              actions={
                <>
                  <Button variant="secondary" onClick={() => next(2)} className="w-full sm:w-auto">Lewati dulu, lanjut <ArrowRight className="h-4 w-4" aria-hidden /></Button>
                  <Link href={evidenceHref} onClick={() => void flush()} className={buttonClass('primary', 'w-full sm:w-auto')}>
                    <FileText className="h-4 w-4" aria-hidden /> Lengkapi Evidence Pack
                  </Link>
                </>
              }>
              <ul className="divide-y divide-divider rounded-btn border border-line">
                {[
                  { label: 'Bukti transfer', done: isDone('proof') },
                  { label: 'Screenshot percakapan', done: isDone('chat') },
                  { label: 'Nomor rekening penerima', done: isDone('recipient') },
                  { label: 'Kronologi singkat', done: isDone('chronology'), partial: !!incident.chronology?.trim() },
                ].map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <span className="text-[15px] font-medium">{item.label}</span>
                    {item.done ? <Pill tone="low">Sudah</Pill> : item.partial ? <Pill tone="medium">Sedang diisi</Pill> : <Pill tone="neutral">Belum</Pill>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[14px] text-ink-3">Kelengkapan saat ini: {comp.done} dari {comp.total}.</p>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard index={3} title={STEPS[3].title}
              why="Indonesia Anti-Scam Centre adalah kanal resmi untuk melaporkan penipuan keuangan agar bisa ditindaklanjuti."
              actions={navActions(3, 'Selesai')}>
              <ol className="divide-y divide-divider">
                <NumberedStep n={1} title="Unduh Evidence Pack (PDF).">
                  <Link href={evidenceHref} onClick={() => void flush()} className={buttonClass('secondary')}><FileText className="h-4 w-4" aria-hidden /> Buka Evidence Pack</Link>
                </NumberedStep>
                <NumberedStep n={2} title="Buka situs IASC, isi formulir, lalu lampirkan PDF.">
                  {IASC_URL ? (
                    <a href={IASC_URL} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}
                      onClick={() => { void api.track('iasc_link_clicked'); update({ checklist: { openedIasc: true } }); }}>
                      Buka situs IASC <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                  ) : (
                    <p className="rounded-btn border border-medium-border bg-medium-bg px-3.5 py-2.5 text-[13.5px] text-medium-text">
                      Tautan resmi IASC belum dikonfigurasi. Cari melalui situs resmi OJK (ojk.go.id), jangan dari tautan yang dikirim orang lain.
                    </p>
                  )}
                </NumberedStep>
                <NumberedStep n={3} title="Simpan nomor laporan IASC Anda.">
                  <label htmlFor="iasc" className="sr-only">Nomor laporan IASC</label>
                  <input id="iasc" className={`${inputClass()} max-w-[360px]`} placeholder="Nomor laporan IASC"
                    defaultValue={incident.iascReportNo ?? ''} onChange={(e) => update({ iascReportNo: e.target.value })} />
                </NumberedStep>
              </ol>
            </StepCard>
          )}

          {step === 4 && (
            <section className="rounded-card border border-line bg-white p-6 text-center shadow-card sm:p-10">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-low-bg text-low"><ShieldCheck className="h-8 w-8" aria-hidden /></span>
              <h2 className="mt-4 text-[26px] font-extrabold">Semua langkah selesai</h2>
              <p className="mx-auto mt-2 max-w-[520px] text-[16px] leading-relaxed text-ink-2">
                Anda sudah melakukan yang terbaik. Simpan Evidence Pack, nomor tiket bank, dan nomor laporan IASC untuk tindak lanjut.
              </p>
              <dl className="mx-auto mt-6 grid max-w-[520px] gap-3 text-left sm:grid-cols-2">
                <div className="rounded-btn border border-line bg-bg p-4"><dt className="text-[12px] text-ink-3">Nomor tiket bank</dt><dd className="mt-1 font-mono text-[15px] font-bold">{incident.bankTicket || '—'}</dd></div>
                <div className="rounded-btn border border-line bg-bg p-4"><dt className="text-[12px] text-ink-3">Nomor laporan IASC</dt><dd className="mt-1 font-mono text-[15px] font-bold">{incident.iascReportNo || '—'}</dd></div>
              </dl>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button variant="secondary" onClick={() => goTo(3)}><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke langkah 4</Button>
                <Link href={evidenceHref} className={buttonClass('primary')}><FileText className="h-4 w-4" aria-hidden /> Lihat Evidence Pack</Link>
              </div>
            </section>
          )}
        </div>

        <p className="mx-auto mt-8 max-w-[720px] text-center text-[13px] leading-relaxed text-ink-3">
          ScamGuard tidak dapat membatalkan transfer atau memblokir rekening. ScamGuard membantu Anda bertindak cepat dan menyusun bukti untuk kanal resmi (bank, e-wallet, IASC).
        </p>
        <p className="mt-2 text-center text-[12px] text-ink-3" aria-live="polite">
          {save === 'saving' ? 'Menyimpan…' : save === 'saved' ? 'Tersimpan' : ''} · ID {incident.code}
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
