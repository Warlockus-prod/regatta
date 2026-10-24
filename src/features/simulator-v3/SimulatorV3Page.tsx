'use client';

import styles from "./SimulatorV3.module.css";
import { SavePractice } from "../sailing-lab/ui/SavePractice";
import { LessonReturn } from "../sailing-lab/ui/LessonReturn";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useI18n } from '@/lib/i18n';
import { legacyPick } from '@/lib/languages';
import { getBoatParams } from '@/lib/sailing-physics';
import { useSimulatorV3 } from './hooks/use-simulator-v3';
import { useTrimStudy } from "./hooks/use-trim-study";
import { useTrimAssessment } from "./hooks/use-trim-assessment";
import { TrimAssessmentPanel } from "./ui/panels/TrimAssessmentPanel";
import { trimTasks, type TrimTask } from "../sailing-lab/lessons/trim-assessment";
import { assessmentCopy } from "../../data/sailing-lab/assessment-copy";
import { TrimStudyPanel } from "./ui/panels/TrimStudyPanel";
import { CheckpointPanel } from "./ui/panels/CheckpointPanel";
import { useTrainerCheckpoint } from "./hooks/use-trainer-checkpoint";
import { resolveTrainerDeepLink } from './runtime/deep-link';
import {
  type DrillDefinition,
  type ScenarioPreset,
} from './runtime/scenario-presets';
import { recommendedTrim } from './runtime/trim-heuristics';
import { advanceDrillClock } from './runtime/drill-clock';
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
import { MainTrimPod } from "./ui/pods/MainTrimPod";
import { ViewPod, pauseLabel, viewOptions } from './ui/pods/ViewPod';
import { WindPod } from './ui/pods/WindPod';
import {
  DEFAULT_UI,
  type ReefLevel,
  type SimulationModel,
  type UiState,
} from './ui/shared';
import {
  ControlDock,
  ControlSettingsSheet,
  BarIconButton,
  DrawerGroup,
  DrawerItem,
  GearButton,
  SceneBar,
  SceneDrawer,
  TrainerWorkspace,
  ViewButton,
  WheelDeck,
  applyCourseDelta,
  helmMappingFor,
  trainerScreenClass,
  useControlLabels,
  useControlPrefs,
  RUDDER_DISPLAY_MAX_DEG,
  type DockTab,
  type HelmTarget,
} from '../trainer-controls';

const TrainerBoat3D = dynamic(() => import("./ui/TrainerBoat3D"), { ssr: false });

// The scene drawings are computed from live physics. Node (server) and the
// browser round transcendental math differently in the 15th digit, so a
// server-rendered SVG never hydrates cleanly. Draw the scene on the client
// only; the box and its background still render on the server.
const noopSubscribe = () => () => {};
const useClientOnly = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

// ---------------------------------------------------------------------------
// URL-state shareable setups.
//
// `/simulator-v3?twa=42&tws=16&tack=s&reef=1&main=24&jib=28` opens the page
// with those values overriding DEFAULT_UI. Useful for "check out this setup"
// links; mirrors the share-link convention already used by i18n shortcuts.
// Invalid values are ignored silently; anything not in the whitelist is
// dropped. Lesson deep-links (?drill=<id> / ?scenario=<id>) are resolved
// separately by resolveTrainerDeepLink in runtime/deep-link.ts.
// ---------------------------------------------------------------------------

function readUiFromUrl(search?: string): Partial<UiState> | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(search ?? window.location.search);
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
    typeof window !== 'undefined' ? window.location.origin : 'https://weektoregatta.com';
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

