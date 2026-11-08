'use client';
// Evidence Pack Generator (KF-06 s.d. KF-09, PRD 8.7).
import { BANKS, CONTACT_CHANNELS, SCAM_TYPES, type Evidence, type EvidenceCategory, type Incident } from '@scamguard/shared';
import { Check, CheckCircle2, Download, FileText, Image as ImageIcon, Link2, Pencil, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, api, fetchEvidenceBlob, uploadEvidence } from '@/lib/api';
import { extractFields, type Extracted } from '@/lib/extract';
import { IASC_URL } from '@/lib/config';
import { formatBytes, formatDate, formatRupiah, formatTime, fromLocalInput, toLocalInput } from '@/lib/format';
import { localFiles } from '@/lib/localFiles';
import { OcrTimeoutError, recognize } from '@/lib/ocr';
import { generateEvidencePack, packFileName, type PackFile } from '@/lib/pdf';
import { clearIncidentBackup, useIncident, type IncidentPatch } from '@/lib/useIncident';
import { Footer, Header } from '../Header';
import { Button, ConfirmDialog, Field, OfflineBanner, Spinner, inputClass, useToast } from '../ui';
import { Dropzone, MAX_BYTES, rejectReason } from './Dropzone';
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
  const [agreed, setAgreed] = useState(false);
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

  const chip = (key: string, name: string, size: number, state: 'done' | 'busy' | 'error', onRemove: () => void, extra?: ReactNode) => (
    <span key={key} className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] ${
      state === 'error' ? 'border-medium-border bg-medium-bg text-medium-text' : 'border-low-border bg-low-bg text-low-text'}`}>
      {state === 'busy' ? <Spinner className="!h-3 !w-3" /> : state === 'done' ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      <span className="truncate" title={name}>{name}</span>
      <span className="shrink-0 text-ink-3">({formatBytes(size)})</span>
      {extra}
      <button type="button" onClick={onRemove} aria-label={`Hapus ${name}`} className="-mr-1 shrink-0 rounded p-0.5 text-ink-3 hover:bg-white hover:text-ink"><X className="h-3.5 w-3.5" /></button>
    </span>
  );

  const zoneFiles = (zone: 'transfer' | 'chat') => {
    const inZone = (c: EvidenceCategory) => (zone === 'transfer' ? c === 'transfer' : c !== 'transfer');
    return [
      ...evidence.filter((e) => inZone(e.category)).map((e) => chip(e.id, e.fileName, e.size, 'done', () => void removeEvidence(e))),
      ...uploads.filter((u) => inZone(u.category)).map((u) =>
        chip(u.key, u.file.name, u.file.size, u.status === 'error' ? 'error' : 'busy', () => setUploads((xs) => xs.filter((x) => x.key !== u.key)),
          u.status === 'error' ? <button type="button" onClick={() => void upload(u)} className="shrink-0 font-bold text-primary">Coba lagi</button>
            : u.status === 'ocr' ? <span className="shrink-0 text-ink-3">membaca {u.ocrPct}%</span> : <span className="shrink-0 text-ink-3">{u.progress}%</span>)),
    ];
  };

  const busy = generating || uploads.some((u) => u.status !== 'error');
  const requestDownload = () => {
    if (!agreed) {
      toast('Centang pernyataan kebenaran data terlebih dahulu.');
      return;
    }
    if (comp.done < comp.total) setConfirmIncomplete(true);
    else void download();
  };

  return (
    <>
      <Header crumbs={[{ label: 'Beranda', href: '/' }, { label: 'Mode Darurat', href: `/darurat/${incident.id}` }, { label: 'Evidence Pack' }]} />
      <OfflineBanner show={save === 'offline' && !local} />
      {local && (
        <div role="status" className="border-b border-medium-border bg-medium-bg px-4 py-2 text-center text-[13px] font-medium text-medium-text">
          Server tidak dapat dihubungi. Data dan bukti hanya tersimpan sementara di perangkat ini — unduh PDF sebelum menutup halaman.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-16 pt-12 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">Evidence Pack Generator</h1>
            <p className="mt-1 max-w-[900px] text-[16px] text-ink-2">Susun berkas kronologi dan bukti transaksi untuk dilaporkan ke bank, e-wallet, dan kanal IASC.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-btn border border-line bg-white px-4 py-2.5 text-[13.5px] text-ink-2 shadow-card">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Hanya dapat diakses dari perangkat Anda
          </span>
        </div>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)]">
          {/* Kolom kiri — Lengkapi Informasi Kejadian */}
          <section ref={formRef} className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8" aria-labelledby="data-title">
            <div className="flex items-start justify-between gap-3 border-b border-divider pb-5">
              <div>
                <h2 id="data-title" className="text-[21px] font-bold">Lengkapi Informasi Kejadian</h2>
                <p className="mt-1 text-[14px] text-ink-3">Isi rincian transaksi dengan teliti. Format ini disesuaikan dengan standar pelaporan perbankan.</p>
              </div>
              <span className="shrink-0 text-[12.5px] text-ink-3" aria-live="polite">
                {save === 'saving' ? <span className="flex items-center gap-1.5"><Spinner /> Menyimpan…</span> : save === 'saved' ? 'Tersimpan' : save === 'error' ? <span className="text-medium-text">{saveError}</span> : ''}
              </span>
            </div>

            <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field id="transferAt" label="Waktu Transfer" required hint="Sesuai jam tertera pada mutasi/resi." warning={w.transferAt}>
                <input id="transferAt" type="datetime-local" className={inputClass(!!w.transferAt)} value={toLocalInput(incident.transferAt)}
                  max={toLocalInput(new Date().toISOString())} aria-describedby="transferAt-msg"
                  onChange={(e) => {
                    const iso = fromLocalInput(e.target.value);
                    if (iso && new Date(iso).getTime() > Date.now() + 60_000) return toast('Waktu transfer tidak boleh di masa depan.');
                    update({ transferAt: iso });
                  }} />
              </Field>
              <Field id="amount" label="Nominal Transfer" required hint="Total dana yang telah dikirim." warning={w.amount}>
                <MoneyInput id="amount" value={incident.amount} warn={!!w.amount} describedBy="amount-msg" onChange={(v) => update({ amount: v })} />
              </Field>
              <Field id="recipientBank" label="Metode Pembayaran" required warning={w.recipientBank}>
                <div className="relative">
                  <input id="recipientBank" list="banks" className={`${inputClass(!!w.recipientBank)} pr-10`} value={incident.recipientBank ?? ''} placeholder="Bank Transfer (BCA/Mandiri/BRI/dll)"
                    aria-describedby="recipientBank-msg" onChange={(e) => update({ recipientBank: e.target.value })} />
                  <Pencil className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
                </div>
                <datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
              </Field>
              <Field id="recipientAccount" label="Nomor Rekening / E-Wallet Penerima" required
                warning={w.recipientAccount ?? (accountInvalid ? 'Nomor rekening/akun 6–20 karakter huruf atau angka.' : null)}>
                <input id="recipientAccount" className={inputClass(!!w.recipientAccount || accountInvalid)} value={incident.recipientAccount ?? ''} inputMode="numeric"
                  placeholder="Contoh: 8820194829" aria-describedby="recipientAccount-msg" maxLength={24} onChange={(e) => update({ recipientAccount: e.target.value })} />
              </Field>
              <Field id="recipientName" label="Nama Pemilik Rekening">
                <input id="recipientName" className={inputClass()} value={incident.recipientName ?? ''} placeholder="a/n penerima" onChange={(e) => update({ recipientName: e.target.value })} />
              </Field>
              <Field id="related" label="Nomor / Akun Pelaku" hint="Pisahkan dengan koma.">
                <input id="related" className={inputClass()} placeholder="mis. 0812xxxx, @admin_cuan"
                  value={relatedText ?? (incident.relatedAccounts ?? []).join(', ')}
                  onChange={(e) => {
                    setRelatedText(e.target.value);
                    update({ relatedAccounts: e.target.value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20) });
                  }} />
              </Field>
              <Field id="contactChannel" label="Media Kontak Pertama">
                <select id="contactChannel" className={inputClass()} value={incident.contactChannel ?? ''} onChange={(e) => update({ contactChannel: e.target.value || null })}>
                  <option value="">Pilih…</option>
                  {CONTACT_CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field id="scamType" label="Jenis Modus">
                <select id="scamType" className={inputClass()} value={incident.scamType ?? ''} onChange={(e) => update({ scamType: e.target.value || null })}>
                  <option value="">Pilih…</option>
                  {SCAM_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
            </div>

            {/* Kronologi */}
            <div className="mt-6">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="chronology" className="text-[14px] font-semibold">Kronologi Kejadian <span className="text-high" aria-hidden>*</span></label>
                <button type="button" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
                  onClick={() => update({ chronology: incident.chronology?.trim() ? `${incident.chronology.trim()}\n\n${chronologyTemplate(incident)}` : chronologyTemplate(incident) })}>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Bantu susun · ringkas &amp; kronologis
                </button>
              </div>
              <textarea id="chronology" rows={5} maxLength={3000} value={incident.chronology ?? ''} aria-describedby="chronology-msg"
                onChange={(e) => update({ chronology: e.target.value })}
                placeholder="Contoh: Dihubungi melalui grup Telegram penawaran investasi dengan iming-iming komisi 30%…"
                className={`w-full rounded-btn border bg-white px-4 py-3 text-[15px] leading-relaxed focus:outline-none focus:ring-2 ${w.chronology ? 'border-medium focus:ring-medium-border' : 'border-inputline focus:border-primary focus:ring-primary-strong'}`} />
              <div className="mt-1 flex justify-between gap-3 text-[12.5px]">
                <p id="chronology-msg" className="font-medium text-medium-text">{w.chronology}</p>
                <p className="shrink-0 text-ink-3">{(incident.chronology ?? '').length}/3.000</p>
              </div>
            </div>

            {/* Unggah bukti */}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[14px] font-semibold">Unggah Bukti Transfer <span className="text-high" aria-hidden>*</span></span>
                <Dropzone id="drop-transfer" title="Bukti Transfer (Struk / M-Banking)" subtitle=""
                  icon={<Upload className="h-4 w-4" aria-hidden />} onFiles={(f) => void addFiles(f, 'transfer')}>
                  {zoneFiles('transfer')}
                </Dropzone>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[14px] font-semibold">Unggah Screenshot Percakapan <span className="text-high" aria-hidden>*</span></span>
                <Dropzone id="drop-chat" title="Chat & Nomor Pelaku" subtitle=""
                  icon={<ImageIcon className="h-4 w-4" aria-hidden />} onFiles={(f) => void addFiles(f, 'chat')}>
                  {zoneFiles('chat')}
                </Dropzone>
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-3">JPG, PNG, WEBP, atau PDF · maks. 10 MB per file · {evidence.length + uploads.length}/{MAX_FILES} file.</p>

            {(ocr || pendingTransfer) && (
              <div className="mt-5">
                {ocr ? <OcrResultBox fields={ocr.fields} confidence={ocr.confidence} onApply={applyOcr} />
                  : <p className="flex items-center gap-2 text-[14px] text-ink-2"><Spinner /> Membaca gambar…</p>}
              </div>
            )}

            <label className="mt-7 flex cursor-pointer items-start gap-3 text-[14px] text-ink-2">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded accent-[#0F766E]" />
              Saya menyatakan data ini benar dan dapat dipertanggungjawabkan.
            </label>

            <Button className="mt-6 h-12 w-full" disabled={busy} onClick={requestDownload}>
              {generating ? <><Spinner /> Menyusun PDF…</> : <><FileText className="h-4 w-4" aria-hidden /> Buat Evidence Pack</>}
            </Button>
          </section>

          {/* Kolom kanan — Pratinjau Dokumen */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[92px]">
            <section className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8" aria-labelledby="preview-title">
              <div className="flex items-start justify-between gap-3 border-b border-divider pb-5">
                <div>
                  <h2 id="preview-title" className="text-[21px] font-bold">Pratinjau Dokumen</h2>
                  <p className="mt-1 text-[14px] text-ink-3">Format resmi siap cetak &amp; kirim</p>
                </div>
                <span className="rounded-md border border-primary-strong bg-primary-soft px-2.5 py-1 text-[12px] font-bold text-primary">PDF • A4</span>
              </div>
              <div className="mt-6"><PdfPreview incident={incident} evidence={evidence} /></div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button className="h-12 w-full whitespace-nowrap !px-3 !text-[14px]" disabled={busy} onClick={requestDownload}>
                  {generating ? <Spinner /> : <Download className="h-4 w-4" aria-hidden />} Unduh PDF
                </Button>
                <Button variant="secondary" className="h-12 w-full whitespace-nowrap !px-3 !text-[14px]"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(IASC_URL);
                      toast('Tautan IASC disalin.');
                    } catch {
                      toast(IASC_URL);
                    }
                  }}>
                  <Link2 className="h-4 w-4" aria-hidden /> Salin Tautan ke IASC
                </Button>
              </div>
              <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-ink-3">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Berkas siap dilampirkan langsung ke customer service bank
              </p>
            </section>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px]">
              <button type="button" className="font-semibold text-primary hover:underline"
                onClick={async () => { update({ currentStep: 3 }); await flush(); router.push(`/darurat/${incident.id}`); }}>
                Lapor ke IASC dengan Co-Pilot →
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 font-semibold text-high-text hover:underline">
                <Trash2 className="h-4 w-4" aria-hidden /> Hapus laporan
              </button>
            </div>
          </aside>
        </div>
        <p className="mx-auto mt-12 max-w-[760px] text-center text-[14px] leading-relaxed text-ink-2">
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
