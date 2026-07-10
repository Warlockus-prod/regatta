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
    { href: '/sternik', label: tp('Обзор', 'Overview', 'Przeglad'), icon: '⚓' },
    { href: '/sternik/teoria', label: tp('Теория', 'Theory', 'Teoria'), icon: '📖' },
    { href: '/sternik/test', label: tp('Тренажёр', 'Trainer', 'Trening'), icon: '🎯' },
    { href: '/sternik/egzamin', label: tp('Экзамен', 'Exam', 'Egzamin'), icon: '⏱️' },
    { href: '/radio', label: tp('Рация SRC', 'Radio SRC', 'Radio SRC'), icon: '📻' },
  ];

  // Keep the active tab in view (Egzamin was cut off on the right on mobile).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 pb-1" aria-label="Sternik">
      <div className="flex gap-2 overflow-x-auto">
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
                  ? { background: 'var(--accent-cyan)', color: '#04222e' }
                  : {
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }
              }
            >
              {t.icon} {t.label}
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
