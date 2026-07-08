'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

export default function SternikSubnav() {
  const pathname = usePathname();
  const { tp } = useI18n();

  const tabs = [
    { href: '/sternik', label: tp('Обзор', 'Overview', 'Przeglad'), icon: '⚓' },
    { href: '/sternik/teoria', label: tp('Теория', 'Theory', 'Teoria'), icon: '📖' },
    { href: '/sternik/test', label: tp('Тренажёр', 'Trainer', 'Trening'), icon: '🎯' },
    { href: '/sternik/egzamin', label: tp('Экзамен', 'Exam', 'Egzamin'), icon: '⏱️' },
  ];

  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Sternik">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition"
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
    </nav>
  );
}
