/**
 * Game-mode course definitions + finish-line helpers.
 *
 * A course is a small ordered list of marks (start line center, windward
 * mark, finish line center) with par time and screen-fraction
 * coordinates. The Game screen reads these against its scene size to
 * compute pixel positions, the same way `simulator/missions.ts` handles
 * mission marks.
 *
 * v1 ships three courses (short / medium / long). The Game screen picks
 * "short" by default; the Daily banner can pass `?course=daily` to force
 * "medium" until the API tells us a richer mapping.
 */
import type { TpExtras } from '../i18n/context';

type Tp = (ru: string, en: string, pl: string, extras?: TpExtras) => string;

export type CourseId = 'short' | 'medium' | 'long' | 'daily';

export interface CourseMark {
  id: 'start' | 'windward' | 'finish';
  /** X as a fraction of bounds.width. */
  fx: number;
  /** Y as a fraction of bounds.height. */
  fy: number;
  /** Render radius in canvas px. */
  radius: number;
  /** Capture radius in canvas px - boat must come within this distance. */
  captureRadius: number;
}

export interface CourseDef {
  id: CourseId;
  title: (tp: Tp) => string;
  hint: (tp: Tp) => string;
  /** Soft target time in seconds. Below this = full score. */
  parSec: number;
  /** Difficulty bucket fed to the leaderboard endpoint. */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Wind bucket fed to the leaderboard endpoint. */
  windStrength: 'light' | 'medium' | 'heavy';
  /** Suggested true wind direction at the start, radians (screen-space).
   *  0 = wind from north (top of canvas), CW positive. */
  initialWindDirRad: number;
  /** Suggested true wind speed at the start, knots. */
  initialWindKn: number;
  /** Marks in order: [start, windward, finish]. v1 always 3 marks. */
  marks: ReadonlyArray<CourseMark>;
}

const COURSE_SHORT: CourseDef = {
  id: 'short',
  parSec: 75,
  difficulty: 'easy',
  windStrength: 'medium',
  initialWindDirRad: 0,
  initialWindKn: 10,
  title: (tp) =>
    tp('Короткая гонка', 'Short race', 'Krotki wyscig', {
      es: 'Regata corta',
      fr: 'Course courte',
      de: 'Kurzes Rennen',
      it: 'Gara breve',
    }),
  hint: (tp) =>
    tp(
      'Старт - верхний знак - финиш. Около 75 секунд при чистом проходе.',
      'Start, windward mark, finish. About 75 seconds if you sail it clean.',
      'Start, znak nawietrzny, meta. Okolo 75 sekund przy czystym przejsciu.',
      {
        es: 'Salida, baliza barlovento, meta. Unos 75 segundos al limpio.',
        fr: 'Depart, bouee au vent, arrivee. Environ 75 secondes en propre.',
        de: 'Start, Luvtonne, Ziel. Etwa 75 Sekunden bei sauberem Lauf.',
        it: 'Partenza, boa al vento, arrivo. Circa 75 secondi puliti.',
      },
    ),
  marks: [
    { id: 'start', fx: 0.5, fy: 0.85, radius: 6, captureRadius: 30 },
    { id: 'windward', fx: 0.5, fy: 0.18, radius: 8, captureRadius: 32 },
    { id: 'finish', fx: 0.5, fy: 0.85, radius: 7, captureRadius: 36 },
  ],
};

const COURSE_MEDIUM: CourseDef = {
  id: 'medium',
  parSec: 110,
  difficulty: 'medium',
  windStrength: 'medium',
  initialWindDirRad: 0,
  initialWindKn: 12,
  title: (tp) =>
    tp('Средняя гонка', 'Medium race', 'Sredni wyscig', {
      es: 'Regata media',
      fr: 'Course moyenne',
      de: 'Mittleres Rennen',
      it: 'Gara media',
    }),
  hint: (tp) =>
    tp(
      'Длиннее верхняя нога. Лавируй чисто и держи скорость.',
      'Longer windward leg. Tack cleanly and keep your speed up.',
      'Dluzsza noga pod wiatr. Halsuj czysto i utrzymuj predkosc.',
      {
        es: 'Pierna de barlovento mas larga. Vira limpio y manten velocidad.',
        fr: 'Bord au vent plus long. Vire proprement et garde ta vitesse.',
        de: 'Laengeres Aufkreuzen. Sauber wenden und Speed halten.',
        it: 'Lato di bolina piu lungo. Vira pulito e tieni la velocita.',
      },
    ),
  marks: [
    { id: 'start', fx: 0.5, fy: 0.88, radius: 6, captureRadius: 30 },
    { id: 'windward', fx: 0.5, fy: 0.10, radius: 8, captureRadius: 32 },
    { id: 'finish', fx: 0.5, fy: 0.88, radius: 7, captureRadius: 36 },
  ],
};

