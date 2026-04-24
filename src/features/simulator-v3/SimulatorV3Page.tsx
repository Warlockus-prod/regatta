'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { getBoatParams } from '@/lib/sailing-physics';
import { useSimulatorV3 } from './hooks/use-simulator-v3';
import {
  type DrillDefinition,
  type ScenarioPreset,
} from './runtime/scenario-presets';
import { recommendedTrim } from './runtime/trim-heuristics';
import { CommentaryLine } from './ui/CommentaryLine';
import { GlossaryFooter } from './ui/GlossaryFooter';
import { MetricsStrip } from './ui/MetricsStrip';
import { SceneOverlayLabels } from './ui/SceneOverlayLabels';
import { SceneRear } from './ui/SceneRear';
import { SceneSide } from './ui/SceneSide';
import { SceneTop } from './ui/SceneTop';
import { DrillCard, type DrillResult } from './ui/panels/DrillCard';
import { ModeBar, type ModeKind } from './ui/panels/ModeBar';
import { ScenarioPicker } from './ui/panels/ScenarioPicker';
import { TourOverlay } from './ui/panels/TourOverlay';
import { HelmPod } from './ui/pods/HelmPod';
import { JibPod } from './ui/pods/JibPod';
import { MainPod } from './ui/pods/MainPod';
import { ViewPod } from './ui/pods/ViewPod';
import { WindPod } from './ui/pods/WindPod';
import {
  DEFAULT_UI,
  type ReefLevel,
  type SimulationModel,
  type UiState,
} from './ui/shared';

// ---------------------------------------------------------------------------
// URL-state shareable setups.
//
// `/simulator-v3?twa=42&tws=16&tack=s&reef=1&main=24&jib=28` opens the page
// with those values overriding DEFAULT_UI. Useful for "check out this setup"
// links; mirrors the share-link convention already used by i18n shortcuts.
// Invalid values are ignored silently; anything not in the whitelist is
// dropped.
// ---------------------------------------------------------------------------

function readUiFromUrl(): Partial<UiState> | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  if (!p.toString()) return null;
  const out: Partial<UiState> = {};
  const num = (k: string) => {
    const v = p.get(k);
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const twa = num('twa');
  if (twa !== undefined && twa >= 30 && twa <= 180) out.twa = Math.round(twa);
  const tws = num('tws');
  if (tws !== undefined && tws >= 4 && tws <= 25) out.windSpeed = Math.round(tws);
  const main = num('main');
  if (main !== undefined && main >= 0 && main <= 85) out.mainAngle = main;
  const jib = num('jib');
  if (jib !== undefined && jib >= 5 && jib <= 55) out.jibAngle = jib;
  const reef = p.get('reef');
  if (reef === '0' || reef === '1' || reef === '2') {
    out.reefLevel = Number(reef) as ReefLevel;
  }
  const tack = p.get('tack');
  if (tack === 'p') out.tack = 'port';
  if (tack === 's') out.tack = 'starboard';
  return Object.keys(out).length ? out : null;
}

function buildShareUrl(ui: UiState): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://regatta.icoffio.com';
  const p = new URLSearchParams();
  p.set('twa', String(ui.twa));
  p.set('tws', String(ui.windSpeed));
  p.set('tack', ui.tack === 'port' ? 'p' : 's');
  p.set('reef', String(ui.reefLevel));
  p.set('main', String(Math.round(ui.mainAngle)));
  p.set('jib', String(Math.round(ui.jibAngle)));
  return `${origin}/simulator-v3?${p.toString()}`;
}

// ============================================================================
// SIMULATOR V3 - cockpit layout on the sailing-physics engine.
//
// See docs/design/simulator-v3/SPEC.md for the full design rationale and
// docs/design/simulator-v3/PIPELINE.md for the delivery pipeline.
//
// This file composes the V3 surface. Runtime state (boat, live/target
// controls, sim time) is owned by useSimulatorV3 which runs a fixed-step
// rAF loop. UI state (slider positions) is owned here via useState.
//
// See docs/design/simulator-v3/BEHAVIORAL_CONTRACTS.md for the testable
// behaviors this page must deliver.
// ============================================================================

