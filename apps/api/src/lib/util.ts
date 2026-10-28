import crypto from 'node:crypto';
import { normalizeNumber, parseUrl } from '@scamguard/risk-engine';

export const newId = (prefix = '') => `${prefix}${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;
export const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

/** Nomor ter-mask untuk ditampilkan: 0812****7781. */
export function maskNumber(raw: string): string {
  const d = normalizeNumber(raw);
  return d.length <= 8 ? d.replace(/\d(?=\d{2})/g, '*') : `${d.slice(0, 4)}${'*'.repeat(d.length - 8)}${d.slice(-4)}`;
}

export function urlWithoutQuery(raw: string): string | null {
  const u = parseUrl(raw);
  if (!u) return null;
  const url = new URL(u.href);
  return `${url.origin}${url.pathname}`;
}

export function hostOf(raw: string): string | null {
  return parseUrl(raw)?.host ?? null;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
