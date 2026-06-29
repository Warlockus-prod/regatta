'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  DEFAULT_BOAT,
  stepBoat,
  targetSpeedKn,
  vmgTarget,
  clamp,
  type BoatState,
  type WindState,
  type Controls,
  type StepResult,
  type CoachKey,
} from './sailModel';
import type { YachtState } from '../types';

// ============================================================================
// useSailingSim - drives the boat from the physics model.
//
// Runs a requestAnimationFrame loop, steps stepBoat() each frame, and writes
// the resulting rig state into a shared YachtState ref (mutated in place, so
// the 3D Canvas is NOT re-rendered every frame - the Yacht reads the ref in its
// own useFrame). Telemetry (for the HUD) is published as React state at ~8 Hz.
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
  /** Polar target boat speed at the current angle/trim, knots. */
  targetSpeedKn: number;
  coach: CoachKey;
  pos: { x: number; z: number };
}

const INITIAL_BOAT: BoatState = { x: 0, z: 0, heading: 45, speedKn: 0, heel: 0 };
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
  vmgTargetAngle: 45,
  targetSpeedKn: 0,
  coach: 'reachOn',
  pos: { x: 0, z: 0 },
};

function toYacht(step: StepResult, controls: Controls): YachtState {
  const side = step.twaSigned >= 0 ? -1 : 1; // leeward sign (-1 = port)
  const twaAbs = Math.abs(step.twaSigned);
  const camber = clamp((step.luffing ? 0.06 : 0.5) * (0.6 + 0.4 * step.trimQuality) - 0.2 * controls.reef, 0.05, 0.7);
  const twist = clamp(0.18 + 0.5 * (twaAbs / 180), 0.15, 0.92);
  return {
    boomAngle: step.boomAngle * (side === -1 ? 1 : -1),
    jibAngle: step.jibAngle * (side === -1 ? 1 : -1),
    camber,
    twist,
    luff: step.luffing ? 1 : 0,
    reef: controls.reef,
    rudderAngle: controls.rudder * 35,
    heel: step.boat.heel * (side === -1 ? 1 : -1),
  };
}

export function useSailingSim(yachtRef: MutableRefObject<YachtState>, enabled: boolean) {
  const cfg = DEFAULT_BOAT;
  const [controls, setControls] = useState<Controls>({ rudder: 0, mainSheet: 0.2, jibSheet: 0.25, reef: 0 });
  const [wind, setWind] = useState<WindState>({ twsKn: 12, fromDeg: 0 });
  const [telemetry, setTelemetry] = useState<SimTelemetry>(INITIAL_TELEMETRY);

  const controlsRef = useRef(controls);
  const windRef = useRef(wind);
  const enabledRef = useRef(enabled);
  const boatRef = useRef<BoatState>(INITIAL_BOAT);

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
        const step = stepBoat(cfg, boatRef.current, windRef.current, controlsRef.current, dt);
        boatRef.current = step.boat;
        Object.assign(yachtRef.current, toYacht(step, controlsRef.current));
        acc += dt;
        if (acc > 0.12) {
          acc = 0;
          const twaAbs = Math.abs(step.twaSigned);
          const tws = windRef.current.twsKn;
          const mode: -1 | 1 = twaAbs < 90 ? -1 : 1;
          setTelemetry({
            speedKn: step.boat.speedKn,
            heelDeg: Math.abs(step.boat.heel),
            twaSigned: step.twaSigned,
            awaDeg: step.awaDeg,
            awaSigned: Math.sign(step.twaSigned || 1) * step.awaDeg,
            awsKn: step.awsKn,
            heading: step.boat.heading,
            trimQuality: step.trimQuality,
            vmg: step.boat.speedKn * Math.cos((twaAbs * Math.PI) / 180),
            vmgTargetAngle: vmgTarget(cfg, tws, mode),
            targetSpeedKn: targetSpeedKn(cfg, tws, twaAbs, step.trimQuality, controlsRef.current.reef),
            coach: step.coach,
            pos: { x: step.boat.x, z: step.boat.z },
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
  }, [cfg, yachtRef]);

  const reset = useCallback(() => {
    boatRef.current = { ...INITIAL_BOAT };
  }, []);

  const setControl = <K extends keyof Controls>(key: K, value: Controls[K]) =>
    setControls((c) => ({ ...c, [key]: value }));

  return { controls, setControl, setControls, wind, setWind, telemetry, reset };
}
