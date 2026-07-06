'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  getBoatParams,
  tick,
  settle,
  twaFromCompass,
  NO_GO_HALF_DEG,
  type BoatState as EngineState,
  type Controls as EngineControls,
  type TickDiagnostics,
} from '@/lib/sailing-physics';
import { clamp, optimalBoomAngle, optimalJibAngle, type CoachKey, type Controls, type WindState } from './sailModel';
import type { YachtState } from '../types';

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
  pos: { x: number; z: number };
}

const TURN_RATE_MAX_DEG_S = 22;
const PARAMS = getBoatParams();

const INITIAL_ENGINE: EngineState = {
  trueWindDir: 0,
  trueWindSpeed: 12,
  heading: 45,
  boatSpeed: 0,
  heel: 0,
  leeway: 0,
};

const INITIAL_TELEMETRY: SimTelemetry = {
  speedKn: 0,
  heelDeg: 0,
  twaSigned: 45,
  awaDeg: 30,
  awaSigned: 30,
  awsKn: 12,
  heading: 45,
  trimQuality: 0,
  vmg: 0,
  vmgTargetAngle: 48,
  targetSpeedKn: 0,
  coach: 'reachOn',
  pos: { x: 0, z: 0 },
};

/** Near-optimal ENGINE controls for a given apparent wind angle: sheet so the
 * boom/jib sit at their optimal angles (sailModel's boom-angle optimum). */
function optimalEngineControls(awaAbs: number, reef: number): EngineControls {
  const mainSheet = clamp(1 - optimalBoomAngle(awaAbs) / PARAMS.mainMaxOff, 0, 1);
  const jibRange = PARAMS.jibMaxOff - PARAMS.jibMinOff;
  const jibSheet = clamp(1 - (optimalJibAngle(awaAbs) - PARAMS.jibMinOff) / jibRange, 0, 1);
  return { mainSheet, jibSheet, mainTwist: 0.35, jibTwist: 0.4, reef, jibFurl: 0, jibSide: 1 };
}

/** Settled boat speed at |TWA| under optimal trim (two-pass: trim to the
 * apparent wind the first pass discovers). */
function settledOptimalSpeed(twaAbs: number, twsKn: number, reef: number): number {
  const state: EngineState = {
    trueWindDir: 0,
    trueWindSpeed: twsKn,
    heading: twaAbs,
    boatSpeed: 3,
    heel: 0,
    leeway: 0,
  };
  const pass1 = settle(state, optimalEngineControls(twaAbs * 0.8, reef), PARAMS, 4);
  const pass2 = settle(pass1.state, optimalEngineControls(Math.abs(pass1.diag.awa), reef), PARAMS, 5);
  return pass2.state.boatSpeed;
}

/** Best-VMG angles for a wind speed, from the engine itself (not a lookup). */
function solveVmgTargets(twsKn: number): { up: number; down: number } {
  let up = 48;
  let bestUp = -Infinity;
  for (let a = NO_GO_HALF_DEG + 1; a <= 75; a += 2) {
    const v = settledOptimalSpeed(a, twsKn, 0) * Math.cos((a * Math.PI) / 180);
    if (v > bestUp) {
      bestUp = v;
      up = a;
    }
  }
  let down = 155;
  let bestDown = -Infinity;
  // Cap the scan at 165: beyond that the engine's drag-driven run is nearly
  // flat, so cos() alone would push the answer to ~173 - deeper than the
  // reference polar (best downwind VMG 150-165 for this cruiser) teaches.
  for (let a = 125; a <= 165; a += 3) {
    const v = settledOptimalSpeed(a, twsKn, 0) * -Math.cos((a * Math.PI) / 180);
    if (v > bestDown) {
      bestDown = v;
      down = a;
    }
  }
  return { up, down };
}

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
  if (twaAbs > 135) return 0.75;
  const q = (aoa: number, stalled: boolean) => (stalled ? 0.15 : clamp(1 - Math.abs(aoa - 16) / 14, 0, 1));
  const base = 0.6 * q(diag.mainAoA, diag.mainStalled) + 0.4 * q(diag.jibAoA, diag.jibStalled);
  return clamp(base * (0.7 + 0.3 * diag.slotHealth), 0, 1);
}

