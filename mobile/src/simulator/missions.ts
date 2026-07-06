import { trainerCatalog } from '../data';
import type { TpExtras } from '../i18n/context';

export type SimMode = 'free' | 'drill' | 'mission';

type Tp = (ru: string, en: string, pl: string, extras?: TpExtras) => string;

/**
 * Title/goal text comes from the cross-platform trainer catalog
 * (web `src/data/drills.ts`, synced here as `src/data/drills.json` by
 * `mobile/scripts/sync-content.ts`). This module keeps everything
 * runtime-specific: check() predicates, progress labels, wind modes,
 * marks and scoring - keyed by the same ids.
 * Throws on a missing id so a catalog/sync drift fails loudly at module
 * load (and in jest) instead of rendering blank labels.
 */
function catalogText(id: string, field: 'title' | 'goal'): (tp: Tp) => string {
  const entry = trainerCatalog.find((e) => e.id === id);
  if (!entry) {
    throw new Error(
      `[missions] trainer catalog has no entry "${id}" - run: npm run sync-content`,
    );
  }
  const t = entry[field];
  return (tp) => tp(t.ru, t.en, t.pl, { es: t.es, fr: t.fr, de: t.de, it: t.it });
}

/**
 * Wind regime auto-set by a drill on start. The simulator screen reads
 * the active drill's `windMode` and pins the wind-mode pill so the
 * exercise matches the curriculum description (e.g. shift drill always
 * runs in shift mode).
 */
export type DrillWindMode = 'steady' | 'shift' | 'gust';

export interface DrillContext {
  twaDeg: number;
  boatSpeedKn: number;
  trimScore: number;
  elapsedSec: number;
  /** Optional fields surfaced for Sprint 8 drills. Older drills ignore them. */
  windDirRad?: number;
  windSpeedKn?: number;
  /** True wind FROM-direction at drill start, captured in setup(). Lets a
   *  shift drill measure how much the user has corrected for the change. */
  windDirAtStartRad?: number;
}

export interface DrillTickResult {
  /** Seconds spent satisfying the objective so far. */
  progressSec: number;
  /** Whether the current tick satisfies the objective. */
  active: boolean;
  /** Whether the drill is finished (progressSec >= targetSec). */
  done: boolean;
}

/**
 * Scoring kinds for Sprint 8 drills.
 * - `time-in-range`: legacy behaviour, target = total seconds spent in the
 *   "success window" defined by `check()`.
 * - `trim-hold`: the loop accumulates seconds where `check()` is true AND
 *   the failure penalty grows when the user drops below threshold (used by
 *   gust-trim).
 * - `recover-speed`: success once `boatSpeedKn >= speedTargetKn`. Score is
 *   `(targetSec - elapsedAtSuccess) / targetSec * 100`. The loop reports
 *   elapsed seconds as `progressSec` so the label counts toward the timeout.
 */
export type DrillGoalKind = 'time-in-range' | 'trim-hold' | 'recover-speed';

export interface DrillGoal {
  kind: DrillGoalKind;
  /** For `trim-hold`: the trim-score floor the user must stay above. */
  trimThreshold?: number;
  /** For `recover-speed`: the boat-speed target in knots. */
  speedTargetKn?: number;
  /** Total drill duration in seconds. */
  duration: number;
}

export interface DrillSetupContext {
  /** Current wind direction (radians, screen-space). */
  windDirRad: number;
  /** Current wind speed (knots). */
  windSpeedKn: number;
}

export interface DrillSetupResult {
  /** If set, the loop forces this initial heading (radians, screen-space).
   *  Used by no-go-recovery to point the bow into the no-go zone. */
  initialHeadingRad?: number;
  /** If set, the loop disables auto-trim. Used by gust-trim. */
  disableAutoTrim?: boolean;
  /** Captured wind dir at drill start; passed back into ctx as
   *  `windDirAtStartRad` for use by `check()`. */
  windDirAtStartRad?: number;
}

