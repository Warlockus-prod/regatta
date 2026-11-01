// Types and helpers of the solo race (/game), shared by GameClient, its race
// loop (useRaceLoop) and its screens. Nothing here touches React; only
// localStore() reads the window, everything else is pure.

import type { NativeRaceSnapshot } from "@/lib/race-native";
import type { RaceBoat } from "@/lib/race-physics";
import { makeStandardCourse, calcTWA, WIND_DIRECTION_BASE as WIND_DIRECTION } from "@/lib/race-physics";
import { makePhysicalRaceCourse } from "@/lib/race-courses";
import type { PhysicalRaceProfile } from "@/lib/race-context";
import type { CoachGoalKind } from "@/lib/fallback-coach";
import { FLEET_COLORS, PLAYER_COLOR } from "@/features/race-hud/boat-colors";

// ============================================================================
// TYPES
// ============================================================================

export type GameState = 'menu' | 'briefing' | 'countdown' | 'racing' | 'finished' | 'replay';

export interface Vec2 { x: number; y: number }

export interface Boat extends RaceBoat {
  id: string;
  name: string;
  color: string;
  pos: Vec2;
  heading: number;       // degrees, 0 = up (north), clockwise
  speed: number;         // knots (game units)
  isPlayer: boolean;
  lapDone: number;       // 0: before start, 1: windward rounded, 2: finished
  finishTime?: number;
  speedMul: number;      // share of the force-model speed the boat makes (bots: difficulty, ADR-0007)
}

export interface CourseMark {
  pos: Vec2;
  radius: number;
  label: string;       // RU, kept for back-compat (e.g. replay sharing)
  labelEn: string;
  labelPl: string;
  labelEs?: string;
  labelFr?: string;
  labelDe?: string;
  labelIt?: string;
  type: 'start' | 'windward' | 'finish';
  roundSide?: 'port' | 'starboard'; // which side to leave the mark
}

export interface Course {
  marks: CourseMark[];
  startLine: { a: Vec2; b: Vec2 };
  finishLine: { a: Vec2; b: Vec2 };
}

export interface LogSample {
  trim?: NativeRaceSnapshot["samples"][number]["trim"]; windDir?: number;
  t: number;
  x: number;
  y: number;
  heading: number;
  twa: number;
  speed: number;
  lap: number;
}

/** A 'tack' or 'gybe' is a manoeuvre as src/lib/race-manoeuvres.ts classifies
 * it (M0-4): wobbles and flips at the world edge are not logged. */
export interface LogEvent {
  type: 'start' | 'tack' | 'gybe' | 'mark-rounded' | 'finish' | 'no-go-entered';
  t: number;
  note?: string;
}

// Local Coaching type intentionally duplicates the runtime shape defined
// in src/lib/fallback-coach.ts. Both old (`*Ru`) and new (no-suffix) field
// names are present - new responses fill both, old replay caches only
// have the `*Ru` form. Read via helpers (`coachTitle`, `coachExplanation`,
// `coachFix`, `coachNextGoal`) from src/lib/fallback-coach.ts.
export interface Coaching {
  overall: string;
  score: number;
  mistakes: Array<{
    timeStart: number;
    timeEnd: number;
    severity: 'minor' | 'major';
    titleRu: string;
    explanationRu: string;
    fixRu: string;
    title?: string;
    explanation?: string;
    fix?: string;
    kind?: CoachGoalKind;
  }>;
  strengths: string[];
  nextGoalRu: string;
  nextGoal?: string;
}

/** One row of the finish table: penalty-adjusted time, Infinity for a DNF. */
export interface RaceResultRow { name: string; time: number; color: string; isPlayer: boolean }

/** The browser's localStorage, or null where reading it throws. */
export const localStore = () => { try { return window.localStorage; } catch { return null; } };

export function recordSample(boat: Boat, t: number, windDir: number): LogSample {
  return { t, x: Math.round(boat.pos.x), y: Math.round(boat.pos.y), heading: Math.round(boat.heading),
    twa: Math.round(calcTWA(boat.heading, windDir)), speed: Math.round(boat.speed * 10) / 10, lap: boat.lapDone, windDir,
    trim: boat.trim ? { mainSheet: boat.trim.mainSheet, jibSheet: boat.trim.jibSheet, reef: boat.trim.reef,
      jibFurl: boat.trim.jibFurl, mainHoisted: boat.trim.mainHoisted !== false } : undefined };
}

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

