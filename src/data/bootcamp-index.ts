// ============================================================================
// Foundation (bootcamp) lessons without their lesson text: the head of each
// lesson (id, order, emoji, title in seven languages) and its practice route
// and length. The root layout uses these on every page (learning bookmark,
// lesson footer, lesson return link); importing bootcamp.ts for that shipped
// all lesson text on the first visit to any page.
//
// bootcampLessonHeads is the source: bootcamp.ts spreads each head into its
// lesson. BOOTCAMP_LESSON_PLAN is a copy of route and estMinutes;
// bootcamp-index.test.ts deep-compares both with bootcampLessons.
// ============================================================================

import type { LegacyLocalized } from "../lib/languages";

export type BootcampLessonHead = LegacyLocalized<'title'> & { id: string; order: number; emoji: string };

export const bootcampLessonHeads: readonly BootcampLessonHead[] = [
  {
    id: 'wind-direction',
    order: 1,
    emoji: '🌬',
    titleRu: 'Ветер и направление',
    titleEn: 'Wind & direction',
    titlePl: 'Wiatr i kierunek',
    titleEs: 'Viento y dirección',
    titleFr: 'Vent et direction',
    titleDe: 'Wind und Richtung',
    titleIt: 'Vento e direzione',
  },
  {
    id: 'points-of-sail',
    order: 2,
    emoji: '🧭',
    titleRu: 'Курсы относительно ветра',
    titleEn: 'Points of sail',
    titlePl: 'Kursy względem wiatru',
    titleEs: 'Rumbos respecto al viento',
    titleFr: 'Les allures',
    titleDe: 'Kurse zum Wind',
    titleIt: 'Le andature',
  },
  {
    id: 'how-sail-works',
    order: 3,
    emoji: '⛵',
    titleRu: 'Как работает парус',
    titleEn: 'How a sail works',
    titlePl: 'Jak działa żagiel',
    titleEs: 'Cómo funciona una vela',
    titleFr: 'Comment fonctionne une voile',
    titleDe: 'Wie ein Segel funktioniert',
    titleIt: 'Come funziona una vela',
  },
  {
    id: 'tacking',
    order: 4,
    emoji: '↰',
    titleRu: 'Поворот оверштаг',
    titleEn: 'Tacking',
    titlePl: 'Zwrot przez sztag',
    titleEs: 'Virar por avante',
    titleFr: 'Virer de bord',
    titleDe: 'Wenden',
    titleIt: 'Virare di bordo',
  },
  {
    id: 'jibing',
    order: 5,
    emoji: '↱',
    titleRu: 'Поворот фордевинд',
    titleEn: 'Jibing (gybing)',
    titlePl: 'Zwrot przez rufę',
    titleEs: 'Trasluchar',
    titleFr: 'Empanner',
    titleDe: 'Halsen',
    titleIt: 'Strambare',
  },
  {
    id: 'vmg-beating',
    order: 6,
    emoji: '🎯',
    titleRu: 'Лавировка и VMG',
    titleEn: 'Beating and VMG',
    titlePl: 'Halsowanie i VMG',
    titleEs: 'Dar bordos y VMG',
    titleFr: 'Louvoyer et VMG',
    titleDe: 'Kreuzen und VMG',
    titleIt: 'Bordeggiare e VMG',
  },
  {
    id: 'simple-rules',
    order: 7,
    emoji: '📖',
    titleRu: 'Простые правила',
    titleEn: 'Simple rules',
    titlePl: 'Proste zasady',
    titleEs: 'Reglas sencillas',
    titleFr: 'Règles simples',
    titleDe: 'Einfache Regeln',
    titleIt: 'Regole semplici',
  },
  {
    id: 'mini-race',
    order: 8,
    emoji: '🏁',
    titleRu: 'Мини-гонка',
    titleEn: 'Mini race',
    titlePl: 'Miniwyścig',
    titleEs: 'Minirregata',
    titleFr: 'Mini-régate',
    titleDe: 'Mini-Regatta',
    titleIt: 'Mini-regata',
  },
];

export const BOOTCAMP_LESSON_IDS: readonly string[] = bootcampLessonHeads.map(lesson => lesson.id);

/** Practice route and length per lesson, in course order. */
export const BOOTCAMP_LESSON_PLAN: readonly { id: string; route: string; estMinutes: number }[] = [
  { id: "wind-direction", route: "/simulator-v3", estMinutes: 5 },
  { id: "points-of-sail", route: "/simulator", estMinutes: 8 },
  { id: "how-sail-works", route: "/simulator-v3?drill=hold-trim", estMinutes: 4 },
  { id: "tacking", route: "/checklist#maneuvers", estMinutes: 5 },
  { id: "jibing", route: "/checklist#maneuvers", estMinutes: 5 },
  { id: "vmg-beating", route: "/racing", estMinutes: 7 },
  { id: "simple-rules", route: "/rules", estMinutes: 10 },
  { id: "mini-race", route: "/game", estMinutes: 10 },
];