const COURSE_LONG: CourseDef = {
  id: 'long',
  parSec: 160,
  difficulty: 'hard',
  windStrength: 'heavy',
  initialWindDirRad: 0,
  initialWindKn: 16,
  title: (tp) =>
    tp('Длинная гонка', 'Long race', 'Dlugi wyscig', {
      es: 'Regata larga',
      fr: 'Course longue',
      de: 'Langes Rennen',
      it: 'Gara lunga',
    }),
  hint: (tp) =>
    tp(
      'Длинная дистанция при свежем ветре. Контролируй крен.',
      'Long course in fresh breeze. Manage your heel.',
      'Dluga trasa w swiezym wietrze. Kontroluj przechyl.',
      {
        es: 'Recorrido largo con brisa fresca. Controla la escora.',
        fr: 'Parcours long par brise fraiche. Maitrise la gite.',
        de: 'Lange Strecke bei frischem Wind. Kraengung im Griff behalten.',
        it: 'Percorso lungo con brezza tesa. Controlla lo sbandamento.',
      },
    ),
  marks: [
    { id: 'start', fx: 0.5, fy: 0.92, radius: 6, captureRadius: 30 },
    { id: 'windward', fx: 0.5, fy: 0.06, radius: 8, captureRadius: 32 },
    { id: 'finish', fx: 0.5, fy: 0.92, radius: 7, captureRadius: 36 },
  ],
};

/** "Daily" is a label aliased to MEDIUM until the /api/daily endpoint
 *  returns a structured course descriptor. The Game screen routes a
 *  `?course=daily` query param to this id. */
const COURSE_DAILY: CourseDef = {
  ...COURSE_MEDIUM,
  id: 'daily',
  title: (tp) =>
    tp('Дневной вызов', 'Daily challenge', 'Dzienne wyzwanie', {
      es: 'Reto diario',
      fr: 'Defi du jour',
      de: 'Tagesherausforderung',
      it: 'Sfida giornaliera',
    }),
  hint: (tp) =>
    tp(
      'Один шанс в день. Финишируй ниже par для попадания в таблицу.',
      'One shot per day. Finish under par to land on the daily board.',
      'Jedna szansa dziennie. Konczsz ponizej par, by trafic do tabeli.',
      {
        es: 'Una oportunidad al dia. Termina bajo par para entrar al ranking.',
        fr: 'Une chance par jour. Finis sous le par pour entrer au classement.',
        de: 'Eine Chance pro Tag. Unter Par finishen, um aufs Tagesboard zu kommen.',
        it: 'Una sola possibilita al giorno. Finisci sotto par per entrare in classifica.',
      },
    ),
};

export const COURSES: ReadonlyArray<CourseDef> = [
  COURSE_SHORT,
  COURSE_MEDIUM,
  COURSE_LONG,
  COURSE_DAILY,
];

export function findCourse(id: string | null | undefined): CourseDef {
  if (!id) return COURSE_SHORT;
  return COURSES.find((c) => c.id === id) ?? COURSE_SHORT;
}

/**
 * Project a fractional course mark into pixel space. Returns the same
 * shape `simulator/missions.ts` uses for its mark overlay so the Game
 * screen can reuse the existing render code paths.
 */
export interface CourseMarkScreen {
  id: CourseMark['id'];
  x: number;
  y: number;
  radius: number;
  captureRadius: number;
  index: number;
  cleared: boolean;
  active: boolean;
  finish: boolean;
}

export function projectCourse(
  course: CourseDef,
  bounds: { width: number; height: number },
): CourseMarkScreen[] {
  return course.marks.map((m, i) => ({
    id: m.id,
    x: m.fx * bounds.width,
    y: m.fy * bounds.height,
    radius: m.radius,
    captureRadius: m.captureRadius,
    index: i,
    cleared: false,
    active: i === 0,
    finish: i === course.marks.length - 1,
  }));
}

/**
 * Score a finished course time against par. Mirrors the formula the
 * simulator missions use so the Result panel reads consistently across
 * Game and Mission modes.
 */
export function scoreCourse(elapsedSec: number, parSec: number): number {
  if (elapsedSec <= parSec) return 100;
  const over = elapsedSec - parSec;
  return Math.max(40, Math.round(100 - over * 1.2));
}

/**
 * Build a horizontal "finish line" segment for the canvas overlay. The
 * line spans 80 px of canvas width, centred on the finish mark, and
 * lives at the mark's Y. Used by the Game screen to draw the cyan
 * finish stripe per the spec.
 */
export interface FinishLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function buildFinishLine(
  marks: ReadonlyArray<CourseMarkScreen>,
  bounds: { width: number; height: number },
): FinishLineSegment | null {
  const finish = marks.find((m) => m.finish);
  if (!finish) return null;
  const half = Math.min(60, bounds.width * 0.22);
  return {
    x1: Math.max(8, finish.x - half),
    y1: finish.y,
    x2: Math.min(bounds.width - 8, finish.x + half),
    y2: finish.y,
  };
}

/**
 * Detect whether the boat has crossed the finish line during this tick.
 * Uses a simple distance-to-segment test (line is horizontal so the
 * test is cheap) plus a half-strip thickness so a fast boat doesn't
 * pass through unsensed between two physics steps.
 */
export function crossedFinishLine(
  boat: { x: number; y: number },
  line: FinishLineSegment,
  /** Vertical thickness in canvas px. Default 18. */
  thickness = 18,
): boolean {
  // Line is horizontal in v1: y1 === y2. Generalised math kept small for
  // future angled lines.
  const minX = Math.min(line.x1, line.x2);
  const maxX = Math.max(line.x1, line.x2);
  if (boat.x < minX || boat.x > maxX) return false;
  return Math.abs(boat.y - line.y1) <= thickness;
}