export default function SimulatorV3Page() {
  const { lang, tp } = useI18n();
  const params = useMemo(() => getBoatParams(), []);
  const initialUi = useMemo<UiState>(() => {
    const fromUrl = readUiFromUrl();
    return fromUrl ? { ...DEFAULT_UI, ...fromUrl } : DEFAULT_UI;
  }, []);
  const [ui, setUi] = useState<UiState>(initialUi);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  // Tour visibility. forceTour > 0 triggers the overlay via effect inside
  // TourOverlay; increment to re-open.
  const [forceTour, setForceTour] = useState(0);

  const onShare = async () => {
    const url = buildShareUrl(ui);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (typeof window !== 'undefined') {
        window.prompt(tp('Ссылка на сетап:', 'Setup link:', 'Link do setupu:'), url);
      }
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 1800);
    } catch {
      // Clipboard can fail in insecure / locked-down contexts. Fall back
      // to a prompt so the user can still grab the URL.
      if (typeof window !== 'undefined') {
        window.prompt(tp('Ссылка на сетап:', 'Setup link:', 'Link do setupu:'), url);
      }
    }
  };
  const { sim, reset } = useSimulatorV3({ ui, tp });

  // Mode machine (PR-4). Drives what sits above the metrics strip:
  // - free: the original sandbox (no overlay panel)
  // - drill: DrillCard with timer + hold-counter + win/fail
  // - scenario: ScenarioPicker - pick a starting condition, then sail
  const [mode, setMode] = useState<ModeKind>('free');
  const [activeDrill, setActiveDrill] = useState<DrillDefinition | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [drillElapsed, setDrillElapsed] = useState(0);
  const [drillHeldFor, setDrillHeldFor] = useState(0);
  const [drillResult, setDrillResult] = useState<DrillResult>('pending');

  // Drill evaluator reads the live sim via a ref so the interval useEffect
  // doesn't churn on every sim frame. Updated on every render.
  const simRef = useRef<SimulationModel>(sim);
  simRef.current = sim;

  useEffect(() => {
    if (mode !== 'drill' || !activeDrill || drillResult !== 'pending') return;
    const start = performance.now();
    let heldFor = 0;
    const tickMs = 100;
    const iv = setInterval(() => {
      const s = simRef.current;
      const elapsed = (performance.now() - start) / 1000;
      const ok = activeDrill.evaluate({
        trimScore: s.trimScore,
        heel: s.result.state.heel,
        slotHealth: s.result.diag.slotHealth,
        mainStalled: s.result.diag.mainStalled,
        jibStalled: s.result.diag.jibStalled,
      });
      heldFor = ok ? heldFor + tickMs / 1000 : 0;
      setDrillElapsed(elapsed);
      setDrillHeldFor(heldFor);
      if (heldFor >= activeDrill.holdDuration) {
        setDrillResult('win');
        clearInterval(iv);
      } else if (elapsed >= activeDrill.timeLimit) {
        setDrillResult('fail');
        clearInterval(iv);
      }
    }, tickMs);
    return () => clearInterval(iv);
  }, [mode, activeDrill, drillResult]);

  const startDrill = (def: DrillDefinition) => {
    setActiveDrill(def);
    setDrillElapsed(0);
    setDrillHeldFor(0);
    setDrillResult('pending');
    setUi(def.initialUi);
    reset(def.initialUi);
  };

  const restartDrill = () => {
    if (!activeDrill) return;
    startDrill(activeDrill);
  };

  const exitDrill = () => {
    setActiveDrill(null);
    setDrillResult('pending');
    setDrillElapsed(0);
    setDrillHeldFor(0);
  };

  const pickScenario = (s: ScenarioPreset) => {
    setActiveScenarioId(s.id);
    setUi(s.ui);
    reset(s.ui);
  };

  const handleModeChange = (next: ModeKind) => {
    setMode(next);
    if (next !== 'drill') exitDrill();
    if (next !== 'scenario') setActiveScenarioId(null);
  };

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

  const resetAll = () => {
    setUi(DEFAULT_UI);
    reset(DEFAULT_UI);
    exitDrill();
    setActiveScenarioId(null);
  };

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
              'VPP engine · живой тренажёр',
              'VPP engine · live trainer',
              'VPP · trener na zywo',
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setForceTour((n) => n + 1)}
            aria-label={tp('Показать обзор', 'Show tour', 'Pokaz przewodnik')}
            className="w-7 h-7 rounded-md border text-[13px] font-bold transition flex items-center justify-center"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.35)',
              background: 'rgba(0, 212, 255, 0.08)',
              color: 'var(--accent-cyan)',
            }}
          >
            ?
          </button>
          <button
            onClick={onShare}
            className="text-[11px] font-semibold px-2 py-1 rounded-md border transition"
            style={{
              borderColor:
                shareState === 'copied'
                  ? 'var(--success)'
                  : 'rgba(0, 212, 255, 0.35)',
              color:
                shareState === 'copied' ? 'var(--success)' : 'var(--accent-cyan)',
              background:
                shareState === 'copied'
                  ? 'rgba(82, 255, 142, 0.08)'
                  : 'rgba(0, 212, 255, 0.08)',
            }}
          >
            {shareState === 'copied'
              ? tp('СКОПИРОВАНО', 'COPIED', 'SKOPIOWANO')
              : tp('Поделиться', 'Share', 'Udostepnij')}
          </button>
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
        </div>
      </div>

      {/* Desktop layout (>= lg) */}
      <div className="hidden lg:grid lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:gap-4 lg:px-5 lg:pt-4 flex-1">
        <div className="space-y-3">
          <ModeBar active={mode} onChange={handleModeChange} tp={tp} />
          {mode === 'drill' && (
            <DrillCard
              active={activeDrill}
              elapsed={drillElapsed}
              heldFor={drillHeldFor}
              result={drillResult}
              lang={lang}
              tp={tp}
              onStart={startDrill}
              onRestart={restartDrill}
              onExit={exitDrill}
            />
          )}
          {mode === 'scenario' && (
            <ScenarioPicker
              activeId={activeScenarioId}
              onPick={pickScenario}
              lang={lang}
              tp={tp}
            />
          )}
          <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} />
          <HelmPod sim={sim} tp={tp} />
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
            ) : ui.view === 'side' ? (
              <SceneSide ui={ui} sim={sim} tp={tp} />
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

      {/* Mobile layout (< lg): scene at full width on top, pods in a 2x2
          grid underneath. The pre-fix layout overlapped pods on the scene
          corners which left almost no visible scene on narrow viewports.
          Now the boat gets a proper 55vh stage and every control is
          thumb-reachable without overlap. */}
      <div className="lg:hidden flex-1 flex flex-col">
        <div className="mx-2 mt-2">
          <ModeBar active={mode} onChange={handleModeChange} tp={tp} />
        </div>
        {mode === 'drill' && (
          <div className="mx-2 mt-2">
            <DrillCard
              active={activeDrill}
              elapsed={drillElapsed}
              heldFor={drillHeldFor}
              result={drillResult}
              lang={lang}
              tp={tp}
              onStart={startDrill}
              onRestart={restartDrill}
              onExit={exitDrill}
            />
          </div>
        )}
        {mode === 'scenario' && (
          <div className="mx-2 mt-2">
            <ScenarioPicker
              activeId={activeScenarioId}
              onPick={pickScenario}
              lang={lang}
              tp={tp}
            />
          </div>
        )}
        <div
          className="relative mx-2 mt-2 rounded-2xl overflow-hidden border shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
          style={{
            borderColor: 'rgba(0, 212, 255, 0.18)',
            background:
              'radial-gradient(ellipse at center 40%, #0c2745 0%, #061020 65%, #040a16 100%)',
            height: '55vh',
            minHeight: '360px',
          }}
        >
          {ui.view === 'top' ? (
            <SceneTop ui={ui} sim={sim} lang={lang} />
          ) : ui.view === 'side' ? (
            <SceneSide ui={ui} sim={sim} tp={tp} />
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
        <div className="mx-2 grid grid-cols-2 gap-2 mb-2">
          <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} />
          <MainPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} />
          <ViewPod
            ui={ui}
            setUi={setUi}
            tp={tp}
            applyOptimal={applyOptimal}
            resetAll={resetAll}
            setPreset={setPreset}
          />
          <JibPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} />
          <div className="col-span-2">
            <HelmPod sim={sim} tp={tp} />
          </div>
        </div>
      </div>

      <GlossaryFooter tp={tp} />

      <TourOverlay
        key={forceTour}
        lang={lang}
        tp={tp}
        forceOpen={forceTour > 0}
      />
    </div>
  );
}
