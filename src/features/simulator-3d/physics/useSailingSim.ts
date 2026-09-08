'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  getBoatParams,
  twaFromCompass,
  NO_GO_HALF_DEG,
  type BoatState as EngineState,
  type Controls as EngineControls,
  type TickDiagnostics,
} from '@/lib/sailing-physics';
import { clamp, type CoachKey, type Controls, type WindState } from './sailModel';
import { createTargetSolver } from './targets';
import type { YachtState } from '../types';
import type { SailStatus } from '../sails/response';
import type { RigMotion, Maneuver } from '../sails/transfer';
import { stepWithRig } from './step';

// ============================================================================
// useSailingSim - drives the 3D boat from the GOLDEN VPP engine.
//
// Until 2026-07-06 sailing mode ran on a scripted polar (sailModel.stepBoat);
// now it runs src/lib/sailing-physics - the same force-balance engine as the
// web Trainer and the native app trainer (one engine, three simulators:
// docs/design/SIMULATORS.md). Heading is integrated caller-side from the helm
// (the engine owns trim/speed/heel/leeway; steering is a runtime concern,
// same split the Trainer uses).
//
// Runs a requestAnimationFrame loop and writes the rig state into a shared
// YachtState ref (mutated in place, so the 3D Canvas is NOT re-rendered every
// frame). Telemetry for the HUD is published as React state at ~8 Hz.
//
// UI sheet semantics stay 0 = hard in .. 1 = fully eased (the sliders and
// boom visuals depend on it); the engine wants the opposite, so we invert at
// the boundary.
// ============================================================================

export interface SimTelemetry {
  speedKn: number;
  heelDeg: number;
  twaSigned: number;
  awaDeg: number;
  /** Signed apparent wind angle off the bow (sign follows the tack). */
  awaSigned: number;
  awsKn: number;
  heading: number;
  trimQuality: number;
  /** Velocity made good up/down wind, knots (sign: + made good upwind). */
  vmg: number;
  /** Best-VMG |TWA| for the current mode (up or downwind), degrees. */
  vmgTargetAngle: number;
  /** Engine target boat speed at the current angle with OPTIMAL trim, knots. */
  targetSpeedKn: number;
  coach: CoachKey;
  maneuver: Maneuver;
  mainStatus: SailStatus;
  jibStatus: SailStatus;
  pos: { x: number; z: number };
}

const TURN_RATE_MAX_DEG_S = 22;
const PARAMS = getBoatParams();

const INITIAL_ENGINE: EngineState = {
  trueWindDir: 0,
  trueWindSpeed: 12,
  heading: 90,
  boatSpeed: 5,
  heel: 0,
  leeway: 0,
};

const INITIAL_TELEMETRY: SimTelemetry = {
  speedKn: 0,
  heelDeg: 0,
  twaSigned: -90,
  awaDeg: 90,
  awaSigned: -90,
  awsKn: 12,
  heading: 90,
  trimQuality: 0,
  vmg: 0,
  vmgTargetAngle: 48,
  targetSpeedKn: 0,
  coach: 'reachOn',
  maneuver: 'sailing',
  mainStatus: 'drawing',
  jibStatus: 'drawing',
  pos: { x: 0, z: 0 },
};

/** Coach hint from engine diagnostics (same keys/labels as before).
 * Note: deep downwind the sails run in drag mode - the engine's "stalled"
 * flag is physically true but is NOT a trim error there, so stall coaching
 * only applies while flow should be attached (up to ~135 deg). */
function coachFrom(twaAbs: number, speedKn: number, diag: TickDiagnostics, quality: number): CoachKey {
  if (twaAbs < NO_GO_HALF_DEG) return speedKn < 1.5 ? 'inIrons' : 'pinching';
  if (twaAbs < NO_GO_HALF_DEG + 5) return 'pinching';
  if (twaAbs >= 150) return 'run';
  if (twaAbs <= 135 && (diag.mainStalled || diag.jibStalled)) return 'stallEaseOut';
  const minAoA = Math.min(diag.mainAoA, diag.jibAoA);
  if (twaAbs <= 135 && minAoA < 7) return 'luffEaseIn';
  if (quality >= 0.68) return 'good';
  return 'reachOn';
}

/** 0..1 trim quality from angles of attack + slot (optimum AoA ~ 12-18).
 * Deep downwind (drag mode) attached-flow scoring does not apply: full,
 * well-eased sails there are GOOD trim even though the engine flags stall. */
function trimQualityFrom(twaAbs: number, diag: TickDiagnostics): number {
  if (twaAbs > 135) return clamp((0.6 * Math.sin(diag.mainAoA * Math.PI / 180) ** 2 + 0.4 * Math.sin(diag.jibAoA * Math.PI / 180) ** 2), 0, 1);
  const q = (aoa: number, stalled: boolean) => (stalled ? 0.15 : clamp(1 - Math.abs(aoa - 16) / 14, 0, 1));
  const base = 0.6 * q(diag.mainAoA, diag.mainStalled) + 0.4 * q(diag.jibAoA, diag.jibStalled);
  return clamp(base * (0.7 + 0.3 * diag.slotHealth), 0, 1);
}

