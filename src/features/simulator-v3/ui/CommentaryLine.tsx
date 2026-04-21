'use client';

import { type FeedbackTone } from './shared';

// ---------------------------------------------------------------------------
// Single-line commentary (fades on tone change, one sentence only)
// ---------------------------------------------------------------------------

export function CommentaryLine({ text, tone }: { text: string; tone: FeedbackTone }) {
  const color =
    tone === 'danger'
      ? 'var(--danger)'
      : tone === 'warn'
      ? 'var(--warning)'
      : tone === 'good'
      ? 'var(--success)'
      : 'var(--accent-cyan)';
  return (
    <div
      className="mx-2 lg:mx-0 mt-2 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-2 text-[12px] sm:text-[13px]"
      style={{ background: 'rgba(8, 24, 48, 0.5)', border: '1px solid rgba(0, 212, 255, 0.12)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[var(--text-secondary)] leading-snug">{text}</span>
    </div>
  );
}
