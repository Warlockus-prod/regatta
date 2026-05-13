/**
 * Local leaderboard helpers.
 *
 * Pure functions that turn the device's race-history list into the rows
 * the Leaderboard screen renders. The screen is the only React-aware
 * caller of these helpers; the helpers themselves are React-free,
 * AsyncStorage-free, and side-effect-free so they can be unit-tested
 * trivially and reused once the online leaderboard backend lands.
 *
 * Sort model:
 *   The leaderboard ranks the user against themselves, per course.
 *   For each `courseId`, we pick the single race with the highest
 *   `score`, breaking ties on the faster `timeSec`. That row is then
 *   sorted globally so the top of the board is the user's overall best
 *   finish (highest score, then fastest time).
 *
 *   "All time" is the default; the screen layers `filterByPeriod` on top
 *   so a user can ask "how am I doing today / this week" without
 *   opening Settings.
 *
 *   Filters are independent: course filter narrows the list to one
 *   discipline, period filter narrows it to a recency window. They
 *   compose - the screen pipes one into the other.
 *
 * Backend-ready shape:
 *   When the online layer ships, the screen will:
 *     1. Render local PBs from `bestPerCourse(filteredRaces)` (today).
 *     2. Add a Global tab that fetches `/api/leaderboard?course&period`
 *        and renders the same row component, just with a different
 *        data source. The row contract (rank, courseId, time, score,
 *        date, owner-id) maps 1:1 to the planned API response.
 *   These helpers stay - they're the read side of the local cache that
 *   doubles as the offline fallback for the global tab.
 */

import type { Lang } from '../i18n/languages';
import type { RaceRecord } from '../persistence/race-history';

export type LeaderboardCourseFilter = 'all' | 'short' | 'medium' | 'long';
export type LeaderboardPeriodFilter = 'all' | 'today' | 'week';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

/**
 * Reduce a list of races to one record per course - the personal best
 * (PB) for that course. PB is "highest score; tie-break on fastest
 * time; tie-break on most recent finish".
 *
 * The returned list is sorted globally so the head is the user's
 * overall best finish.
 *
 * Pure: does not mutate `races`.
 */
export function bestPerCourse(races: ReadonlyArray<RaceRecord>): RaceRecord[] {
  const byCourse = new Map<string, RaceRecord>();
  for (const r of races) {
    const prev = byCourse.get(r.courseId);
    if (!prev || isBetter(r, prev)) {
      byCourse.set(r.courseId, r);
    }
  }
  // Sort by score desc, then time asc, then finishedAt desc so the
  // overall best finish heads the leaderboard.
  return Array.from(byCourse.values()).sort(compareBest);
}

/** True when `a` is a better personal best than `b`. */
function isBetter(a: RaceRecord, b: RaceRecord): boolean {
  if (a.score !== b.score) return a.score > b.score;
  if (a.timeSec !== b.timeSec) return a.timeSec < b.timeSec;
  return a.finishedAt > b.finishedAt;
}

function compareBest(a: RaceRecord, b: RaceRecord): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
  return b.finishedAt - a.finishedAt;
}

/**
 * Narrow a list to a single course id. `'all'` is the identity filter
 * (returns a shallow copy so the caller can sort safely). The 'daily'
 * course id maps to the medium bucket because it shares marks and par
 * with `medium` - showing it as its own card would split the user's PB
 * into two near-identical rows.
 */
export function filterByCourse(
  races: ReadonlyArray<RaceRecord>,
  courseId: LeaderboardCourseFilter,
): RaceRecord[] {
  if (courseId === 'all') return races.slice();
  return races.filter((r) => normalizeCourseId(r.courseId) === courseId);
}

/** Course-id normaliser: collapse 'daily' onto 'medium' for filter math. */
function normalizeCourseId(id: string): string {
  return id === 'daily' ? 'medium' : id;
}

/**
 * Narrow a list to a recency window. `'today'` = last 24 h, `'week'` =
 * last 7 days, `'all'` = identity. We use rolling windows (`now - 1d /
 * now - 7d`) instead of calendar boundaries so the leaderboard reads
 * consistently across timezones and the week boundary doesn't reset at
 * midnight UTC for users in the Americas.
 *
 * The optional `now` arg is only there to keep the helper deterministic
 * in tests; production callers omit it and let `Date.now()` fire.
 */
export function filterByPeriod(
  races: ReadonlyArray<RaceRecord>,
  period: LeaderboardPeriodFilter,
  now: number = Date.now(),
): RaceRecord[] {
  if (period === 'all') return races.slice();
  const cutoff = period === 'today' ? now - ONE_DAY_MS : now - ONE_WEEK_MS;
  return races.filter((r) => r.finishedAt >= cutoff);
}

/**
 * Score-tier colour bucket. Mirrors the `scoreColor` helper used in the
 * simulator result panel so a score of 80 reads the same green on both
 * surfaces. Returned as a string token so the screen can map it to the
 * actual `colors.*` value without dragging the design-system import in
 * here.
 */
