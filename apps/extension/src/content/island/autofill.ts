// Smart Autofill Engine untuk portal IASC OJK (PRD 5 / KF-ISLAND-04 & KF-ISLAND-05)
//
// Dipetakan ke struktur form live https://iasc.ojk.go.id/Guest/LaporanV2:
// - Step 2: data terlapor & sumber penipuan diisi lewat MODAL Bootstrap (+ tombol "Simpan" milik IASC).
// - Step 3: waktu kejadian memakai flatpickr (format "Y-m-d H:i"), kronologi maks 4000 karakter,
//           bukti pendukung kejadian WAJIB (maks 2MB).
// - Step 4: form utama = rekening KORBAN (diisi user). Rekening pelaku + transaksi ada di modal
//           "Tambah Penyelenggara Terlapor" (select2 kategori → lembaga via AJAX, flatpickr "Y-m-d H:i:S",
//           maskMoney ".", bukti maks 5MB).
// - Step 5: CAPTCHA & persetujuan sengaja TIDAK diisi (Non-Goal PRD 2.2).
// Halaman simulasi /demo/iasc-portal meniru nama/id field yang sama.
import type { ReportingSession } from '@scamguard/shared';
import { send, type PageSetOp } from '../../lib/messaging';

export type AutofillAction = 'terlapor' | 'sumber' | 'kejadian' | 'transaksi' | 'evidence' | 'captcha';

export interface AutofillResult {
  ok: boolean;
  filledFields: string[];
  /** Field yang masih perlu diisi/diperiksa user sendiri. */
  pending: string[];
  attachedFile?: boolean;
  message: string;
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const MB = 1024 * 1024;
const KRONOLOGI_MAX = 4000;

/* ------------------------------------------------------------------ */
/* Deteksi langkah                                                      */
/* ------------------------------------------------------------------ */

/** Deteksi langkah formulir IASC yang aktif (1 s/d 5). Form ID diprioritaskan karena
 *  IASC menampilkan Step 1 untuk `?step=5` bila sesi belum ada. */
export function detectCurrentStep(): number {
  for (const n of [5, 4, 3, 2, 1]) {
    if (document.getElementById(`form-scam-step${n}`)) return n;
  }
  const stepParam = new URLSearchParams(window.location.search).get('step');
  if (stepParam && /^[1-5]$/.test(stepParam)) return parseInt(stepParam, 10);
  return 1;
}

/* ------------------------------------------------------------------ */
/* Helper DOM                                                           */
/* ------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Set value lewat setter prototype agar terdeteksi juga oleh framework (React di halaman demo). */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

/** Memicu event reaktif (AC-04.1) + keyup untuk maskMoney & counter kronologi (AC-04.3). */
export function triggerReactiveEvents(element: HTMLElement): void {
  for (const type of ['input', 'keyup', 'change']) {
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }
  element.dispatchEvent(new Event('blur', { bubbles: false }));
}

/** Elemen yang benar-benar terlihat user (alt input flatpickr / tampilan select2). */
function visualTarget(el: HTMLElement): HTMLElement {
  if (el instanceof HTMLSelectElement) {
    const s2 = el.nextElementSibling;
    if (s2 instanceof HTMLElement && s2.classList.contains('select2')) {
      return s2.querySelector<HTMLElement>('.select2-selection') ?? s2;
    }
  }
  if (el instanceof HTMLInputElement && el.type === 'hidden') {
    const alt = el.nextElementSibling;
    if (alt instanceof HTMLInputElement) return alt;
  }
  return el;
}

/** Highlight hijau 2 detik (AC-04.4). */
export function highlightField(element: HTMLElement): void {
  const el = visualTarget(element);
  const prev = { t: el.style.transition, s: el.style.boxShadow, b: el.style.borderColor };
  el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
  el.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.4)';
  el.style.borderColor = '#10B981';
  window.setTimeout(() => {
    el.style.boxShadow = prev.s;
    el.style.borderColor = prev.b;
    el.style.transition = prev.t;
  }, 2000);
}

