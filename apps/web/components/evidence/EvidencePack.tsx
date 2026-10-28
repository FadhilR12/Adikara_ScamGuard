'use client';
// Evidence Pack Generator (KF-06 s.d. KF-09, PRD 8.7).
import { BANKS, CONTACT_CHANNELS, SCAM_TYPES, type Evidence, type EvidenceCategory, type Incident } from '@scamguard/shared';
import { Download, Image as ImageIcon, Lock, Sparkles, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, fetchEvidenceBlob, uploadEvidence } from '@/lib/api';
import { extractFields, type Extracted } from '@/lib/extract';
import { formatDate, formatRupiah, formatTime, fromLocalInput, toLocalInput } from '@/lib/format';
import { localFiles } from '@/lib/localFiles';
import { OcrTimeoutError, recognize } from '@/lib/ocr';
import { generateEvidencePack, packFileName, type PackFile } from '@/lib/pdf';
import { clearIncidentBackup, useIncident, type IncidentPatch } from '@/lib/useIncident';
import { Footer, Header } from '../Header';
import { Button, ConfirmDialog, Field, OfflineBanner, Spinner, inputClass, useToast } from '../ui';
import { CompletenessPanel } from './CompletenessPanel';
import { Dropzone, MAX_BYTES, rejectReason } from './Dropzone';
import { EvidenceFileCard } from './EvidenceFileCard';
import { MoneyInput } from './MoneyInput';
import { OcrResultBox } from './OcrResultBox';
import { PdfPreview } from './PdfPreview';

const MAX_FILES = 10;
const REQUIRED = 'Belum diisi, diperlukan untuk laporan.';

