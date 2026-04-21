'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialState,
  getBoatParams,
  settle,
  type Controls,
} from '@/lib/sailing-physics';
import { pickPrimaryFeedback } from '../runtime/feedback';
import {
  createRuntimeState,
  uiToControls,
} from '../runtime/create-runtime-state';
import { stepRuntime } from '../runtime/step-runtime';
import { type RuntimeState } from '../runtime/runtime-types';
import { recommendedTrim } from '../runtime/trim-heuristics';
import {
  clamp,
  pointOfSailFor,
  toJibSheet,
  toMainSheet,
  type SimulationModel,
  type TpFn,
  type UiState,
} from '../ui/shared';

// ---------------------------------------------------------------------------
// V3 live-runtime React hook.
//
// Contract: replaces the PR-1 useMemo(settle(...)) flow. Same output shape
// (SimulationModel) so scene/pods/metrics stay unchanged - only the source
// of truth moves from "recompute from scratch on each ui change" to "walk
// a persistent runtime forward with rAF". That is what Contracts 2 and 3
// (live overtrim, live reef recovery) require.
//
// Frame loop:
// 1. rAF callback receives a timestamp.
// 2. Elapsed ms since last frame is capped at 100 to avoid post-tab-hidden
//    burst simulation.
// 3. Accumulated lag is divided by a fixed dt (1/30). While enough lag is
//    available, stepRuntime runs one step at a time. This decouples sim
//    stepping from display refresh - sim stays stable on 120 Hz screens
//    and after short GC pauses.
// 4. A frame counter bumps so React renders with the new runtime snapshot.
//
// Reset clears the runtime and re-settles from the current UI.
// ---------------------------------------------------------------------------

const FIXED_DT = 1 / 30;
const MAX_LAG_MS = 100;

interface Options {
  ui: UiState;
  tp: TpFn;
}

interface Result {
  sim: SimulationModel;
  /**
   * Re-seed the runtime with a settled initial state. Caller passes the UI
   * that should be in effect post-reset; this avoids a stale-closure trap
   * where the captured `ui` lags one render behind a concurrent setUi.
   */
  reset: (nextUi: UiState) => void;
}