function isVisible(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
}

/** Cari elemen dengan beberapa selector (nama field IASC dulu, lalu fallback). */
export function findInput(selectors: string[], root: ParentNode = document): Field | null {
  for (const s of selectors) {
    const el = root.querySelector<Field>(s);
    if (el) return el;
  }
  return null;
}

/** Fallback heuristik: cari kontrol berdasarkan teks label di sekitarnya (FAQ PRD 8). */
function findByLabel(pattern: RegExp, root: ParentNode = document, tag = 'input, textarea, select'): Field | null {
  for (const label of Array.from(root.querySelectorAll('label'))) {
    if (!pattern.test(label.textContent ?? '')) continue;
    const forId = label.getAttribute('for');
    if (forId) {
      const el = document.getElementById(forId);
      if (el && el.matches(tag)) return el as Field;
    }
    const scope = label.closest('.col, [class*="col-"], .form-group, .mb-3, div');
    const el = scope?.querySelector<Field>(tag);
    if (el && !(el instanceof HTMLInputElement && el.type === 'file')) return el;
  }
  return null;
}

async function waitFor<T extends Element>(fn: () => T | null, timeoutMs = 4000, intervalMs = 100): Promise<T | null> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await sleep(intervalMs);
  }
  return fn();
}

/** Buka modal Bootstrap IASC lewat tombol pemicunya, tunggu sampai tampil. */
async function openModal(modalId: string): Promise<HTMLElement | null> {
  const modal = () => {
    const el = document.getElementById(modalId);
    return el && el.classList.contains('show') ? el : null;
  };
  if (modal()) return modal();
  const trigger = document.querySelector<HTMLElement>(`[data-bs-target="#${modalId}"], [data-target="#${modalId}"]`);
  if (!trigger) return null;
  trigger.click();
  const opened = await waitFor(modal, 3000);
  // Tunggu transisi fade + handler `shown.bs.modal` IASC (mis. re-init flatpickr) selesai.
  if (opened) await sleep(450);
  return opened;
}

/** Jalankan operasi di MAIN world (flatpickr / jQuery-select2 milik halaman). */
async function pageSet(ops: PageSetOp[]): Promise<boolean[]> {
  try {
    const res = await send({ type: 'PAGE_SET', ops });
    return res?.results ?? ops.map(() => false);
  } catch {
    return ops.map(() => false);
  }
}

/** Selector unik untuk dikirim ke MAIN world. */
function selectorFor(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = el.getAttribute('name');
  if (name) return `${el.tagName.toLowerCase()}[name="${name.replace(/"/g, '\\"')}"]`;
  return '';
}

function setText(el: Field | null, value: string): boolean {
  if (!el || el instanceof HTMLSelectElement) return false;
  setNativeValue(el, value);
  triggerReactiveEvents(el);
  highlightField(el);
  return true;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
}

/** Pilih option terbaik berdasarkan kandidat teks/value (case-insensitive). */
function pickOption(select: HTMLSelectElement, candidates: string[]): HTMLOptionElement | null {
  let best: { opt: HTMLOptionElement; score: number } | null = null;
  for (const opt of Array.from(select.options)) {
    if (!opt.value || opt.disabled) continue;
    const text = norm(opt.textContent ?? '');
    const value = norm(opt.value);
    candidates.forEach((raw, idx) => {
      const c = norm(raw);
      if (!c) return;
      let score = 0;
      if (text === c || value === c) score = 100;
      else if (new RegExp(`(^| )${c.replace(/[+]/g, '\\+')}( |$)`).test(text)) score = 70 - Math.min(text.length, 60) / 3;
      else if (text.includes(c)) score = 40 - Math.min(text.length, 60) / 3;
      if (score <= 0) return;
      score -= idx; // kandidat awal lebih diutamakan
      if (!best || score > best.score) best = { opt, score };
    });
  }
  return (best as { opt: HTMLOptionElement; score: number } | null)?.opt ?? null;
}