export interface DrillDef {
  id:
    | 'twa45'
    | 'noGo'
    | 'reach90'
    | 'shiftReact'
    | 'gustTrim'
    | 'noGoRecovery';
  title: (tp: Tp) => string;
  hint: (tp: Tp) => string;
  /** Target seconds spent in the success window. */
  targetSec: number;
  /** Per-tick predicate. Returns true when the current state satisfies the
   *  objective and the timer should advance. */
  check: (ctx: DrillContext) => boolean;
  /** Live progress label, e.g. "TWA held: 22 / 30 sec". For
   *  `recover-speed` drills `progressSec` is elapsed seconds toward the
   *  timeout (see DrillGoalKind docs), so the label counts up. */
  progressLabel: (progressSec: number, targetSec: number, tp: Tp) => string;
  /** Sprint 8: structured goal description for richer scoring. Optional so
   *  the existing 3 drills work without modification. */
  goal?: DrillGoal;
  /** Sprint 8: wind regime to pin while this drill is active. */
  windMode?: DrillWindMode;
  /** Sprint 8: optional one-shot setup callback. Returns initial state
   *  hints the loop applies (heading override, auto-trim toggle, etc). */
  setup?: (ctx: DrillSetupContext) => DrillSetupResult;
}

const DRILL_TWA45: DrillDef = {
  id: 'twa45',
  targetSec: 30,
  title: catalogText('twa45', 'title'),
  hint: catalogText('twa45', 'goal'),
  check: (ctx) => {
    const a = Math.abs(ctx.twaDeg);
    return a >= 40 && a <= 50;
  },
  progressLabel: (p, t, tp) =>
    tp(
      `TWA удержан: ${Math.floor(p)} / ${t} сек`,
      `TWA held: ${Math.floor(p)} / ${t} sec`,
      `TWA utrzymany: ${Math.floor(p)} / ${t} sek`,
      {
        es: `TWA mantenido: ${Math.floor(p)} / ${t} seg`,
        fr: `TWA tenu: ${Math.floor(p)} / ${t} sec`,
        de: `TWA gehalten: ${Math.floor(p)} / ${t} Sek.`,
        it: `TWA tenuto: ${Math.floor(p)} / ${t} sec`,
      },
    ),
};

const DRILL_NO_GO: DrillDef = {
  id: 'noGo',
  targetSec: 60,
  title: catalogText('noGo', 'title'),
  hint: catalogText('noGo', 'goal'),
  check: (ctx) => Math.abs(ctx.twaDeg) >= 30,
  progressLabel: (p, t, tp) =>
    tp(
      `Чисто: ${Math.floor(p)} / ${t} сек`,
      `Clear: ${Math.floor(p)} / ${t} sec`,
      `Czysto: ${Math.floor(p)} / ${t} sek`,
      {
        es: `Despejado: ${Math.floor(p)} / ${t} seg`,
        fr: `Degage: ${Math.floor(p)} / ${t} sec`,
        de: `Frei: ${Math.floor(p)} / ${t} Sek.`,
        it: `Libero: ${Math.floor(p)} / ${t} sec`,
      },
    ),
};

const DRILL_REACH90: DrillDef = {
  id: 'reach90',
  targetSec: 30,
  title: catalogText('reach90', 'title'),
  hint: catalogText('reach90', 'goal'),
  check: (ctx) => {
    const a = Math.abs(ctx.twaDeg);
    return a >= 80 && a <= 100 && ctx.trimScore >= 70;
  },
  progressLabel: (p, t, tp) =>
    tp(
      `Время на курсе: ${Math.floor(p)} / ${t} сек`,
      `On target: ${Math.floor(p)} / ${t} sec`,
      `Na kursie: ${Math.floor(p)} / ${t} sek`,
      {
        es: `En objetivo: ${Math.floor(p)} / ${t} seg`,
        fr: `Sur objectif: ${Math.floor(p)} / ${t} sec`,
        de: `Auf Ziel: ${Math.floor(p)} / ${t} Sek.`,
        it: `In rotta: ${Math.floor(p)} / ${t} sec`,
      },
    ),
};

