'use client';

import dynamic from 'next/dynamic';

const MultiplayerClient = dynamic(() => import('./MultiplayerClient'), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[70vh] flex items-center justify-center text-sm text-[var(--text-muted)]"
      role="status"
      aria-live="polite"
    >
      Загрузка мультиплеера / Loading multiplayer
    </div>
  ),
});

export default function MultiplayerPage() {
  return <MultiplayerClient />;
}