/** Set nilai <select> (native atau select2) — AC-04.2. */
async function setSelect(select: HTMLSelectElement | null, candidates: string[]): Promise<boolean> {
  if (!select) return false;
  const opt = pickOption(select, candidates);
  if (!opt) return false;
  const isSelect2 = select.classList.contains('select2-hidden-accessible');
  let done = false;
  if (isSelect2) {
    const sel = selectorFor(select);
    if (sel) [done] = await pageSet([{ kind: 'select2', selector: sel, value: opt.value }]);
  }
  if (!done) {
    select.value = opt.value;
    // jQuery/select2 mendengar event native, jadi `change` biasa ikut memperbarui tampilan select2.
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
  }
  highlightField(select);
  return true;
}

/** Set tanggal (flatpickr di IASC asli; input teks biasa di halaman demo). */
async function setDate(el: Field | null, value: string): Promise<boolean> {
  if (!el || el instanceof HTMLSelectElement) return false;
  const sel = selectorFor(el);
  const isFlatpickr = el.classList.contains('flatpickr-input');
  if (isFlatpickr && sel) {
    const [ok] = await pageSet([{ kind: 'flatpickr', selector: sel, value }]);
    if (ok) {
      highlightField(el);
      return true;
    }
  }
  return setText(el, value);
}

/* ------------------------------------------------------------------ */
/* Format data                                                          */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD HH:mm[:ss]" waktu lokal, dibatasi ≤ sekarang (flatpickr IASC memakai maxDate: now). */
export function formatLocalDateTime(iso: string | undefined, withSeconds: boolean): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const d = parsed.getTime() > Date.now() ? new Date() : parsed;
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
}

/** Nomor telepon? (bukan username/link). */
export function isPhoneLike(v: string | undefined): v is string {
  return !!v && /^[+\d\s().-]+$/.test(v) && v.replace(/\D/g, '').length >= 8;
}

/** Format nomor untuk IASC: digit saja, tanpa awalan 62/0 (kode negara dipilih terpisah), maks 13. */
export function normalizePhone(v: string): string {
  let digits = v.replace(/\D/g, '');
  if (digits.startsWith('62')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 13);
}

/**
 * IASC hanya menerima kronologi alfanumerik + tanda baca dasar. Karakter lain (emoji, kutip tipografis,
 * "—", "•", "@", ":", dst.) diubah ke padanan aman atau dibuang, baris baru dipertahankan.
 */
export function sanitizeIascText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // aksen: é → e
    .replace(/[–—−]/g, '-')
    .replace(/[•·▪●◦]/g, '-')
    .replace(/…/g, '...')
    .replace(/&/g, ' dan ')
    .replace(/%/g, ' persen')
    .replace(/(\d):(\d)/g, '$1.$2') // 14:05 → 14.05
    .replace(/[:;!?]/g, '.')
    .replace(/[^A-Za-z0-9 .,\-/()\n]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\.{4,}/g, '...')
    .trim();
}

const EWALLETS =['dana', 'ovo', 'gopay', 'shopeepay', 'linkaja', 'doku', 'isaku', 'sakuku'];

const BANK_ALIASES: Record<string, string[]> = {
  bca: ['BCA', 'Bank Central Asia'],
  bri: ['BRI', 'Bank Rakyat Indonesia'],
  bni: ['BNI', 'Bank Negara Indonesia'],
  mandiri: ['Bank Mandiri', 'Mandiri'],
  bsi: ['Bank Syariah Indonesia', 'BSI'],
  btn: ['BTN', 'Bank Tabungan Negara'],
  'cimb niaga': ['CIMB Niaga', 'CIMB'],
  permata: ['Bank Permata', 'Permata'],
  danamon: ['Bank Danamon', 'Danamon'],
  ocbc: ['OCBC', 'OCBC NISP'],
  'bank jago': ['Bank Jago', 'Jago'],
  seabank: ['SeaBank', 'Bank Seabank'],
  dana: ['DANA'],
  ovo: ['OVO'],
  gopay: ['GoPay', 'Gojek'],
  shopeepay: ['ShopeePay'],
  linkaja: ['LinkAja'],
};

