'use client';
// deviceId anonim: dari query ?d= (dikirim ekstensi) → localStorage.sg_device; jika tidak ada, buat baru (PRD 11.2).
const KEY = 'sg_device';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const fromQuery = new URLSearchParams(window.location.search).get('d');
  if (fromQuery && UUID.test(fromQuery)) {
    localStorage.setItem(KEY, fromQuery.toLowerCase());
    return fromQuery.toLowerCase();
  }
  let id = localStorage.getItem(KEY);
  if (!id || !UUID.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
