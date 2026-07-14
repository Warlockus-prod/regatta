'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { ExplLangToggle } from '../sternik/prefs';

export default function RadioSubnav() {
  const pathname = usePathname();
  const { tp } = useI18n();

  const tabs = [
    { href: '/radio', label: tp('Рация и SRC', 'Radio and SRC', 'Radio i SRC'), icon: '📻' },
    { href: '/radio/obsluga', label: tp('Путеводитель', 'Guide', 'Poradnik'), icon: '🛠️' },
    { href: '/radio/symulator', label: tp('Симулятор', 'Simulator', 'Symulator'), icon: '🎙️' },
    { href: '/radio/rozmowa', label: tp('Живой разговор', 'Live conversation', 'Rozmowa na zywo'), icon: '🗣️' },
    { href: '/radio/pozycja', label: tp('Диктовка позиции', 'Position dictation', 'Dyktowanie pozycji'), icon: '🧭' },
    { href: '/radio/zadania', label: tp('26 заданий', '26 tasks', '26 zadan'), icon: '📋' },
    { href: '/radio/test', label: tp('Тренажёр UKE', 'UKE trainer', 'Trening UKE'), icon: '✅' },
    { href: '/radio/sciaga', label: tp('Шпаргалка', 'Cheat sheet', 'Sciaga'), icon: '📄' },
  ];

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 pb-1" aria-label="Radio">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition"
              style={
                active
                  ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
              }
            >
              {t.icon} {t.label}
            </Link>
          );
        })}
        <Link
          href="/sternik"
          className="flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)' }}
        >
          ⚓ {tp('Патент sternika', 'Sternik licence', 'Patent sternika')}
        </Link>
      </div>
      <div className="ml-auto">
        <ExplLangToggle />
      </div>
    </nav>
  );
}