function bankCandidates(bankName: string): string[] {
  const key = norm(bankName);
  return [...(BANK_ALIASES[key] ?? []), bankName];
}

function isEwallet(bankName: string): boolean {
  return EWALLETS.includes(norm(bankName).replace(/ /g, ''));
}

function sumberCandidates(platform: string | undefined): string[] {
  const p = norm(platform ?? '');
  if (p.includes('instagram')) return ['Instagram'];
  if (p.includes('tiktok')) return ['Tiktok', 'TikTok'];
  if (p.includes('tokopedia')) return ['Tokopedia'];
  if (p.includes('shopee')) return ['Shopee'];
  if (p.includes('situs') || p.includes('web') || p.includes('link')) return ['Website'];
  return ['Media Lainnya', 'Lainnya'];
}

const PLATFORM_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp', telegram: 'Telegram', instagram: 'Instagram', facebook: 'Facebook',
  sms: 'SMS', telepon: 'Telepon', situs: 'Situs web', lainnya: 'Lainnya',
};

/* ------------------------------------------------------------------ */
/* File Evidence Pack (KF-ISLAND-05)                                    */
/* ------------------------------------------------------------------ */

/** Konversi base64 / data URL ke File (AC-05.1). Melempar error bila data kosong/rusak. */
export function base64ToFile(base64: string, fileName: string, mimeType = 'application/pdf'): File {
  const raw = base64.replace(/^data:[^;]+;base64,/, '');
  if (!raw) throw new Error('Evidence Pack kosong');
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], fileName, { type: mimeType, lastModified: Date.now() });
}

export function sessionFile(session: ReportingSession): File | null {
  const ef = session.evidenceFile;
  if (!ef?.base64) return null;
  try {
    return base64ToFile(ef.base64, ef.fileName || 'Evidence_Pack_ScamGuard.pdf', ef.mimeType || 'application/pdf');
  } catch {
    return null;
  }
}

/** Lampirkan file ke input[type=file] via DataTransfer (AC-05.2). */
export function attachFileToInput(input: HTMLInputElement, file: File): boolean {
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    highlightField(input);
    return true;
  } catch (err) {
    console.warn('[ScamGuard Island] Gagal melampirkan file via DataTransfer:', err);
    return false;
  }
}

type AttachOutcome = 'ok' | 'no-input' | 'no-file' | 'too-big' | 'failed';

function attachEvidence(session: ReportingSession, input: HTMLInputElement | null, maxBytes: number): AttachOutcome {
  if (!input) return 'no-input';
  const file = sessionFile(session);
  if (!file) return 'no-file';
  if (file.size > maxBytes) return 'too-big';
  return attachFileToInput(input, file) ? 'ok' : 'failed';
}

function attachNote(outcome: AttachOutcome, maxBytes: number): string {
  switch (outcome) {
    case 'too-big': return `PDF melebihi batas IASC ${maxBytes / MB}MB — unggah versi lebih kecil secara manual.`;
    case 'no-file': return 'PDF Evidence Pack belum tersedia — unduh dari ScamGuard lalu unggah manual.';
    case 'no-input': return 'Kolom unggah bukti tidak ditemukan.';
    case 'failed': return 'Browser menolak lampiran otomatis — gunakan drag chip PDF.';
    default: return '';
  }
}

/* ------------------------------------------------------------------ */
/* Aksi per langkah                                                     */
/* ------------------------------------------------------------------ */

