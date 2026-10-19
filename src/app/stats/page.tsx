import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { checkAdminAuth } from '@/lib/admin-auth';
import { listFeedback, type FeedbackListItem } from '@/lib/db';
import FeedbackAdmin from './FeedbackAdmin';
import StatsDashboard from './StatsDashboard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Admin dashboard - never expose to search engines. Even though it's
// auth-gated by proxy.ts, defense-in-depth: emit explicit robots noindex
// metadata so a misconfigured crawler that finds the URL (e.g. via leak)
// still drops it from the index.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function StatsPage() {
  // src/proxy.ts answers 401 with the Basic-Auth challenge before this runs.
  // Re-checked here so the page never renders analytics if the proxy is
  // bypassed or its matcher changes; a page cannot send 401, so 404.
  if (checkAdminAuth((await headers()).get('authorization')) !== 'ok') notFound();

  // No IP or raw user agent in these rows: they are serialized to the browser.
  let feedback: FeedbackListItem[] = [];
  try {
    feedback = listFeedback(100);
  } catch {
    // DB may be unavailable on first boot; dashboard will show its own error.
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Regatta Stats</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Range-picker + real-time. Auto-refreshes every 15 sec when LIVE is on.
        </p>
      </div>

      <StatsDashboard />

      <div className="mt-8 border-t border-[rgba(0,212,255,0.1)] pt-6">
        <FeedbackAdmin items={feedback} />
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-8">
        Data source: /data/regatta-stats.db (Docker volume). Auth via proxy.ts basic auth.
      </p>
    </div>
  );
}
