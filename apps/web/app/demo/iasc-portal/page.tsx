'use client';
// Simulasi Demo Portal IASC OJK (PRD 5 / KF-ISLAND-07)
// Halaman tiruan portal resmi https://iasc.ojk.go.id/Guest/LaporanV2 untuk demonstrasi juri lomba
import { AlertCircle, CheckCircle2, Clock, FileText, Shield, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { DemoBanner } from '../DemoBanner';

const STEPS = [
  { id: 1, label: 'Informasi Pihak Pelapor' },
  { id: 2, label: 'Informasi Pihak Terlapor' },
  { id: 3, label: 'Informasi Kejadian' },
  { id: 4, label: 'Informasi Transaksi & Bukti' },
  { id: 5, label: 'Kesediaan Melapor' },
];

export default function IascDemoPortalPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-bold text-slate-500">Memuat simulasi IASC...</div>}>
      <IascDemoPortalContent />
    </Suspense>
  );
}

function IascDemoPortalContent() {
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get('step') || '1', 10);
  const [step, setStep] = useState(initialStep >= 1 && initialStep <= 5 ? initialStep : 1);
  const [timerSeconds, setTimerSeconds] = useState(1794); // ~30 menit
  const [showSwal, setShowSwal] = useState(false);
  const [generatedReportNo, setGeneratedReportNo] = useState('');

  // Sisa waktu pengisian countdown (seperti web IASC asli)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitFinal = (e: React.FormEvent) => {
    e.preventDefault();
    const randomReportNo = `IASC-202611-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedReportNo(randomReportNo);
    setShowSwal(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      <DemoBanner />

      {/* Header Portal IASC */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F766E] font-black text-white shadow">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[17px] font-black tracking-tight text-slate-900">
                INDONESIA ANTI-SCAM CENTRE (IASC)
              </div>
              <div className="text-[12px] font-medium text-slate-500">
                Otoritas Jasa Keuangan (OJK) • Portal Laporan Masyarakat V2
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-[13px] font-bold text-amber-800">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Sisa Waktu:</span>
            <span id="countdown-timer" className="font-mono text-[14px] text-amber-900">{formatTimer(timerSeconds)}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Stepper Navigation */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-5">
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`step-trigger flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-bold transition-all ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : isDone
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
                aria-selected={isActive ? 'true' : 'false'}
                id={`stepper1trigger${s.id}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                    isActive ? 'bg-white text-[#0F766E]' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? '✓' : s.id}
                </span>
                <span className="bs-stepper-label">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* STEP 1: Informasi Pihak Pelapor */}
          {step === 1 && (
            <form id="form-scam-step1" onSubmit={handleNextStep} className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">Informasi Pihak Pelapor</h2>
                <p className="mt-1 text-[13.5px] text-slate-500">
                  Sesuai ketentuan, data diri pelapor harus diisi dengan benar sesuai Kartu Tanda Penduduk (KTP).
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-[13px] text-blue-900">
                <div className="font-bold">🛡️ Perlindungan Privasi (UU PDP)</div>
                <div className="mt-0.5 text-blue-800">
                  ScamGuard tidak menyimpan data NIK Anda di server. Silakan isi NIK dan identitas diri secara mandiri langsung pada formulir ini.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Nama Lengkap Pelapor *</label>
                  <input
                    type="text"
                    name="nama_pelapor"
                    required
                    defaultValue="Budi Santoso"
                    placeholder="Sesuai KTP"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Nomor Induk Kependudukan (NIK) *</label>
                  <input
                    type="text"
                    name="nomor_identitas"
                    maxLength={16}
                    required
                    defaultValue="3273201809980002"
                    placeholder="16 digit NIK"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Nomor Telepon Pelapor *</label>
                  <input
                    type="tel"
                    name="no_nomor_telepon_pelapor"
                    defaultValue="081299887766"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Alamat Email Aktif *</label>
                  <input
                    type="email"
                    name="email_pelapor"
                    defaultValue="budi.santoso@gmail.com"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="rounded-lg bg-[#0F766E] px-6 py-2.5 text-[14px] font-bold text-white shadow hover:bg-[#0D625C]"
                >
                  Simpan & Lanjut ke Pihak Terlapor →
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Informasi Pihak Terlapor */}
          {step === 2 && (
            <form id="form-scam-step2" onSubmit={handleNextStep} className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">Informasi Pihak Terlapor (Pelaku)</h2>
                <p className="mt-1 text-[13.5px] text-slate-500">
                  Masukkan identitas pelaku yang menghubungi Anda (nomor HP WhatsApp, akun medsos, atau tautan).
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">
                    Nomor Telepon / WhatsApp Terlapor (Pelaku) *
                  </label>
                  <input
                    type="tel"
                    name="no_nomor_telepon_terlapor"
                    id="laporanv2-nomor-terlapor"
                    placeholder="Contoh: 081234567890 (Akan diisi otomatis oleh ScamGuard)"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                  <small className="mt-1 block text-slate-400">
                    Gunakan tombol pada ScamGuard Dynamic Island di atas untuk mengisi otomatis.
                  </small>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Akun Media Sosial / Platform Penipuan</label>
                  <input
                    type="text"
                    name="media_sosial_terlapor"
                    placeholder="Contoh: Akun Instagram @toko.diskon.official atau Grup Telegram"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Kembali
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0F766E] px-6 py-2.5 text-[14px] font-bold text-white shadow hover:bg-[#0D625C]"
                >
                  Simpan & Lanjut ke Kronologi →
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Informasi Kejadian (Kronologi) */}
          {step === 3 && (
            <form id="form-scam-step3" onSubmit={handleNextStep} className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">Informasi Kejadian</h2>
                <p className="mt-1 text-[13.5px] text-slate-500">
                  Uraikan kronologi penipuan secara berurutan dan jelas.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Waktu Kejadian *</label>
                  <input
                    type="datetime-local"
                    name="waktu_kejadian"
                    id="waktu_kejadian"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Kronologi Lengkap Penipuan *</label>
                  <textarea
                    name="kronologi_kejadian"
                    id="kronologi_kejadian"
                    rows={6}
                    placeholder="Klik 'Tempel Kronologi Rapi' pada ScamGuard Dynamic Island di atas..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] leading-relaxed focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  ></textarea>
                  <small className="mt-1 block text-slate-400">
                    Kronologi terstruktur dari Evidence Pack akan ditempel di sini secara otomatis.
                  </small>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Kembali
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0F766E] px-6 py-2.5 text-[14px] font-bold text-white shadow hover:bg-[#0D625C]"
                >
                  Simpan & Lanjut ke Transaksi & Bukti →
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Informasi Transaksi & Bukti PDF */}
          {step === 4 && (
            <form id="form-scam-step4" onSubmit={handleNextStep} className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">Informasi Transaksi & Bukti Transfer</h2>
                <p className="mt-1 text-[13.5px] text-slate-500">
                  Data rekening bank tujuan penipuan, jumlah kerugian, dan berkas Evidence Pack.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Bank / E-Wallet Pelaku *</label>
                  <input
                    type="text"
                    name="bank_terlapor"
                    defaultValue="Bank Central Asia (BCA)"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Nomor Rekening Tujuan Pelaku *</label>
                  <input
                    type="text"
                    name="nomor_rekening_terlapor"
                    id="laporanv2-nomor-rekening-terlapor"
                    placeholder="Contoh: 0882194819"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-[14px] font-bold focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Nama Pemilik Rekening Pelaku</label>
                  <input
                    type="text"
                    name="nama_pemilik_rekening_terlapor"
                    placeholder="Nama di rekening penipu"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-bold text-slate-700">Nominal Kerugian Transaksi (Rp) *</label>
                  <input
                    type="text"
                    name="nominal_transaksi"
                    id="nominal_transaksi"
                    placeholder="Contoh: 15.000.000"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-[14px] font-bold focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Area Upload Dokumen PDF */}
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-[#0F766E]">
                <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                <div className="mt-2 text-[14px] font-bold text-slate-800">
                  Unggah Dokumen Bukti Transaksi (Evidence Pack PDF)
                </div>
                <p className="mt-1 text-[12px] text-slate-500">
                  Format didukung: PDF, JPG, PNG (Maks 5 MB).
                </p>
                <div className="mt-3">
                  <input
                    type="file"
                    name="detail[0].file_bukti_pendukung_kejadian"
                    id="file_bukti_pendukung_kejadian"
                    accept="image/jpeg,image/png,application/pdf"
                    className="inline-block text-[13px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#0F766E] file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-white hover:file:bg-[#0D625C]"
                  />
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-700">
                  <span>💡 Tip:</span>
                  <span>
                    Bisa diisi otomatis 1-klik atau di-drag langsung dari <strong>ScamGuard Dynamic Island</strong> di atas!
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Kembali
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0F766E] px-6 py-2.5 text-[14px] font-bold text-white shadow hover:bg-[#0D625C]"
                >
                  Simpan & Lanjut ke Kesediaan Melapor →
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Kesediaan Melapor (Final Submission & Captcha) */}
          {step === 5 && (
            <form id="form-scam-step5" onSubmit={handleSubmitFinal} className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">Kesediaan Melapor & Pernyataan Hukum</h2>
                <p className="mt-1 text-[13.5px] text-slate-500">
                  Tinjau kembali kebenaran data Anda sebelum mengirimkan laporan resmi ke IASC.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="agreementCheckbox"
                    name="agreement"
                    required
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span className="text-[13px] leading-relaxed text-slate-700">
                    Dengan ini saya menyatakan bahwa data dan bukti yang saya sampaikan adalah benar dan dapat
                    dipertanggungjawabkan di hadapan hukum. Saya memberikan kuasa kepada IASC untuk menindaklanjuti
                    laporan ini ke pihak perbankan terkait.
                  </span>
                </label>
              </div>

              {/* CAPTCHA Box */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-[13px] font-bold text-slate-700">
                  Verifikasi Keamanan (CAPTCHA) *
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-12 w-36 select-none items-center justify-center rounded-lg border border-slate-300 bg-slate-100 font-mono text-[22px] font-black tracking-widest text-slate-800 shadow-inner">
                    SG982A
                  </div>
                  <input
                    type="text"
                    id="CaptchaResponse"
                    name="CaptchaResponse"
                    required
                    placeholder="Ketik kode di atas"
                    className="w-48 rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-[15px] font-bold uppercase focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Kembali
                </button>
                <button
                  type="submit"
                  id="button-send"
                  className="rounded-lg bg-emerald-600 px-7 py-3 text-[14.5px] font-black text-white shadow-lg hover:bg-emerald-700 transition"
                >
                  🚀 Kirim Laporan Penipuan Resmi
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* SweetAlert2 Mock Modal (Saat Laporan Terkirim) */}
      {showSwal && (
        <div className="swal2-container fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="swal2-popup w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="mt-4 text-[20px] font-black text-slate-900">Laporan Berhasil Diajukan!</h3>
            <div className="swal2-html-container mt-2 text-[14px] text-slate-600">
              Laporan Anda telah diajukan dengan nomor laporan : <br />
              <p className="mt-1 font-mono text-[20px] font-black text-[#0F766E]">{generatedReportNo}</p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowSwal(false)}
                className="w-full rounded-lg bg-[#0F766E] py-2.5 text-[14px] font-bold text-white shadow hover:bg-[#0D625C]"
              >
                Selesai & Tutup
              </button>
              <Link
                href="/"
                className="w-full rounded-lg border border-slate-200 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Kembali ke Beranda ScamGuard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
