'use client';

import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';

// Placeholder while the multiplayer bundle streams in. Like LoadingRace in
// src/app/game/page.tsx it renders inside the root I18nProvider, so the text
// follows the visitor's language instead of a hardcoded "RU / EN" pair.
function LoadingMultiplayer() {
  const { tp } = useI18n();
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center text-sm text-[var(--text-muted)]"
      role="status"
      aria-live="polite"
    >
      {tp('Загрузка мультиплеера...', 'Loading multiplayer...', 'Ładowanie trybu wieloosobowego...', {
        es: 'Cargando el multijugador...',
        fr: 'Chargement du multijoueur...',
        de: 'Mehrspieler wird geladen...',
        it: 'Caricamento del multigiocatore...',
      })}
    </div>
  );
}

const MultiplayerClient = dynamic(() => import('./MultiplayerClient'), {
  ssr: false,
  loading: LoadingMultiplayer,
});

export default function MultiplayerPage() {
  return <MultiplayerClient />;
}
