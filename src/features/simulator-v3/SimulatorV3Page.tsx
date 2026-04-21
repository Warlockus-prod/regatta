'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  createInitialState,
  getBoatParams,
  settle,
  type Controls,
} from '@/lib/sailing-physics';
import { pickPrimaryFeedback } from './runtime/feedback';
import { recommendedTrim } from './runtime/trim-heuristics';
import { CommentaryLine } from './ui/CommentaryLine';
import { GlossaryFooter } from './ui/GlossaryFooter';
import { MetricsStrip } from './ui/MetricsStrip';
import { SceneOverlayLabels } from './ui/SceneOverlayLabels';
import { SceneRear } from './ui/SceneRear';
import { SceneTop } from './ui/SceneTop';
import { JibPod } from './ui/pods/JibPod';
import { MainPod } from './ui/pods/MainPod';
import { ViewPod } from './ui/pods/ViewPod';
import { WindPod } from './ui/pods/WindPod';
import {
  clamp,
  DEFAULT_UI,
  pointOfSailFor,
  REEF_VALUES,
  toJibSheet,
  toMainSheet,
  type SimulationModel,
  type UiState,
} from './ui/shared';

// ============================================================================
// SIMULATOR V3 - cockpit layout on the sailing-physics engine.
//
// See docs/design/simulator-v3/SPEC.md for the full design rationale and
// docs/design/simulator-v3/PIPELINE.md for the delivery pipeline.
//
// This file composes the V3 surface: it owns the UI state, calls the steady-
// state solver, and threads the resulting SimulationModel into the scene +
// pod components. Runtime helpers (trim heuristics, feedback copy) live in
// ./runtime/*; visual leaves live in ./ui/*.
//
// Scene layers (bottom to top) and behavior contracts are documented in
// docs/design/simulator-v3/BEHAVIORAL_CONTRACTS.md.
// ============================================================================