/**
 * Sprint 8 drill: react to a wind shift. The simulator pins wind mode to
 * `shift` so the wind direction sweeps across the screen. The user must
 * keep the boat within +/- 5 deg of optimal close-hauled (TWA = 45 deg
 * on whichever tack the wind has just rolled into).
 */
const DRILL_SHIFT_REACT: DrillDef = {
  id: 'shiftReact',
  targetSec: 60,
  windMode: 'shift',
  goal: { kind: 'time-in-range', duration: 60 },
  title: catalogText('shiftReact', 'title'),
  hint: catalogText('shiftReact', 'goal'),
  check: (ctx) => {
    const a = Math.abs(ctx.twaDeg);
    return a >= 40 && a <= 50;
  },
  progressLabel: (p, t, tp) =>
    tp(
      `На курсе: ${Math.floor(p)} / ${t} сек`,
      `On target: ${Math.floor(p)} / ${t} sec`,
      `Na kursie: ${Math.floor(p)} / ${t} sek`,
      {
        es: `En objetivo: ${Math.floor(p)} / ${t} seg`,
        fr: `Sur objectif: ${Math.floor(p)} / ${t} sec`,
        de: `Auf Ziel: ${Math.floor(p)} / ${t} Sek.`,
        it: `In rotta: ${Math.floor(p)} / ${t} sec`,
      },
    ),
  setup: (ctx) => ({ windDirAtStartRad: ctx.windDirRad }),
};

/**
 * Sprint 8 drill: trim through a gust cycle. Wind cycles steady -> gust
 * -> steady every 8 sec. Auto-trim is disabled so the user must ease the
 * sheets manually when the gust hits. Score = seconds with trim score
 * >= 75 (drill threshold).
 */
const DRILL_GUST_TRIM: DrillDef = {
  id: 'gustTrim',
  targetSec: 60,
  windMode: 'gust',
  goal: { kind: 'trim-hold', trimThreshold: 75, duration: 60 },
  title: catalogText('gustTrim', 'title'),
  hint: catalogText('gustTrim', 'goal'),
  check: (ctx) => ctx.trimScore >= 75,
  progressLabel: (p, t, tp) =>
    tp(
      `TRIM удержан: ${Math.floor(p)} / ${t} сек`,
      `TRIM held: ${Math.floor(p)} / ${t} sec`,
      `TRIM utrzymany: ${Math.floor(p)} / ${t} sek`,
      {
        es: `TRIM mantenido: ${Math.floor(p)} / ${t} seg`,
        fr: `TRIM tenu: ${Math.floor(p)} / ${t} sec`,
        de: `TRIM gehalten: ${Math.floor(p)} / ${t} Sek.`,
        it: `TRIM tenuto: ${Math.floor(p)} / ${t} sec`,
      },
    ),
  setup: () => ({ disableAutoTrim: true }),
};

/**
 * Sprint 8 drill: recover from the no-go zone. The bow is forced into
 * the no-go on start. The user must steer out and accelerate to 4 kt
 * within 30 sec. Score = remaining seconds when 4 kt is reached, scaled
 * to 100 (so faster recovery = higher score).
 */
const DRILL_NO_GO_RECOVERY: DrillDef = {
  id: 'noGoRecovery',
  targetSec: 30,
  windMode: 'steady',
  goal: { kind: 'recover-speed', speedTargetKn: 4, duration: 30 },
  title: catalogText('noGoRecovery', 'title'),
  hint: catalogText('noGoRecovery', 'goal'),
  check: (ctx) => ctx.boatSpeedKn >= 4,
  progressLabel: (p, t, tp) =>
    tp(
      `Время до 4 уз: ${Math.floor(p)} / ${t} сек`,
      `Time to 4 kt: ${Math.floor(p)} / ${t} sec`,
      `Czas do 4 wezlow: ${Math.floor(p)} / ${t} sek`,
      {
        es: `Tiempo a 4 nudos: ${Math.floor(p)} / ${t} seg`,
        fr: `Temps jusqu a 4 nd: ${Math.floor(p)} / ${t} sec`,
        de: `Zeit bis 4 kt: ${Math.floor(p)} / ${t} Sek.`,
        it: `Tempo fino a 4 nd: ${Math.floor(p)} / ${t} sec`,
      },
    ),
  setup: (ctx) => ({
    initialHeadingRad: ctx.windDirRad,
  }),
};

