'use client';

import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';

const ReplayViewer = dynamic(() => import('./ReplayViewer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-[var(--text-muted)]">
      Loading replay...
    </div>
  ),
});

export default function ReplayPage() {
  const { tp } = useI18n();
  return (
    <>
      <span className="sr-only">
        {tp('Загрузка replay', 'Loading replay', 'Ladowanie powtorki', { es: 'Cargando repeticion', fr: 'Chargement du rejeu', de: 'Replay wird geladen', it: 'Caricamento replay' })}
      </span>
      <ReplayViewer />
    </>
  );
}
