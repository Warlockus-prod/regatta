'use client';

import dynamic from 'next/dynamic';

// Game page is 2500+ lines of canvas + physics + UI.
// Lazy-loaded so it doesn't bloat the initial JS bundle for users who never
// open /game (most visitors to the home page).
const GameClient = dynamic(() => import('./GameClient'), {
  ssr: false,
  loading: () => (
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
        <div>Загрузка гонки / Loading race</div>
      </div>
    </div>
  ),
});

export default function GamePage() {
  return <GameClient />;
}