export default function SimulatorV3Page() {
  const { lang, tp } = useI18n();
  const params = useMemo(() => getBoatParams(), []);
  const [ui, setUi] = useState<UiState>(DEFAULT_UI);

  const sim = useMemo<SimulationModel>(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;

    // sailsRaised control maps to jibFurl/reef via area zero-out.
    const jibFurlEff = ui.sailsRaised === 'main' ? 1 : 1 - ui.jibFurlPct / 100;
    const reefEff = ui.sailsRaised === 'jib' ? 1 : REEF_VALUES[ui.reefLevel];

    const controls: Controls = {
      mainSheet: toMainSheet(ui.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(ui.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: ui.mainTwistPct / 100,
      jibTwist: ui.jibTwistPct / 100,
      reef: reefEff,
      jibFurl: jibFurlEff,
      jibSide: 1,
    };

    const initial = createInitialState({
      tws: ui.windSpeed,
      twa: signedTwa,
      // Seed bs with a realistic beam-reach speed so the engine does not
      // settle into a stalled-at-rest equilibrium when trim is sub-optimal.
      boatSpeed: Math.max(3, ui.windSpeed * 0.45),
    });

    const result = settle(initial, controls, params, 45, 0.1);

    const firstOptimal = recommendedTrim(
      Math.abs(result.diag.awa),
      ui.windSpeed,
      ui.reefLevel,
      params,
    );
    const firstOptCtrls: Controls = {
      ...controls,
      mainSheet: toMainSheet(firstOptimal.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(firstOptimal.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: firstOptimal.mainTwistPct / 100,
      jibTwist: firstOptimal.jibTwistPct / 100,
    };
    const firstOptRes = settle(initial, firstOptCtrls, params, 45, 0.1);

    const optimal = recommendedTrim(
      Math.abs(firstOptRes.diag.awa),
      ui.windSpeed,
      ui.reefLevel,
      params,
    );
    const optCtrls: Controls = {
      ...controls,
      mainSheet: toMainSheet(optimal.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(optimal.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: optimal.mainTwistPct / 100,
      jibTwist: optimal.jibTwistPct / 100,
    };
    const optimalResult = settle(initial, optCtrls, params, 45, 0.1);

    const absTwa = Math.abs(signedTwa);
    const pos = pointOfSailFor(absTwa);
    const trimScore = clamp(
      Math.round(
        (result.state.boatSpeed / Math.max(0.1, optimalResult.state.boatSpeed)) * 100,
      ),
      0,
      100,
    );

    const base: SimulationModel = {
      result,
      optimalResult,
      pos,
      signedTwa,
      absTwa,
      trimScore,
      optimal,
      primaryFeedback: '',
      primaryFeedbackTone: 'info',
    };
    const picked = pickPrimaryFeedback({ ui, result, pos, absTwa, tp });
    return { ...base, primaryFeedback: picked.text, primaryFeedbackTone: picked.tone };
  }, [params, tp, ui]);

  const setPreset = (twa: number) => {
    const preset = recommendedTrim(Math.max(25, twa - 18), ui.windSpeed, ui.reefLevel, params);
    setUi((prev) => ({
      ...prev,
      twa,
      mainAngle: preset.mainAngle,
      jibAngle: preset.jibAngle,
      mainTwistPct: preset.mainTwistPct,
      jibTwistPct: preset.jibTwistPct,
    }));
  };

  const applyOptimal = () => {
    setUi((prev) => ({
      ...prev,
      mainAngle: sim.optimal.mainAngle,
      jibAngle: sim.optimal.jibAngle,
      mainTwistPct: sim.optimal.mainTwistPct,
      jibTwistPct: sim.optimal.jibTwistPct,
    }));
  };

  const resetAll = () => setUi(DEFAULT_UI);

  const pointLabel =
    lang === 'pl' ? sim.pos.namePl : lang === 'en' ? sim.pos.nameEn : sim.pos.nameRu;
  const tackLabel =
    ui.tack === 'starboard'
      ? tp('правый галс', 'starboard tack', 'prawy hals')
      : tp('левый галс', 'port tack', 'lewy hals');

  return (
    <div
      className="page-enter min-h-[calc(100vh-56px)] flex flex-col"
      style={{ background: '#050b18' }}
    >
      {/* Top bar with V3 badge + A/B cross-links */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b"
        style={{
          background: 'rgba(5, 11, 24, 0.92)',
          borderColor: 'rgba(0, 212, 255, 0.16)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0"
            style={{
              background: 'rgba(0, 212, 255, 0.16)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 212, 255, 0.35)',
            }}
          >
            V3 · Cockpit
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">
            {tp(
              'VPP engine · обучающий тренажёр',
              'VPP engine · teaching trainer',
              'VPP · trener',
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href="/simulator"
            className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
            style={{
              borderColor: 'rgba(139, 167, 184, 0.22)',
              color: 'var(--text-secondary)',
            }}
          >
            V1
          </a>
          <a
            href="/simulator2"
            className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
            style={{
              borderColor: 'rgba(139, 167, 184, 0.22)',
              color: 'var(--text-secondary)',
            }}
          >
            V2
          </a>
        </div>
      </div>

      {/* Desktop layout (>= lg) */}
      <div className="hidden lg:grid lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:gap-4 lg:px-5 lg:pt-4 flex-1">
        <div className="space-y-3">
          <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} />
          <ViewPod
            ui={ui}
            setUi={setUi}
            tp={tp}
            applyOptimal={applyOptimal}
            resetAll={resetAll}
            setPreset={setPreset}
          />
        </div>

        <div className="relative flex flex-col">
          <div
            className="relative flex-1 min-h-[520px] rounded-2xl overflow-hidden border shadow-[0_12px_60px_rgba(0,0,0,0.5)]"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.18)',
              background:
                'radial-gradient(ellipse at center 40%, #0c2745 0%, #061020 65%, #040a16 100%)',
            }}
          >
            {ui.view === 'top' ? (
              <SceneTop ui={ui} sim={sim} lang={lang} />
            ) : (
              <SceneRear ui={ui} sim={sim} tp={tp} />
            )}
            <SceneOverlayLabels
              ui={ui}
              sim={sim}
              pointLabel={pointLabel}
              tackLabel={tackLabel}
              tp={tp}
            />
          </div>
          <MetricsStrip ui={ui} sim={sim} tp={tp} />
          <CommentaryLine text={sim.primaryFeedback} tone={sim.primaryFeedbackTone} />
        </div>

        <div className="space-y-3">
          <MainPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} />
          <JibPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} />
        </div>
      </div>

      {/* Mobile layout (< lg): pods overlap scene corners */}
      <div className="lg:hidden flex-1 flex flex-col">
        <div
          className="relative mx-2 mt-2 rounded-2xl overflow-hidden border shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
          style={{
            borderColor: 'rgba(0, 212, 255, 0.18)',
            background:
              'radial-gradient(ellipse at center 40%, #0c2745 0%, #061020 65%, #040a16 100%)',
            minHeight: '62vh',
          }}
        >
          {ui.view === 'top' ? (
            <SceneTop ui={ui} sim={sim} lang={lang} />
          ) : (
            <SceneRear ui={ui} sim={sim} tp={tp} />
          )}
          <SceneOverlayLabels
            ui={ui}
            sim={sim}
            pointLabel={pointLabel}
            tackLabel={tackLabel}
            tp={tp}
          />

          <div className="absolute top-2 left-2 w-[44%] max-w-[180px]">
            <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} compact />
          </div>
          <div className="absolute top-2 right-2 w-[44%] max-w-[180px]">
            <MainPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} compact />
          </div>
          <div className="absolute bottom-2 left-2 w-[44%] max-w-[180px]">
            <ViewPod
              ui={ui}
              setUi={setUi}
              tp={tp}
              applyOptimal={applyOptimal}
              resetAll={resetAll}
              setPreset={setPreset}
              compact
            />
          </div>
          <div className="absolute bottom-2 right-2 w-[44%] max-w-[180px]">
            <JibPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} compact />
          </div>
        </div>
        <MetricsStrip ui={ui} sim={sim} tp={tp} />
        <CommentaryLine text={sim.primaryFeedback} tone={sim.primaryFeedbackTone} />
      </div>

      <GlossaryFooter tp={tp} />
    </div>
  );
}
