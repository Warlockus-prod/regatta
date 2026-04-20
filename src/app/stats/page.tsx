import { listFeedback, type FeedbackRow } from '@/lib/db';
import FeedbackAdmin from './FeedbackAdmin';
import StatsDashboard from './StatsDashboard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function StatsPage() {
  let feedback: FeedbackRow[] = [];
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
