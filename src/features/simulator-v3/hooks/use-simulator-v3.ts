'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialState,
  getBoatParams,
  settle,
  twaFromCompass,
  type Controls,
} from '@/lib/sailing-physics';
import { pickPrimaryFeedback } from '../runtime/feedback';
import {
  createRuntimeState,
  uiToControls,
} from '../runtime/create-runtime-state';
import { stepRuntime } from '../runtime/step-runtime';
import { createFixedClock, SAILING_STEP_SECONDS } from '../../sailing-lab/runtime/fixed-clock';
import type { SailingSession } from "../../sailing-lab/runtime/session";
import { type RuntimeState } from '../runtime/runtime-types';
import { recommendedTrim } from '../runtime/trim-heuristics';
import {
  clamp,
  DEFAULT_UI,
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
// The shared 30 Hz clock owns accumulation, pause and discontinuities.
// A view switch never restarts it. Background tabs do not fast-forward.
//
// Reset clears the runtime and re-settles from the current UI.
// ---------------------------------------------------------------------------

const FIXED_DT = SAILING_STEP_SECONDS;

interface Options {
  ui: UiState;
  tp: TpFn;
  paused?: boolean;
}

interface Result {
  sim: SimulationModel;
  /**
   * Re-seed the runtime with a settled initial state. Caller passes the UI
   * that should be in effect post-reset; this avoids a stale-closure trap
   * where the captured `ui` lags one render behind a concurrent setUi.
   */
  reset: (nextUi: UiState) => void;
  restore: (session: SailingSession, nextUi: UiState) => void;
}

export function useSimulatorV3({ ui, tp, paused = false }: Options): Result {
  const params = useMemo(() => getBoatParams(), []);

  // Mutable runtime lives outside React state to avoid N re-renders per
  // frame (we only need one). `frame` is just a tick counter for React.
  const [initialRuntime] = useState(() => createRuntimeState({ ui, params }));
  const stateRef = useRef<RuntimeState>(initialRuntime);
  const targetRef = useRef<Controls>(stateRef.current.target);
  const trimRef = useRef(ui.mainTrim);
  // targetHeading kept in a ref so the env useEffect can update it without
  // racing with the fixed-step loop (loop reads .current each tick).
  const targetHeadingRef = useRef<number>(stateRef.current.targetHeading);
  // Wind mode read by the fixed-step loop each tick. A ref (not a loop
  // dependency) so flipping Steady/Shifts/Gusts never restarts the
  // interval or resets the accumulated wind phase.
  const windModeRef = useRef(ui.windMode);
  useEffect(() => {
    windModeRef.current = ui.windMode;
  }, [ui.windMode]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef(createFixedClock());
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  // Telemetry anchor for PR-5 delta-sensitive feedback. We capture
  // (trimScore, heelAbs, t) at a stable point up to ~1.5 s in the past,
  // then measure delta = current - anchor each frame. When the anchor
  // expires, we rotate it forward. This reads the direction of travel
  // (trim recovering / heel rising) without needing a full buffer.
  const telemetryAnchorRef = useRef<{ trim: number; heelAbs: number; t: number } | null>(null);
  const [frame, setFrame] = useState(0);

  // Rebuild target controls when trim-related UI changes. Env-related fields
  // (twa/tack/windSpeed) do not belong here - they update the boat state
  // directly below so the wind rotates immediately.
  useEffect(() => {
    targetRef.current = uiToControls(ui, params);
    trimRef.current = ui.mainTrim;
  }, [ui, params]);

  // PR-3 heading intent: TWA/tack express the TARGET, not an instant TWA.
  // TrueWindDir stays pinned at whatever createRuntimeState settled to - it
  // is the world reference. The TWA slider and tack flip both move the
  // targetHeading = trueWindDir - signedTwa; the boat's own heading
  // interpolates there at HEADING_TURN_RATE each tick, so a tack/gybe now
  // looks and feels like a real maneuver instead of a teleport.
  //
  // Wind SPEED is still applied instantly (wind gusts happen fast).
  useEffect(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    const current = stateRef.current;
    // Heading target anchors to the BASE wind direction, not the shift-
    // modulated one: the user's TWA slider expresses intent relative to
    // the base breeze, and shift/gust modulation wanders around it.
    const newTarget = ((current.wind.baseDir - signedTwa) % 360 + 360) % 360;
    targetHeadingRef.current = newTarget;
    stateRef.current = {
      ...current,
      boat: {
        ...current.boat,
        // Apply the slider immediately, preserving any active modulation
        // so a mid-gust slider move doesn't snap the felt wind.
        trueWindSpeed: ui.windSpeed * current.wind.twsFactor,
      },
      wind: { ...current.wind, baseTws: ui.windSpeed },
      targetHeading: newTarget,
    };
  }, [ui.twa, ui.tack, ui.windSpeed]);

  // Timer publishes to React, but the common clock determines whether and
  // how many fixed steps run. Never simulate hidden time to satisfy a test.
  useEffect(() => {
    const clock = clockRef.current;
    const tickInterval = () => {
      const advanced = clock.advance(performance.now(), !pausedRef.current && !document.hidden, (dt) => {
        stateRef.current = stepRuntime(
          stateRef.current,
          targetRef.current,
          targetHeadingRef.current,
          params,
          dt,
          windModeRef.current,
          trimRef.current,
        );
      });
      if (advanced) setFrame((f) => (f + 1) | 0);
    };
    const intervalMs = Math.max(1, Math.round(FIXED_DT * 1000));
    intervalRef.current = setInterval(tickInterval, intervalMs);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      clock.reset();
    };
  }, [params]);

  const reset = useCallback(
    (nextUi: UiState) => {
      const fresh = createRuntimeState({ ui: nextUi, params });
      stateRef.current = fresh;
      targetRef.current = fresh.target;
      trimRef.current = nextUi.mainTrim;
      targetHeadingRef.current = fresh.targetHeading;
      clockRef.current.reset();
      // Drop telemetry anchor on reset so trim/heel deltas don't report
      // a huge jump against a now-unrelated prior scenario.
      telemetryAnchorRef.current = null;
      setFrame((f) => (f + 1) | 0);
    },
    [params],
  );

  const restore = useCallback((session: SailingSession, nextUi: UiState) => {
    if (session.steering.mode !== "course-assist") throw new RangeError("Trainer requires assisted steering");
    // Pause immediately, before the parent state update can reach an effect.
    pausedRef.current = true;
    const signedTwa = nextUi.tack === "starboard" ? nextUi.twa : -nextUi.twa;
    const heading = ((session.wind.baseDir - signedTwa) % 360 + 360) % 360;
    stateRef.current = { ...session, targetHeading: heading };
    targetRef.current = uiToControls(nextUi, params);
    trimRef.current = nextUi.mainTrim;
    targetHeadingRef.current = heading;
    windModeRef.current = nextUi.windMode;
    clockRef.current.reset();
    telemetryAnchorRef.current = null;
    setFrame(value => (value + 1) | 0);
  }, [params]);

  // ---------------------------------------------------------------------
  // Optimal trim + reference speed: recomputed only when env or reef/sails
  // change, not every frame. Uses the same two-pass AWA convergence the
  // PR-1 code had (awa depends on bs which depends on trim, so we settle
  // twice with optimal-so-far controls to find a self-consistent optimum).
  // ---------------------------------------------------------------------
  const optimalModel = useMemo(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    const baseControls = uiToControls({ ...DEFAULT_UI, sailsRaised: ui.sailsRaised,
      reefLevel: ui.reefLevel, jibFurlPct: ui.jibFurlPct }, params);
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
  //
  // PR-3 change: signedTwa now comes from the boat's *actual* heading vs
  // trueWindDir, not from ui.twa directly. This is how the scene rotates
  // smoothly during a tack - the boat's heading walks toward target, and
  // the derived TWA follows. ui.twa remains the user's intent (what TWA
  // they want), read by other systems like the course-preset buttons.
  const sim: SimulationModel = useMemo(() => {
    const rt = stateRef.current;
    const signedTwa = twaFromCompass(rt.boat.trueWindDir, rt.boat.heading);
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

    // Delta vs the telemetry anchor. Anchor is up to 1.5 s old; on expiry
    // it rotates forward. Intentionally a ref-mutation inside useMemo: it
    // is idempotent per render and avoids wiring another effect.
    const heelAbsNow = Math.abs(rt.boat.heel);
    const nowSec = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
    const anchor = telemetryAnchorRef.current;
    const windowSec = 1.5;
    let trimDelta = 0;
    let heelDelta = 0;
    if (anchor) {
      trimDelta = trimScore - anchor.trim;
      heelDelta = heelAbsNow - anchor.heelAbs;
      if (nowSec - anchor.t >= windowSec) {
        telemetryAnchorRef.current = { trim: trimScore, heelAbs: heelAbsNow, t: nowSec };
      }
    } else {
      telemetryAnchorRef.current = { trim: trimScore, heelAbs: heelAbsNow, t: nowSec };
    }

    const picked = pickPrimaryFeedback({
      ui,
      result,
      pos,
      absTwa,
      tp,
      trimDelta,
      heelDelta,
    });

    // Ghost angles: cheap per-frame heuristic based on the LIVE AWA. Unlike
    // `optimalModel.optimal` (which is target-TWA based and memoized), this
    // slides as the boat turns so the dashed ghost on the scene always
    // reads "here is where these sails should be for the wind you feel
    // RIGHT NOW". No settle() call per frame - just the piecewise formula.
    const ghostAngles = recommendedTrim(
      Math.abs(rt.lastDiag.awa),
      ui.windSpeed,
      ui.reefLevel,
      params,
    );

    // Live sail angles in degrees, recovered from the runtime's interpolated
    // controls. Scenes draw these instead of ui.mainAngle/ui.jibAngle so the
    // drawn sail eases at winch speed exactly like the physics does.
    const liveMainAngle = Math.abs(rt.rig.main);
    const liveJibAngle = Math.abs(rt.rig.jib);

    return {
      session: rt,
      result,
      optimalResult: optimalModel.optimalResult,
      pos,
      signedTwa,
      absTwa,
      trimScore,
      optimal: optimalModel.optimal,
      ghostAngles,
      liveMainAngle,
      liveJibAngle,
      primaryFeedback: rt.mainTrim ? tp("Меняй одну снасть. Сравни угол гика, twist, крен и установившуюся скорость.", "Change one control. Compare boom angle, twist, heel and settled speed.", "Zmieniaj jedną linę. Porównaj kąt bomu, skręt, przechył i ustaloną prędkość.", { es: "Cambia un control. Compara ángulo, torsión, escora y velocidad estable.", fr: "Change une commande. Compare angle, vrillage, gîte et vitesse stabilisée.", de: "Ändere eine Einstellung. Vergleiche Baumwinkel, Twist, Krängung und stabile Fahrt.", it: "Cambia un comando. Confronta angolo, twist, sbandamento e velocità stabile." }) : picked.text,
      primaryFeedbackTone: rt.mainTrim ? "info" : picked.tone,
      targetHeading: rt.targetHeading,
    };
    // `frame` forces invalidation on every rAF-driven render so the memo
    // reads a fresh stateRef snapshot. `stateRef.current` itself is mutable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui, optimalModel, tp, frame]);

  return { sim, reset, restore };
}
