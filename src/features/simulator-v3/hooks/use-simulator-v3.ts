'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getBoatParams,
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
import { bindClockLifecycle } from "../../sailing-lab/runtime/clock-lifecycle";
import { recordDiagnostic } from "@/lib/diagnostics-controls";
import type { SailingSession } from "../../sailing-lab/runtime/session";
import { type RuntimeState } from '../runtime/runtime-types';
import { autoTrimStep, trainerOptimum } from '../runtime/auto-trim';
import { AUTO_TRIM_PERIOD_S } from '@/lib/helm-trim';
import {
  clamp,
  DEFAULT_UI,
  pointOfSailFor,
  type OptimalTrim,
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
/** How long the course, wind and sails must rest before the optimum is solved again. */
const OPTIMUM_SETTLE_MS = 150;

interface Options {
  ui: UiState;
  tp: TpFn;
  paused?: boolean;
  /**
   * Optional rudder steering (owner decision 3, an option in the control
   * settings): -1..1, null = the default course assist. The yaw rate is the
   * shared session's helm formula, so the Trainer turns like the 3D boat.
   */
  rudder?: number | null;
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

export function useSimulatorV3({ ui, tp, paused = false, rudder = null }: Options): Result {
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
  useEffect(() => {
    pausedRef.current = paused;
    clockRef.current.synchronize(performance.now(), !paused && !document.hidden);
  }, [paused]);
  const rudderRef = useRef<number | null>(rudder);
  useEffect(() => { rudderRef.current = rudder; }, [rudder]);
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
    const unbindClock = bindClockLifecycle(clock, { target: document, now: () => performance.now(),
      active: () => !pausedRef.current && !document.hidden });
    const tickInterval = () => {
      const advanced = clock.advance(performance.now(), !pausedRef.current && !document.hidden, (dt) => {
        const r = rudderRef.current;
        if (r !== null && r !== 0) {
          // Same yaw as stepSailingSession's helm mode; the course assist then follows this target.
          const s = stateRef.current;
          const yaw = clamp(r, -1, 1) * 22 * Math.max(0.12, clamp(s.boat.boatSpeed / 3, 0, 1)) * dt;
          targetHeadingRef.current = ((s.boat.heading + yaw) % 360 + 360) % 360;
        }
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
      unbindClock(); clock.reset();
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
      recordDiagnostic({ type: "trainer.lifecycle", surface: "trainer", outcome: "accepted", action: "reset" });
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
    recordDiagnostic({ type: "trainer.lifecycle", surface: "trainer", outcome: "accepted", action: "restore" });
  }, [params]);

  // ---------------------------------------------------------------------
  // Optimal trim + reference speed (package 13 stage D): the auto-trim at
  // rest on the intended course, from the one sheet solver
  // (runtime/auto-trim.ts -> src/lib/helm-trim.ts, the race crew's
  // trimForDrive). "Best" applies it and its settled speed is the 100% of the
  // trim score. Recomputed only when the course, wind or sails change, and
  // only once they rest for OPTIMUM_SETTLE_MS: a wheel turning the course
  // through many degrees solves once at the end, not once per degree.
  // mainAngle/jibAngle/twist do NOT change the optimum (the solver starts
  // from its own sheets), so sliding a sheet does not re-run the solve.
  // ---------------------------------------------------------------------
  const optimumInput = useMemo(() => ({
    twa: ui.twa, tack: ui.tack, windSpeed: ui.windSpeed, reefLevel: ui.reefLevel,
    sailsRaised: ui.sailsRaised, jibFurlPct: ui.jibFurlPct,
  }), [ui.twa, ui.tack, ui.windSpeed, ui.reefLevel, ui.sailsRaised, ui.jibFurlPct]);
  const [settledInput, setSettledInput] = useState(optimumInput);
  useEffect(() => {
    if (settledInput === optimumInput) return;
    const id = setTimeout(() => setSettledInput(optimumInput), OPTIMUM_SETTLE_MS);
    return () => clearTimeout(id);
  }, [optimumInput, settledInput]);
  const optimalModel = useMemo(() => {
    const { trim, result } = trainerOptimum({ ...DEFAULT_UI, ...settledInput }, params);
    return { optimal: trim, optimalResult: result };
  }, [settledInput, params]);
  // The ghost of the best trim follows the live boat: one auto-trim step on
  // the wind it feels now, solved at most every AUTO_TRIM_PERIOD_S of sail time.
  const ghostRef = useRef<{ time: number; key: string; trim: OptimalTrim } | null>(null);

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

    // Ghost angles: the auto-trim's answer for the LIVE boat. Unlike
    // `optimalModel.optimal` (target-TWA based and memoized), this slides as
    // the boat turns so the dashed ghost on the scene always reads "here is
    // where these sails should be for the wind you feel RIGHT NOW". Solved
    // at the auto-trim's cadence, not every frame; a new sail plan or wind
    // solves at once.
    const ghostKey = `${ui.windSpeed}:${ui.reefLevel}:${ui.sailsRaised}:${ui.jibFurlPct}`;
    const cached = ghostRef.current;
    const ghostAngles = cached && cached.key === ghostKey && rt.simTime >= cached.time && rt.simTime - cached.time < AUTO_TRIM_PERIOD_S
      ? cached.trim
      : autoTrimStep(rt.boat, ui, params);
    if (ghostAngles !== cached?.trim) ghostRef.current = { time: rt.simTime, key: ghostKey, trim: ghostAngles };

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
      primaryFeedback: rt.mainTrim ? tp("Меняй одну снасть. Сравни угол гика, twist, крен и установившуюся скорость.", "Change one control. Compare boom angle, twist, heel and settled speed.", "Zmieniaj jedną linę. Porównaj kąt bomu, skręt, przechył i ustaloną prędkość.", { es: "Cambia un solo cabo. Compara el ángulo de la botavara, la torsión, la escora y la velocidad estable.", fr: "Change un seul réglage. Compare l'angle de bôme, le vrillage, la gîte et la vitesse stabilisée.", de: "Ändere eine Einstellung. Vergleiche Baumwinkel, Twist, Krängung und stabile Fahrt.", it: "Cambia una sola manovra. Confronta angolo del boma, svergolamento, sbandamento e velocità stabile." }) : picked.text,
      primaryFeedbackTone: rt.mainTrim ? "info" : picked.tone,
      targetHeading: rt.targetHeading,
    };
    // `frame` forces invalidation on every rAF-driven render so the memo
    // reads a fresh stateRef snapshot. `stateRef.current` itself is mutable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui, optimalModel, tp, frame]);

  return { sim, reset, restore };
}
