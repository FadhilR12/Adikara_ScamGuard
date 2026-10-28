'use client';
// /darurat — membuat incident baru lalu mengalihkan ke /darurat/[id] (PRD 11.1).
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { createLocalIncident } from '@/lib/useIncident';
import { getDeviceId } from '@/lib/device';

const SOURCES = ['popup', 'overlay', 'result', 'web'];

function Start() {
  const router = useRouter();
  const params = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    getDeviceId(); // simpan ?d= dari ekstensi
    const src = SOURCES.includes(params.get('src') ?? '') ? params.get('src')! : 'web';
    const domain = params.get('domain')?.slice(0, 253) || undefined;
    (async () => {
      try {
        const incident = await api.createIncident({ source: src, relatedDomain: domain });
        router.replace(`/darurat/${incident.id}`);
      } catch {
        // Backend tidak dapat dihubungi → tetap pandu pengguna; progres disimpan di perangkat (KNF-10).
        router.replace(`/darurat/${createLocalIncident(src, domain).id}`);
      }
    })();
  }, [params, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" aria-hidden />
      <p className="text-[16px] text-ink-2">Menyiapkan panduan darurat…</p>
    </main>
  );
}

export default function DaruratPage() {
  return <Suspense><Start /></Suspense>;
}
