'use client';
import type { Evidence, Incident } from '@scamguard/shared';
import { API_URL } from './config';
import { getDeviceId } from './device';

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly field?: string) {
    super(message);
  }
}

/** Gagal terhubung ke server (offline / backend mati). */
export class NetworkError extends Error {}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Device-Id', getDeviceId());
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new NetworkError('Tidak dapat terhubung ke server.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL', e?.message ?? 'Terjadi kendala. Coba lagi sebentar lagi.', e?.field);
  }
  return data as T;
}

export const api = {
  createIncident: (body: { source: string; relatedDomain?: string }) =>
    apiFetch<Incident>('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  getIncident: (id: string) => apiFetch<Incident>(`/incidents/${id}`),
  patchIncident: (id: string, body: Partial<Incident>) =>
    apiFetch<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteIncident: (id: string) => apiFetch<void>(`/incidents/${id}`, { method: 'DELETE' }),
  listIncidents: () => apiFetch<Pick<Incident, 'id' | 'code' | 'status' | 'amount' | 'currentStep' | 'createdAt' | 'updatedAt'>[]>('/incidents'),
  listChecks: () =>
    apiFetch<{ id: string; inputType: string; source: string; target: string | null; score: number; level: 'low' | 'medium' | 'high'; createdAt: string }[]>('/risk/checks'),
  packGenerated: (id: string, props: Record<string, unknown>) =>
    apiFetch<Incident>(`/incidents/${id}/pack-generated`, { method: 'POST', body: JSON.stringify(props) }),
  deleteEvidence: (id: string) => apiFetch<void>(`/evidence/${id}`, { method: 'DELETE' }),
  patchEvidence: (id: string, category: string) =>
    apiFetch<Evidence>(`/evidence/${id}`, { method: 'PATCH', body: JSON.stringify({ category }) }),
  track: (name: string, props: Record<string, string | number | boolean> = {}) =>
    apiFetch('/events', { method: 'POST', body: JSON.stringify({ events: [{ name, props }] }) }).catch(() => {}),
};

/** Unggah dengan progress bar (XHR, karena fetch belum punya progress unggah). */
export function uploadEvidence(
  incidentId: string,
  file: File,
  fields: { category: string; ocrText?: string; ocrFields?: object },
  onProgress: (pct: number) => void,
): Promise<Evidence> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('category', fields.category);
    if (fields.ocrText) form.append('ocrText', fields.ocrText.slice(0, 20_000));
    if (fields.ocrFields) form.append('ocrFields', JSON.stringify(fields.ocrFields));
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/incidents/${incidentId}/evidence`);
    xhr.setRequestHeader('X-Device-Id', getDeviceId());
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || 'null');
      if (xhr.status === 201) resolve(data);
      else reject(new ApiError(xhr.status, data?.error?.code ?? 'INTERNAL', data?.error?.message ?? 'Gagal mengunggah. Coba lagi.'));
    };
    xhr.onerror = () => reject(new NetworkError('Gagal mengunggah. Coba lagi.'));
    xhr.send(form);
  });
}

/** File bukti butuh header X-Device-Id, jadi diambil sebagai blob (AC-10.4). */
export async function fetchEvidenceBlob(evidence: Evidence): Promise<Blob> {
  const res = await fetch(`${API_URL}/evidence/${evidence.id}/file`, { headers: { 'X-Device-Id': getDeviceId() } });
  if (!res.ok) throw new ApiError(res.status, 'NOT_FOUND', 'File tidak dapat diambil.');
  return res.blob();
}
