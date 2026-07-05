'use client';

import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';

// Spinner shown while the game bundle streams in. next/dynamic renders the
// `loading` option as a React component INSIDE the root I18nProvider (see
// src/app/layout.tsx), so useI18n works here and the text follows the
// visitor's language - the old hardcoded "RU / EN" pair leaked Russian to
// the other five languages.
function LoadingRace() {
  const { tp } = useI18n();
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center text-sm text-[var(--text-muted)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-full pulse-gentle"
          style={{ background: 'rgba(0, 212, 255, 0.25)', border: '2px solid var(--accent-cyan)' }}
        />
        <div>
          {tp('Загрузка гонки...', 'Loading race...', 'Ladowanie wyscigu...', {
            es: 'Cargando la regata...',
            fr: 'Chargement de la course...',
            de: 'Rennen wird geladen...',
            it: 'Caricamento della regata...',
          })}
        </div>
      </div>
    </div>
  );
}

// Game page is 2500+ lines of canvas + physics + UI.
// Lazy-loaded so it doesn't bloat the initial JS bundle for users who never
// open /game (most visitors to the home page).
const GameClient = dynamic(() => import('./GameClient'), {
  ssr: false,
  loading: LoadingRace,
});

export default function GamePage() {
  return <GameClient />;
}
