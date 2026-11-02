// Mission titles, the one source of each mission's name (M5 step 8): the
// missions (src/data/missions.ts) spread them in, and the leaderboard's
// mission picker reads only these, so its page does not ship the mission
// descriptions, hints and evaluator. Same flat fields as missions.ts, so the
// translation scripts (scripts/translate-data-flat.mjs) read this file too.

import type { LegacyLocalized } from '@/lib/languages';

export const MISSION_TITLES = {
  'clean-laps': {
    titleRu: 'Чистая гонка',
    titleEn: 'Clean race',
    titlePl: 'Czysty wyścig',
    titleEs: 'Regata limpia',
    titleFr: 'Course propre',
    titleDe: 'Sauberes Rennen',
    titleIt: 'Regata pulita',
  },
  'sub-90': {
    titleRu: 'Под 90 секунд',
    titleEn: 'Sub 90 sec',
    titlePl: 'Poniżej 90 s',
    titleEs: 'Menos de 90 s',
    titleFr: 'Moins de 90 s',
    titleDe: 'Unter 90 s',
    titleIt: 'Sotto i 90 s',
  },
  'minimal-tacks': {
    titleRu: 'Экономия галсов',
    titleEn: 'Minimal tacks',
    titlePl: 'Minimum zwrotów',
    titleEs: 'Pocas viradas',
    titleFr: 'Peu de virements',
    titleDe: 'Sparsam wenden',
    titleIt: 'Poche virate',
  },
  'light-wind-master': {
    titleRu: 'Слабый ветер',
    titleEn: 'Light wind',
    titlePl: 'Słaby wiatr',
    titleEs: 'Viento flojo',
    titleFr: 'Vent faible',
    titleDe: 'Leichtwind',
    titleIt: 'Vento leggero',
  },
} as const satisfies Record<string, LegacyLocalized<'title'>>;

/** The missions in screen order, with their titles. */
export const MISSION_TITLE_LIST = (Object.keys(MISSION_TITLES) as (keyof typeof MISSION_TITLES)[]).map(id => ({ id, ...MISSION_TITLES[id] }));
