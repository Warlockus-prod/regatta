'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { ExplLangToggle } from './prefs';

export default function SternikSubnav() {
  const pathname = usePathname();
  const { tp } = useI18n();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  const tabs = [
    { href: '/sternik', label: tp('Обзор', 'Overview', 'Przegląd') },
    { href: '/sternik/teoria', label: tp('Теория', 'Theory', 'Teoria') },
    { href: '/sternik/test', label: tp('Тренажёр', 'Trainer', 'Trening') },
    { href: '/sternik/egzamin', label: tp('Экзамен', 'Exam', 'Egzamin') },
    { href: '/sternik/ustny', label: tp('Устный ответ', 'Oral answer', 'Odpowiedź ustna') },
  ];

  // The tabs wrap on a phone: a row that scrolled off the right edge hid the exam.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 pb-1" aria-label="Sternik">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              ref={active ? activeRef : undefined}
              className="flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition"
              style={
                active
                  ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
                  : {
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <div className="ml-auto">
        <ExplLangToggle />
      </div>
    </nav>
  );
}
