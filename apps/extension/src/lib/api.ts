// Klien backend. Semua panggilan bersifat opsional: bila backend mati, ekstensi tetap jalan (KNF-10).
import { API_URL, EXT_VERSION } from '../config';
import { getDeviceId } from './storage';

export async function api<T>(path: string, init: RequestInit = {}, timeoutMs = 4000): Promise<T | null> {
  try {
    const headers = new Headers(init.headers);
    headers.set('X-Device-Id', await getDeviceId());
    headers.set('X-Ext-Version', EXT_VERSION);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 304) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function track(name: string, props: Record<string, unknown> = {}): void {
  void api('/events', { method: 'POST', body: JSON.stringify({ events: [{ name, props }] }) });
}

/** URL tanpa query string & fragmen (AC-02.4). */
export function stripQuery(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}
