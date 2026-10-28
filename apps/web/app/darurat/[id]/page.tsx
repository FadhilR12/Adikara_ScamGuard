'use client';
import { useParams } from 'next/navigation';
import { EmergencyMode } from '@/components/emergency/EmergencyMode';

export default function EmergencyPage() {
  const { id } = useParams<{ id: string }>();
  return <EmergencyMode id={id} />;
}