export const DRILLS: ReadonlyArray<DrillDef> = [
  DRILL_TWA45,
  DRILL_NO_GO,
  DRILL_REACH90,
  DRILL_SHIFT_REACT,
  DRILL_GUST_TRIM,
  DRILL_NO_GO_RECOVERY,
];

/** Mission marks expressed as fractions of the canvas (0..1) so they scale
 *  with the playfield. Origin is top-left. */
export interface MarkPlan {
  id: string;
  /** X as fraction of bounds.width. */
  fx: number;
  /** Y as fraction of bounds.height. */
  fy: number;
  /** Visual radius hint in px (used by the renderer). */
  radius: number;
  /** Capture radius in px - boat must come within this distance. */
  captureRadius: number;
}

export interface MissionDef {
  id: 'windwardReturn' | 'beamRun' | 'tackTwice';
  title: (tp: Tp) => string;
  hint: (tp: Tp) => string;
  /** Soft time budget in seconds for scoring. Below this = full score. */
  parSec: number;
  /** Marks in order. Final entry is treated as the finish line. */
  marks: ReadonlyArray<MarkPlan>;
}

const MISSION_WINDWARD: MissionDef = {
  id: 'windwardReturn',
  parSec: 90,
  title: catalogText('windwardReturn', 'title'),
  hint: catalogText('windwardReturn', 'goal'),
  marks: [
    { id: 'mark1', fx: 0.5, fy: 0.18, radius: 8, captureRadius: 32 },
    { id: 'finish', fx: 0.5, fy: 0.88, radius: 7, captureRadius: 36 },
  ],
};

const MISSION_BEAM: MissionDef = {
  id: 'beamRun',
  parSec: 60,
  title: catalogText('beamRun', 'title'),
  hint: catalogText('beamRun', 'goal'),
  marks: [
    { id: 'mark1', fx: 0.85, fy: 0.50, radius: 8, captureRadius: 32 },
    { id: 'finish', fx: 0.15, fy: 0.50, radius: 7, captureRadius: 36 },
  ],
};

const MISSION_TACK_TWICE: MissionDef = {
  id: 'tackTwice',
  parSec: 110,
  title: catalogText('tackTwice', 'title'),
  hint: catalogText('tackTwice', 'goal'),
  marks: [
    { id: 'mark1', fx: 0.20, fy: 0.55, radius: 7, captureRadius: 30 },
    { id: 'mark2', fx: 0.80, fy: 0.45, radius: 7, captureRadius: 30 },
    { id: 'finish', fx: 0.50, fy: 0.18, radius: 7, captureRadius: 34 },
  ],
};

export const MISSIONS: ReadonlyArray<MissionDef> = [
  MISSION_WINDWARD,
  MISSION_BEAM,
  MISSION_TACK_TWICE,
];

export function findDrill(id: string | null | undefined): DrillDef | undefined {
  if (!id) return undefined;
  return DRILLS.find((d) => d.id === id);
}

export function findMission(
  id: string | null | undefined,
): MissionDef | undefined {
  if (!id) return undefined;
  return MISSIONS.find((m) => m.id === id);
}

export function scoreMission(elapsedSec: number, parSec: number): number {
  if (elapsedSec <= parSec) return 100;
  const over = elapsedSec - parSec;
  return Math.max(40, Math.round(100 - over * 1.2));
}
