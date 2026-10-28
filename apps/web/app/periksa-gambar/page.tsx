'use client';
// Periksa screenshot percakapan: OCR di browser → analisis teks (AC-01.7).
import { analyze, defaultRules, isUsableRuleSet } from '@scamguard/risk-engine';
import type { RiskResult, RuleSet } from '@scamguard/shared';
import { LifeBuoy, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Dropzone, rejectReason } from '@/components/evidence/Dropzone';
import { Footer, Header } from '@/components/Header';
import { RiskView } from '@/components/RiskView';
import { Button, Spinner, buttonClass, useToast } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { OcrTimeoutError, recognize } from '@/lib/ocr';

const IMAGE_TYPES = ['image/png', 'image/jpeg'];

export default function PeriksaGambar() {
  const [rules, setRules] = useState<RuleSet>(defaultRules);
  const [busy, setBusy] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<RiskResult | null>(null);
  const toast = useToast();

  useEffect(() => {
    getDeviceId();
    apiFetch<RuleSet>('/rules').then((r) => isUsableRuleSet(r) && setRules({ ...r, fromServer: true })).catch(() => {});
  }, []);

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reason = rejectReason(file, 5 * 1024 * 1024, IMAGE_TYPES);
    if (reason) return toast(reason.includes('lebih dari') ? 'File lebih dari 5 MB.' : 'Gunakan gambar PNG atau JPG.');
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setBusy(0);
    try {
      const ocrText = await recognize(file, setBusy);
      setText(ocrText);
      if (!ocrText.trim()) {
        toast('Teks tidak terbaca otomatis. Coba gambar yang lebih jelas.');
        return;
      }
      const r = analyze({ type: 'text', value: ocrText.slice(0, 5000) }, rules);
      setResult(r);
      void apiFetch('/risk/check', {
        method: 'POST',
        body: JSON.stringify({ type: 'text', value: ocrText.slice(0, 5000), source: 'web', score: r.score, ruleHits: r.reasons.map((x) => x.ruleId) }),
      }).catch(() => {});
    } catch (e) {
      toast(e instanceof OcrTimeoutError ? e.message : 'Teks tidak terbaca otomatis. Silakan coba lagi.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Header crumbs={[{ label: 'Beranda', href: '/' }, { label: 'Periksa screenshot' }]} />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10 sm:px-8">
        <h1 className="text-[28px] font-extrabold tracking-tight">Periksa screenshot percakapan</h1>
        <p className="mt-1 text-[15px] text-ink-2">Gambar dibaca di peramban Anda (tidak dikirim ke layanan OCR pihak ketiga), lalu teksnya diperiksa.</p>

        <div className="mt-6">
          {busy !== null ? (
            <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-white p-10 text-center shadow-card" role="status">
              <Spinner className="h-6 w-6 text-primary" />
              <p className="text-[15px] font-semibold">Membaca gambar… ({busy}%)</p>
              <p className="text-[13px] text-ink-3">Pemakaian pertama perlu mengunduh data bahasa, mohon tunggu.</p>
            </div>
          ) : !result ? (
            <Dropzone id="shot" title="Screenshot percakapan" subtitle="PNG atau JPG · maks. 5 MB" multiple={false} accept={IMAGE_TYPES} onFiles={(f) => void onFiles(f)} />
          ) : (
            <div className="grid gap-5 md:grid-cols-[200px_1fr]">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Screenshot yang diperiksa" className="max-h-[360px] w-full rounded-card border border-line object-contain" />
              )}
              <div>
                <RiskView result={result} />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button variant="secondary" onClick={() => { setResult(null); setPreview(null); }}><RotateCcw className="h-4 w-4" aria-hidden /> Periksa gambar lain</Button>
                  <Link href="/darurat?src=web" className={buttonClass('ghost')}><LifeBuoy className="h-4 w-4" aria-hidden /> Sudah terlanjur transfer?</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {text && result && (
          <details className="mt-6 rounded-card border border-line bg-white p-4">
            <summary className="cursor-pointer text-[14px] font-semibold">Teks yang terbaca</summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-[13.5px] text-ink-2">{text}</pre>
          </details>
        )}
      </main>
      <Footer />
    </>
  );
}
