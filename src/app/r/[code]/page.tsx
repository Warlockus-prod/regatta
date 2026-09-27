'use client';

import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';

// Placeholder while the viewer bundle streams in. It renders inside the root
// I18nProvider (same as LoadingRace in src/app/game/page.tsx), so the text
// follows the visitor's language instead of a hardcoded English string.
function LoadingReplay() {
  const { tp } = useI18n();
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-[var(--text-muted)]">
      {tp('Загрузка replay...', 'Loading replay...', 'Ładowanie powtórki...', { es: 'Cargando la repetición...', fr: 'Chargement du replay...', de: 'Replay wird geladen...', it: 'Caricamento del replay...' })}
    </div>
  );
}

const ReplayViewer = dynamic(() => import('./ReplayViewer'), {
  ssr: false,
  loading: LoadingReplay,
});

export default function ReplayPage() {
  const { tp } = useI18n();
  return (
    <>
      <span className="sr-only">
        {tp('Загрузка replay', 'Loading replay', 'Ładowanie powtórki', { es: 'Cargando la repetición', fr: 'Chargement du replay', de: 'Replay wird geladen', it: 'Caricamento del replay' })}
      </span>
      <ReplayViewer />
    </>
  );
}
