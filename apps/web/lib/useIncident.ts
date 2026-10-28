'use client';
// Data incident + autosave (AC-05.8, AC-07.3): PATCH debounce 800 ms ke backend,
// cadangan di localStorage.sg_incident_<id>, dan mode lokal bila backend tidak dapat dihubungi.
import { computeCompleteness, type Evidence, type Incident } from '@scamguard/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError, api } from './api';

export type SaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'error';
export type IncidentPatch = Partial<Omit<Incident, 'id' | 'code' | 'evidence' | 'completeness' | 'createdAt' | 'updatedAt'>>;

const DEBOUNCE_MS = 800;
const backupKey = (id: string) => `sg_incident_${id}`;

export const isLocalIncident = (id: string) => id.startsWith('local-');

function withCompleteness(i: Incident): Incident {
  return { ...i, completeness: computeCompleteness(i, i.evidence ?? []) };
}

type Backup = Incident & { _dirty?: IncidentPatch };

function readBackup(id: string): Backup | null {
  try {
    const raw = localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as Backup) : null;
  } catch {
    return null;
  }
}

/** `dirty` = perubahan yang belum terkirim ke server; dikirim ulang saat halaman dimuat lagi. */
function writeBackup(i: Incident, dirty?: IncidentPatch): void {
  try {
    // Bukti lokal tidak dicadangkan (blob hanya di memori).
    const data: Backup = { ...i, evidence: isLocalIncident(i.id) ? [] : i.evidence, _dirty: dirty && Object.keys(dirty).length ? dirty : undefined };
    localStorage.setItem(backupKey(i.id), JSON.stringify(data));
  } catch {
    /* penyimpanan penuh / diblokir — abaikan */
  }
}

export function createLocalIncident(source: string, relatedDomain?: string): Incident {
  const id = `local-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const incident = withCompleteness({
    id, code: `SG-LOKAL-${id.slice(6, 10).toUpperCase()}`, status: 'draft', currentStep: 0, checklist: {}, source,
    relatedDomain: relatedDomain ?? null, relatedAccounts: relatedDomain ? [relatedDomain] : [], createdAt: now, updatedAt: now, evidence: [],
  });
  writeBackup(incident);
  return incident;
}

export function useIncident(id: string) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const pending = useRef<IncidentPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const local = isLocalIncident(id);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (local) {
        const backup = readBackup(id);
        if (backup) setIncident(withCompleteness({ ...backup, evidence: backup.evidence ?? [] }));
        else setLoadError('Laporan lokal ini tidak ditemukan di perangkat.');
        setSave('offline');
        return;
      }
      try {
        const data = await api.getIncident(id);
        if (cancelled) return;
        const dirty = readBackup(id)?._dirty;
        if (dirty) {
          // Perubahan dari sesi sebelumnya yang belum tersimpan di server.
          setIncident(withCompleteness({ ...data, ...dirty, checklist: { ...data.checklist, ...dirty.checklist } }));
          pending.current = dirty;
          void flushRef.current();
        } else {
          setIncident(withCompleteness(data));
        }
      } catch (e) {
        if (cancelled) return;
        const backup = readBackup(id);
        if (e instanceof NetworkError && backup) {
          setIncident(withCompleteness(backup));
          setSave('offline');
        } else {
          setLoadError(e instanceof Error ? e.message : 'Laporan tidak dapat dimuat.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, local]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const patch = pending.current;
    if (local || !Object.keys(patch).length) {
      if (local) setSave('offline');
      return;
    }
    pending.current = {};
    setSave('saving');
    try {
      const server = await api.patchIncident(id, patch);
      setIncident((prev) => {
        if (!prev) return prev;
        const next = withCompleteness({ ...prev, status: server.status, updatedAt: server.updatedAt });
        writeBackup(next, pending.current);
        return next;
      });
      setSave('saved');
      setSaveError(null);
    } catch (e) {
      pending.current = { ...patch, ...pending.current };
      if (e instanceof NetworkError) setSave('offline');
      else {
        setSave('error');
        setSaveError(e instanceof ApiError ? e.message : 'Gagal menyimpan.');
      }
    }
  }, [id, local]);

  flushRef.current = flush;

  // Saat kembali online, kirim perubahan yang tertunda.
  useEffect(() => {
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  const update = useCallback(
    (patch: IncidentPatch) => {
      pending.current = {
        ...pending.current,
        ...patch,
        ...(patch.checklist ? { checklist: { ...pending.current.checklist, ...patch.checklist } } : {}),
      };
      const dirty = pending.current;
      setIncident((prev) => {
        if (!prev) return prev;
        const next = withCompleteness({
          ...prev,
          ...patch,
          checklist: patch.checklist ? { ...prev.checklist, ...patch.checklist } : prev.checklist,
          updatedAt: new Date().toISOString(),
        });
        writeBackup(next, dirty);
        return next;
      });
      setSave(local ? 'offline' : 'saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush, local],
  );

  const setEvidence = useCallback((fn: (list: Evidence[]) => Evidence[]) => {
    setIncident((prev) => {
      if (!prev) return prev;
      const next = withCompleteness({ ...prev, evidence: fn(prev.evidence ?? []) });
      writeBackup(next);
      return next;
    });
  }, []);

  const replace = useCallback((next: Incident) => setIncident(withCompleteness(next)), []);

  // Saat komponen dilepas (pindah halaman), kirim perubahan yang tertunda.
  useEffect(() => () => void flushRef.current(), []);

  return { incident, loadError, save, saveError, update, flush, setEvidence, replace, local };
}

export function clearIncidentBackup(id: string): void {
  try {
    localStorage.removeItem(backupKey(id));
  } catch {
    /* abaikan */
  }
}