export function useSimulatorV3({ ui, tp }: Options): Result {
  const params = useMemo(() => getBoatParams(), []);

  // Mutable runtime lives outside React state to avoid N re-renders per
  // frame (we only need one). `frame` is just a tick counter for React.
  const stateRef = useRef<RuntimeState>(createRuntimeState({ ui, params }));
  const targetRef = useRef<Controls>(stateRef.current.target);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumRef = useRef(0);
  const [frame, setFrame] = useState(0);

  // Rebuild target controls when trim-related UI changes. Env-related fields
  // (twa/tack/windSpeed) do not belong here - they update the boat state
  // directly below so the wind rotates immediately.
  useEffect(() => {
    targetRef.current = uiToControls(ui, params);
  }, [
    ui.mainAngle,
    ui.jibAngle,
    ui.mainTwistPct,
    ui.jibTwistPct,
    ui.reefLevel,
    ui.jibFurlPct,
    ui.sailsRaised,
    ui.tack,
    params,
  ]);

  // Apply environment changes (TWA slider, wind speed, tack flip) straight
  // to the boat state. TWA is derived from (trueWindDir - heading) so we
  // rotate trueWindDir and leave heading alone; the live boat speed then
  // catches up over the next few ticks.
  useEffect(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    const current = stateRef.current;
    stateRef.current = {
      ...current,
      boat: {
        ...current.boat,
        trueWindDir: (current.boat.heading + signedTwa + 360) % 360,
        trueWindSpeed: ui.windSpeed,
      },
    };
  }, [ui.twa, ui.tack, ui.windSpeed]);

  // Main simulation loop. We use setInterval(FIXED_DT) rather than rAF
  // because requestAnimationFrame is paused by the browser when the tab is
  // hidden, which prevents physics from ticking in background tabs and
  // breaks automated preview verification (headless tabs report
  // document.hidden === true). setInterval keeps ticking, and the visual
  // refresh is still driven by the browser's natural paint cadence via
  // React renders. FIXED_DT = 1/30 keeps CPU cost negligible.
  //
  // We still accumulate elapsed time and cap per-frame lag so that a tab
  // unfreeze burst (e.g. laptop waking from sleep) does not simulate
  // minutes of physics in one burst.
  useEffect(() => {
    const tickInterval = () => {
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
          params,
          FIXED_DT,
        );
        accumRef.current -= FIXED_DT;
        advanced = true;
      }
      if (advanced) setFrame((f) => (f + 1) | 0);
    };
    const intervalMs = Math.max(1, Math.round(FIXED_DT * 1000));
    intervalRef.current = setInterval(tickInterval, intervalMs);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      lastTimeRef.current = null;
    };
  }, [params]);

  const reset = useCallback(
    (nextUi: UiState) => {
      const fresh = createRuntimeState({ ui: nextUi, params });
      stateRef.current = fresh;
      targetRef.current = fresh.target;
      accumRef.current = 0;
      lastTimeRef.current = null;
      setFrame((f) => (f + 1) | 0);
    },
    [params],
  );

  // ---------------------------------------------------------------------
  // Optimal trim + reference speed: recomputed only when env or reef/sails
  // change, not every frame. Uses the same two-pass AWA convergence the
  // PR-1 code had (awa depends on bs which depends on trim, so we settle
  // twice with optimal-so-far controls to find a self-consistent optimum).
  // ---------------------------------------------------------------------
  const optimalModel = useMemo(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    const baseControls = uiToControls(ui, params);
    const init = createInitialState({
      tws: ui.windSpeed,
      twa: signedTwa,
      boatSpeed: Math.max(3, ui.windSpeed * 0.45),
    });
    const passOne = settle(init, baseControls, params, 45, 0.1);
    const firstOpt = recommendedTrim(
      Math.abs(passOne.diag.awa),
      ui.windSpeed,
      ui.reefLevel,
      params,
    );
    const firstOptCtrls: Controls = {
      ...baseControls,
      mainSheet: toMainSheet(firstOpt.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(firstOpt.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: firstOpt.mainTwistPct / 100,
      jibTwist: firstOpt.jibTwistPct / 100,
    };
    const firstOptRes = settle(init, firstOptCtrls, params, 45, 0.1);
    const optimal = recommendedTrim(
      Math.abs(firstOptRes.diag.awa),
      ui.windSpeed,
      ui.reefLevel,
      params,
    );
    const optCtrls: Controls = {
      ...baseControls,
      mainSheet: toMainSheet(optimal.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(optimal.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: optimal.mainTwistPct / 100,
      jibTwist: optimal.jibTwistPct / 100,
    };
    const optimalResult = settle(init, optCtrls, params, 45, 0.1);
    return { optimal, optimalResult };
  }, [
    ui.twa,
    ui.tack,
    ui.windSpeed,
    ui.reefLevel,
    ui.sailsRaised,
    ui.jibFurlPct,
    params,
    // Keep heuristic dependencies explicit. mainAngle/jibAngle/twist do NOT
    // affect the optimal target, only the delta; they are intentionally
    // absent so sliding the sheet does not retrigger 3 settle() calls.
  ]);

  // Derive SimulationModel from the live runtime snapshot. The heavy optimal
  // memo is reused; the feedback picker reads current state so it tracks
  // live stalls and heel in real time.
  const sim: SimulationModel = useMemo(() => {
    const rt = stateRef.current;
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    const absTwa = Math.abs(signedTwa);
    const pos = pointOfSailFor(absTwa);
    const result = { state: rt.boat, diag: rt.lastDiag };
    const trimScore = clamp(
      Math.round(
        (rt.boat.boatSpeed / Math.max(0.1, optimalModel.optimalResult.state.boatSpeed)) * 100,
      ),
      0,
      100,
    );
    const picked = pickPrimaryFeedback({ ui, result, pos, absTwa, tp });
    return {
      result,
      optimalResult: optimalModel.optimalResult,
      pos,
      signedTwa,
      absTwa,
      trimScore,
      optimal: optimalModel.optimal,
      primaryFeedback: picked.text,
      primaryFeedbackTone: picked.tone,
    };
    // `frame` forces invalidation on every rAF-driven render so the memo
    // reads a fresh stateRef snapshot. `stateRef.current` itself is mutable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui, optimalModel, tp, frame]);

  return { sim, reset };
}