export default function SimulatorV3Page({ initialSearch }: { initialSearch?: string } = {}) {
  const { lang, tp } = useI18n();
  const params = useMemo(() => getBoatParams(), []);
  // Start from DEFAULT_UI on both server and client so hydration matches;
  // URL params (share links) are applied in a mount effect below. Reading
  // window.location.search during render made the client's first render
  // differ from the SSR HTML on /simulator-v3?twa=... and threw React
  // hydration errors. The 1-frame settle after mount is acceptable.
  const [ui, setUi] = useState<UiState>(DEFAULT_UI);
  // ?embed=1 (sent by the iOS app's WebView) strips the in-page chrome
  // (tier switcher, Share, glossary footer) and locks the layout to 100dvh
  // with the controls scrolling internally, because the WKWebView disables
  // page scrolling. Same convention as /simulator and /simulator2.
  const [embed, setEmbed] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  // Tour visibility. forceTour > 0 triggers the overlay via effect inside
  // TourOverlay; increment to re-open.
  const [forceTour, setForceTour] = useState(0);
  // Which layout tree to mount. Previously BOTH desktop and mobile trees
  // stayed in the DOM (Tailwind hidden/lg:hidden) and re-rendered at 30 Hz,
  // doubling the SVG scene work - the main jank source on phones. Now we
  // render exactly one tree, picked with matchMedia at Tailwind's lg
  // breakpoint. Starts false (mobile tree) on the server and on the first
  // client render so hydration matches; measured after mount, same
  // convention as the `embed` flag below.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const shareLinkLabel = tp('Ссылка на сетап:', 'Setup link:', 'Link do ustawień:', {
    es: 'Enlace del setup:',
    fr: 'Lien de ta config :',
    de: 'Setup-Link:',
    it: 'Link del setup:',
  });
  const onShare = async () => {
    const url = buildShareUrl(ui);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (typeof window !== 'undefined') {
        window.prompt(shareLinkLabel, url);
      }
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 1800);
    } catch {
      // Clipboard can fail in insecure / locked-down contexts. Fall back
      // to a prompt so the user can still grab the URL.
      if (typeof window !== 'undefined') {
        window.prompt(shareLinkLabel, url);
      }
    }
  };
  const [paused, setPaused] = useState(false);
  // Shared trainer controls (docs/design/trainer-controls-concept.md): sliders
  // or wheels, course or rudder steering, favorites; one record for all trainers.
  const { prefs, update: updatePrefs } = useControlPrefs();
  const controlLabels = useControlLabels();
  const helmMapping = helmMappingFor(prefs, 'trainer');
  const [rudder, setRudder] = useState(0);
  const [desktopSettings, setDesktopSettings] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const onClient = useClientOnly();
  const { sim, reset, restore } = useSimulatorV3({ ui, tp, paused, rudder: helmMapping === 'rudder' ? rudder : null });
  const uiRef = useRef(ui);
  uiRef.current = ui;
  // Rudder steering moves the boat itself; keep the course slider and the
  // share link in step with the real heading so nothing snaps back later.
  useEffect(() => {
    if (helmMapping !== 'rudder' || rudder === 0) return;
    const signed = ((sim.session.wind.baseDir - sim.session.boat.heading) % 360 + 540) % 360 - 180;
    const twa = Math.round(Math.abs(signed));
    const tack = signed >= 0 ? 'starboard' : 'port';
    if (twa !== uiRef.current.twa || tack !== uiRef.current.tack) setUi((p) => ({ ...p, twa, tack }));
  }, [helmMapping, rudder, sim.session.ticks, sim.session.wind.baseDir, sim.session.boat.heading]);
  // The wheel turns the course in fractions of a degree; the UI keeps whole degrees.
  const exactCourse = useRef<{ twa: number; tack: UiState['tack'] } | null>(null);
  const onCourseDelta = (deg: number) => {
    const cur = uiRef.current;
    const base = exactCourse.current && Math.round(exactCourse.current.twa) === cur.twa && exactCourse.current.tack === cur.tack
      ? exactCourse.current
      : { twa: cur.twa, tack: cur.tack };
    const next = applyCourseDelta(base.twa, base.tack, deg);
    exactCourse.current = { twa: next.twa, tack: next.tack };
    const twa = Math.round(next.twa);
    if (twa !== cur.twa || next.tack !== cur.tack) {
      uiRef.current = { ...cur, twa, tack: next.tack };
      setUi((p) => ({ ...p, twa, tack: next.tack }));
    }
    return next.crossed;
  };
  const trimStudy = useTrimStudy(sim.session);
  const trimAssessment = useTrimAssessment(sim.session);

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
    let progress = { time: simRef.current.session.simTime, heldFor: 0 };
    const tickMs = 100;
    const iv = setInterval(() => {
      const s = simRef.current;
      const elapsed = s.session.simTime;
      const ok = activeDrill.evaluate({
        trimScore: s.trimScore,
        heel: s.result.state.heel,
        slotHealth: s.result.diag.slotHealth,
        mainStalled: s.result.diag.mainStalled,
        jibStalled: s.result.diag.jibStalled,
      });
      progress = advanceDrillClock(progress, elapsed, ok);
      setDrillElapsed(elapsed);
      setDrillHeldFor(progress.heldFor);
      if (progress.heldFor >= activeDrill.holdDuration) {
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
    trimAssessment.cancel();
    trimStudy.cancel();
    setPaused(false);
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
    trimAssessment.cancel();
    trimStudy.cancel();
    setPaused(false);
    setActiveScenarioId(s.id);
    setUi(s.ui);
    reset(s.ui);
  };

  const handleModeChange = (next: ModeKind) => {
    setMode(next);
    if (next !== 'drill') exitDrill();
    if (next !== 'scenario') setActiveScenarioId(null);
  };

  // Apply URL params + embed flag after mount (see the useState comments
  // above). Declared below the mode handlers so lesson deep-links can reuse
  // startDrill/pickScenario - the exact activation path DrillCard and
  // ScenarioPicker use - instead of duplicating it.
  //
  // ?drill=<id> / ?scenario=<id> (bootcamp lessons, app deep-links, works
  // together with ?embed=1) switch the mode machine and activate the match;
  // a resolved deep-link carries its own full UiState, so plain share-state
  // numbers (?twa=...) only apply when no deep-link resolves. Unknown ids
  // are ignored silently. reset() reseeds the runtime so the target setup
  // opens already settled instead of easing there from the defaults.
  //
  // Runs once: `reset` is a stable useCallback keyed on boat params, and
  // startDrill/pickScenario close over stable setters only, so they are
  // intentionally left out of the deps (adding them would rerun the effect
  // every render and restart the drill).
  useEffect(() => {
    try {
      const search = new URLSearchParams(initialSearch ?? window.location.search);
      const deepLink = resolveTrainerDeepLink(search);
      if (deepLink?.kind === 'drill') {
        setMode('drill');
        startDrill(deepLink.drill);
      } else if (deepLink?.kind === 'scenario') {
        setMode('scenario');
        pickScenario(deepLink.scenario);
      } else if (search.get("assessment") === "twist" || search.get("assessment") === "depth") {
        startAssessment(search.get("assessment") as TrimTask);
      } else if (search.get("study") === "mainsheet") {
        startGuidedStudy();
      } else if (search.get("study") === "shape") {
        startRigStudy();
      } else {
        const fromUrl = readUiFromUrl(initialSearch);
        if (fromUrl) {
          const next = { ...DEFAULT_UI, ...fromUrl };
          setUi(next);
          reset(next);
        }
      }
      setEmbed(search.get('embed') === '1');
    } catch {
      // Malformed URL or blocked APIs - keep defaults.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, initialSearch]);

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
    trimAssessment.cancel();
    trimStudy.cancel();
    setPaused(false);
    setUi(DEFAULT_UI);
    reset(DEFAULT_UI);
    exitDrill();
    setActiveScenarioId(null);
  };

  const startRigStudy = () => {
    trimAssessment.cancel();
    trimStudy.cancel();
    const study: UiState = { ...DEFAULT_UI, twa: 50, mainAngle: 15, jibAngle: 18,
      mainTrim: { workingLength: 9, traveler: 0 }, showOptimal: false, view: "rear" };
    setUi(study); reset(study); setPaused(false); exitDrill(); setActiveScenarioId(null); setMode("free");
  };
  const startGuidedStudy = () => { startRigStudy(); trimStudy.start(); };
  const startAssessment = (task: TrimTask) => {
    const spec = trimTasks[task];
    const setup: UiState = { ...DEFAULT_UI, twa: spec.twa, windSpeed: spec.windSpeed, tack: spec.tack, jibAngle: spec.jibAngle,
      mainTrim: { workingLength: spec.length, traveler: 0, outhaulEase: spec.outhaul }, showOptimal: false, view: "rear" };
    trimStudy.cancel(); setUi(setup); reset(setup); setPaused(false); exitDrill(); setActiveScenarioId(null); setMode("free");
    trimAssessment.start(task);
  };
  const studyPanel = <>{trimAssessment.assessment
    ? <TrimAssessmentPanel assessment={trimAssessment.assessment} lang={lang} record={trimAssessment.record} answer={trimAssessment.answer} restart={() => startAssessment(trimAssessment.assessment!.task)} close={trimAssessment.cancel} />
    : <TrimStudyPanel study={trimStudy.study} start={startGuidedStudy} cancel={trimStudy.cancel} record={trimStudy.record} answer={trimStudy.answer} tp={tp} />}
    {trimAssessment.assessment?.phase === "complete" && <SavePractice key={trimAssessment.assessment.task} id={trimAssessment.assessment.task} lang={lang} />}
    {trimStudy.study?.phase === "complete" && <SavePractice id="mainsheet" lang={lang} />}
  </>;
  const checkpoint = useTrainerCheckpoint({ session: sim.session, ui, study: trimStudy.study }, saved => {
    trimAssessment.cancel();
    setPaused(true);
    setUi(saved.ui);
    restore(saved.session, saved.ui);
    trimStudy.restore(saved.study);
    exitDrill(); setActiveScenarioId(null); setMode("free");
  });
  const checkpointPanel = <>
    {trimAssessment.assessment && <p className="text-sm text-[var(--text-secondary)]">{assessmentCopy.temporary[lang]}</p>}
    <CheckpointPanel checkpoint={checkpoint} canSave={mode === "free" && !trimAssessment.assessment} tp={tp} />
  </>;
  const openCheckpoint = () => {
    const panel = document.querySelector<HTMLDetailsElement>('[data-testid="trainer-checkpoint"]');
    if (!panel) return;
    // The session group may be collapsed on a phone. Reveal it before focus.
    let ancestor: HTMLElement | null = panel.parentElement;
    while (ancestor) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    panel.open = true;
    panel.scrollIntoView({ block: "start" });
    panel.querySelector("summary")?.focus({ preventScroll: true });
  };

  const cameraPanel = <ViewPod section="camera" paused={paused} togglePause={() => setPaused(value => !value)} ui={ui} setUi={setUi} tp={tp} applyOptimal={applyOptimal} resetAll={resetAll} setPreset={setPreset} />;
  const sessionPanel = <ViewPod section="session" paused={paused} togglePause={() => setPaused(value => !value)} ui={ui} setUi={setUi} tp={tp} applyOptimal={applyOptimal} resetAll={resetAll} setPreset={setPreset}>{checkpointPanel}</ViewPod>;
  const controlsLabel = tp("Управление парусами", "Sail controls", "Obsługa żagli", { es: "Controles de velas", fr: "Commandes des voiles", de: "Segelbedienung", it: "Comandi delle vele" });
  const conditionsLabel = tp("Условия: ветер и курс", "Conditions: wind and course", "Warunki: wiatr i kurs", { es: "Condiciones: viento y rumbo", fr: "Conditions : vent et cap", de: "Bedingungen: Wind und Kurs", it: "Condizioni: vento e rotta" });
  const sessionLabel = tp("Настройки и сохранение", "Settings and saving", "Ustawienia i zapis", { es: "Ajustes y guardado", fr: "Réglages et sauvegarde", de: "Einstellungen und Speichern", it: "Impostazioni e salvataggio" });
  const rigTitle = tp("Наблюдение: форма грота", "Observe: mainsail shape", "Obserwuj: kształt grota", { es: "Observa: forma de la mayor", fr: "Observer : forme de la grand-voile", de: "Beobachten: Großsegelform", it: "Osserva: forma della randa" });
  const modePanel = ui.mainTrim
    ? <p className={styles.groupTitle}>{trimAssessment.assessment ? assessmentCopy.title[lang] : rigTitle}</p>
    : <ModeBar active={mode} onChange={handleModeChange} tp={tp} />;

  const pointLabel = legacyPick(sim.pos, 'name', lang);
  const tackLabel =
    ui.tack === 'starboard'
      ? tp('правый галс', 'starboard tack', 'prawy hals', {
          es: 'amurado a estribor',
          fr: 'tribord amures',
          de: 'Steuerbordbug',
          it: 'mure a dritta',
        })
      : tp('левый галс', 'port tack', 'lewy hals', {
          es: 'amurado a babor',
          fr: 'bâbord amures',
          de: 'Backbordbug',
          it: 'mure a sinistra',
        });

  const helmTarget: HelmTarget = helmMapping === 'rudder'
    ? {
        mapping: 'rudder',
        value: `${Math.round(rudder * RUDDER_DISPLAY_MAX_DEG)}°`,
        unit: controlLabels.rudderShort,
        ariaNow: Math.round(rudder * RUDDER_DISPLAY_MAX_DEG),
        ariaMin: -RUDDER_DISPLAY_MAX_DEG,
        ariaMax: RUDDER_DISPLAY_MAX_DEG,
        rudder,
        setRudder,
      }
    : {
        mapping: 'course',
        value: `${ui.twa}°`,
        unit: controlLabels.courseToWind,
        ariaNow: ui.tack === 'starboard' ? ui.twa : -ui.twa,
        ariaMin: -180,
        ariaMax: 180,
        onCourseDelta,
      };
  const wheelDeck = (layout: 'bottom' | 'column') => (
                <WheelDeck
                  layout={layout}
                  prefs={prefs}
                  labels={controlLabels}
                  arrowKeysSteer
                  helm={helmTarget}
                  main={ui.mainTrim ? null : {
                    ease: Math.min(1, Math.max(0, ui.mainAngle / params.mainMaxOff)),
                    angleDeg: ui.mainAngle,
                    setEase: (v) => setUi((p) => ({ ...p, mainAngle: Math.round(v * params.mainMaxOff * 10) / 10 })),
                  }}
                  jib={ui.mainTrim ? null : {
                    ease: Math.min(1, Math.max(0, (ui.jibAngle - params.jibMinOff) / (params.jibMaxOff - params.jibMinOff))),
                    angleDeg: ui.jibAngle,
                    setEase: (v) => setUi((p) => ({ ...p, jibAngle: Math.round((params.jibMinOff + v * (params.jibMaxOff - params.jibMinOff)) * 10) / 10 })),
                  }}
                />
  );
  const rudderCard = (
            <label className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
              <span className="flex justify-between text-sm text-[var(--text-secondary)]"><span>{controlLabels.rudder}</span><b className="font-mono text-[var(--accent-cyan)]">{Math.round(rudder * RUDDER_DISPLAY_MAX_DEG)}°</b></span>
              <input type="range" min={-1} max={1} step={0.05} value={rudder} onChange={(e) => setRudder(Number(e.target.value))} className="w-full" style={{ height: 44, accentColor: 'var(--accent-cyan)' }} />
            </label>
  );
  const podsMain = ui.mainTrim
    ? <MainTrimPod ui={ui} setUi={setUi} sim={sim} tp={tp} taskFirst={Boolean(trimStudy.study || trimAssessment.assessment)} studyActive={trimStudy.study !== null}>{studyPanel}</MainTrimPod>
    : <MainPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} startRigStudy={startRigStudy} comfortable />;
  // Arriving from a lesson (rig study or an independent check), the task opens
  // first on a phone, the way the lesson promised it; free sailing keeps Favorites.
  const taskLabel = tp('Задание', 'Task', 'Zadanie', { es: 'Tarea', fr: 'Exercice', de: 'Aufgabe', it: 'Compito' });
  const taskTab: DockTab | undefined = ui.mainTrim
    ? { id: 'task', label: taskLabel, cards: [{ id: 'task', title: taskLabel, node: <div className="space-y-2">{modePanel}{podsMain}</div> }] }
    : undefined;
  const dockTabs: DockTab[] = [
    {
      id: 'sails',
      label: controlLabels.tabs.sails,
      cards: [
        { id: 'main', title: tp('Грот: гика-шкот и риф', 'Main: mainsheet and reef', 'Grot: szot grota i ref', { es: 'Mayor: escota de mayor y rizo', fr: 'Grand-voile : écoute de grand-voile et ris', de: 'Groß: Großschot und Reff', it: 'Randa: scotta della randa e terzaroli' }), node: podsMain },
        { id: 'jib', title: tp('Стаксель: стаксель-шкот и раскрытие', 'Jib: jib sheet and furling', 'Fok: szot foka i rozwinięcie', { es: 'Foque: escota de foque y desenrollado', fr: 'Foc : écoute de foc et déroulement', de: 'Fock: Fockschot und Ausrollen', it: 'Fiocco: scotta del fiocco e svolgimento' }), node: <JibPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} comfortable /> },
      ],
    },
    {
      id: 'helm',
      label: controlLabels.tabs.helm,
      cards: [
        ...(helmMapping === 'rudder' ? [{
          id: 'rudder',
          title: controlLabels.rudder,
          node: rudderCard,
        }] : []),
        { id: 'course', title: tp('Курс к ветру и галс', 'Angle to wind and tack', 'Kurs względem wiatru i hals', { es: 'Ángulo al viento y amura', fr: 'Angle au vent et amure', de: 'Kurs zum Wind und Bug', it: 'Angolo al vento e mure' }), node: <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} part="course" comfortable /> },
        { id: 'compass', title: tp('Компас', 'Compass', 'Kompas', { es: 'Brújula', fr: 'Compas', de: 'Kompass', it: 'Bussola' }), node: <HelmPod sim={sim} tp={tp} /> },
      ],
    },
    {
      id: 'wind',
      label: controlLabels.tabs.wind,
      cards: [
        { id: 'wind', title: tp('Ветер: сила и порывы', 'Wind: strength and gusts', 'Wiatr: siła i podmuchy', { es: 'Viento: fuerza y rachas', fr: 'Vent : force et rafales', de: 'Wind: Stärke und Böen', it: 'Vento: forza e raffiche' }), node: <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} part="wind" comfortable /> },
      ],
    },
    {
      id: 'more',
      label: controlLabels.tabs.more,
      cards: [
        ...(taskTab ? [] : [{
          id: 'tasks',
          title: tp('Упражнения и сценарии', 'Drills and scenarios', 'Ćwiczenia i scenariusze', { es: 'Ejercicios y escenarios', fr: 'Exercices et scénarios', de: 'Übungen und Szenarien', it: 'Esercizi e scenari' }),
          node: (
            <div className="space-y-2">
              {modePanel}
              {mode === 'drill' && <DrillCard active={activeDrill} elapsed={drillElapsed} heldFor={drillHeldFor} result={drillResult} lang={lang} tp={tp} onStart={startDrill} onRestart={restartDrill} onExit={exitDrill} />}
              {mode === 'scenario' && <ScenarioPicker activeId={activeScenarioId} onPick={pickScenario} lang={lang} tp={tp} />}
            </div>
          ),
        }]),
        { id: 'session', title: sessionLabel, node: sessionPanel },
        ...(!embed ? [{ id: 'glossary', title: tp('Термины', 'Terms', 'Terminy', { es: 'Términos', fr: 'Termes', de: 'Begriffe', it: 'Termini' }), node: <GlossaryFooter tp={tp} /> }] : []),
      ],
    },
  ];

  return (
    <div
      className={`page-enter flex flex-col ${
        !isDesktop
          ? trainerScreenClass(embed)
          : embed
          ? 'h-[100dvh] overflow-hidden'
          : 'min-h-[calc(100vh-var(--site-nav-h,56px))]'
      }`}
      style={{ background: 'var(--bg-primary)' }}
    >
      <LessonReturn lang={lang} initialSearch={initialSearch} />
      {/* Top bar with V3 badge + two-tier switcher (Basics / Trainer / 3D).
          Cross-links and Share are hidden under ?embed=1 - the iOS app
          embeds this page chromelessly and provides its own navigation.
          On an embedded phone the bar would hold only "?", so the button
          floats over the scene instead and the boat gets the height. */}
      {(isDesktop || !embed) && <div
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
          borderColor: 'rgba(0, 212, 255, 0.16)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0"
            style={{
              background: 'rgba(0, 212, 255, 0.16)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 212, 255, 0.35)',
            }}
          >
            {tp("Трим", "Trim", "Trym", { es: "Trimado", fr: "Réglage", de: "Trimm", it: "Regolazione" })}
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">
            {tp(
              'Ветер, паруса, ход',
              'Wind, sails, boat speed',
              'Wiatr, żagle, prędkość',
              {
                es: 'Viento, velas, velocidad',
                fr: 'Vent, voiles, vitesse',
                de: 'Wind, Segel, Fahrt',
                it: 'Vento, vele, velocità',
              },
            )}
          </span>
        </div>
        <div className={`flex items-center gap-1 min-w-0 ${isDesktop ? 'flex-wrap' : 'flex-nowrap overflow-x-auto'}`}>
          {isDesktop && <GearButton label={controlLabels.openSettings} onClick={() => setDesktopSettings(true)} />}
          {isDesktop && <button onClick={openCheckpoint} className="min-h-11 rounded-md border border-[var(--border-subtle)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent-cyan)]">
            {tp("Сессия", "Session", "Sesja", { es: "Sesión", fr: "Session", de: "Sitzung", it: "Sessione" })}
          </button>}
          <button
            onClick={() => setForceTour((n) => n + 1)}
            aria-label={tp('Показать обзор', 'Show tour', 'Pokaż przewodnik', {
              es: 'Mostrar la guía',
              fr: 'Afficher le guide',
              de: 'Tour anzeigen',
              it: 'Mostra il tour',
            })}
            className="min-w-11 min-h-11 rounded-md border text-[13px] font-bold transition flex items-center justify-center"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.35)',
              background: 'rgba(0, 212, 255, 0.08)',
              color: 'var(--accent-cyan)',
            }}
          >
            ?
          </button>
          {!embed && (
            <>
              {!ui.mainTrim && <button
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
                  ? tp('СКОПИРОВАНО', 'COPIED', 'SKOPIOWANO', {
                      es: 'COPIADO',
                      fr: 'COPIÉ',
                      de: 'KOPIERT',
                      it: 'COPIATO',
                    })
                  : tp('Поделиться', 'Share', 'Udostępnij', {
                      es: 'Compartir',
                      fr: 'Partager',
                      de: 'Teilen',
                      it: 'Condividi',
                    })}
              </button>}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Also bundled without the Next router for offline use. Hidden in native embeds. */}
              <a href="/learn/sails" className={styles.courseLink}>{tp("К урокам", "Lessons", "Do lekcji", { es: "Lecciones", fr: "Leçons", de: "Lektionen", it: "Lezioni" })}</a>
              <details className={styles.otherTools}>
              <summary>{tp("Другие тренажёры", "Other simulators", "Inne symulatory", { es: "Otros simuladores", fr: "Autres simulateurs", de: "Andere Simulatoren", it: "Altri simulatori" })}</summary>
              <nav>
              <a
                href="/simulator"
                className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
                style={{
                  borderColor: 'rgba(139, 167, 184, 0.22)',
                  color: 'var(--text-secondary)',
                }}
              >
                {tp('Основы', 'Basics', 'Podstawy', {
                  es: 'Fundamentos',
                  fr: 'Bases',
                  de: 'Grundlagen',
                  it: 'Basi',
                })}
              </a>
              <span
                className="text-[11px] font-semibold px-2 py-1 rounded-md border"
                style={{
                  background: 'rgba(0, 212, 255, 0.14)',
                  borderColor: 'rgba(0, 212, 255, 0.35)',
                  color: 'var(--accent-cyan)',
                }}
              >
                {tp('Тренажёр', 'Trainer', 'Trenażer', {
                  es: 'Trimado',
                  fr: 'Réglage',
                  de: 'Trainer',
                  it: 'Regolazione',
                })}
              </span>
              <a
                href="/simulator2"
                className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
                style={{
                  borderColor: 'rgba(139, 167, 184, 0.22)',
                  color: 'var(--text-secondary)',
                }}
              >
                {tp('Лодка 3D', '3D Boat', 'Łódka 3D', {
                  es: 'Barco 3D',
                  fr: 'Bateau 3D',
                  de: '3D-Boot',
                  it: 'Barca 3D',
                })}
              </a>
              </nav>
              </details>
            </>
          )}
        </div>
      </div>}

      {!embed && isDesktop && !ui.mainTrim && <p className="px-5 pt-3 pb-1 text-sm text-[var(--text-secondary)] max-w-[75ch]">
        {tp("Выбери курс к ветру, настрой два шкота и сравни скорость. Для задания открой «Упражнения», для объяснений нажми «?».", "Choose a wind angle, trim both sails and compare speed. Open Drills for a task or ? for a guide.", "Wybierz kurs względem wiatru, ustaw oba szoty i porównaj prędkość. Zadanie znajdziesz w \"Ćwiczeniach\", objaśnienia pod \"?\".", { es: "Elige un rumbo respecto al viento, ajusta las dos escotas y compara la velocidad. Para una tarea abre \"Ejercicios\"; para las explicaciones, pulsa \"?\".", fr: "Choisis une allure, règle les deux écoutes et compare la vitesse. Pour une tâche, ouvre \"Exercices\" ; pour les explications, appuie sur \"?\".", de: "Wähle einen Kurs zum Wind, trimme beide Schoten und vergleiche die Fahrt. Aufgaben findest du unter \"Übungen\", Erklärungen unter \"?\".", it: "Scegli l'andatura, regola le due scotte e confronta la velocità. Per un compito apri \"Esercizi\", per le spiegazioni premi \"?\"." })}
      </p>}

      {/* Desktop layout (>= 1024px), mounted ONLY when isDesktop. In embed
          mode the grid is clamped to the viewport and each side column
          scrolls internally. */}
      {isDesktop && (
      <div
        className={`grid grid-cols-[260px_minmax(0,1fr)_260px] gap-4 px-5 pt-4 flex-1 ${
          embed ? 'min-h-0 overflow-hidden' : ''
        }`}
      >
        <div className={`space-y-3 ${embed ? 'min-h-0 overflow-y-auto' : ''}`} data-trainer-settings-host>
          {modePanel}
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
          <h2 className={styles.groupTitle}>{conditionsLabel}</h2>
          <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} />
          {helmMapping === 'rudder' && rudderCard}
          <details>
            <summary className="cursor-pointer py-3 text-xs text-[var(--text-secondary)]">{tp("Курс и компас", "Heading and compass", "Kurs i kompas", { es: "Rumbo y brújula", fr: "Cap et compas", de: "Kurs und Kompass", it: "Rotta e bussola" })}</summary>
            <HelmPod sim={sim} tp={tp} />
          </details>
          <details className={styles.secondaryGroup}><summary>{sessionLabel}</summary>{sessionPanel}</details>
        </div>

        <div className="relative flex flex-col min-h-0 overflow-y-auto">
          {cameraPanel}
          <SceneOverlayLabels ui={ui} sim={sim} pointLabel={pointLabel} tackLabel={tackLabel} tp={tp} />
          <div
            data-testid="trainer-scene"
            data-session-tick={sim.session.ticks}
            data-session-heading={sim.session.boat.heading}
            className="relative shrink-0 rounded-2xl overflow-hidden border"
            style={{
              height: 'clamp(360px, 55dvh, 620px)',
              borderColor: 'rgba(0, 212, 255, 0.18)',
              background:
                'radial-gradient(ellipse at center 40%, var(--water-light) 0%, var(--water-dark) 80%)',
            }}
          >
            {!onClient ? null : ui.view === "3d" ? <TrainerBoat3D sim={sim} tp={tp} /> : ui.view === 'top' ? (
              <SceneTop ui={ui} sim={sim} lang={lang} />
            ) : ui.view === 'side' ? (
              <SceneSide ui={ui} sim={sim} tp={tp} />
            ) : (
              <SceneRear ui={ui} sim={sim} tp={tp} />
            )}
          </div>
          <MetricsStrip ui={ui} sim={sim} tp={tp} />
          <CommentaryLine text={sim.primaryFeedback} tone={sim.primaryFeedbackTone} />
        </div>

        <div className={`space-y-3 ${embed ? 'min-h-0 overflow-y-auto' : ''}`}>
          {prefs.mode === 'wheels' && (
            <div className="h-[380px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 pt-2 pb-1">
              {wheelDeck('column')}
            </div>
          )}
          <h2 className={styles.groupTitle}>{controlsLabel}</h2>
          {ui.mainTrim ? <MainTrimPod ui={ui} setUi={setUi} sim={sim} tp={tp} taskFirst={Boolean(trimStudy.study || trimAssessment.assessment)} studyActive={trimStudy.study !== null}>{studyPanel}</MainTrimPod> : <MainPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} startRigStudy={startRigStudy} />}
          <JibPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} />
        </div>
      </div>
      )}

      {/* Phone and tablet layout (< 1024px), mounted ONLY when !isDesktop
          (also the SSR/first-render tree until matchMedia is measured). The
          boat is pinned: the scene takes the spare height, the readouts sit
          under it, and every control lives in the dock below; only the dock
          panel scrolls (docs/design/trainer-controls-concept.md). */}
      {!isDesktop && (
        <TrainerWorkspace
          embed={embed}
          sceneBar={
            <SceneBar
              status={<><strong>{pointLabel}</strong> · {tackLabel}</>}
              actions={<>
                <ViewButton
                  label={controlLabels.view}
                  current={viewOptions(tp).find((o) => o.value === ui.view)?.label}
                  open={viewsOpen}
                  controls="trainer-views"
                  onToggle={() => setViewsOpen((v) => !v)}
                />
                {embed && (
                  <BarIconButton
                    label={tp('Показать обзор', 'Show tour', 'Pokaż przewodnik', { es: 'Mostrar la guía', fr: 'Afficher le guide', de: 'Tour anzeigen', it: 'Mostra il tour' })}
                    onClick={() => setForceTour((n) => n + 1)}
                  >?</BarIconButton>
                )}
              </>}
            />
          }
          scene={
            <div
              data-testid="trainer-scene"
              data-session-tick={sim.session.ticks}
              data-session-heading={sim.session.boat.heading}
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at center 40%, var(--water-light) 0%, var(--water-dark) 80%)' }}
            >
              {!onClient ? null : ui.view === "3d" ? <TrainerBoat3D sim={sim} tp={tp} /> : ui.view === 'top' ? (
                <SceneTop ui={ui} sim={sim} lang={lang} />
              ) : ui.view === 'side' ? (
                <SceneSide ui={ui} sim={sim} tp={tp} />
              ) : (
                <SceneRear ui={ui} sim={sim} tp={tp} />
              )}
              <SceneDrawer
                id="trainer-views"
                open={viewsOpen}
                title={controlLabels.views}
                closeLabel={controlLabels.close}
                onClose={() => setViewsOpen(false)}
              >
                <DrawerGroup>
                  {viewOptions(tp).map((o) => (
                    <DrawerItem key={o.value} pressed={ui.view === o.value} onClick={() => { setUi((p) => ({ ...p, view: o.value })); setViewsOpen(false); }}>{o.label}</DrawerItem>
                  ))}
                </DrawerGroup>
                <DrawerGroup>
                  <DrawerItem pressed={paused} onClick={() => setPaused((value) => !value)}>{pauseLabel(tp, paused)}</DrawerItem>
                </DrawerGroup>
              </SceneDrawer>
            </div>
          }
          readouts={<>
            <MetricsStrip ui={ui} sim={sim} tp={tp} dense />
            <CommentaryLine text={sim.primaryFeedback} tone={sim.primaryFeedbackTone} dense />
          </>}
          dock={
            <ControlDock
              key={taskTab ? 'task' : 'free'}
              surface="trainer"
              layout="bottom"
              prefs={prefs}
              update={updatePrefs}
              hasSheets={!ui.mainTrim}
              rudderAvailable
              defaultFavorites={['main', 'jib', 'course']}
              tabs={dockTabs}
              wheelDeck={wheelDeck('bottom')}
              leadTab={taskTab}
            />
          }
        />
      )}

      {!embed && isDesktop && <GlossaryFooter tp={tp} />}

      {desktopSettings && (
        <ControlSettingsSheet
          surface="trainer"
          prefs={prefs}
          update={updatePrefs}
          labels={controlLabels}
          hasSheets={!ui.mainTrim}
          rudderAvailable
          favorites={[]}
          defaultFavorites={[]}
          onClose={() => setDesktopSettings(false)}
        />
      )}

      {forceTour > 0 && <TourOverlay
        key={forceTour}
        lang={lang}
        tp={tp}
        forceOpen
      />}
    </div>
  );
}
