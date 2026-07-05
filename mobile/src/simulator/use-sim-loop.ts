/**
 * React hook driving the simulator at 30 Hz on top of the ported VPP
 * engine in `./physics/*`.
 *
 * Two state worlds run side by side:
 *
 * 1. Screen-space (canvas px, radians, clockwise-from-north) -- exposed
 *    via `boat: BoatState`. The Skia scene reads this and applies a
 *    rotation transform.
 * 2. Engine-space (compass degrees, knots) -- the real VPP `BoatState`.
 *    Lives on a ref, surfaced via `boatExt: BoatStateExt` for the HUD
 *    and the wind / no-go overlays.
 *
 * The two are synchronized once per tick: target heading is converted
 * to compass degrees, fed to the engine, the engine runs `tick()`, then
 * the resulting boat speed (knots) is converted to canvas px/s for the
 * position integrator. Heading rotation is still done in screen-space
 * (turn rate clamp), then echoed back to the engine. This keeps the UI
 * smooth and the physics responsive without forcing the engine to model
 * helm response.
 */

import { useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import {
  tick as physicsTick,
  createInitialState,
  getBoatParams,
  RAD_TO_DEG,
} from './physics';
import type {
  BoatState as PhysicsBoatState,
  Controls as PhysicsControls,
} from './physics';
import type {
  BoatState,
  BoatStateExt,
  Controls,
  SailSet,
  SimParams,
  WindState,
} from './types';
import {
  DRILLS,
  MISSIONS,
  findDrill,
  findMission,
  scoreMission,
  type DrillDef,
  type DrillWindMode,
  type MissionDef,
  type SimMode,
} from './missions';
import { deriveSailFeedback, type SailFeedback } from './sail-feedback';

const TICK_HZ = 30;
const DT = 1 / TICK_HZ;
/** How many recent positions to keep for the wake render. */
const TRAIL_MAX = 60;
/** Squared min distance between consecutive trail points (canvas px). */
const TRAIL_MIN_DIST_SQ = 4;

/**
 * Rough conversion from real knots to canvas pixels per second. Tuned so a
 * cruiser at 6 kn glides across the 320-wide playfield in ~10 sec, which
 * reads as "moving" without leaving the visible field too quickly.
 */
const KN_TO_PX_PER_S = 6;

const DEFAULT_PARAMS: SimParams = {
  maxSpeed: 90,
  turnRate: 0.7,
  drag: 0.5,
};

const DEFAULT_BOAT: BoatState = {
  heading: 0,
  speed: 0,
  x: 0,
  y: 0,
};

const DEFAULT_WIND: WindState = {
  trueWindDirRad: 0,
  trueWindSpeedKts: 12,
};

interface SimLoopOptions {
  initialX?: number;
  initialY?: number;
  bounds: { width: number; height: number };
}

export interface TrailPoint {
  x: number;
  y: number;
}

export interface MarkScreen {
  id: string;
  x: number;
  y: number;
  radius: number;
  captureRadius: number;
  /** Index in mission.marks. */
  index: number;
  /** True once this mark has been rounded. */
  cleared: boolean;
  /** True if it is the next mark to round. */
  active: boolean;
  /** True for the final mark (finish). */
  finish: boolean;
}

export interface DrillProgress {
  drillId: DrillDef['id'];
  /** Seconds the drill `check()` has been satisfied. For `recover-speed`
   *  drills this reports elapsed seconds toward the timeout instead, so
   *  the progress label counts up while the user races the deadline. */
  progressSec: number;
  /** Total seconds since the drill started, regardless of success. */
  elapsedSec: number;
  /** Drill total duration, seconds. */
  targetSec: number;
  done: boolean;
  active: boolean;
  /** True once `done` and the drill goal was actually met. False when the
   *  drill ended by timeout with nothing achieved (fail state). */
  passed: boolean;
  /** 0..100, computed from the drill's `goal.kind`. Updates live. */
  score: number;
  /** When set, the simulator screen pins the wind-mode pill. */
  windMode?: DrillWindMode;
}

export interface MissionProgress {
  missionId: MissionDef['id'];
  elapsedSec: number;
  marks: ReadonlyArray<MarkScreen>;
  done: boolean;
  /** 0..100, only meaningful when `done`. */
  score: number;
  /** Distance to next mark in canvas px, or null if done. */
  distanceToNextPx: number | null;
}

export interface SimLoopHandle {
  /** Live screen-space boat. Read on every render for Skia transforms. */
  boat: BoatState;
  /** Real-units extended state for the HUD. */
  boatExt: BoatStateExt;
  /** Wind state. */
  wind: WindState;
  /** Live screen-space controls. */
  controls: Controls;
  /** Recent boat positions, oldest first. */
  trail: TrailPoint[];
  /** Increments once per tick, used as a render trigger. */
  tickN: number;
  /** Sail-state badges derived per-tick from physics. */
  sailFeedback: SailFeedback;
  /** Active mode. */
  mode: SimMode;
  /** Active drill state when mode === 'drill'. */
  drill: DrillProgress | null;
  /** Active mission state when mode === 'mission'. */
  mission: MissionProgress | null;
  /** Set the heading target (radians, screen-space). */
  setTargetHeading: (h: number) => void;
  /** Set true wind FROM-direction (radians, screen-space). */
  setWindDir: (rad: number) => void;
  /** Set wind speed in knots directly. */
  setWindSpeed: (kts: number) => void;
  /** User trim controls. Calling these leaves auto-trim mode. */
  setMainSheet: (value: number) => void;
  setJibSheet: (value: number) => void;
  setTwist: (value: number) => void;
  setReef: (value: number) => void;
  /** Enable or disable auto-trim. */
  setAutoTrim: (enabled: boolean) => void;
  /** Switch mode. Resets boat + drill/mission state for the new mode. */
  setMode: (mode: SimMode) => void;
  /** Pick a drill (only meaningful in 'drill' mode). */
  setDrillId: (id: DrillDef['id']) => void;
  /** Pick a mission (only meaningful in 'mission' mode). */
  setMissionId: (id: MissionDef['id']) => void;
  /** Reset boat + trail + drill/mission timers. Wind preserved. */
  reset: () => void;
}

/**
 * Default trim numbers for an "auto-trim" sailor. They are good enough to
 * drive across the wind range before the user takes manual control.
 */
const AUTO_CONTROLS: PhysicsControls = {
  mainSheet: 0.5,
  jibSheet: 0.4,
  mainTwist: 0.15,
  jibTwist: 0.15,
  reef: 0,
  jibFurl: 0,
  jibSide: 1,
};

const DEFAULT_CONTROL_STATE: Controls = {
  targetHeading: 0,
  throttle: 0.7,
  autoTrim: true,
  mainSheet: AUTO_CONTROLS.mainSheet,
  jibSheet: AUTO_CONTROLS.jibSheet,
  twist: AUTO_CONTROLS.mainTwist,
  reef: AUTO_CONTROLS.reef,
};

/** Pick the spinnaker / main+jib / main-only based on TWA. */
function pickSailSet(twaAbs: number): SailSet {
  if (twaAbs > 130) return 'spinnaker';
  if (twaAbs > 35) return 'mainJib';
  return 'mainOnly';
}

/** Tweak the auto-controls so the boat behaves sensibly across TWA. */
function autoTrimFor(twaSigned: number): PhysicsControls {
  const a = Math.abs(twaSigned);
  // Upwind: hard sheeted in. Reach: medium. Downwind: ease out, set
  // wing-on-wing once past 150.
  let mainSheet: number;
  let jibSheet: number;
  let jibSide: 1 | -1 = 1;
  if (a < 50) {
    mainSheet = 0.85;
    jibSheet = 0.85;
  } else if (a < 100) {
    mainSheet = 0.55;
    jibSheet = 0.45;
  } else if (a < 150) {
    mainSheet = 0.30;
    jibSheet = 0.25;
  } else {
    mainSheet = 0.15;
    jibSheet = 0.10;
    jibSide = -1;
  }
  return { ...AUTO_CONTROLS, mainSheet, jibSheet, jibSide };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function buildMissionProgress(
  mission: MissionDef,
  bounds: { width: number; height: number },
): MissionProgress {
  const marks: MarkScreen[] = mission.marks.map((m, i) => ({
    id: m.id,
    x: m.fx * bounds.width,
    y: m.fy * bounds.height,
    radius: m.radius,
    captureRadius: m.captureRadius,
    index: i,
    cleared: false,
    active: i === 0,
    finish: i === mission.marks.length - 1,
  }));
  return {
    missionId: mission.id,
    elapsedSec: 0,
    marks,
    done: false,
    score: 0,
    distanceToNextPx: marks.length > 0 ? Infinity : null,
  };
}

function controlsToPhysics(
  controls: Controls,
  auto: PhysicsControls,
): PhysicsControls {
  if (controls.autoTrim !== false) return auto;
  return {
    ...auto,
    mainSheet: clamp01(controls.mainSheet ?? auto.mainSheet),
    jibSheet: clamp01(controls.jibSheet ?? auto.jibSheet),
    mainTwist: clamp01(controls.twist ?? auto.mainTwist),
    jibTwist: clamp01(controls.twist ?? auto.jibTwist),
    reef: clamp01(controls.reef ?? auto.reef),
    jibFurl: clamp01((controls.reef ?? auto.reef) * 0.25),
  };
}

function trimScoreFor(result: {
  diag: { mainStalled: boolean; jibStalled: boolean; slotHealth: number };
}): number {
  let score = result.diag.slotHealth * 100;
  if (result.diag.mainStalled) score -= 28;
  if (result.diag.jibStalled) score -= 18;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Normalize a radians angle to [0, 2 PI). */
function normalizeRad(r: number): number {
  const TWO_PI = Math.PI * 2;
  let n = r % TWO_PI;
  if (n < 0) n += TWO_PI;
  return n;
}

/** Shortest signed angular distance from a to b, radians. */
function shortestRad(a: number, b: number): number {
  const TWO_PI = Math.PI * 2;
  let d = (b - a) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

export function useSimLoop(options: SimLoopOptions): SimLoopHandle {
  const initialX = options.initialX ?? options.bounds.width / 2;
  const initialY = options.initialY ?? options.bounds.height / 2;

  const screenStateRef = useRef<BoatState>({
    ...DEFAULT_BOAT,
    x: initialX,
    y: initialY,
  });
  const controlsRef = useRef<Controls>({ ...DEFAULT_CONTROL_STATE });
  const windRef = useRef<WindState>({ ...DEFAULT_WIND });
  const physicsRef = useRef<PhysicsBoatState>(
    createInitialState({
      tws: DEFAULT_WIND.trueWindSpeedKts,
      heading: 0,
      trueWindDir: 0,
      boatSpeed: 0,
    }),
  );
  const boatExtRef = useRef<BoatStateExt>({
    boatSpeedKn: 0,
    heelDeg: 0,
    leewayDeg: 0,
    twaDeg: 0,
    awaDeg: 0,
    awsKn: DEFAULT_WIND.trueWindSpeedKts,
    vmgKn: 0,
    sailSet: 'mainJib',
    mainStalled: false,
    jibStalled: false,
    slotHealth: 1,
    trimScore: 100,
  });
  const trailRef = useRef<TrailPoint[]>([{ x: initialX, y: initialY }]);
  const sailFeedbackRef = useRef<SailFeedback>({ main: 'idle', jib: 'idle' });
  const modeRef = useRef<SimMode>('free');
  const drillIdRef = useRef<DrillDef['id']>(DRILLS[0]!.id);
  const missionIdRef = useRef<MissionDef['id']>(MISSIONS[0]!.id);
  const drillStateRef = useRef<DrillProgress>({
    drillId: DRILLS[0]!.id,
    progressSec: 0,
    elapsedSec: 0,
    targetSec: DRILLS[0]!.targetSec,
    done: false,
    active: false,
    passed: false,
    score: 0,
    windMode: DRILLS[0]!.windMode,
  });
  /** Wind direction captured the moment a drill started. Drives the
   *  step-shift schedule and lets `check()` reason about how far the
   *  wind has drifted from its starting point. */
  const drillStartWindRef = useRef<number>(0);
  /** Wind speed captured the moment a drill started. Drives the gust
   *  cycle so the boat sees a reproducible 8-sec gust pattern. */
  const drillStartWindSpeedRef = useRef<number>(DEFAULT_WIND.trueWindSpeedKts);
  const missionStateRef = useRef<MissionProgress>(
    buildMissionProgress(MISSIONS[0]!, options.bounds),
  );
  const [tickN, advance] = useReducer((n: number) => n + 1, 0);

  const params = getBoatParams();

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id !== null) return;
      id = setInterval(() => {
        const screen = screenStateRef.current;
        const controls = controlsRef.current;

        // 0. If a drill is active and owns the wind regime, drive the
        //    schedule BEFORE the engine reads windRef. Step shifts for
        //    `windMode === 'shift'`, square-ish gust cycle for `'gust'`.
        //    Steady drills leave the wind alone so the screen-level
        //    wind-mode pill behaves normally.
        if (modeRef.current === 'drill') {
          const drill = findDrill(drillIdRef.current);
          if (drill && drill.windMode && drill.windMode !== 'steady') {
            const elapsed = drillStateRef.current.elapsedSec;
            if (drill.windMode === 'shift') {
              // 6 step shifts of 30 deg over 60 sec, alternating sides
              // around the captured starting wind direction.
              const stepIdx = Math.min(5, Math.floor(elapsed / 10));
              const sign = stepIdx % 2 === 0 ? 1 : -1;
              const offsetRad =
                (sign * (15 + 15 * Math.floor(stepIdx / 2)) * Math.PI) /
                180;
              const next = drillStartWindRef.current + offsetRad;
              if (
                Math.abs(
                  shortestRad(windRef.current.trueWindDirRad, next),
                ) > 1e-3
              ) {
                windRef.current = {
                  ...windRef.current,
                  trueWindDirRad: normalizeRad(next),
                };
              }
            } else if (drill.windMode === 'gust') {
              // 8-sec cycle: first 5 sec steady at base, next 3 sec gust
              // bumped by ~6 kt. Repeats.
              const phase = elapsed % 8;
              const target =
                phase >= 5
                  ? drillStartWindSpeedRef.current + 6
                  : drillStartWindSpeedRef.current;
              if (
                Math.abs(windRef.current.trueWindSpeedKts - target) > 1e-3
              ) {
                windRef.current = {
                  ...windRef.current,
                  trueWindSpeedKts: target,
                };
              }
            }
          }
        }

        const wind = windRef.current;

        // 1. Heading rotation in screen-space, clamped per frame.
        const dh = shortestRad(screen.heading, controls.targetHeading);
        const maxStep = DEFAULT_PARAMS.turnRate * DT;
        const turn = Math.max(-maxStep, Math.min(maxStep, dh));
        const newHeadingRad = normalizeRad(screen.heading + turn);
        const newHeadingDeg = (newHeadingRad * RAD_TO_DEG) % 360;

        // 2. Sync engine state with current screen heading + wind.
        const trueWindDirDeg =
          (normalizeRad(wind.trueWindDirRad) * RAD_TO_DEG) % 360;
        const engineIn: PhysicsBoatState = {
          ...physicsRef.current,
          heading: newHeadingDeg,
          trueWindDir: trueWindDirDeg,
          trueWindSpeed: wind.trueWindSpeedKts,
        };

        // 3. Auto-trim sails for the current TWA, then run one engine tick.
        const twaPre =
          ((trueWindDirDeg - newHeadingDeg + 540) % 360) - 180;
        const autoControls = autoTrimFor(twaPre);
        const trimmed = controlsToPhysics(controls, autoControls);
        if (controls.autoTrim !== false) {
          controlsRef.current = {
            ...controls,
            mainSheet: autoControls.mainSheet,
            jibSheet: autoControls.jibSheet,
            twist: autoControls.mainTwist,
            reef: autoControls.reef,
          };
        }
        const result = physicsTick(engineIn, trimmed, params, DT);
        physicsRef.current = result.state;

        // 4. Position integration in screen-space, driven by real knots.
        //    Canvas Y is screen-down so heading 0 (north) means -Y.
        const speedPxPerS = result.state.boatSpeed * KN_TO_PX_PER_S;
        const dx = Math.sin(newHeadingRad) * speedPxPerS * DT;
        const dy = -Math.cos(newHeadingRad) * speedPxPerS * DT;

        const w = options.bounds.width;
        const h = options.bounds.height;
        let x = screen.x + dx;
        let y = screen.y + dy;
        if (x < 0) x += w;
        if (x > w) x -= w;
        if (y < 0) y += h;
        if (y > h) y -= h;

        screenStateRef.current = {
          heading: newHeadingRad,
          speed: speedPxPerS,
          x,
          y,
        };

        boatExtRef.current = {
          boatSpeedKn: result.state.boatSpeed,
          heelDeg: result.state.heel,
          leewayDeg: result.state.leeway,
          twaDeg: twaPre,
          awaDeg: result.diag.awa,
          awsKn: result.diag.aws,
          vmgKn: result.diag.vmg,
          sailSet: pickSailSet(Math.abs(twaPre)),
          mainStalled: result.diag.mainStalled,
          jibStalled: result.diag.jibStalled,
          slotHealth: result.diag.slotHealth,
          trimScore: trimScoreFor(result),
        };

        // Append to trail if moved enough.
        const last = trailRef.current[trailRef.current.length - 1];
        if (!last || (x - last.x) ** 2 + (y - last.y) ** 2 >= TRAIL_MIN_DIST_SQ) {
          const nextTrail = [...trailRef.current, { x, y }];
          trailRef.current = nextTrail.length > TRAIL_MAX
            ? nextTrail.slice(nextTrail.length - TRAIL_MAX)
            : nextTrail;
        }

        sailFeedbackRef.current = deriveSailFeedback({
          awaDeg: result.diag.awa,
          twaDeg: twaPre,
          mainSheet: clamp01(controlsRef.current.mainSheet ?? 0.5),
          jibSheet: clamp01(controlsRef.current.jibSheet ?? 0.4),
          mainStalled: result.diag.mainStalled,
          jibStalled: result.diag.jibStalled,
          spinnaker: pickSailSet(Math.abs(twaPre)) === 'spinnaker',
        });

        if (modeRef.current === 'drill') {
          const drill = findDrill(drillIdRef.current);
          if (drill) {
            const prev = drillStateRef.current;
            const trim = trimScoreFor(result);
            const ok = drill.check({
              twaDeg: twaPre,
              boatSpeedKn: result.state.boatSpeed,
              trimScore: trim,
              elapsedSec: prev.elapsedSec,
              windDirRad: wind.trueWindDirRad,
              windSpeedKn: wind.trueWindSpeedKts,
              windDirAtStartRad: drillStartWindRef.current,
            });
            const wasDone = prev.done;
            const nextElapsed = wasDone
              ? prev.elapsedSec
              : Math.min(prev.elapsedSec + DT, drill.targetSec);
            const goalKind = drill.goal?.kind ?? 'time-in-range';
            // `recover-speed` drills race a deadline, so their progress
            // label tracks elapsed seconds toward the timeout. The
            // accumulating kinds track seconds inside the success window.
            const nextProgress =
              goalKind === 'recover-speed'
                ? nextElapsed
                : ok && !wasDone
                ? Math.min(prev.progressSec + DT, drill.targetSec)
                : prev.progressSec;
            let nextDone = wasDone;
            let nextScore = prev.score;
            let nextPassed = prev.passed;
            if (!wasDone) {
              if (goalKind === 'recover-speed') {
                if (ok) {
                  nextDone = true;
                  nextPassed = true;
                  const remaining = Math.max(
                    0,
                    drill.targetSec - prev.elapsedSec,
                  );
                  nextScore = Math.round(
                    (remaining / drill.targetSec) * 100,
                  );
                } else if (nextElapsed >= drill.targetSec) {
                  nextDone = true;
                  nextPassed = false;
                  nextScore = 0;
                } else {
                  nextScore = 0;
                }
              } else if (goalKind === 'trim-hold') {
                nextScore = Math.round(
                  (nextProgress / drill.targetSec) * 100,
                );
                if (nextElapsed >= drill.targetSec) {
                  nextDone = true;
                  nextPassed = nextScore > 0;
                }
              } else {
                nextScore = Math.round(
                  (nextProgress / drill.targetSec) * 100,
                );
                if (
                  nextProgress >= drill.targetSec ||
                  nextElapsed >= drill.targetSec
                ) {
                  nextDone = true;
                  nextPassed = nextScore > 0;
                }
              }
            }
            drillStateRef.current = {
              drillId: drill.id,
              progressSec: nextProgress,
              elapsedSec: nextElapsed,
              targetSec: drill.targetSec,
              active: ok,
              done: nextDone,
              passed: nextPassed,
              score: nextScore,
              windMode: drill.windMode,
            };
          }
        } else if (modeRef.current === 'mission') {
          const mission = findMission(missionIdRef.current);
          const prev = missionStateRef.current;
          if (mission && !prev.done) {
            const elapsed = prev.elapsedSec + DT;
            let nextDone = false;
            let active = -1;
            const nextMarks = prev.marks.map((m) => ({ ...m }));
            for (let i = 0; i < nextMarks.length; i++) {
              if (!nextMarks[i]!.cleared) {
                active = i;
                break;
              }
            }
            let distance: number | null = null;
            if (active >= 0) {
              const m = nextMarks[active]!;
              const dxm = x - m.x;
              const dym = y - m.y;
              distance = Math.sqrt(dxm * dxm + dym * dym);
              if (distance <= m.captureRadius) {
                m.cleared = true;
                m.active = false;
                if (active + 1 < nextMarks.length) {
                  nextMarks[active + 1]!.active = true;
                  active = active + 1;
                  const m2 = nextMarks[active]!;
                  const dxm2 = x - m2.x;
                  const dym2 = y - m2.y;
                  distance = Math.sqrt(dxm2 * dxm2 + dym2 * dym2);
                } else {
                  nextDone = true;
                  distance = 0;
                  active = -1;
                }
              } else {
                m.active = true;
              }
            }
            missionStateRef.current = {
              missionId: mission.id,
              elapsedSec: nextDone ? elapsed : elapsed,
              marks: nextMarks,
              done: nextDone,
              score: nextDone ? scoreMission(elapsed, mission.parSec) : 0,
              distanceToNextPx: nextDone ? null : distance,
            };
          }
        }

        advance();
      }, 1000 / TICK_HZ);
    };

    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
    // params is a fresh object every render but always ===-equivalent; the
    // engine reads it by value each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.bounds.width, options.bounds.height]);

  const resetCore = () => {
    screenStateRef.current = {
      ...DEFAULT_BOAT,
      x: initialX,
      y: initialY,
    };
    controlsRef.current = { ...DEFAULT_CONTROL_STATE };
    let wind = windRef.current;
    let initialHeadingRad = 0;
    let drillForReset: DrillDef | undefined;
    if (modeRef.current === 'drill') {
      drillForReset = findDrill(drillIdRef.current);
      if (drillForReset?.setup) {
        const baseWindDir = wind.trueWindDirRad;
        const baseWindSpeed = wind.trueWindSpeedKts;
        const setupResult = drillForReset.setup({
          windDirRad: baseWindDir,
          windSpeedKn: baseWindSpeed,
        });
        drillStartWindRef.current =
          setupResult.windDirAtStartRad ?? baseWindDir;
        drillStartWindSpeedRef.current = baseWindSpeed;
        if (setupResult.disableAutoTrim) {
          controlsRef.current = {
            ...controlsRef.current,
            autoTrim: false,
          };
        }
        if (setupResult.initialHeadingRad != null) {
          initialHeadingRad = normalizeRad(setupResult.initialHeadingRad);
          screenStateRef.current = {
            ...screenStateRef.current,
            heading: initialHeadingRad,
          };
          controlsRef.current = {
            ...controlsRef.current,
            targetHeading: initialHeadingRad,
          };
        }
      } else {
        drillStartWindRef.current = wind.trueWindDirRad;
        drillStartWindSpeedRef.current = wind.trueWindSpeedKts;
      }
      wind = windRef.current;
    } else {
      drillStartWindRef.current = wind.trueWindDirRad;
      drillStartWindSpeedRef.current = wind.trueWindSpeedKts;
    }
    physicsRef.current = createInitialState({
      tws: wind.trueWindSpeedKts,
      heading: (initialHeadingRad * RAD_TO_DEG) % 360,
      trueWindDir:
        (normalizeRad(wind.trueWindDirRad) * RAD_TO_DEG) % 360,
      boatSpeed: 0,
    });
    boatExtRef.current = {
      boatSpeedKn: 0,
      heelDeg: 0,
      leewayDeg: 0,
      twaDeg: 0,
      awaDeg: 0,
      awsKn: wind.trueWindSpeedKts,
      vmgKn: 0,
      sailSet: 'mainJib',
      mainStalled: false,
      jibStalled: false,
      slotHealth: 1,
      trimScore: 100,
    };
    trailRef.current = [{ x: initialX, y: initialY }];
    sailFeedbackRef.current = { main: 'idle', jib: 'idle' };
    const drill = drillForReset ?? findDrill(drillIdRef.current);
    drillStateRef.current = {
      drillId: drillIdRef.current,
      progressSec: 0,
      elapsedSec: 0,
      targetSec: drill ? drill.targetSec : 30,
      done: false,
      active: false,
      passed: false,
      score: 0,
      windMode: drill?.windMode,
    };
    const mission = findMission(missionIdRef.current);
    if (mission) {
      missionStateRef.current = buildMissionProgress(mission, options.bounds);
    }
  };

  return {
    boat: screenStateRef.current,
    boatExt: boatExtRef.current,
    wind: windRef.current,
    controls: controlsRef.current,
    trail: trailRef.current,
    tickN,
    sailFeedback: sailFeedbackRef.current,
    mode: modeRef.current,
    drill: modeRef.current === 'drill' ? drillStateRef.current : null,
    mission: modeRef.current === 'mission' ? missionStateRef.current : null,
    setTargetHeading: (h) => {
      controlsRef.current.targetHeading = h;
    },
    setWindDir: (rad) => {
      windRef.current = {
        ...windRef.current,
        trueWindDirRad: normalizeRad(rad),
      };
    },
    setWindSpeed: (kts) => {
      windRef.current = {
        ...windRef.current,
        trueWindSpeedKts: Math.max(0, kts),
      };
    },
    setMainSheet: (value) => {
      controlsRef.current = {
        ...controlsRef.current,
        autoTrim: false,
        mainSheet: clamp01(value),
      };
    },
    setJibSheet: (value) => {
      controlsRef.current = {
        ...controlsRef.current,
        autoTrim: false,
        jibSheet: clamp01(value),
      };
    },
    setTwist: (value) => {
      controlsRef.current = {
        ...controlsRef.current,
        autoTrim: false,
        twist: clamp01(value),
      };
    },
    setReef: (value) => {
      controlsRef.current = {
        ...controlsRef.current,
        autoTrim: false,
        reef: clamp01(value),
      };
    },
    setAutoTrim: (enabled) => {
      controlsRef.current = {
        ...controlsRef.current,
        autoTrim: enabled,
      };
    },
    setMode: (mode) => {
      modeRef.current = mode;
      resetCore();
    },
    setDrillId: (id) => {
      drillIdRef.current = id;
      const drill = findDrill(id);
      drillStateRef.current = {
        drillId: id,
        progressSec: 0,
        elapsedSec: 0,
        targetSec: drill ? drill.targetSec : 30,
        done: false,
        active: false,
        passed: false,
        score: 0,
        windMode: drill?.windMode,
      };
    },
    setMissionId: (id) => {
      missionIdRef.current = id;
      const mission = findMission(id);
      if (mission) {
        missionStateRef.current = buildMissionProgress(mission, options.bounds);
      }
    },
    reset: () => {
      resetCore();
    },
  };
}
