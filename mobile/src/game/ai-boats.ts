/** Rivals use the shared force model, with the same screen-space units as the player. */
import { useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import { createInitialState, tick as physicsTick, getBoatParams, trimForDrive, type BoatState, type Controls, type RaceBoat, raceAutopilotTurn } from '@regatta/physics';

import { nativeCourse, nativeProgress, advanceNativeProgress } from "./progression";

const TICK_HZ = 30;
const DT = 1 / TICK_HZ;
const KN_TO_PX_PER_S = 6; // must match use-sim-loop.ts
const TURN_RATE = 0.7; // rad/s
const RAD = Math.PI / 180;

export type RaceDifficulty = 'easy' | 'medium' | 'hard';

export interface AiMark {
  x: number;
  y: number;
  captureRadius: number;
  finish?: boolean;
}

export interface AiBoat {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  heading: number;
  speedKn: number;
  markIndex: number;
  finished: boolean;
  finishSec: number | null;
  tackDir: 1 | -1;
  tackCdSec: number;
  skill: number;
  progression?: RaceBoat;
  physics?: BoatState;
  trim?: Controls;
  trimClock?: number;
}

export interface RaceAiOptions {
  bounds: { width: number; height: number };
  marks: ReadonlyArray<AiMark>;
  /** Live wind getter (the race wind can be set once but read this each tick). */
  getWind: () => { dirRad: number; speedKts: number };
  difficulty: RaceDifficulty;
  /** AI only advances while true (i.e. phase === 'racing'). */
  running: boolean;
  /** Player start position (AI boats spread around it on the start line). */
  startX: number;
  startY: number;
  /** Bump to rebuild the fleet (new race / difficulty / course). */
  resetKey: string | number;
}

export interface RaceAiHandle {
  boats: AiBoat[];
  tick: number;
  /** Elapsed race seconds the AI loop has run (since running went true). */
  elapsedSec: number;
}

const AI_NAMES = ['Bavaria', 'Nord', 'Mistral', 'Albatross', 'Corsair', 'Solveig'];
const AI_COLORS = ['#ff8a5c', '#ffd24a', '#7cc7ff', '#b07cff', '#5cff9d', '#ff6f9d'];

const DIFFICULTY: Record<RaceDifficulty, { count: number; skillLo: number; skillHi: number }> = {
  easy: { count: 2, skillLo: 0.78, skillHi: 0.86 },
  medium: { count: 3, skillLo: 0.86, skillHi: 0.94 },
  hard: { count: 4, skillLo: 0.93, skillHi: 1.0 },
};

function normRad(r: number): number {
  const T = Math.PI * 2;
  let n = r % T;
  if (n < 0) n += T;
  return n;
}
export function buildFleet(opts: RaceAiOptions): AiBoat[] {
  const cfg = DIFFICULTY[opts.difficulty];
  const boats: AiBoat[] = [];
  for (let i = 0; i < cfg.count; i++) {
    const t = cfg.count === 1 ? 0.5 : i / (cfg.count - 1);
    const skill = cfg.skillLo + (cfg.skillHi - cfg.skillLo) * t;
    // Spread along the start line, biased to the sides so the player has room.
    const spread = (i - (cfg.count - 1) / 2) * Math.min(40, opts.bounds.width * 0.12);
    boats.push({
      id: `ai-${i}`,
      name: AI_NAMES[i % AI_NAMES.length]!,
      color: AI_COLORS[i % AI_COLORS.length]!,
      x: Math.max(8, Math.min(opts.bounds.width - 8, opts.startX + spread)),
      y: opts.startY,
      heading: opts.getWind().dirRad + (i % 2 === 0 ? 52 : -52) * RAD,
      speedKn: 0,
      markIndex: 0,
      finished: false,
      finishSec: null,
      tackDir: i % 2 === 0 ? 1 : -1,
      tackCdSec: 0,
      skill,
    });
  }
  return boats;
}

export function stepBoat(
  b: AiBoat,
  marks: ReadonlyArray<AiMark>,
  windDirRad: number,
  windKts: number,
  bounds: { width: number; height: number },
  elapsedSec: number,
): void {
  if (b.finished) return;
  const mark = marks[b.markIndex];
  if (!mark) {
    b.finished = true;
    b.finishSec = elapsedSec;
    return;
  }

  b.progression ??= nativeProgress(b.x,b.y,b.heading);
  b.progression.heading=b.heading/RAD;
  const turn=raceAutopilotTurn(b.progression,nativeCourse(marks),windDirRad/RAD);
  b.heading=normRad(b.heading+turn*TURN_RATE*DT);
  const state = { ...(b.physics ?? createInitialState({tws: windKts})), heading: b.heading / RAD,
    trueWindDir: windDirRad / RAD, trueWindSpeed: windKts };
  b.trimClock = (b.trimClock ?? 0) + DT;
  if (!b.trim || b.trimClock >= .5) {
    b.trim = trimForDrive(state, b.trim ?? { mainSheet:.5, jibSheet:.3, mainTwist:.15, jibTwist:.15, reef:0, jibFurl:0, jibSide:1 });
    b.trimClock = 0;
  }
  b.physics = physicsTick(state, b.trim, getBoatParams(), DT).state;
  b.speedKn = b.physics.boatSpeed;
  const v = b.speedKn * KN_TO_PX_PER_S;
  const course = b.heading + b.physics.leeway * RAD;
  b.x += Math.sin(course) * v * DT;
  b.y += -Math.cos(course) * v * DT;
  // Soft-wrap like the player field so a boat does not vanish off-edge.
  if (b.x < 0) b.x += bounds.width;
  if (b.x > bounds.width) b.x -= bounds.width;
  if (b.y < 0) b.y += bounds.height;
  if (b.y > bounds.height) b.y -= bounds.height;

  b.markIndex=advanceNativeProgress(b.progression,b.x,b.y,b.heading,marks,elapsedSec);
  if (b.markIndex>=marks.length) { b.finished=true; b.finishSec=elapsedSec; }

}

export function useRaceAi(opts: RaceAiOptions): RaceAiHandle {
  const boatsRef = useRef<AiBoat[]>([]);
  const elapsedRef = useRef(0);
  const [tick, advance] = useReducer((n: number) => (n + 1) % 1_000_000, 0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Rebuild fleet on resetKey / difficulty / bounds change.
  useEffect(() => {
    boatsRef.current = buildFleet(optsRef.current);
    elapsedRef.current = 0;
    advance();
  }, [opts.resetKey, opts.difficulty, opts.bounds.width, opts.bounds.height]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const loop = () => {
      const o = optsRef.current;
      if (!o.running) return;
      const wind = o.getWind();
      elapsedRef.current += DT;
      const boats = boatsRef.current;
      for (const b of boats) {
        stepBoat(b, o.marks, wind.dirRad, wind.speedKts, o.bounds, elapsedRef.current);
      }
      advance();
    };
    const start = () => {
      if (id == null) id = setInterval(loop, 1000 / TICK_HZ);
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, []);

  return { boats: boatsRef.current, tick, elapsedSec: elapsedRef.current };
}
