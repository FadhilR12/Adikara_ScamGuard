'use client';
// Simulasi Demo Portal IASC OJK (PRD 5 / KF-ISLAND-07)
// Meniru struktur form resmi https://iasc.ojk.go.id/Guest/LaporanV2 (name/id field, modal Bootstrap,
// pesan SweetAlert) agar autofill Dynamic Island yang lolos di sini juga cocok dengan situs aslinya.
import { CheckCircle2, Clock, Plus, Shield, UploadCloud } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { DemoBanner } from '../DemoBanner';

const STEPS = [
  { id: 1, label: 'Informasi Pihak Pelapor' },
  { id: 2, label: 'Informasi Pihak Terlapor' },
  { id: 3, label: 'Informasi Kejadian' },
  { id: 4, label: 'Informasi Transaksi' },
  { id: 5, label: 'Kesediaan Melapor' },
];

const KATEGORI = [
  { id: '1', name: 'Bank Umum' },
  { id: '2', name: 'Dompet Digital / Uang Elektronik' },
];

const LEMBAGA: Record<string, { id: string; name: string }[]> = {
  '1': [
    { id: '101', name: 'PT Bank Central Asia Tbk (BCA)' },
    { id: '102', name: 'PT Bank Rakyat Indonesia (Persero) Tbk (BRI)' },
    { id: '103', name: 'PT Bank Negara Indonesia (Persero) Tbk (BNI)' },
    { id: '104', name: 'PT Bank Mandiri (Persero) Tbk' },
    { id: '105', name: 'PT Bank Syariah Indonesia Tbk (BSI)' },
    { id: '106', name: 'PT Bank CIMB Niaga Tbk' },
    { id: '107', name: 'PT Bank Jago Tbk' },
    { id: '108', name: 'PT Bank Seabank Indonesia' },
  ],
  '2': [
    { id: '201', name: 'DANA' },
    { id: '202', name: 'OVO' },
    { id: '203', name: 'GoPay' },
    { id: '204', name: 'ShopeePay' },
    { id: '205', name: 'LinkAja' },
  ],
};

const SUMBER = ['Instagram', 'Website', 'Tiktok', 'Tokopedia', 'Media Lainnya', 'Shopee'];
const CAPTCHA = 'SG982A';

const inputBase =
  'rounded-btn border-[1.5px] border-inputline bg-white px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-strong';
const inputCls = `w-full ${inputBase}`;
const fileCls =
  'block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-white hover:file:bg-primary-hover';
const btnPrimary = 'rounded-btn bg-primary px-6 py-2.5 text-[14px] font-bold text-white transition hover:bg-primary-hover';
const btnSecondary = 'rounded-btn border-[1.5px] border-inputline bg-white px-5 py-2.5 text-[14px] font-bold text-ink transition hover:bg-bg';

interface SwalState {
  title: string;
  body?: ReactNode;
  icon: 'success' | 'warning' | 'question';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

interface TerlaporRow { nomor: string; nama: string; bukti: string }
interface SumberRow { sumber: string; detail: string; bukti: string }
interface TransaksiRow { penyelenggara: string; rekening: string; pemilik: string; waktu: string; nominal: string; bukti: string }

export default function IascDemoPortalPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-bold text-slate-500">Memuat simulasi IASC...</div>}>
      <IascDemoPortalContent />
    </Suspense>
  );
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold text-slate-700">
        {label} {required && <small className="text-red-600">*</small>}
      </label>
      {children}
      {hint && <small className="text-[12px] text-slate-500">{hint}</small>}
      {error && <div className="invalid-feedback text-[12.5px] font-semibold text-red-600">{error}</div>}
    </div>
  );
}