function result(filled: string[], pending: string[], okMsg: string, failMsg: string, extra: string[] = []): AutofillResult {
  const notes = extra.filter(Boolean);
  const ok = filled.length > 0;
  const base = ok ? okMsg : failMsg;
  return { ok, filledFields: filled, pending, message: [base, ...notes].join(' ') };
}

/** Step 2a — modal "Tambah Informasi Terlapor". */
async function fillTerlapor(session: ReportingSession): Promise<AutofillResult> {
  const t = session.target;
  const modal = await openModal('modal-tambah-informasi-terlapor');
  const root: ParentNode = modal ?? document;
  const filled: string[] = [];
  const pending: string[] = [];

  if (isPhoneLike(t.perpetratorPhone)) {
    const kode = findInput(['select[name="kode_nomor_terlapor"]'], root) as HTMLSelectElement | null;
    const digits = t.perpetratorPhone.replace(/\D/g, '');
    const kodeCandidates = digits.startsWith('0') || digits.startsWith('62') ? ['62', '+62', 'Indonesia (+62)', 'Indonesia'] : [];
    if (kodeCandidates.length && (await setSelect(kode, kodeCandidates))) filled.push('Kode Negara (+62)');
    const nomor = findInput(['input[name="nomor_terlapor"]', '#laporanv2-nomor-terlapor'], root) ?? findByLabel(/nomor terlapor/i, root, 'input');
    if (setText(nomor, normalizePhone(t.perpetratorPhone))) filled.push('Nomor Terlapor');
  } else pending.push('Nomor Terlapor');

  const namaTerlaporVal = t.perpetratorName?.trim() || t.accountHolder?.trim() || '';
  const nama = findInput(['input[name="nama_terlapor"]'], root) ?? findByLabel(/nama terlapor/i, root, 'input');
  if (namaTerlaporVal && setText(nama, namaTerlaporVal)) filled.push('Nama Terlapor');
  else pending.push('Nama Terlapor');

  const fileInput = findInput(['input[type="file"][name="file_bukti_komunikasi_terlapor"]'], root) as HTMLInputElement | null;
  const outcome = attachEvidence(session, fileInput, 2 * MB);
  if (outcome === 'ok') filled.push('Bukti Komunikasi (PDF)');
  else pending.push('Bukti Komunikasi');

  if (!modal) pending.unshift('Buka "Tambah Informasi Terlapor"');
  return {
    ...result(filled, pending, 'Info terlapor terisi. Periksa lalu klik "Simpan" di jendela IASC.', 'Form terlapor tidak ditemukan — klik "Tambah Informasi Terlapor" dulu.', [attachNote(outcome, 2 * MB)]),
    attachedFile: outcome === 'ok',
  };
}

/** Step 2b — modal "Tambah Sumber / Media Informasi Penipuan". */
async function fillSumber(session: ReportingSession): Promise<AutofillResult> {
  const t = session.target;
  const modal = await openModal('modal-tambah-sumber-informasi-penipuan');
  const root: ParentNode = modal ?? document;
  const filled: string[] = [];
  const pending: string[] = [];

  const sumber = findInput(['select[name="sumber_informasi_penipuan_id"]'], root) as HTMLSelectElement | null;
  if (await setSelect(sumber, sumberCandidates(t.perpetratorPlatform))) filled.push('Sumber / Media');
  else pending.push('Sumber / Media');

  const platformKey = (t.perpetratorPlatform ?? '').toLowerCase();
  const isPhoneBased = ['whatsapp', 'sms', 'telepon', 'wa', 'call'].some((p) => platformKey.includes(p));
  let detailText = '';
  if (isPhoneBased) {
    // WhatsApp / SMS / Telepon: utamakan nomor HP
    detailText = t.perpetratorPhone || t.perpetratorHandle || '';
  } else {
    // Instagram, Telegram, Facebook, Situs Web, dll: utamakan username / handle / link
    detailText = t.perpetratorHandle || t.perpetratorPhone || '';
  }
  const detail = findInput(['input[name="detail_sumber_informasi_penipuan"]'], root) ?? findByLabel(/detail sumber/i, root, 'input, textarea');
  if (detailText && setText(detail, detailText)) filled.push('Detail Sumber');
  else pending.push('Detail Sumber (username/nomor)');

  const fileInput = findInput(['input[type="file"][name="file_bukti_sumber_informasi_penipuan"]'], root) as HTMLInputElement | null;
  const outcome = attachEvidence(session, fileInput, 2 * MB);
  if (outcome === 'ok') filled.push('Bukti Sumber (PDF)');
  else pending.push('Bukti Sumber');

  return {
    ...result(filled, pending, 'Sumber penipuan terisi. Periksa lalu klik "Simpan" di jendela IASC.', 'Form sumber penipuan tidak ditemukan.', [attachNote(outcome, 2 * MB)]),
    attachedFile: outcome === 'ok',
  };
}

