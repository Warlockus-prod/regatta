'use client';

import Link from 'next/link';
import { quickRefreshLessons, QUICK_REFRESH_TOTAL_MINUTES } from '@/data/bootcamp';
import { useI18n } from '@/lib/i18n';

export default function QuickRefreshPage() {
  const { lang, tp } = useI18n();

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(68, 255, 136, 0.1)', border: '1px solid rgba(68, 255, 136, 0.25)', color: 'var(--success)' }}>
          ⚡ {tp('Быстрое освежение', 'Quick refresh', 'Szybkie odswiezenie')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {QUICK_REFRESH_TOTAL_MINUTES} {tp('минут перед стартом', 'min before start', 'minut przed startem')}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Для тех у кого опыт уже есть и регата - завтра. 6 ключевых тем без воды.',
            'For experienced sailors with a regatta tomorrow. 6 key topics, no filler.',
            'Dla doswiadczonych zeglarzy, ktorzy maja regate jutro. 6 kluczowych tematow, bez ogolnikow.',
          )}
        </p>
      </div>

      <div className="space-y-3">
        {quickRefreshLessons.map((l, i) => {
          const title = lang === 'pl' ? l.titlePl : lang === 'en' ? l.titleEn : l.titleRu;
          const tip = lang === 'pl' ? l.tipPl : lang === 'en' ? l.tipEn : l.tipRu;
          return (
            <Link
              key={l.id}
              href={l.route}
              className="card p-4 sm:p-5 flex items-center gap-4 hover:border-[var(--success)] transition"
            >
              <span className="text-xs font-mono text-[var(--text-muted)] w-6">#{i + 1}</span>
              <span className="text-2xl">{l.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(68, 255, 136, 0.15)', color: 'var(--success)' }}>
                    {l.estMinutes} {tp('мин', 'min', 'min')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{tip}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] shrink-0">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 p-4 card text-center text-sm text-[var(--text-secondary)]">
        {tp(
          'Если хочешь полный маршрут на 45+ минут -',
          'If you want the full 45+ min path -',
          'Jesli chcesz pelna sciezke na 45+ minut -',
        )}{' '}
        <Link href="/start" className="text-[var(--accent-cyan)] hover:underline">
          Bootcamp
        </Link>
      </div>
    </div>
  );
}