interface UploadItem {
  key: string;
  file: File;
  category: EvidenceCategory;
  status: 'ocr' | 'uploading' | 'error';
  progress: number;
  ocrPct: number;
  previewUrl?: string;
  error?: string;
  ocrText?: string;
  ocr?: Extracted;
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function chronologyTemplate(i: Incident): string {
  const media = CONTACT_CHANNELS.find((c) => c.value === i.contactChannel)?.label ?? '[media]';
  const akun = i.relatedAccounts?.[0] || '[akun]';
  const tgl = i.transferAt ? formatDate(i.transferAt) : '[Tanggal]';
  const jam = i.transferAt ? formatTime(i.transferAt) : '[jam]';
  return [
    `[Tanggal] — Dihubungi lewat ${media} oleh ${akun}.`,
    'Isi penawaran/permintaan: [jelaskan singkat apa yang dijanjikan atau diminta].',
    `${tgl} pukul ${jam} — Transfer ${i.amount ? formatRupiah(i.amount) : '[nominal]'} ke rekening ${i.recipientAccount || '[no. rekening]'} (${i.recipientBank || '[bank]'})${i.recipientName ? ` a.n. ${i.recipientName}` : ''}.`,
    'Setelah transfer: [mis. diminta biaya tambahan, kontak tidak bisa dihubungi].',
  ].join('\n');
}

export function EvidencePack({ id }: { id: string }) {
  const { incident, loadError, save, saveError, update, flush, setEvidence, local } = useIncident(id);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [ocr, setOcr] = useState<Extracted | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [overwrite, setOverwrite] = useState<{ patch: IncidentPatch; diffs: string[] } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [relatedText, setRelatedText] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  // Thumbnail bukti yang sudah tersimpan (file butuh header X-Device-Id, jadi diambil sebagai blob).
  useEffect(() => {
    for (const e of incident?.evidence ?? []) {
      if (previews[e.id] || !e.mime.startsWith('image/')) continue;
      const blob = localFiles.get(e.id);
      if (blob) setPreviews((p) => ({ ...p, [e.id]: URL.createObjectURL(blob) }));
      else if (!local) fetchEvidenceBlob(e).then((b) => setPreviews((p) => ({ ...p, [e.id]: URL.createObjectURL(b) }))).catch(() => {});
    }
  }, [incident?.evidence, local]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchItem = (key: string, patch: Partial<UploadItem>) => setUploads((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const upload = useCallback(
    async (item: UploadItem) => {
      patchItem(item.key, { status: 'uploading', progress: 0, error: undefined });
      try {
        let evidence: Evidence;
        if (local) {
          evidence = {
            id: `local-${crypto.randomUUID()}`, incidentId: id, category: item.category, fileName: item.file.name, mime: item.file.type,
            size: item.file.size, sha256: await sha256Hex(item.file), ocrText: item.ocrText, ocrFields: item.ocr?.fields, createdAt: new Date().toISOString(), url: '',
          };
          localFiles.set(evidence.id, item.file);
        } else {
          evidence = await uploadEvidence(id, item.file, { category: item.category, ocrText: item.ocrText, ocrFields: item.ocr?.fields }, (pct) => patchItem(item.key, { progress: pct }));
        }
        if (item.previewUrl) setPreviews((p) => ({ ...p, [evidence.id]: item.previewUrl! }));
        setEvidence((list) => [...list, evidence]);
        setUploads((xs) => xs.filter((x) => x.key !== item.key));
      } catch (e) {
        patchItem(item.key, { status: 'error', error: e instanceof ApiError ? e.message : 'Gagal mengunggah. Coba lagi.' });
      }
    },
    [id, local, setEvidence],
  );

  const addFiles = useCallback(
    async (files: File[], category: EvidenceCategory) => {
      const room = MAX_FILES - (incident?.evidence?.length ?? 0) - uploads.length;
      if (files.length > room) toast(`Maksimal ${MAX_FILES} file per laporan.`);
      for (const file of files.slice(0, Math.max(0, room))) {
        const reason = rejectReason(file, MAX_BYTES);
        if (reason) {
          toast(reason.includes('lebih dari') ? 'File lebih dari 10 MB.' : reason);
          continue;
        }
        const isImage = file.type.startsWith('image/');
        const item: UploadItem = {
          key: `${file.name}-${file.size}-${Date.now()}`, file, category, progress: 0, ocrPct: 0,
          status: category === 'transfer' && isImage ? 'ocr' : 'uploading', previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        };
        setUploads((xs) => [...xs, item]);
        if (item.status === 'ocr') {
          // OCR otomatis untuk gambar bukti transfer (AC-08.1).
          try {
            const text = await recognize(file, (pct) => patchItem(item.key, { ocrPct: pct }));
            item.ocrText = text;
            item.ocr = extractFields(text);
            setOcr(item.ocr);
            void api.track('ocr_used', { success: true, fieldsFound: item.ocr.found });
          } catch (e) {
            toast(e instanceof OcrTimeoutError ? e.message : 'Teks tidak terbaca otomatis. Silakan isi manual.');
            void api.track('ocr_used', { success: false, fieldsFound: 0 });
          }
        }
        void upload(item);
      }
    },
    [incident?.evidence?.length, uploads.length, toast, upload],
  );

  if (loadError) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <p className="text-[16px] text-ink-2">{loadError}</p>
        <Link href="/darurat" className="mt-4 inline-block font-bold text-primary">Mulai panduan baru</Link>
      </div>
    );
  }
  if (!incident) return <div className="mx-auto mt-24 h-96 w-full max-w-[1240px] animate-pulse rounded-card bg-divider" aria-label="Memuat…" />;

  const evidence = incident.evidence ?? [];
  const comp = incident.completeness!;
  const warn = (bad: boolean) => (showWarnings && bad ? REQUIRED : null);
  const w = {
    transferAt: warn(!incident.transferAt),
    amount: warn(!incident.amount),
    recipientBank: warn(!incident.recipientBank),
    recipientAccount: warn(!incident.recipientAccount),
    chronology: showWarnings && (incident.chronology?.trim().length ?? 0) < 30
      ? (incident.chronology?.trim() ? 'Kronologi minimal 30 karakter.' : REQUIRED) : null,
  };
  const accountInvalid = !!incident.recipientAccount && !/^[a-z0-9]{6,20}$/i.test(incident.recipientAccount.replace(/[\s-]/g, ''));

  const applyOcr = () => {
    if (!ocr) return;
    const f = ocr.fields;
    const candidate: IncidentPatch = {};
    if (f.amount) candidate.amount = f.amount;
    if (f.date) candidate.transferAt = fromLocalInput(`${f.date}T${f.time ?? '00:00'}`);
    if (f.account) candidate.recipientAccount = f.account;
    if (f.name) candidate.recipientName = f.name;
    if (f.bank) candidate.recipientBank = f.bank;
    const fill: IncidentPatch = {};
    const replace: IncidentPatch = {};
    const diffs: string[] = [];
    const names: Record<string, string> = { amount: 'Nominal', transferAt: 'Waktu transfer', recipientAccount: 'Rekening', recipientName: 'Nama penerima', recipientBank: 'Bank' };
    for (const [k, v] of Object.entries(candidate) as [keyof IncidentPatch, never][]) {
      const cur = incident[k as keyof Incident];
      if (cur === null || cur === undefined || cur === '') (fill as Record<string, unknown>)[k] = v;
      else if (String(cur) !== String(v) && !(k === 'transferAt' && new Date(String(cur)).getTime() === new Date(String(v)).getTime())) {
        (replace as Record<string, unknown>)[k] = v;
        const show = (x: unknown) => (k === 'amount' ? formatRupiah(Number(x)) : k === 'transferAt' ? `${formatDate(String(x))} ${formatTime(String(x))}` : String(x));
        diffs.push(`${names[k]}: ${show(cur)} → ${show(v)}`);
      }
    }
    // Hanya mengisi field kosong; field yang sudah diisi tidak ditimpa tanpa konfirmasi (AC-08.4).
    if (Object.keys(fill).length) update(fill);
    if (diffs.length) setOverwrite({ patch: replace, diffs });
    else toast(Object.keys(fill).length ? 'Data dari gambar sudah diisikan.' : 'Isian formulir sudah sesuai.');
  };

  const removeEvidence = async (e: Evidence) => {
    try {
      if (e.id.startsWith('local-')) localFiles.delete(e.id);
      else await api.deleteEvidence(e.id);
      setEvidence((list) => list.filter((x) => x.id !== e.id));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Terjadi kendala. Coba lagi sebentar lagi.');
    }
  };

  const changeCategory = async (e: Evidence, category: EvidenceCategory) => {
    setEvidence((list) => list.map((x) => (x.id === e.id ? { ...x, category } : x)));
    if (!e.id.startsWith('local-')) await api.patchEvidence(e.id, category).catch(() => toast('Terjadi kendala. Coba lagi sebentar lagi.'));
  };

  const download = async () => {
    setConfirmIncomplete(false);
    setGenerating(true);
    try {
      await flush();
      const files: PackFile[] = await Promise.all(
        evidence.map(async (e) => {
          let blob = localFiles.get(e.id);
          if (!blob && !e.id.startsWith('local-')) blob = await fetchEvidenceBlob(e).catch(() => undefined);
          return { meta: e, blob };
        }),
      );
      const pdf = await generateEvidencePack(incident, files);
      const url = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = packFileName(incident);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      const props = { completeness: `${comp.done}/${comp.total}`, files: evidence.length };
      if (local) void api.track('evidence_pack_generated', props);
      else await api.packGenerated(incident.id, props).catch(() => {});
      update({ checklist: { downloadedPack: true } });
      toast('Evidence Pack berhasil diunduh.');
    } catch (e) {
      console.error(e);
      toast('Terjadi kendala saat membuat PDF. Coba lagi.');
    } finally {
      setGenerating(false);
    }
  };

  const missing = comp.items.filter((x) => !x.done).map((x) => x.label);
  const pendingTransfer = uploads.some((u) => u.status === 'ocr');

  return (
    <>
      <Header crumbs={[{ label: 'Beranda', href: '/' }, { label: 'Mode Darurat', href: `/darurat/${incident.id}` }, { label: 'Evidence Pack' }]} />
      <OfflineBanner show={save === 'offline' && !local} />
      {local && (
        <div role="status" className="border-b border-medium-border bg-medium-bg px-4 py-2 text-center text-[13px] font-medium text-medium-text">
          Server tidak dapat dihubungi. Data dan bukti hanya tersimpan sementara di perangkat ini — unduh PDF sebelum menutup halaman.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-16 pt-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">Evidence Pack Generator</h1>
            <p className="mt-1 max-w-[720px] text-[16px] text-ink-2">Susun kronologi dan bukti transaksi untuk dilaporkan ke bank, e-wallet, dan IASC.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-btn border border-line bg-white px-3.5 py-2 text-[13.5px] text-ink-2 shadow-card">
            <Lock className="h-4 w-4 text-primary" aria-hidden /> Hanya dapat diakses dari perangkat Anda
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-start gap-6">
          {/* Kolom kiri */}
          <div ref={formRef} className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-8" aria-labelledby="data-title">
              <div className="flex items-start justify-between gap-3 border-b border-divider pb-4">
                <div>
                  <h2 id="data-title" className="text-[20px] font-bold">Data transaksi</h2>
                  <p className="mt-0.5 text-[14px] text-ink-3">Isi sesuai yang tertera pada mutasi atau bukti transfer.</p>
                </div>
                <span className="shrink-0 text-[12.5px] text-ink-3" aria-live="polite">
                  {save === 'saving' ? <span className="flex items-center gap-1.5"><Spinner /> Menyimpan…</span> : save === 'saved' ? 'Tersimpan' : save === 'error' ? <span className="text-medium-text">{saveError}</span> : ''}
                </span>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field id="transferAt" label="Waktu transfer" required hint="Sesuai jam pada mutasi/resi." warning={w.transferAt}>
                  <input id="transferAt" type="datetime-local" className={inputClass(!!w.transferAt)} value={toLocalInput(incident.transferAt)}
                    max={toLocalInput(new Date().toISOString())} aria-describedby="transferAt-msg"
                    onChange={(e) => {
                      const iso = fromLocalInput(e.target.value);
                      if (iso && new Date(iso).getTime() > Date.now() + 60_000) return toast('Waktu transfer tidak boleh di masa depan.');
                      update({ transferAt: iso });
                    }} />
                </Field>
                <Field id="amount" label="Nominal transfer" required hint="Total dana yang telah dikirim." warning={w.amount}>
                  <MoneyInput id="amount" value={incident.amount} warn={!!w.amount} describedBy="amount-msg" onChange={(v) => update({ amount: v })} />
                </Field>
                <Field id="recipientBank" label="Bank / e-wallet penerima" required warning={w.recipientBank}>
                  <input id="recipientBank" list="banks" className={inputClass(!!w.recipientBank)} value={incident.recipientBank ?? ''} placeholder="Pilih atau ketik"
                    aria-describedby="recipientBank-msg" onChange={(e) => update({ recipientBank: e.target.value })} />
                  <datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
                </Field>
                <Field id="recipientAccount" label="Nomor rekening / akun penerima" required
                  warning={w.recipientAccount ?? (accountInvalid ? 'Nomor rekening/akun 6–20 karakter huruf atau angka.' : null)}>
                  <input id="recipientAccount" className={inputClass(!!w.recipientAccount || accountInvalid)} value={incident.recipientAccount ?? ''} inputMode="numeric"
                    aria-describedby="recipientAccount-msg" maxLength={24} onChange={(e) => update({ recipientAccount: e.target.value })} />
                </Field>
                <Field id="recipientName" label="Nama pemilik rekening">
                  <input id="recipientName" className={inputClass()} value={incident.recipientName ?? ''} onChange={(e) => update({ recipientName: e.target.value })} />
                </Field>
                <Field id="related" label="Tautan / akun terkait" hint="Pisahkan dengan koma.">
                  <input id="related" className={inputClass()} placeholder="mis. investasi-cuan88.xyz, @admin_cuan"
                    value={relatedText ?? (incident.relatedAccounts ?? []).join(', ')}
                    onChange={(e) => {
                      setRelatedText(e.target.value);
                      update({ relatedAccounts: e.target.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20) });
                    }} />
                </Field>
                <Field id="contactChannel" label="Media kontak pertama">
                  <select id="contactChannel" className={inputClass()} value={incident.contactChannel ?? ''} onChange={(e) => update({ contactChannel: e.target.value || null })}>
                    <option value="">Pilih…</option>
                    {CONTACT_CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field id="scamType" label="Jenis modus">
                  <select id="scamType" className={inputClass()} value={incident.scamType ?? ''} onChange={(e) => update({ scamType: e.target.value || null })}>
                    <option value="">Pilih…</option>
                    {SCAM_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
              </div>
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-8" aria-labelledby="bukti-title">
              <h2 id="bukti-title" className="text-[20px] font-bold">Bukti</h2>
              <p className="mt-0.5 text-[14px] text-ink-3">JPG, PNG, WEBP, atau PDF · maks. 10 MB per file · maks. {MAX_FILES} file ({evidence.length + uploads.length}/{MAX_FILES}).</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Dropzone id="drop-transfer" title="Bukti transfer" subtitle="Struk / m-banking. Gambar dibaca otomatis."
                  icon={<Upload className="h-5 w-5" aria-hidden />} onFiles={(f) => void addFiles(f, 'transfer')} />
                <Dropzone id="drop-chat" title="Screenshot percakapan" subtitle="Chat & profil akun terkait."
                  icon={<ImageIcon className="h-5 w-5" aria-hidden />} onFiles={(f) => void addFiles(f, 'chat')} />
              </div>

              {(ocr || pendingTransfer) && (
                <div className="mt-5">
                  {ocr ? <OcrResultBox fields={ocr.fields} confidence={ocr.confidence} onApply={applyOcr} />
                    : <p className="flex items-center gap-2 text-[14px] text-ink-2"><Spinner /> Membaca gambar…</p>}
                </div>
              )}

              {(evidence.length > 0 || uploads.length > 0) && (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {evidence.map((e) => (
                    <EvidenceFileCard key={e.id} name={e.fileName} size={e.size} mime={e.mime} previewUrl={previews[e.id]} category={e.category}
                      status="done" onCategory={(c) => void changeCategory(e, c)} onRemove={() => void removeEvidence(e)} />
                  ))}
                  {uploads.map((u) => (
                    <EvidenceFileCard key={u.key} name={u.file.name} size={u.file.size} mime={u.file.type} previewUrl={u.previewUrl} category={u.category}
                      status={u.status} progress={u.progress} ocrPct={u.ocrPct} error={u.error}
                      onCategory={(c) => patchItem(u.key, { category: c })}
                      onRemove={() => setUploads((xs) => xs.filter((x) => x.key !== u.key))} onRetry={() => void upload(u)} />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-8" aria-labelledby="krono-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="krono-title" className="text-[20px] font-bold">Kronologi <span className="text-high" aria-hidden>*</span></h2>
                  <p className="mt-0.5 text-[14px] text-ink-3">Ceritakan urutan kejadian: kapan dihubungi, lewat apa, apa yang diminta, kapan transfer.</p>
                </div>
                <Button variant="secondary" className="!min-h-[40px] text-[14px]"
                  onClick={() => update({ chronology: incident.chronology?.trim() ? `${incident.chronology.trim()}\n\n${chronologyTemplate(incident)}` : chronologyTemplate(incident) })}>
                  <Sparkles className="h-4 w-4" aria-hidden /> Bantu susun kronologi
                </Button>
              </div>
              <label htmlFor="chronology" className="sr-only">Kronologi kejadian</label>
              <textarea id="chronology" rows={8} maxLength={3000} value={incident.chronology ?? ''} aria-describedby="chronology-msg"
                onChange={(e) => update({ chronology: e.target.value })}
                placeholder="Contoh: 25 Okt 2026 — Dihubungi lewat WhatsApp oleh akun yang menawarkan investasi profit tetap…"
                className={`mt-4 w-full rounded-btn border bg-white px-3.5 py-3 text-[15px] leading-relaxed focus:outline-none focus:ring-2 ${w.chronology ? 'border-medium focus:ring-medium-border' : 'border-inputline focus:border-primary focus:ring-primary-strong'}`} />
              <div className="mt-1 flex justify-between gap-3 text-[12.5px]">
                <p id="chronology-msg" className="font-medium text-medium-text">{w.chronology}</p>
                <p className="shrink-0 text-ink-3">{(incident.chronology ?? '').length}/3.000</p>
              </div>
            </section>
          </div>

          {/* Kolom kanan */}
          <aside className="flex w-full flex-col gap-5 lg:sticky lg:top-[88px] lg:w-[340px] lg:flex-none">
            <CompletenessPanel completeness={comp} />
            <section className="rounded-card border border-line bg-white p-5 shadow-card" aria-labelledby="preview-title">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="preview-title" className="text-[17px] font-bold">Pratinjau dokumen</h2>
                <span className="rounded-md border border-primary-strong bg-primary-soft px-2 py-0.5 text-[11.5px] font-bold text-primary">PDF · A4</span>
              </div>
              <PdfPreview incident={incident} files={evidence.length} />
              <Button className="mt-4 w-full" disabled={generating || uploads.some((u) => u.status !== 'error')}
                onClick={() => (comp.done < comp.total ? setConfirmIncomplete(true) : void download())}>
                {generating ? <><Spinner /> Menyusun PDF…</> : <><Download className="h-4 w-4" aria-hidden /> Unduh Evidence Pack (PDF)</>}
              </Button>
              <Button variant="secondary" className="mt-2.5 w-full"
                onClick={async () => { update({ currentStep: 3 }); await flush(); router.push(`/darurat/${incident.id}`); }}>
                Lanjut lapor ke IASC ↗
              </Button>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                Data dan bukti Anda tersimpan aman dan hanya dapat diakses oleh Anda. Kebenaran isi dokumen tetap menjadi tanggung jawab pelapor.
              </p>
            </section>
            <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center justify-center gap-2 rounded-btn py-2 text-[14px] font-semibold text-high-text hover:bg-high-bg">
              <Trash2 className="h-4 w-4" aria-hidden /> Hapus laporan ini
            </button>
          </aside>
        </div>
        <p className="mx-auto mt-10 max-w-[720px] text-center text-[13px] text-ink-3">
          ScamGuard membantu menyusun bukti dan mengarahkan ke kanal resmi. Keputusan pemblokiran dan pemulihan dana tetap pada lembaga terkait.
        </p>
      </main>
      <Footer />

      <ConfirmDialog open={confirmIncomplete} title="Data belum lengkap"
        message={<>Ada data yang belum lengkap: <strong>{missing.join(', ')}</strong>. Tetap unduh?</>}
        confirmLabel="Tetap unduh" cancelLabel="Lengkapi"
        onConfirm={() => void download()}
        onCancel={() => { setConfirmIncomplete(false); setShowWarnings(true); formRef.current?.scrollIntoView({ behavior: 'smooth' }); }} />

      <ConfirmDialog open={!!overwrite} title="Isian berbeda dengan gambar"
        message={<><p>Beberapa isian Anda berbeda dengan hasil baca gambar:</p><ul className="mt-2 list-disc pl-5">{overwrite?.diffs.map((d) => <li key={d}>{d}</li>)}</ul><p className="mt-2">Ganti dengan hasil dari gambar?</p></>}
        confirmLabel="Ganti" cancelLabel="Biarkan"
        onConfirm={() => { if (overwrite) update(overwrite.patch); setOverwrite(null); }}
        onCancel={() => setOverwrite(null)} />

      <ConfirmDialog open={confirmDelete} danger title="Hapus laporan ini?"
        message="Laporan, kronologi, dan semua bukti yang diunggah akan dihapus permanen dari server. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus permanen" cancelLabel="Batal"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            if (!local) await api.deleteIncident(incident.id);
            clearIncidentBackup(incident.id);
            toast('Laporan dihapus.');
            router.push('/riwayat');
          } catch (e) {
            setConfirmDelete(false);
            toast(e instanceof Error ? e.message : 'Terjadi kendala. Coba lagi sebentar lagi.');
          }
        }} />
    </>
  );
}