/** Step 3 — waktu kejadian, kronologi, bukti pendukung kejadian. */
async function fillKejadian(session: ReportingSession): Promise<AutofillResult> {
  const t = session.target;
  const filled: string[] = [];
  const pending: string[] = [];

  const when = formatLocalDateTime(t.incidentDate, false);
  const waktu = findInput(['input[name="waktu_kejadian"]', '#waktu_kejadian']) ?? findByLabel(/waktu kejadian/i);
  if (when && (await setDate(waktu, when))) filled.push('Waktu Kejadian');
  else pending.push('Waktu Kejadian');

  let notes = '';
  const kronologi = findInput(['textarea[name="kronologi_kejadian"]', '#kronologi_kejadian', 'textarea[name*="kronologi"]']) ?? findByLabel(/kronologi/i, document, 'textarea');
  if (t.chronology) {
    let text = sanitizeIascText(t.chronology);
    if (text.length > KRONOLOGI_MAX) {
      text = `${text.slice(0, KRONOLOGI_MAX - 3)}...`;
      notes = `Kronologi dipotong ke ${KRONOLOGI_MAX} karakter (batas IASC).`;
    }
    if (setText(kronologi, text)) filled.push('Kronologi Kejadian');
    else pending.push('Kronologi Kejadian');
  } else pending.push('Kronologi Kejadian');

  const fileInput = findInput(['input[type="file"][name="file_bukti_pendukung_kejadian"]']) as HTMLInputElement | null;
  const outcome = attachEvidence(session, fileInput, 2 * MB);
  if (outcome === 'ok') filled.push('Bukti Pendukung Kejadian (PDF)');
  else pending.push('Bukti Pendukung Kejadian');

  return {
    ...result(filled, pending, 'Kronologi & bukti kejadian terisi!', 'Field kejadian tidak ditemukan.', [notes, attachNote(outcome, 2 * MB)]),
    attachedFile: outcome === 'ok',
  };
}