export function useSailingSim(yachtRef: MutableRefObject<YachtState>, enabled: boolean) {
  const [controls, setControls] = useState<Controls>({ rudder: 0, mainSheet: 0.2, jibSheet: 0.25, reef: 0 });
  const [wind, setWind] = useState<WindState>({ twsKn: 12, fromDeg: 0 });
  const [telemetry, setTelemetry] = useState<SimTelemetry>(INITIAL_TELEMETRY);

  const controlsRef = useRef(controls);
  const windRef = useRef(wind);
  const enabledRef = useRef(enabled);
  const engineRef = useRef<EngineState>({ ...INITIAL_ENGINE });
  const posRef = useRef({ x: 0, z: 0 });
  // Throttled expensive solves (engine settles): target speed + best-VMG.
  const solveRef = useRef({ twaKey: -1, twsKey: -1, target: 0, vmgUp: 48, vmgDown: 155 });

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
        const { state: next, diag } = tick(s, engineControls, PARAMS, dt);
        engineRef.current = next;

        const twaSigned = twaFromCompass(next.trueWindDir, next.heading);
        const twaAbs = Math.abs(twaSigned);
        const side = twaSigned >= 0 ? -1 : 1; // sails set to leeward
        const quality = trimQualityFrom(twaAbs, diag);
        const luffing = twaAbs < NO_GO_HALF_DEG || Math.min(diag.mainAoA, diag.jibAoA) < 6;

        // Rig visuals: sheets place the booms; morphs follow trim state.
        const boom = PARAMS.mainMaxOff * ui.mainSheet;
        const jib = PARAMS.jibMinOff + (PARAMS.jibMaxOff - PARAMS.jibMinOff) * ui.jibSheet;
        const camber = clamp((luffing ? 0.06 : 0.5) * (0.6 + 0.4 * quality) - 0.2 * ui.reef, 0.05, 0.7);
        const twist = clamp(0.18 + 0.5 * (twaAbs / 180), 0.15, 0.92);
        Object.assign(yachtRef.current, {
          boomAngle: boom * (side === -1 ? 1 : -1),
          jibAngle: jib * (side === -1 ? 1 : -1),
          camber,
          twist,
          luff: luffing ? 1 : 0,
          reef: ui.reef,
          rudderAngle: ui.rudder * 35,
          heel: next.heel * (side === -1 ? 1 : -1),
          speedKn: next.boatSpeed,
        } satisfies YachtState);

        // Position (telemetry only; the 3D world is boat-centric).
        const course = ((next.heading + side * next.leeway) * Math.PI) / 180;
        const v = next.boatSpeed * 0.514444;
        posRef.current.x += Math.sin(course) * v * dt;
        posRef.current.z += Math.cos(course) * v * dt;

        acc += dt;
        if (acc > 0.12) {
          acc = 0;
          // Throttled engine solves: only when the angle bucket or wind change.
          const sv = solveRef.current;
          const twaKey = Math.round(twaAbs / 4);
          const twsKey = Math.round(w.twsKn);
          if (sv.twsKey !== twsKey) {
            const t2 = solveVmgTargets(w.twsKn);
            sv.vmgUp = t2.up;
            sv.vmgDown = t2.down;
          }
          if (sv.twaKey !== twaKey || sv.twsKey !== twsKey) {
            sv.target = twaAbs < NO_GO_HALF_DEG ? 0 : settledOptimalSpeed(twaAbs, w.twsKn, ui.reef);
            sv.twaKey = twaKey;
            sv.twsKey = twsKey;
          }
          setTelemetry({
            speedKn: next.boatSpeed,
            heelDeg: Math.abs(next.heel),
            twaSigned,
            awaDeg: Math.abs(diag.awa),
            awaSigned: Math.sign(twaSigned || 1) * Math.abs(diag.awa),
            awsKn: diag.aws,
            heading: next.heading,
            trimQuality: quality,
            vmg: diag.vmg,
            vmgTargetAngle: twaAbs < 90 ? sv.vmgUp : sv.vmgDown,
            targetSpeedKn: sv.target,
            coach: coachFrom(twaAbs, next.boatSpeed, diag, quality),
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
    engineRef.current = { ...INITIAL_ENGINE, trueWindDir: windRef.current.fromDeg, trueWindSpeed: windRef.current.twsKn };
    posRef.current = { x: 0, z: 0 };
    solveRef.current.twaKey = -1;
  }, []);

  const setControl = <K extends keyof Controls>(key: K, value: Controls[K]) =>
    setControls((c) => ({ ...c, [key]: value }));

  return { controls, setControl, setControls, wind, setWind, telemetry, reset };
}
