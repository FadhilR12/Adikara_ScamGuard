'use client';
import { useParams } from 'next/navigation';
import { EvidencePack } from '@/components/evidence/EvidencePack';

export default function EvidencePage() {
  const { id } = useParams<{ id: string }>();
  return <EvidencePack id={id} />;
}
