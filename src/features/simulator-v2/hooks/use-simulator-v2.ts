'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getBoatParams,
  twaFromCompass,
  type Controls,
} from '@/lib/sailing-physics';
import {
  createRuntimeState,
  uiToControls,
  type UiState,
} from '../runtime/create-runtime-state';
import { stepRuntime } from '../runtime/step-runtime';
import { type RuntimeState } from '../runtime/runtime-types';

// ---------------------------------------------------------------------------
// V2 live-runtime hook.
//
// Owns the simulation clock and exposes a snapshot the scene and HUD can
// read. setInterval-based fixed-step loop (not rAF) so background tabs
// and headless preview verification keep ticking; React renders are
// driven by a frame counter bumped after each advance.
// ---------------------------------------------------------------------------

const FIXED_DT = 1 / 30;
const MAX_LAG_MS = 100;

export interface SimulationSnapshot {
  boatSpeed: number;
  heel: number;
  signedTwa: number;
  absTwa: number;
  awa: number;
  aws: number;
  mainAngle: number;
  jibAngle: number;
  noGo: boolean;
  targetHeading: number;
  heading: number;
  trueWindDir: number;
  simTime: number;
}

export interface UseSimulatorV2Result {
  sim: SimulationSnapshot;
  /** Re-seed the runtime with a settled state built from the passed UI. */
  reset: (nextUi: UiState) => void;
}

export function useSimulatorV2(ui: UiState): UseSimulatorV2Result {
  const params = useMemo(() => getBoatParams(), []);

  // Mutable runtime lives outside React state - we only need one render
  // per advanced frame, not one per mutation.
  const stateRef = useRef<RuntimeState>(createRuntimeState({ ui, params }));
  const targetRef = useRef<Controls>(stateRef.current.target);
  const targetHeadingRef = useRef<number>(stateRef.current.targetHeading);
  const lastTimeRef = useRef<number | null>(null);
  const accumRef = useRef(0);
  const [frame, setFrame] = useState(0);

  // Auto-trim target rebuilds whenever TWA intent or sail config changes.
  // Heading intent is handled separately so that a wind-speed change does
  // not rebuild controls unnecessarily.
  useEffect(() => {
    targetRef.current = uiToControls(ui, params);
  }, [ui.twa, ui.tack, ui.mainOn, ui.jibOn, ui.reefLevel, params]);

  // Heading intent + wind speed. Changes to TWA/tack move the target
  // heading; the boat turns toward it at HEADING_TURN_RATE. Wind speed
  // updates the live boat state immediately (gusts happen fast).
  useEffect(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    const current = stateRef.current;
    const newHeading = ((current.boat.trueWindDir - signedTwa) % 360 + 360) % 360;
    targetHeadingRef.current = newHeading;
    stateRef.current = {
      ...current,
      boat: { ...current.boat, trueWindSpeed: ui.windSpeed },
      targetHeading: newHeading,
    };
  }, [ui.twa, ui.tack, ui.windSpeed]);

  // Fixed-step loop. setInterval over rAF so headless/hidden tabs tick.
  useEffect(() => {
    const tickFn = () => {
      const now = performance.now();
      const prev = lastTimeRef.current ?? now;
      lastTimeRef.current = now;
      const elapsedMs = Math.min(now - prev, MAX_LAG_MS);
      accumRef.current += elapsedMs / 1000;
      let advanced = false;
      while (accumRef.current >= FIXED_DT) {
        stateRef.current = stepRuntime(
          stateRef.current,
          targetRef.current,
          targetHeadingRef.current,
          params,
          FIXED_DT,
        );
        accumRef.current -= FIXED_DT;
        advanced = true;
      }
      if (advanced) setFrame((f) => (f + 1) | 0);
    };
    const intervalMs = Math.max(1, Math.round(FIXED_DT * 1000));
    const id = setInterval(tickFn, intervalMs);
    return () => {
      clearInterval(id);
      lastTimeRef.current = null;
    };
  }, [params]);

  const reset = useCallback(
    (nextUi: UiState) => {
      const fresh = createRuntimeState({ ui: nextUi, params });
      stateRef.current = fresh;
      targetRef.current = fresh.target;
      targetHeadingRef.current = fresh.targetHeading;
      accumRef.current = 0;
      lastTimeRef.current = null;
      setFrame((f) => (f + 1) | 0);
    },
    [params],
  );

  // Snapshot for the scene + HUD. Reads the live runtime each render.
  const sim = useMemo<SimulationSnapshot>(() => {
    const rt = stateRef.current;
    const signedTwa = twaFromCompass(rt.boat.trueWindDir, rt.boat.heading);
    const absTwa = Math.abs(signedTwa);
    const noGo = absTwa < 30;
    // Reverse the mainSheet / jibSheet mapping so the scene gets a boom
    // angle it can render directly.
    const mainAngle = (1 - rt.live.mainSheet) * params.mainMaxOff;
    const jibAngle = params.jibMinOff
      + (1 - rt.live.jibSheet) * (params.jibMaxOff - params.jibMinOff);
    return {
      boatSpeed: rt.boat.boatSpeed,
      heel: rt.boat.heel,
      signedTwa,
      absTwa,
      awa: Math.abs(rt.lastDiag.awa),
      aws: rt.lastDiag.aws,
      mainAngle,
      jibAngle,
      noGo,
      targetHeading: rt.targetHeading,
      heading: rt.boat.heading,
      trueWindDir: rt.boat.trueWindDir,
      simTime: rt.simTime,
    };
    // `frame` forces recompute each advanced tick. Mutable ref makes ui
    // unnecessary in the dep list, but we keep params for correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, frame]);

  return { sim, reset };
}
