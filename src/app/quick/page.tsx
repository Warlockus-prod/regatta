'use client';

import Link from 'next/link';
import { legacyPick } from '@/lib/languages';
import { quickRefreshLessons, QUICK_REFRESH_TOTAL_MINUTES } from '@/data/bootcamp';
import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

export default function QuickRefreshPage() {
  const { lang, tp } = useI18n();

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(68, 255, 136, 0.1)', border: '1px solid rgba(68, 255, 136, 0.25)', color: 'var(--success)' }}>
          ⚡ {tp('Быстрое освежение', 'Quick refresh', 'Szybkie odswiezenie',
            { es: 'Repaso rapido', fr: 'Rappel rapide', de: 'Schnelle Auffrischung', it: 'Ripasso rapido' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {QUICK_REFRESH_TOTAL_MINUTES} {tp('минут перед стартом', 'min before start', 'minut przed startem',
            { es: 'min antes de la salida', fr: 'min avant le depart', de: 'Min vor dem Start', it: 'min prima della partenza' })}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Для тех у кого опыт уже есть и регата - завтра. 6 ключевых тем без воды.',
            'For experienced sailors with a regatta tomorrow. 6 key topics, no filler.',
            'Dla doswiadczonych zeglarzy, ktorzy maja regate jutro. 6 kluczowych tematow, bez ogolnikow.',
            {
              es: 'Para navegantes con experiencia que tienen una regata manana. 6 temas clave, sin relleno.',
              fr: 'Pour les navigateurs experimentes qui ont une regate demain. 6 sujets cles, sans remplissage.',
              de: 'Fuer erfahrene Segler mit einer Regatta morgen. 6 zentrale Themen, ohne Fuellstoff.',
              it: 'Per velisti esperti con una regata domani. 6 temi chiave, senza riempitivi.',
            },
          )}
        </p>
      </div>

      <div className="space-y-3">
        {quickRefreshLessons.map((l, i) => {
          const title = legacyPick(l, 'title', lang);
          const tip = legacyPick(l, 'tip', lang);
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
                    {l.estMinutes} {tp('мин', 'min', 'min', { es: 'min', fr: 'min', de: 'Min', it: 'min' })}
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
          {
            es: 'Si quieres la ruta completa de 45+ min -',
            fr: 'Si tu veux le parcours complet de 45+ min -',
            de: 'Wenn du den vollen Pfad ab 45+ Min willst -',
            it: 'Se vuoi il percorso completo da 45+ min -',
          },
        )}{' '}
        <Link href="/start" className="text-[var(--accent-cyan)] hover:underline">
          Bootcamp
        </Link>
      </div>

      <ContentFooterNav page="/quick" />
    </div>
  );
}