/** Step 4a — modal "Tambah Penyelenggara Terlapor": bank/e-wallet, rekening, transaksi. */
async function fillTransaksi(session: ReportingSession): Promise<AutofillResult> {
  const t = session.target;
  const modal = await openModal('modal-tambah-informasi-penyelenggara-terlapor');
  const root: ParentNode = modal ?? document;
  const filled: string[] = [];
  const pending: string[] = [];
  const notes: string[] = [];

  // 1. Kategori → daftar lembaga dimuat AJAX (/Guest/getLembagaByKategoriLembaga/{id}) → pilih bank.
  const lembaga = findInput(['select[name="penyelenggara_layanan_terlapor_pujk_id"]', '#select-reporter-institution'], root) as HTMLSelectElement | null;
  if (t.bankName && lembaga) {
    let picked = await setSelect(lembaga, bankCandidates(t.bankName));
    if (!picked) {
      const kategori = findInput(['select[name="kategori_penyelenggara_layanan_terlapor_pujk_id"]'], root) as HTMLSelectElement | null;
      const kategoriCandidates = isEwallet(t.bankName)
        ? ['Dompet Digital', 'E-Wallet', 'Uang Elektronik', 'Penyelenggara Jasa Pembayaran', 'Pembayaran']
        : ['Bank Umum', 'Bank'];
      const before = lembaga.options.length;
      if (await setSelect(kategori, kategoriCandidates)) {
        filled.push('Kategori Penyelenggara');
        await waitFor(() => (lembaga.options.length !== before && lembaga.options.length > 1 ? lembaga : null), 6000, 150);
        picked = await setSelect(lembaga, bankCandidates(t.bankName));
      }
    }
    if (picked) filled.push(`Penyelenggara (${t.bankName})`);
    else {
      pending.push(`Penyelenggara: pilih "${t.bankName}"`);
      notes.push(`Pilih bank "${t.bankName}" secara manual.`);
    }
  } else pending.push('Nama Penyelenggara');

  const rek = findInput(['input[name="nomor_rekening_terlapor"]', '#laporanv2-nomor-rekening-terlapor'], root) ?? findByLabel(/nomor rekening/i, root, 'input');
  if (t.accountNumber && setText(rek, t.accountNumber.replace(/\D/g, ''))) filled.push('Nomor Rekening Pelaku');
  else pending.push('Nomor Rekening / Akun');

  const pemilik = findInput(['input[name="nama_pemilik_rekening_terlapor"]'], root) ?? findByLabel(/nama pemilik/i, root, 'input');
  if (t.accountHolder && setText(pemilik, t.accountHolder)) filled.push('Nama Pemilik Rekening');
  else pending.push('Nama Pemilik Rekening / Akun');

  const when = formatLocalDateTime(t.incidentDate, true);
  const waktu = findInput(['input[name="detail[0].waktu_transaksi"]', '#first-penyelenggara-terlapor', 'input.waktu_transaksi'], root);
  if (when && (await setDate(waktu, when))) filled.push('Waktu Transaksi');
  else pending.push('Waktu Transaksi');

  const nominal = findInput(['input[name="detail[0].nominal_transaksi"]', 'input.money[name*="nominal_transaksi"]', 'input[name*="nominal_transaksi"]'], root);
  if (t.lossAmount && setText(nominal, Math.round(t.lossAmount).toLocaleString('id-ID'))) filled.push('Nominal Transaksi');
  else pending.push('Nominal Transaksi');

  // Evidence Pack → bukti transaksi di modal yang sama (BUKAN bukti kepemilikan rekening korban).
  const fileInput = findInput(['input[type="file"][name="detail[0].file_bukti_pendukung_kejadian"]'], root) as HTMLInputElement | null;
  const outcome = attachEvidence(session, fileInput, 5 * MB);
  if (outcome === 'ok') filled.push('Bukti Transaksi (PDF)');
  else {
    pending.push('Bukti Pendukung Transaksi');
    notes.push(attachNote(outcome, 5 * MB));
  }

  if (!modal) notes.unshift('Klik "Tambah Informasi Penyelenggara Terlapor" bila jendela belum terbuka.');
  notes.push('Rekening Anda sendiri (korban) diisi mandiri di formulir utama IASC.');
  return {
    ...result(filled, pending, 'Rekening & bukti pelaku terisi. Klik "Simpan" di pop-up, lalu pastikan rekening Anda di form utama terisi.', 'Form penyelenggara terlapor tidak ditemukan.', notes),
    attachedFile: outcome === 'ok',
  };
}

