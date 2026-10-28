// Membuka tautan yang diperiksa manual (tanpa cookie) untuk mengetahui alamat tujuan
// setelah redirect dan membaca teksnya. Service worker tidak punya DOMParser, jadi HTML
// diurai dengan regex sederhana — cukup untuk analisis kata kunci.
import type { PageInput } from '@scamguard/shared';
import { MAX_PAGE_TEXT } from '@scamguard/risk-engine';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const PAYMENT_ATTR = /<input\b[^>]*(?:name|id|placeholder|aria-label)\s*=\s*["'][^"']*(nominal|jumlah|amount|rekening|norek|account|qris|transfer)/i;
const QRIS_IMG = /<img\b[^>]*alt\s*=\s*["'][^"']*qris/i;

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

export async function fetchPage(url: string, timeoutMs = 3000): Promise<PageInput | null> {
  try {
    const res = await fetch(url, { credentials: 'omit', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('html')) return { url: res.url || url, title: '', text: '', hasPaymentForm: false };
    const html = (await res.text()).slice(0, 1_500_000);
    const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim();
    const body = html
      .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    return {
      url: res.url || url,
      title,
      text: decode(body).replace(/\s+/g, ' ').trim().slice(0, MAX_PAGE_TEXT),
      hasPaymentForm: PAYMENT_ATTR.test(html) || QRIS_IMG.test(html),
      hasCountdown: /countdown|\b\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}\b/i.test(html),
    };
  } catch {
    return null;
  }
}
