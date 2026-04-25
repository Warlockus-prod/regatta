'use client';

// ============================================================================
// BootcampProgressChip
//
// Small chip in the top nav: "3/8" with a tiny progress bar. Clicking it
// navigates to /start and scrolls to the current lesson. Visible only when
// the user has started bootcamp but hasn't finished it (1..7 completed).
// Hidden on the /start page itself (no point when you're there already).
// ============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { bootcampLessons } from '@/data/bootcamp';
import { getBootcampProgress } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';

export default function BootcampProgressChip() {
  const { tp } = useI18n();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const read = () => setCompletedCount(getBootcampProgress().completed.length);
    read();
    // Listen for focus (user may have marked lessons in another tab)
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);

  if (!mounted) return null;
  if (pathname === '/start') return null;
  if (completedCount === 0) return null;
  if (completedCount >= bootcampLessons.length) return null;

  const pct = Math.round((completedCount / bootcampLessons.length) * 100);

  return (
    <Link
      href="/start"
      className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-full border text-[11px] font-semibold transition hover:bg-[rgba(0,212,255,0.08)]"
      style={{
        borderColor: 'rgba(0, 212, 255, 0.25)',
        color: 'var(--accent-cyan)',
      }}
      title={tp('Вернуться к курсу', 'Back to course', 'Wroc do kursu',
        { es: 'Volver al curso', fr: 'Retour au cours', de: 'Zurueck zum Kurs', it: 'Torna al corso' })}
    >
      <span>📚</span>
      <span>{completedCount}/{bootcampLessons.length}</span>
      <span
        className="w-10 h-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        aria-hidden="true"
      >
        <span
          className="block h-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--success))',
          }}
        />
      </span>
    </Link>
  );
}
