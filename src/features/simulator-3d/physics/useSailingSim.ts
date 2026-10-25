'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type SetStateAction } from 'react';
import { recordControlChange, recordDiagnostic } from "@/lib/diagnostics-controls";
import {
  getBoatParams,
  twaFromCompass,
  type BoatState as EngineState,
} from '@/lib/sailing-physics';
import { type CoachKey, type Controls, type WindState } from './sailModel';
import { createTargetSolver } from './targets';
import type { YachtState } from '../types';
import type { SailStatus } from '../sails/response';
import type { Maneuver } from '../sails/transfer';
import { createSailingSession, stepSailingSession } from '../../sailing-lab/runtime/session';
import { yachtFromSession } from "../../sailing-lab/runtime/presentation";
import { createFixedClock } from '../../sailing-lab/runtime/fixed-clock';
import { bindClockLifecycle } from "../../sailing-lab/runtime/clock-lifecycle";
import { engineTrimFromEase } from '../../sailing-lab/runtime/trim-controls';
import { coachFrom, trimQualityFrom } from '../../sailing-lab/runtime/trim-coach';

// Compatibility entry point for existing consumers and regression tests.
export { coachFrom } from '../../sailing-lab/runtime/trim-coach';

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
  /** Boom and jib angle to the centerline, degrees (shown in brackets next to the sheet). */
  boomAngleDeg: number;
  jibAngleDeg: number;
  pos: { x: number; z: number };
}

const PARAMS = getBoatParams();

const INITIAL_ENGINE: EngineState = {
  trueWindDir: 0,
  trueWindSpeed: 12,
  heading: 90,
  boatSpeed: 5,
  heel: 0,
  leeway: 0,
};

function inputFrom(ui: Controls, wind: WindState) {
  return {
    controls: engineTrimFromEase({ mainEase: ui.mainSheet, jibEase: ui.jibSheet, reef: ui.reef }),
    steering: { mode: "helm" as const, rudder: ui.rudder, lowSpeedAssist: true },
    wind: { speed: wind.twsKn, direction: wind.fromDeg, mode: "steady" as const },
  };
}
function initialSession(ui: Controls, wind: WindState) {
  return createSailingSession({ ...INITIAL_ENGINE, heading: (wind.fromDeg + 90) % 360 }, inputFrom(ui, wind), PARAMS);
}

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
  boomAngleDeg: 0,
  jibAngleDeg: 0,
  pos: { x: 0, z: 0 },
};

export function useSailingSim(yachtRef: MutableRefObject<YachtState>, enabled: boolean) {
  const [controls, setControlsState] = useState<Controls>({ rudder: 0, mainSheet: 0.6, jibSheet: 0.8, reef: 0 });
  const [wind, setWindState] = useState<WindState>({ twsKn: 12, fromDeg: 0 });
  const commandControls = useRef(controls), commandWind = useRef(wind);
  const [telemetry, setTelemetry] = useState<SimTelemetry>(INITIAL_TELEMETRY);

  const controlsRef = useRef(controls);
  const windRef = useRef(wind);
  const enabledRef = useRef(enabled);
  const [initial] = useState(() => initialSession(controls, wind));
  const sessionRef = useRef(initial);
  const clockRef = useRef(createFixedClock());
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
    clockRef.current.synchronize(performance.now(), enabled && !document.hidden);
  }, [enabled]);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let acc = 0;
    const clock = clockRef.current;
    clock.reset();
    const unbindClock = bindClockLifecycle(clock, { target: document, now: () => performance.now(),
      active: () => enabledRef.current && !document.hidden });
    const loop = (t: number) => {
      if (!alive) return;
      clock.advance(t, enabledRef.current && !document.hidden, (dt) => {
        const ui = controlsRef.current;
        const w = windRef.current;
        const session = stepSailingSession(sessionRef.current, inputFrom(ui, w), PARAMS);
        sessionRef.current = session;
        const { boat: next, lastDiag: diag, rig: motion, main: mainResponse, jib: jibResponse,
          mainIncidence, jibIncidence } = session;

        const twaSigned = twaFromCompass(next.trueWindDir, next.heading);
        const twaAbs = Math.abs(twaSigned);
        const quality = trimQualityFrom(twaAbs, diag);

        Object.assign(yachtRef.current, yachtFromSession(session));
        const pos = { x: session.position.east, z: -session.position.north };

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
            coach: coachFrom(twaAbs, next.boatSpeed, diag, quality, { main: mainIncidence, jib: jibIncidence }),
            maneuver: motion.maneuver,
            mainStatus: mainResponse.status,
            jibStatus: jibResponse.status,
            boomAngleDeg: Math.abs(yachtRef.current.boomAngle),
            jibAngleDeg: Math.abs(yachtRef.current.jibAngle),
            pos,
          });
        }
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      unbindClock();
    };
  }, [yachtRef]);

  const reset = useCallback(() => {
    sessionRef.current = initialSession(controlsRef.current, windRef.current);
    solveRef.current = createTargetSolver();
    clockRef.current.reset();
    recordDiagnostic({ type: "trainer.lifecycle", surface: "boat", outcome: "accepted", action: "reset" });
  }, []);

  const setControl = <K extends keyof Controls>(key: K, value: Controls[K], diagnostic = true) => {
    const previous = commandControls.current[key];
    commandControls.current = { ...commandControls.current, [key]: value };
    setControlsState(c => ({ ...c, [key]: value }));
    if (diagnostic) recordControlChange<"rudder" | "mainsheet" | "jibsheet" | "reef">("boat", ({ rudder: "rudder", mainSheet: "mainsheet", jibSheet: "jibsheet", reef: "reef" } as const)[key], value, previous);
  };
  const setControls = (action: SetStateAction<Controls>) => {
    const previous = commandControls.current, next = typeof action === "function" ? action(previous) : action;
    commandControls.current = next; setControlsState(action);
    for (const key of ["rudder", "mainSheet", "jibSheet", "reef"] as const) if (next[key] !== previous[key]) recordControlChange("boat", ({ rudder: "rudder", mainSheet: "mainsheet", jibSheet: "jibsheet", reef: "reef" } as const)[key], next[key], previous[key]);
  };
  const setWind = (action: SetStateAction<WindState>) => {
    const previous = commandWind.current, next = typeof action === "function" ? action(previous) : action;
    commandWind.current = next; setWindState(action);
    for (const [key, control] of [["twsKn", "wind-speed"], ["fromDeg", "wind-direction"]] as const) if (next[key] !== previous[key]) recordControlChange("boat", control, next[key], previous[key]);
  };

  return { controls, setControl, setControls, wind, setWind, telemetry, reset };
}
