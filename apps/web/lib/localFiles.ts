'use client';
// Bukti untuk incident lokal (saat backend tidak dapat dihubungi) disimpan di memori sesi ini saja.
const files = new Map<string, Blob>();
export const localFiles = {
  set: (id: string, blob: Blob) => files.set(id, blob),
  get: (id: string) => files.get(id),
  delete: (id: string) => files.delete(id),
};