// WORLD, WIND_DIRECTION, MAX_SPEED, TURN_RATE, ACCEL and MARK_ROUND_DIST are
// imported from '@/lib/race-physics' - do not redefine here.

export const AI_NAMES = ['Nautilus', 'Mistral', 'Trident', 'Aurora', 'Kraken', 'Borealis'];
// Boat colours (M1-7): not cyan, 3:1 on both themes, the player distinct from
// the fleet for colour-blind vision too. Source: src/features/race-hud/boat-colors.ts.
export const AI_COLORS: string[] = [...FLEET_COLORS];
export { PLAYER_COLOR };

// ============================================================================
// COURSE SETUP
// ============================================================================

// Labels for the marks of makeStandardCourse(), in its order (windward, start
// L, start R). The geometry is NOT repeated here: the solo race, the
// multiplayer server and the replay viewer all sail the same course from
// '@/lib/race-physics', so a moved mark moves everywhere.
const MARK_LABELS: Omit<CourseMark, 'pos' | 'radius' | 'type'>[] = [
  { label: 'Верхний знак', labelEn: 'Windward mark', labelPl: 'Znak nawietrzny', labelEs: 'Baliza de barlovento', labelFr: 'Bouée au vent', labelDe: 'Luvtonne', labelIt: 'Boa di bolina', roundSide: 'port' },
  { label: 'Старт/Финиш Л', labelEn: 'Start/Finish L', labelPl: 'Start/Meta L', labelEs: 'Salida/Llegada I', labelFr: 'Départ/Arrivée G', labelDe: 'Start/Ziel L', labelIt: 'Partenza/Arrivo S' },
  { label: 'Старт/Финиш П', labelEn: 'Start/Finish R', labelPl: 'Start/Meta P', labelEs: 'Salida/Llegada D', labelFr: 'Départ/Arrivée D', labelDe: 'Start/Ziel R', labelIt: 'Partenza/Arrivo D' },
];

export function makeCourse(profile: PhysicalRaceProfile | null = null): Course {
  const course = profile ? makePhysicalRaceCourse(profile) : makeStandardCourse();
  return {
    ...course,
    marks: course.marks.map((mark, i) => ({ ...mark, ...MARK_LABELS[i] })),
  };
}

// ============================================================================
// RACE HELPERS
// ============================================================================

/**
 * The solo race wind at race time `raceT` seconds: the direction oscillates
 * ±6° with period ~22s (slow shift) plus a faster ±2° wobble with period ~7s
 * (nervous breeze); the gust multiplier blends two sines (Perlin-ish) and is
 * bounded to 0.75..1.25.
 */
export function soloRaceWind(raceT: number): { dir: number; gust: number } {
  const shift = Math.sin(raceT * (2 * Math.PI / 22)) * 6
              + Math.sin(raceT * (2 * Math.PI / 7)) * 2;
  const dir = (WIND_DIRECTION + shift + 360) % 360;
  const gust = 1.0
             + Math.sin(raceT * (2 * Math.PI / 9)) * 0.12
             + Math.sin(raceT * (2 * Math.PI / 3.3)) * 0.05;
  return { dir, gust: Math.max(0.75, Math.min(1.25, gust)) };
}

/** Finish table: penalty-adjusted finish time, unfinished boats last as Infinity. */
export function sortRaceResults(boats: readonly Boat[], penalties: Readonly<Record<string, number | undefined>>): RaceResultRow[] {
  return [...boats]
    .map((b) => ({ name: b.name, time: b.finishTime === undefined ? Infinity : b.finishTime + (penalties[b.id] ?? 0), color: b.color, isPlayer: b.isPlayer }))
    .sort((a, b) => a.time - b.time);
}

/** Tacks (not gybes), no-go entries and top speed of the player's race log. */
export function raceLogTally(events: readonly LogEvent[], samples: readonly LogSample[]): { tacks: number; noGoEntries: number; topSpeed: number } {
  return {
    tacks: events.filter((e) => e.type === 'tack').length,
    noGoEntries: events.filter((e) => e.type === 'no-go-entered').length,
    topSpeed: samples.reduce((mx, s) => Math.max(mx, s.speed), 0),
  };
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '-';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds * 10) % 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}
