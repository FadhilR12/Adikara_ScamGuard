// Ekstraksi URL & teks halaman (AC-02.2, PRD 10.4). Hanya dibaca di perangkat.
import { MAX_PAGE_TEXT } from '@scamguard/risk-engine';
import type { PageInput } from '@scamguard/shared';

const PAYMENT_RE = /(nominal|jumlah|amount|rekening|norek|account|qris|transfer)/i;

function labelText(input: HTMLInputElement): string {
  const byFor = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent : '';
  return [input.name, input.id, input.placeholder, input.getAttribute('aria-label'), byFor, input.closest('label')?.textContent]
    .filter(Boolean)
    .join(' ');
}

export function detectPaymentForm(): boolean {
  const inputs = document.querySelectorAll<HTMLInputElement>('input:not([type=password]):not([type=hidden]), textarea');
  for (const input of inputs) if (PAYMENT_RE.test(labelText(input as HTMLInputElement))) return true;
  return !!document.querySelector('img[alt*="qris" i]');
}

function detectCountdown(text: string): boolean {
  return (
    !!document.querySelector('[class*="countdown" i], [id*="countdown" i], [class*="timer" i], [id*="timer" i]') ||
    /\b\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}\b/.test(text)
  );
}

function texts(selector: string, limit: number): string {
  return Array.from(document.querySelectorAll<HTMLElement>(selector), (el) => el.textContent?.trim() ?? '')
    .filter(Boolean)
    .slice(0, limit)
    .join('\n');
}

export function extractPage(): PageInput {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '';
  // Bagian penting dulu, lalu isi halaman; total dipotong 20.000 karakter.
  const priority = [meta, texts('h1, h2, h3', 60), texts('button, a, [role=button]', 200), texts('label', 100)].join('\n');
  const body = document.body?.innerText ?? '';
  const text = `${priority}\n${body}`.slice(0, MAX_PAGE_TEXT);
  return {
    url: location.href,
    title: document.title,
    text,
    hasPaymentForm: detectPaymentForm(),
    hasCountdown: detectCountdown(body.slice(0, MAX_PAGE_TEXT)),
  };
}