export function useSailingSim(yachtRef: MutableRefObject<YachtState>, enabled: boolean) {
  const [controls, setControls] = useState<Controls>({ rudder: 0, mainSheet: 0.6, jibSheet: 0.8, reef: 0 });
  const [wind, setWind] = useState<WindState>({ twsKn: 12, fromDeg: 0 });
  const [telemetry, setTelemetry] = useState<SimTelemetry>(INITIAL_TELEMETRY);

  const controlsRef = useRef(controls);
  const windRef = useRef(wind);
  const enabledRef = useRef(enabled);
  const engineRef = useRef<EngineState>({ ...INITIAL_ENGINE });
  const posRef = useRef({ x: 0, z: 0 });
  const rigRef = useRef<RigMotion | null>(null);
  // Throttled expensive solves (engine settles): target speed + best-VMG.
  const solveRef = useRef(createTargetSolver());

  // Mirror the latest props/state into the loop's refs (refs must not be
  // assigned during render under the react-hooks rules).
  useEffect(() => {
    controlsRef.current = controls;
    windRef.current = wind;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (t: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (enabledRef.current) {
        const ui = controlsRef.current;
        const w = windRef.current;
        const s = engineRef.current;
        s.trueWindDir = w.fromDeg;
        s.trueWindSpeed = w.twsKn;

        // Steering (caller-side, like the Trainer): helm authority grows with
        // speed, with a small floor so a boat stalled head-to-wind can still
        // slowly fall off instead of freezing in irons forever.
        const auth = Math.max(0.12, clamp(s.boatSpeed / 3, 0, 1));
        s.heading = (s.heading + ui.rudder * TURN_RATE_MAX_DEG_S * auth * dt + 360) % 360;

        // Engine tick: UI sheets are 0=hard..1=eased, engine is the opposite.
        const engineControls: EngineControls = {
          mainSheet: 1 - ui.mainSheet,
          jibSheet: 1 - ui.jibSheet,
          mainTwist: 0.35,
          jibTwist: 0.4,
          reef: ui.reef,
          jibFurl: 0,
          jibSide: 1,
        };
        const { state: next, diag, motion, main: mainResponse, jib: jibResponse, mainIncidence, jibIncidence } =
          stepWithRig(s, engineControls, PARAMS, rigRef.current, dt);
        rigRef.current = motion;
        engineRef.current = next;

        const twaSigned = twaFromCompass(next.trueWindDir, next.heading);
        const twaAbs = Math.abs(twaSigned);
        const quality = trimQualityFrom(twaAbs, diag);

        // Rig visuals: sheets place the booms; morphs follow trim state.
        const camber = 0.6 - 0.2 * ui.reef;
        const twist = engineControls.mainTwist;
        Object.assign(yachtRef.current, {
          boomAngle: motion.main,
          jibAngle: motion.jib,
          rigResolved: true,
          sailSide: motion.lee,
          camber,
          twist,
          luff: mainResponse.luff,
          fill: mainResponse.fill,
          airSpeed: mainResponse.airSpeed,
          reef: ui.reef,
          rudderAngle: ui.rudder * 35,
          heel: next.heel,
          heading: next.heading,
          wind: { from: w.fromDeg, knots: w.twsKn },
          apparentWind: { from: (next.heading + diag.awa + 360) % 360, knots: diag.aws },
          jibShape: {
            camber: 0.7,
            twist: engineControls.jibTwist,
            luff: jibResponse.luff,
            fill: jibResponse.fill,
            airSpeed: jibResponse.airSpeed,
            furl: 0,
          },
          speedKn: next.boatSpeed,
        } satisfies YachtState);

        // Position (telemetry only; the 3D world is boat-centric).
        const course = ((next.heading + next.leeway) * Math.PI) / 180;
        const v = next.boatSpeed * 0.514444;
        posRef.current.x += Math.sin(course) * v * dt;
        posRef.current.z -= Math.cos(course) * v * dt;
        yachtRef.current.travel = { ...posRef.current };

        acc += dt;
        if (acc > 0.12) {
          acc = 0;
          // Throttled engine solves: only when the angle bucket or wind change.
          const sv = solveRef.current(twaAbs, w.twsKn, ui.reef);
          setTelemetry({
            speedKn: next.boatSpeed,
            heelDeg: Math.abs(next.heel),
            twaSigned,
            awaDeg: Math.abs(diag.awa),
            awaSigned: diag.awa,
            awsKn: diag.aws,
            heading: next.heading,
            trimQuality: quality,
            vmg: diag.vmg,
            vmgTargetAngle: twaAbs < 90 ? sv.vmgUp : sv.vmgDown,
            targetSpeedKn: sv.target,
            coach: twaAbs >= NO_GO_HALF_DEG && twaAbs <= 135 && (mainIncidence < 1 || jibIncidence < 1)
              ? "luffEaseIn" : coachFrom(twaAbs, next.boatSpeed, diag, quality),
            maneuver: motion.maneuver,
            mainStatus: mainResponse.status,
            jibStatus: jibResponse.status,
            pos: { ...posRef.current },
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [yachtRef]);

  const reset = useCallback(() => {
    engineRef.current = { ...INITIAL_ENGINE, trueWindDir: windRef.current.fromDeg, trueWindSpeed: windRef.current.twsKn, heading: (windRef.current.fromDeg + 90) % 360 };
    posRef.current = { x: 0, z: 0 };
    rigRef.current = null;
    solveRef.current = createTargetSolver();
  }, []);

  const setControl = <K extends keyof Controls>(key: K, value: Controls[K]) =>
    setControls((c) => ({ ...c, [key]: value }));

  return { controls, setControl, setControls, wind, setWind, telemetry, reset };
}
