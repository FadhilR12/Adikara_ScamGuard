'use client';
// OCR di browser dengan Tesseract.js (ind+eng). Gambar tidak dikirim ke layanan OCR pihak ketiga (AC-08.5);
// hanya data bahasa (traineddata) yang diunduh dari CDN saat pertama kali dipakai.
import type { Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;
let progressListener: ((pct: number) => void) | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('ind+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') progressListener?.(Math.round(m.progress * 100));
        },
      }),
    );
    workerPromise.catch(() => (workerPromise = null));
  }
  return workerPromise;
}

export class OcrTimeoutError extends Error {}

/** Baca teks dari gambar; gagal bila lebih dari `timeoutMs` (AC-08.2). */
export async function recognize(file: Blob, onProgress: (pct: number) => void, timeoutMs = 20_000): Promise<string> {
  progressListener = onProgress;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new OcrTimeoutError('Teks tidak terbaca otomatis. Silakan isi manual.')), timeoutMs);
  });
  try {
    const worker = await Promise.race([getWorker(), timeout]);
    const { data } = await Promise.race([worker.recognize(file), timeout]);
    return data.text;
  } finally {
    clearTimeout(timer);
    progressListener = null;
  }
}