export type ScoreTier = 'gold' | 'silver' | 'bronze';

export function scoreTier(score: number): ScoreTier {
  if (score >= 78) return 'gold';
  if (score >= 52) return 'silver';
  return 'bronze';
}

/**
 * "today" / "2 days ago" / "last week" relative-date formatter.
 *
 * Buckets:
 *   - < 1 day -> "today"
 *   - 1 day  -> "yesterday"
 *   - 2..6 days -> "N days ago"
 *   - 7..13 days -> "last week"
 *   - 14..27 days -> "N weeks ago"
 *   - >= 28 days -> "N months ago"
 *
 * We deliberately don't reach for `Intl.RelativeTimeFormat` - mobile
 * Hermes ships an inconsistent ICU and the strings would shift per
 * device locale. A 7-language lookup table is small and exact.
 */
export function relativeDate(
  timestamp: number,
  lang: Lang,
  now: number = Date.now(),
): string {
  const diffMs = Math.max(0, now - timestamp);
  const diffDays = Math.floor(diffMs / ONE_DAY_MS);

  if (diffDays === 0) return RELATIVE_LABELS.today[lang];
  if (diffDays === 1) return RELATIVE_LABELS.yesterday[lang];
  if (diffDays < 7) return RELATIVE_LABELS.daysAgo[lang](diffDays);
  if (diffDays < 14) return RELATIVE_LABELS.lastWeek[lang];
  if (diffDays < 28) {
    const weeks = Math.floor(diffDays / 7);
    return RELATIVE_LABELS.weeksAgo[lang](weeks);
  }
  const months = Math.max(1, Math.floor(diffDays / 30));
  return RELATIVE_LABELS.monthsAgo[lang](months);
}

type LangMap<T> = Record<Lang, T>;

const RELATIVE_LABELS: {
  today: LangMap<string>;
  yesterday: LangMap<string>;
  lastWeek: LangMap<string>;
  daysAgo: LangMap<(n: number) => string>;
  weeksAgo: LangMap<(n: number) => string>;
  monthsAgo: LangMap<(n: number) => string>;
} = {
  today: {
    ru: 'сегодня',
    en: 'today',
    pl: 'dzisiaj',
    es: 'hoy',
    fr: "aujourd'hui",
    de: 'heute',
    it: 'oggi',
  },
  yesterday: {
    ru: 'вчера',
    en: 'yesterday',
    pl: 'wczoraj',
    es: 'ayer',
    fr: 'hier',
    de: 'gestern',
    it: 'ieri',
  },
  lastWeek: {
    ru: 'на прошлой неделе',
    en: 'last week',
    pl: 'w zeszlym tygodniu',
    es: 'la semana pasada',
    fr: 'la semaine derniere',
    de: 'letzte Woche',
    it: 'la settimana scorsa',
  },
  daysAgo: {
    // Russian gets a tiny plural rule: 2..4 -> дня, otherwise дней.
    ru: (n) => `${n} ${n >= 2 && n <= 4 ? 'дня' : 'дней'} назад`,
    en: (n) => `${n} days ago`,
    pl: (n) => `${n} dni temu`,
    es: (n) => `hace ${n} dias`,
    fr: (n) => `il y a ${n} jours`,
    de: (n) => `vor ${n} Tagen`,
    it: (n) => `${n} giorni fa`,
  },
  weeksAgo: {
    ru: (n) => `${n} ${n === 1 ? 'неделю' : n >= 2 && n <= 4 ? 'недели' : 'недель'} назад`,
    en: (n) => `${n} weeks ago`,
    pl: (n) => `${n} tygodni temu`,
    es: (n) => `hace ${n} semanas`,
    fr: (n) => `il y a ${n} semaines`,
    de: (n) => `vor ${n} Wochen`,
    it: (n) => `${n} settimane fa`,
  },
  monthsAgo: {
    ru: (n) => `${n} ${n === 1 ? 'месяц' : n >= 2 && n <= 4 ? 'месяца' : 'месяцев'} назад`,
    en: (n) => `${n} months ago`,
    pl: (n) => `${n} miesiecy temu`,
    es: (n) => `hace ${n} meses`,
    fr: (n) => `il y a ${n} mois`,
    de: (n) => `vor ${n} Monaten`,
    it: (n) => `${n} mesi fa`,
  },
};

/**
 * Compose: filter by course, then period, then PB-per-course. The
 * screen orchestrates the same pipeline directly with `useMemo` so it
 * can label each step with a deps array; this helper is provided for
 * future Global-tab parity (drop in a global-list source, run the same
 * pipeline).
 */
export function buildLeaderboardRows(
  races: ReadonlyArray<RaceRecord>,
  course: LeaderboardCourseFilter,
  period: LeaderboardPeriodFilter,
  now: number = Date.now(),
): RaceRecord[] {
  return bestPerCourse(filterByPeriod(filterByCourse(races, course), period, now));
}
