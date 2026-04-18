'use client';

import dynamic from 'next/dynamic';

const ReplayViewer = dynamic(() => import('./ReplayViewer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-[var(--text-muted)]">
      Загружаю replay…
    </div>
  ),
});

export default function ReplayPage() {
  return <ReplayViewer />;
}