function Modal({ id, title, open, onClose, children, formId, onSubmit, large }: {
  id: string; title: string; open: boolean; onClose: () => void; children: ReactNode; formId: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void; large?: boolean;
}) {
  return (
    <div
      id={id}
      className={`modal fade fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 px-4 pb-10 pt-20 ${open ? 'show block' : 'hidden'}`}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal-dialog mx-auto w-full ${large ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="modal-content rounded-2xl bg-white shadow-2xl">
          {/* Form tetap ter-mount (seperti IASC) agar field bisa diisi saat modal dibuka */}
          <form method="POST" id={formId} encType="multipart/form-data" noValidate onSubmit={onSubmit}>
            <div className="modal-header flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <h5 className="text-[16px] font-extrabold text-slate-900">{title}</h5>
              <button type="button" className="btn-close text-[20px] leading-none text-slate-400 hover:text-slate-700" aria-label="Close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body flex flex-col gap-4 px-5 py-5 sm:px-6">{children}</div>
            <div className="modal-footer flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" className={btnSecondary} onClick={onClose}>Tutup</button>
              <button type="submit" className={btnPrimary}>Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DataTable({ head, rows, empty = 'Belum ada data' }: { head: string[]; rows: string[][]; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <thead className="bg-slate-50 text-slate-600">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={head.length} className="px-4 py-5 text-center text-slate-400">{empty}</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-3">{i + 1}</td>
                {r.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function fileName(fd: FormData, name: string): string {
  const f = fd.get(name);
  return f instanceof File && f.size > 0 ? f.name : '';
}

function IascDemoPortalContent() {
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get('step') || '1', 10);
  const [step, setStepState] = useState(initialStep >= 1 && initialStep <= 5 ? initialStep : 1);
  const [timerSeconds, setTimerSeconds] = useState(1800);
  const [swal, setSwal] = useState<SwalState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<string | null>(null);
  const [terlapor, setTerlapor] = useState<TerlaporRow[]>([]);
  const [sumber, setSumber] = useState<SumberRow[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiRow[]>([]);
  const [lembaga, setLembaga] = useState<{ id: string; name: string }[]>([]);
  const [kronologiCount, setKronologiCount] = useState(0);
  const [summary, setSummary] = useState<Record<string, string>>({});

  useEffect(() => {
    const interval = setInterval(() => setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  const setStep = (n: number) => {
    setStepState(n);
    setErrors({});
    setModal(null);
    // IASC asli berpindah langkah lewat ?step=N
    window.history.replaceState(null, '', `?step=${n}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const warn = (text: string) => setSwal({ title: 'Peringatan', body: text, icon: 'warning', confirmText: 'OK' });
  const added = () => setSwal({ title: 'Berhasil menambah data.', icon: 'success', confirmText: 'OK' });

  /** Validasi sederhana gaya respons 422 IASC: .is-invalid + .invalid-feedback */
  const validate = (fd: FormData, required: Record<string, string>): boolean => {
    const next: Record<string, string> = {};
    for (const [name, label] of Object.entries(required)) {
      const v = fd.get(name);
      const empty = v instanceof File ? v.size === 0 : !String(v ?? '').trim();
      if (empty) next[name] = `${label} wajib diisi.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitStep = (n: number, required: Record<string, string>, extra?: () => string | null) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!validate(fd, required)) return;
    const problem = extra?.();
    if (problem) return warn(problem);
    const values: Record<string, string> = {};
    fd.forEach((v, k) => { if (typeof v === 'string') values[k] = v; });
    setSummary((s) => ({ ...s, ...values }));
    setStep(n + 1);
  };

  const submitTerlapor = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!validate(fd, { nomor_terlapor: 'Nomor terlapor', nama_terlapor: 'Nama terlapor', file_bukti_komunikasi_terlapor: 'Bukti komunikasi' })) return;
    setTerlapor((r) => [...r, { nomor: `+${fd.get('kode_nomor_terlapor')} ${fd.get('nomor_terlapor')}`, nama: String(fd.get('nama_terlapor')), bukti: fileName(fd, 'file_bukti_komunikasi_terlapor') }]);
    e.currentTarget.reset();
    setModal(null);
    added();
  };

  const submitSumber = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!validate(fd, { sumber_informasi_penipuan_id: 'Sumber informasi', detail_sumber_informasi_penipuan: 'Detail sumber', file_bukti_sumber_informasi_penipuan: 'Bukti sumber' })) return;
    setSumber((r) => [...r, { sumber: String(fd.get('sumber_informasi_penipuan_id')), detail: String(fd.get('detail_sumber_informasi_penipuan')), bukti: fileName(fd, 'file_bukti_sumber_informasi_penipuan') }]);
    e.currentTarget.reset();
    setModal(null);
    added();
  };

  const submitTransaksi = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = validate(fd, {
      penyelenggara_layanan_terlapor_pujk_id: 'Nama penyelenggara',
      nomor_rekening_terlapor: 'Nomor rekening / akun',
      nama_pemilik_rekening_terlapor: 'Nama pemilik rekening / akun',
      'detail[0].waktu_transaksi': 'Waktu transaksi',
      'detail[0].nominal_transaksi': 'Nominal transaksi',
      'detail[0].file_bukti_pendukung_kejadian': 'Bukti pendukung kejadian',
    });
    if (!ok) return;
    const lembagaId = String(fd.get('penyelenggara_layanan_terlapor_pujk_id'));
    setTransaksi((r) => [...r, {
      penyelenggara: Object.values(LEMBAGA).flat().find((l) => l.id === lembagaId)?.name ?? lembagaId,
      rekening: String(fd.get('nomor_rekening_terlapor')),
      pemilik: String(fd.get('nama_pemilik_rekening_terlapor')),
      waktu: String(fd.get('detail[0].waktu_transaksi')),
      // maskMoney IASC: titik dibuang sebelum dikirim
      nominal: String(fd.get('detail[0].nominal_transaksi')).replace(/\./g, ''),
      bukti: fileName(fd, 'detail[0].file_bukti_pendukung_kejadian'),
    }]);
    e.currentTarget.reset();
    setLembaga([]);
    setModal(null);
    added();
  };

  const submitFinal = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const captcha = String(fd.get('CaptchaResponse') ?? '').trim();
    if (!captcha) return warn('Mohon masukkan kode captcha.');
    if (!fd.get('agreement')) return warn('Anda harus menyatakan kesediaan untuk melapor dan memberikan infomasi dengan benar.');
    if (captcha.toUpperCase() !== CAPTCHA) return warn('Kode captcha tidak sesuai.');
    setSwal({
      title: 'Notifikasi',
      body: 'Apakah anda yakin ingin kirim laporan penipuan?',
      icon: 'question',
      confirmText: 'Ya',
      cancelText: 'Tidak',
      onConfirm: () => {
        const reportNo = `IASC-202611-${Math.floor(1000 + Math.random() * 9000)}`;
        setSwal({
          title: 'Laporan berhasil diajukan',
          icon: 'success',
          confirmText: 'OK',
          body: (
            <>
              Laporan Anda telah diajukan dengan nomor laporan : <p className="fw-bold my-2 font-mono text-[20px] font-black text-[#0F766E]">{reportNo}</p>
              Anda akan menerima email yang berisi nomor laporan beserta ringkasan laporannya.
            </>
          ),
        });
      },
    });
  };

  /** Tiruan maskMoney: thousands ".", precision 0 */
  const maskMoney = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const digits = el.value.replace(/\D/g, '');
    el.value = digits ? Number(digits).toLocaleString('id-ID') : '';
  };

  const err = (name: string) => errors[name];

  return (
    <div className="min-h-screen bg-bg text-ink">
      <DemoBanner />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F766E] text-white shadow">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-black tracking-tight text-slate-900 sm:text-[17px]">INDONESIA ANTI-SCAM CENTRE (IASC)</div>
              <div className="text-[12px] font-medium text-slate-500">Otoritas Jasa Keuangan (OJK) • Portal Laporan Masyarakat V2</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-[13px] font-bold text-amber-800">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Sisa Waktu Pengisian:</span>
            <span id="countdown-timer" className="font-mono text-[14px] text-amber-900">{formatTimer(timerSeconds)}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Stepper (bs-stepper IASC) */}
        <div className="mb-8 grid grid-cols-5 gap-2 border-b border-slate-200 pb-5">
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                onClick={() => setStep(s.id)}
                aria-selected={isActive ? 'true' : 'false'}
                id={`stepper1trigger${s.id}`}
                className={`step-trigger flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center text-[12.5px] font-bold transition-all md:flex-row md:items-start md:gap-2 md:px-2.5 md:text-left ${
                  isActive ? 'bg-primary text-white' : isDone ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  isActive ? 'bg-white text-[#0F766E]' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isDone ? '✓' : s.id}
                </span>
                <span className="bs-stepper-label hidden leading-tight md:block">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-8">
          {/* STEP 1 */}
          {step === 1 && (
            <form method="POST" id="form-scam-step1" encType="multipart/form-data" noValidate className="flex flex-col gap-6"
              onSubmit={submitStep(1, { nama_pelapor: 'Nama pelapor', no_nomor_telepon_pelapor: 'Nomor telepon', email_pelapor: 'E-mail', nomor_identitas_pelapor: 'Nomor identitas' })}>
              <StepHeader title="Informasi Pihak Pelapor" desc="Data diri pelapor diisi sesuai Kartu Tanda Penduduk (KTP)." />
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-[13px] leading-relaxed text-blue-900">
                <div className="font-bold">🛡️ Perlindungan Privasi (UU PDP)</div>
                <div className="mt-1 text-blue-800">ScamGuard tidak menyimpan NIK Anda. Isi identitas diri secara mandiri pada formulir ini.</div>
              </div>
              <Field label="Apakah anda sendiri yang mengalami penipuan?" required>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
                  <label className="flex items-center gap-2"><input type="radio" name="is_pelapor" value="true" defaultChecked /> Ya, saya sendiri</label>
                  <label className="flex items-center gap-2"><input type="radio" name="is_pelapor" value="false" /> Tidak, saya mewakili korban</label>
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <Field label="Nama Pelapor" required error={err('nama_pelapor')}>
                  <input className={inputCls} type="text" name="nama_pelapor" defaultValue="Budi Santoso (Demo)" />
                </Field>
                <Field label="Jenis Kelamin" required>
                  <div className="flex gap-6 pt-2 text-[14px]">
                    <label className="flex items-center gap-2"><input type="radio" name="jenis_kelamin_pelapor_id" value="1" defaultChecked /> Laki-laki</label>
                    <label className="flex items-center gap-2"><input type="radio" name="jenis_kelamin_pelapor_id" value="2" /> Perempuan</label>
                  </div>
                </Field>
                <Field label="Nomor Telepon Pelapor" required hint="Contoh: 81234567890" error={err('no_nomor_telepon_pelapor')}>
                  <div className="flex gap-2">
                    <select className={`${inputBase} w-40 shrink-0`} name="kode_nomor_telepon_pelapor" defaultValue="62">
                      <option value="62">Indonesia (+62)</option>
                      <option value="1">Amerika Serikat (+1)</option>
                    </select>
                    <input type="tel" className={`${inputBase} min-w-0 flex-1`} id="laporanv2-no-nomor-telepon-pelapor" name="no_nomor_telepon_pelapor" maxLength={13} defaultValue="81299887766" />
                  </div>
                </Field>
                <Field label="E-Mail Pelapor" required error={err('email_pelapor')}>
                  <input className={inputCls} type="email" name="email_pelapor" defaultValue="budi.demo@example.com" />
                </Field>
                <Field label="Jenis Identitas" required>
                  <select className={inputCls} name="jenis_identitas_id" id="jenisIdentitas" defaultValue="1">
                    <option value="1">KTP</option><option value="2">Paspor</option><option value="3">KITAS</option>
                  </select>
                </Field>
                <Field label="Nomor Identitas" required error={err('nomor_identitas_pelapor')}>
                  <input className={`${inputCls} font-mono`} id="nomorIdentitas" type="text" name="nomor_identitas_pelapor" maxLength={16} defaultValue="3273000000000000" />
                </Field>
              </div>
              <Field label="Alamat Pelapor" required>
                <textarea className={inputCls} rows={3} name="alamat_pelapor" defaultValue="Jl. Contoh No. 1, Bandung (Demo)" />
              </Field>
              <Field label="Upload Kartu Identitas Pelapor" hint="Format PDF, JPG, PNG. Maks 1MB.">
                <input className={fileCls} type="file" name="file_foto_identitas_pelapor" accept="image/jpeg,image/png,application/pdf" />
              </Field>
              <StepNav submitLabel="Lanjut" />
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form method="POST" id="form-scam-step2" encType="multipart/form-data" noValidate className="flex flex-col gap-6"
              onSubmit={submitStep(2, {}, () => (terlapor.length === 0 ? 'Informasi terlapor wajib diisi minimal 1 data.' : null))}>
              <StepHeader title="Informasi Pihak Terlapor" desc="Tambahkan nomor pelaku dan sumber/media tempat penipuan terjadi." />
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[15px] font-extrabold text-slate-800">Informasi Terlapor</h3>
                  <button type="button" className={`${btnPrimary} inline-flex items-center gap-1.5 px-4 py-2 text-[13px]`} data-bs-toggle="modal" data-bs-target="#modal-tambah-informasi-terlapor" onClick={() => setModal('terlapor')}>
                    <Plus className="h-4 w-4" /> Tambah Informasi Terlapor
                  </button>
                </div>
                <DataTable head={['No', 'Nomor Terlapor', 'Nama Terlapor', 'Bukti Komunikasi']} rows={terlapor.map((r) => [r.nomor, r.nama, r.bukti])} />
              </section>
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[15px] font-extrabold text-slate-800">Sumber / Media Informasi Penipuan</h3>
                  <button type="button" className={`${btnPrimary} inline-flex items-center gap-1.5 px-4 py-2 text-[13px]`} data-bs-toggle="modal" data-bs-target="#modal-tambah-sumber-informasi-penipuan" onClick={() => setModal('sumber')}>
                    <Plus className="h-4 w-4" /> Tambah Sumber / Media Informasi Penipuan
                  </button>
                </div>
                <DataTable head={['No', 'Sumber / Media', 'Detail', 'Bukti']} rows={sumber.map((r) => [r.sumber, r.detail, r.bukti])} />
              </section>
              <StepNav onBack={() => setStep(1)} submitLabel="Lanjut" />
            </form>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <form method="POST" id="form-scam-step3" encType="multipart/form-data" noValidate className="flex flex-col gap-6"
              onSubmit={submitStep(3, { waktu_kejadian: 'Tanggal dan waktu kejadian', kronologi_kejadian: 'Kronologi kejadian', file_bukti_pendukung_kejadian: 'Bukti pendukung kejadian' })}>
              <StepHeader title="Informasi Kejadian" desc="Uraikan kronologi penipuan secara berurutan dan jelas." />
              <Field label="Tanggal dan Waktu Kejadian" required hint="Format: YYYY-MM-DD HH:mm" error={err('waktu_kejadian')}>
                <input className={`${inputCls} datetime`} type="text" name="waktu_kejadian" placeholder="Pilih tanggal & waktu" />
              </Field>
              <Field label="Kronologi Kejadian Penipuan" required error={err('kronologi_kejadian')}>
                <textarea className={`${inputCls} leading-relaxed`} rows={7} name="kronologi_kejadian" maxLength={4000}
                  placeholder="Klik 'Tempel Kronologi Rapi' pada ScamGuard Dynamic Island…"
                  onInput={(e) => setKronologiCount(e.currentTarget.value.length)} onKeyUp={(e) => setKronologiCount(e.currentTarget.value.length)} />
                <small className="text-right text-[12px] text-slate-500"><span id="count-character-kronologi">{kronologiCount}</span> / 4000</small>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <Field label="Upload Bukti Pendukung Kejadian" required hint="Format PDF, JPG, PNG. Maks 2MB." error={err('file_bukti_pendukung_kejadian')}>
                  <input className={fileCls} type="file" name="file_bukti_pendukung_kejadian" accept="image/jpeg,image/png,application/pdf" />
                </Field>
                <Field label="Upload Laporan Kepolisian" hint="Opsional. Maks 2MB.">
                  <input className={fileCls} type="file" name="file_bukti_laporan_polisi" accept="image/jpeg,image/png,application/pdf" />
                </Field>
              </div>
              <StepNav onBack={() => setStep(2)} submitLabel="Lanjut" />
            </form>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <form method="POST" id="form-scam-step4" encType="multipart/form-data" noValidate className="flex flex-col gap-6"
              onSubmit={submitStep(4, { penyelenggara_layanan_korban_pujk_id: 'Penyelenggara layanan korban', nomor_rekening_korban: 'Nomor rekening korban', nama_pemilik_rekening_korban: 'Nama pemilik rekening korban' },
                () => (transaksi.length === 0 ? 'Informasi penyelenggara terlapor wajib diisi minimal 1 data.' : null))}>
              <StepHeader title="Informasi Transaksi" desc="Rekening Anda (korban) yang dipakai bertransaksi, lalu rekening tujuan pelaku." />
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-900">
                Apabila anda menggunakan lebih dari 1 rekening untuk bertransaksi kepada pelaku scam, harap membuat laporan baru.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <Field label="Nama Penyelenggara Layanan Korban" required error={err('penyelenggara_layanan_korban_pujk_id')}>
                  <select className={inputCls} name="penyelenggara_layanan_korban_pujk_id" defaultValue="">
                    <option value="">-- Pilih Penyelenggara --</option>
                    {Object.values(LEMBAGA).flat().map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </Field>
                <Field label="Nomor Rekening / Akun Korban" required error={err('nomor_rekening_korban')}>
                  <input className={`${inputCls} font-mono`} type="text" id="laporanv2-nomor-rekening-korban" name="nomor_rekening_korban" />
                </Field>
                <Field label="Nama Pemilik Rekening / Akun Korban" required error={err('nama_pemilik_rekening_korban')}>
                  <input className={inputCls} type="text" name="nama_pemilik_rekening_korban" />
                </Field>
                <Field label="Bukti Kepemilikan Rekening / Akun Korban" hint="Format PDF, JPG, PNG. Maks 2MB.">
                  <input className={fileCls} type="file" name="file_bukti_kepemilikan_rekening_korban" accept=".pdf, .jpeg, .jpg, .png" />
                </Field>
              </div>
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[15px] font-extrabold text-slate-800">Informasi Penyelenggara Terlapor</h3>
                  <button type="button" className={`${btnPrimary} inline-flex items-center gap-1.5 px-4 py-2 text-[13px]`} data-bs-toggle="modal" data-bs-target="#modal-tambah-informasi-penyelenggara-terlapor" onClick={() => setModal('penyelenggara')}>
                    <Plus className="h-4 w-4" /> Tambah Informasi Penyelenggara Terlapor
                  </button>
                </div>
                <DataTable head={['No', 'Nama Penyelenggara', 'Nomor Rekening / Akun', 'Nama Pemilik', 'Nominal']}
                  rows={transaksi.map((r) => [r.penyelenggara, r.rekening, r.pemilik, `Rp ${Number(r.nominal).toLocaleString('id-ID')}`])} />
              </section>
              <StepNav onBack={() => setStep(3)} submitLabel="Lanjut" />
            </form>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <form method="POST" id="form-scam-step5" encType="multipart/form-data" noValidate className="flex flex-col gap-6" onSubmit={submitFinal}>
              <StepHeader title="Kesediaan Melapor" desc="Tinjau kembali kebenaran data Anda sebelum mengirim laporan resmi ke IASC." />
              <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] sm:grid-cols-2 sm:p-5">
                <Summary k="Pelapor" v={summary.nama_pelapor} />
                <Summary k="Waktu kejadian" v={summary.waktu_kejadian} />
                <Summary k="Jumlah terlapor" v={String(terlapor.length)} />
                <Summary k="Jumlah transaksi" v={String(transaksi.length)} />
              </dl>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" id="agreementCheckbox" name="agreement" className="mt-1 h-4 w-4 shrink-0" />
                  <span className="text-[13px] leading-relaxed text-slate-700">
                    Dengan ini saya menyatakan bersedia melapor dan bahwa data serta bukti yang saya sampaikan adalah benar dan dapat dipertanggungjawabkan.
                  </span>
                </label>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <label className="mb-3 block text-[13px] font-bold text-slate-700">Kode Captcha <small className="text-red-600">*</small></label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-12 w-36 select-none items-center justify-center rounded-lg border border-slate-300 bg-slate-100 font-mono text-[22px] font-black tracking-widest text-slate-800 shadow-inner" aria-label="Captcha">
                    {CAPTCHA}
                  </div>
                  <input type="text" id="CaptchaResponse" name="CaptchaResponse" placeholder="Ketik kode di atas" autoComplete="off"
                    className={`${inputBase} w-full font-mono font-bold uppercase sm:w-48`} />
                </div>
              </div>
              <StepNav onBack={() => setStep(4)} submitLabel="Kirim Laporan" />
            </form>
          )}
        </div>
      </main>

      {/* Modal Step 2 — form selalu ter-mount seperti di IASC */}
      {step === 2 && (
        <>
          <Modal id="modal-tambah-informasi-terlapor" formId="form-tambah-informasi-terlapor" title="Tambah Informasi Terlapor"
            open={modal === 'terlapor'} onClose={() => setModal(null)} onSubmit={submitTerlapor}>
            <Field label="Kode Nomor Terlapor" required>
              <select className={inputCls} name="kode_nomor_terlapor" defaultValue="">
                <option value="">Pilih Kode Telepon</option>
                <option value="62">Indonesia (+62)</option>
                <option value="60">Malaysia (+60)</option>
                <option value="1">Amerika Serikat (+1)</option>
              </select>
            </Field>
            <Field label="Nomor Terlapor" required hint="Mohon pastikan nomor telepon sesuai dengan bukti komunikasi yang diunggah." error={err('nomor_terlapor')}>
              <input className={inputCls} type="text" id="laporanv2-nomor-terlapor" name="nomor_terlapor" maxLength={13} placeholder="Contoh: 81234567890" />
            </Field>
            <Field label="Nama Terlapor" required error={err('nama_terlapor')}>
              <input className={inputCls} type="text" name="nama_terlapor" />
            </Field>
            <Field label="Upload Bukti Komunikasi" required hint="Format PDF, JPG, PNG. Maks 2MB." error={err('file_bukti_komunikasi_terlapor')}>
              <input className={fileCls} type="file" name="file_bukti_komunikasi_terlapor" accept="image/jpeg,image/png,application/pdf" />
            </Field>
          </Modal>
          <Modal id="modal-tambah-sumber-informasi-penipuan" formId="form-tambah-sumber-informasi-penipuan" title="Tambah Sumber / Media Informasi Penipuan"
            open={modal === 'sumber'} onClose={() => setModal(null)} onSubmit={submitSumber}>
            <Field label="Sumber Informasi / Media Informasi Penipuan" required error={err('sumber_informasi_penipuan_id')}>
              <select className={inputCls} name="sumber_informasi_penipuan_id" defaultValue="">
                <option value="">-- Pilih Sumber --</option>
                {SUMBER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Detail Sumber Informasi / Media Informasi Penipuan" required hint="Dapat diisi dengan username atau link sumber/media informasi penipuan." error={err('detail_sumber_informasi_penipuan')}>
              <input className={inputCls} type="text" name="detail_sumber_informasi_penipuan" />
            </Field>
            <Field label="Upload Bukti Sumber / Media Informasi Penipuan" required hint="Format PDF, JPG, PNG. Maks 2MB." error={err('file_bukti_sumber_informasi_penipuan')}>
              <input className={fileCls} type="file" name="file_bukti_sumber_informasi_penipuan" accept="image/jpeg,image/png,application/pdf" />
            </Field>
          </Modal>
        </>
      )}

      {/* Modal Step 4 */}
      {step === 4 && (
        <Modal id="modal-tambah-informasi-penyelenggara-terlapor" formId="form-tambah-informasi-penyelenggara-terlapor" title="Tambah Penyelenggara Terlapor" large
          open={modal === 'penyelenggara'} onClose={() => setModal(null)} onSubmit={submitTransaksi}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <Field label="Kategori Penyelenggara" required>
              <select className={inputCls} name="kategori_penyelenggara_layanan_terlapor_pujk_id" defaultValue=""
                onChange={(e) => {
                  const id = e.currentTarget.value;
                  setLembaga([]);
                  // Tiruan AJAX GET /Guest/getLembagaByKategoriLembaga/{id}
                  window.setTimeout(() => setLembaga(LEMBAGA[id] ?? []), 600);
                }}>
                <option value="">-- Pilih Kategori --</option>
                {KATEGORI.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </Field>
            <Field label="Nama Penyelenggara" required error={err('penyelenggara_layanan_terlapor_pujk_id')}>
              <select className={inputCls} name="penyelenggara_layanan_terlapor_pujk_id" id="select-reporter-institution" defaultValue="">
                <option value="">-- Pilih Penyelenggara --</option>
                {lembaga.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Nomor Rekening / Akun" required error={err('nomor_rekening_terlapor')}>
              <input className={`${inputCls} font-mono`} type="text" id="laporanv2-nomor-rekening-terlapor" name="nomor_rekening_terlapor" />
            </Field>
            <Field label="Nama Pemilik Rekening / Akun" required error={err('nama_pemilik_rekening_terlapor')}>
              <input className={inputCls} type="text" name="nama_pemilik_rekening_terlapor" />
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="mb-4 text-[14px] font-extrabold text-slate-800">Transaksi #1</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <Field label="Waktu Transaksi" required hint="Format: YYYY-MM-DD HH:mm:ss" error={err('detail[0].waktu_transaksi')}>
                <input className={`${inputCls} waktu_transaksi`} id="first-penyelenggara-terlapor" type="text" name="detail[0].waktu_transaksi" />
              </Field>
              <Field label="Nominal Transaksi" required error={err('detail[0].nominal_transaksi')}>
                <input className={`${inputCls} money font-mono`} type="text" name="detail[0].nominal_transaksi" onKeyUp={maskMoney} onBlur={maskMoney} />
              </Field>
            </div>
            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center" data-dropzone>
              <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
              <div className="mt-2 text-[13.5px] font-bold text-slate-800">Upload Bukti Pendukung Kejadian <small className="text-red-600">*</small></div>
              <p className="mt-1 text-[12px] text-slate-500">Format PDF, JPG, PNG. Maks 5MB.</p>
              <input className={`${fileCls} mx-auto mt-3 max-w-xs`} type="file" name="detail[0].file_bukti_pendukung_kejadian" accept="image/jpeg,image/png,application/pdf" />
              {err('detail[0].file_bukti_pendukung_kejadian') && (
                <div className="invalid-feedback mt-2 text-[12.5px] font-semibold text-red-600">{err('detail[0].file_bukti_pendukung_kejadian')}</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* SweetAlert2 tiruan */}
      {swal && (
        <div className="swal2-container fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="swal2-popup w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              swal.icon === 'success' ? 'bg-emerald-100 text-emerald-600' : swal.icon === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'
            }`}>
              {swal.icon === 'success' ? <CheckCircle2 className="h-10 w-10" /> : <span className="text-[30px] font-black">{swal.icon === 'warning' ? '!' : '?'}</span>}
            </div>
            <h2 className="swal2-title mt-4 text-[20px] font-black text-slate-900">{swal.title}</h2>
            {swal.body && <div className="swal2-html-container mt-3 text-[14px] leading-relaxed text-slate-600">{swal.body}</div>}
            <div className="swal2-actions mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              {swal.cancelText && (
                <button type="button" className={`swal2-cancel ${btnSecondary}`} onClick={() => setSwal(null)}>{swal.cancelText}</button>
              )}
              <button type="button" className={`swal2-confirm ${btnPrimary}`}
                onClick={() => { const next = swal.onConfirm; setSwal(null); next?.(); }}>
                {swal.confirmText ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h2 className="text-[19px] font-extrabold text-slate-900 sm:text-[20px]">{title}</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}

function StepNav({ onBack, submitLabel }: { onBack?: () => void; submitLabel: string }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
      {onBack ? <button type="button" className={btnSecondary} onClick={onBack}>Kembali</button> : <span className="hidden sm:block" />}
      <button id="button-send" type="submit" className={btnPrimary}>{submitLabel}</button>
    </div>
  );
}

function Summary({ k, v }: { k: string; v?: string }) {
  return (
    <div>
      <dt className="text-[12px] text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-semibold text-slate-800">{v || '—'}</dd>
    </div>
  );
}
