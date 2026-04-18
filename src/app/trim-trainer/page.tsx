'use client';

import dynamic from 'next/dynamic';

const TrimTrainerClient = dynamic(() => import('./TrimTrainerClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-[var(--text-muted)]">
      Загружаю тренажёр трима…
    </div>
  ),
});

export default function TrimTrainerPage() {
  return <TrimTrainerClient />;
}
