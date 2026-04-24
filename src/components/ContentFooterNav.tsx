'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// ContentFooterNav
//
// Small footer card shown at the bottom of reference content pages
// (/onboard, /anatomy, /checklist) to give the user a way OUT back to the
// course hub and to adjacent references, instead of relying on the top nav.
//
// A reader who landed here from /start expected to "finish" the page and
// return to the curriculum. Without this card they had to guess at the top
// navigation. Keep it visually low-key so it never competes with the main
// content - it's a way-finder, not a CTA.
// ---------------------------------------------------------------------------

interface RelatedLink {
  href: string;
  icon: string;
  labelRu: string;
  labelEn: string;
  labelPl: string;
  labelEs?: string;
  labelFr?: string;
  labelDe?: string;
  labelIt?: string;
}

const SIBLINGS: Record<string, RelatedLink[]> = {
  '/onboard': [
    { href: '/checklist', icon: '✅', labelRu: 'Чек-лист к регате', labelEn: 'Pre-race checklist', labelPl: 'Lista przed regata', labelEs: 'Checklist pre-regata', labelFr: 'Checklist pre-regate', labelDe: 'Pre-Race-Checkliste', labelIt: 'Checklist pre-regata' },
    { href: '/anatomy', icon: '🔧', labelRu: 'Устройство яхты', labelEn: 'Yacht anatomy', labelPl: 'Budowa jachtu', labelEs: 'Anatomia del velero', labelFr: 'Anatomie du voilier', labelDe: 'Aufbau der Yacht', labelIt: 'Anatomia della barca' },
  ],
  '/anatomy': [
    { href: '/onboard', icon: '⚓', labelRu: 'Первая неделя на борту', labelEn: 'First week on board', labelPl: 'Pierwszy tydzien na pokladzie', labelEs: 'Primera semana a bordo', labelFr: 'Premiere semaine a bord', labelDe: 'Erste Woche an Bord', labelIt: 'Prima settimana a bordo' },
    { href: '/glossary', icon: '📖', labelRu: 'Глоссарий', labelEn: 'Glossary', labelPl: 'Slownik', labelEs: 'Glosario', labelFr: 'Glossaire', labelDe: 'Glossar', labelIt: 'Glossario' },
  ],
  '/checklist': [
    { href: '/onboard', icon: '⚓', labelRu: 'Первая неделя на борту', labelEn: 'First week on board', labelPl: 'Pierwszy tydzien na pokladzie', labelEs: 'Primera semana a bordo', labelFr: 'Premiere semaine a bord', labelDe: 'Erste Woche an Bord', labelIt: 'Prima settimana a bordo' },
    { href: '/rules', icon: '📜', labelRu: 'Правила расхождения', labelEn: 'Rules of the road', labelPl: 'Przepisy drogowe', labelEs: 'Reglas de navegacion', labelFr: 'Regles de route', labelDe: 'Vorfahrtsregeln', labelIt: 'Regole di rotta' },
  ],
  '/rules': [
    { href: '/racing', icon: '🏁', labelRu: 'Гоночные стратегии', labelEn: 'Racing strategy', labelPl: 'Strategie regatowe', labelEs: 'Estrategia de regatas', labelFr: 'Strategie de regate', labelDe: 'Regattataktik', labelIt: 'Strategia di regata' },
    { href: '/glossary', icon: '📖', labelRu: 'Глоссарий', labelEn: 'Glossary', labelPl: 'Slownik', labelEs: 'Glosario', labelFr: 'Glossaire', labelDe: 'Glossar', labelIt: 'Glossario' },
  ],
  '/gallery': [
    { href: '/anatomy', icon: '🔧', labelRu: 'Устройство яхты', labelEn: 'Yacht anatomy', labelPl: 'Budowa jachtu', labelEs: 'Anatomia del velero', labelFr: 'Anatomie du voilier', labelDe: 'Aufbau der Yacht', labelIt: 'Anatomia della barca' },
    { href: '/courses', icon: '🧭', labelRu: 'Курсы относительно ветра', labelEn: 'Points of sail', labelPl: 'Kursy wzgledem wiatru', labelEs: 'Rumbos respecto al viento', labelFr: 'Allures', labelDe: 'Windkurse', labelIt: 'Andature' },
  ],
};

function pickLabel(link: RelatedLink, lang: string): string {
  switch (lang) {
    case 'ru': return link.labelRu;
    case 'pl': return link.labelPl;
    case 'es': return link.labelEs ?? link.labelEn;
    case 'fr': return link.labelFr ?? link.labelEn;
    case 'de': return link.labelDe ?? link.labelEn;
    case 'it': return link.labelIt ?? link.labelEn;
    default:   return link.labelEn;
  }
}

export default function ContentFooterNav({ page }: { page: '/onboard' | '/anatomy' | '/checklist' | '/rules' | '/gallery' }) {
  const { lang, tp } = useI18n();
  const siblings = SIBLINGS[page] ?? [];

  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 mt-12 mb-8"
    >
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{
          background: 'rgba(0, 212, 255, 0.04)',
          border: '1px solid rgba(0, 212, 255, 0.18)',
        }}
      >
        <div className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--accent-cyan)' }}>
          {tp('Куда дальше', 'Where to next', 'Co dalej')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/start"
            className="flex items-center gap-3 p-3 rounded-lg transition hover:bg-[rgba(0,212,255,0.08)]"
            style={{
              background: 'rgba(0, 212, 255, 0.08)',
              border: '1px solid rgba(0, 212, 255, 0.25)',
            }}
          >
            <span className="text-xl shrink-0">🎓</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                ← {tp('К курсу', 'Back to course', 'Do kursu')}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">
                {tp('Полный курс с нуля', 'Full bootcamp', 'Pelny kurs od zera')}
              </div>
            </div>
          </Link>

          {siblings.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 p-3 rounded-lg transition hover:bg-[rgba(139,167,184,0.08)]"
              style={{
                background: 'rgba(139, 167, 184, 0.05)',
                border: '1px solid rgba(139, 167, 184, 0.18)',
              }}
            >
              <span className="text-xl shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {pickLabel(s, lang)}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">
                  {s.href}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