/** Step 4b — lampirkan Evidence Pack ke bukti transaksi (BUKAN ke bukti kepemilikan rekening korban). */
async function fillEvidence(session: ReportingSession): Promise<AutofillResult> {
  const modal = await openModal('modal-tambah-informasi-penyelenggara-terlapor');
  const root: ParentNode = modal ?? document;
  const input = findInput(['input[type="file"][name="detail[0].file_bukti_pendukung_kejadian"]'], root) as HTMLInputElement | null;
  const outcome = attachEvidence(session, input, 5 * MB);
  const ok = outcome === 'ok';
  return {
    ok,
    filledFields: ok ? ['Bukti Transaksi (PDF)'] : [],
    pending: ok ? [] : ['Bukti Pendukung Transaksi'],
    attachedFile: ok,
    message: ok ? 'Evidence Pack PDF terlampir di bukti transaksi. Klik "Simpan" di jendela IASC.' : attachNote(outcome, 5 * MB),
  };
}

/** Step 5 — hanya mengarahkan ke CAPTCHA. Persetujuan & CAPTCHA wajib dilakukan user. */
function focusCaptcha(): AutofillResult {
  const captcha = document.querySelector<HTMLInputElement>('#CaptchaResponse, input[name="CaptchaResponse"]');
  if (captcha) {
    captcha.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => captcha.focus(), 350);
    highlightField(captcha);
  }
  return {
    ok: !!captcha,
    filledFields: [],
    pending: ['Centang pernyataan kesediaan', 'Kode CAPTCHA'],
    message: captcha
      ? 'Centang pernyataan kesediaan, ketik kode CAPTCHA, lalu klik Kirim.'
      : 'Kolom CAPTCHA tidak ditemukan di halaman ini.',
  };
}

/** Eksekusi aksi autofill. */
export async function executeAutofill(session: ReportingSession, action: AutofillAction): Promise<AutofillResult> {
  switch (action) {
    case 'terlapor': return fillTerlapor(session);
    case 'sumber': return fillSumber(session);
    case 'kejadian': return fillKejadian(session);
    case 'transaksi': return fillTransaksi(session);
    case 'evidence': return fillEvidence(session);
    case 'captcha': return focusCaptcha();
  }
}

/* ------------------------------------------------------------------ */
/* Tangkap nomor laporan (KF-ISLAND-06)                                 */
/* ------------------------------------------------------------------ */

/** Baca nomor laporan dari Swal sukses IASC:
 *  title "Laporan berhasil diajukan", html "...nomor laporan : <p class="fw-bold">NOMOR</p> ...". */
export function extractIascReportNo(): string | null {
  const popup = document.querySelector('.swal2-popup');
  if (!popup || !isVisible(popup)) return null;
  const title = popup.querySelector('.swal2-title')?.textContent ?? '';
  const html = popup.querySelector('.swal2-html-container');
  const text = html?.textContent ?? popup.textContent ?? '';
  if (!/berhasil diajukan/i.test(title) && !/nomor laporan\s*:/i.test(text)) return null;

  const bold = html?.querySelector('p')?.textContent?.trim();
  if (bold && /^[A-Za-z0-9/._-]{4,40}$/.test(bold)) return bold;

  const m = text.match(/nomor laporan\s*:\s*([A-Za-z0-9/._-]{4,40})/i);
  return m?.[1] ?? null;
}

/** Pesan error validasi IASC yang sedang terlihat (.invalid-feedback / Swal "Peringatan"). */
export function visibleIascErrors(): string[] {
  const errs = Array.from(document.querySelectorAll('.invalid-feedback'))
    .filter(isVisible)
    .map((n) => n.textContent?.trim() ?? '')
    .filter(Boolean);
  const popup = document.querySelector('.swal2-popup');
  if (popup && isVisible(popup) && /peringatan/i.test(popup.querySelector('.swal2-title')?.textContent ?? '')) {
    const msg = popup.querySelector('.swal2-html-container')?.textContent?.trim();
    if (msg) errs.unshift(msg);
  }
  return [...new Set(errs)];
}

/** Ada modal Bootstrap / SweetAlert yang sedang terbuka? */
export function hasOpenDialog(): boolean {
  return !!document.querySelector('.modal.show') || isVisible(document.querySelector('.swal2-container'));
}
