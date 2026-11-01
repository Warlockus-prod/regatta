'use client';

import DiagnosticAccess from "@/components/diagnostics/DiagnosticAccess";
import { FoundationReturn, useFoundationReturnId } from "@/components/FoundationReturn";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { WheelDeck } from "@/features/trainer-controls/WheelDeck";
import { useControlLabels } from "@/features/trainer-controls/labels";
import { helmMappingFor, useControlPrefs } from "@/features/trainer-controls/prefs";
import type { Controls } from "@/lib/sailing-physics/types";
import type { StandingRow } from "@/features/race-hud/RaceHud";
import type { RaceGuidance } from "@/lib/race-guidance";
import { METRES_PER_UNIT, type RaceCamera } from "@/features/race-3d/pose";
import { useRaceCopy } from "./race-copy";
import type { RacePrefs } from "./race-prefs";
import styles from "./RaceCockpit.module.css";
import { RaceOverviewMap } from "@/features/race-hud/RaceOverviewMap";
import { RaceWindInstrument, RaceWindSettings } from "@/features/race-hud/RaceWindInstrument";
import { useRaceNavigationCopy } from "@/features/race-hud/navigation-copy";
import type { RaceNavigationSnapshot, RaceWindReading } from "@/features/race-hud/navigation-model";
import { GearIcon } from "@/features/trainer-controls/GearIcon";
import { recordControlChange } from "@/lib/diagnostics-controls";
import { RaceCornerInstruments } from "@/features/race-hud/RaceCornerInstruments";
import { RaceBigMap } from "@/features/race-hud/RaceBigMap";
import { RACE_MAP_COPY } from "@/data/race-map-copy";
import { RACE_SAIL_FLOW_COPY } from "@/data/race-sail-flow-copy";
import { finishHoldActive, finishHoldStore } from "./race-finish-hold";
import { RacePauseSheet } from "./RacePauseSheet";
import { useRacePauseCopy } from "./race-pause-copy";
import { fullscreenOfferAnswered, fullscreenServerState, fullscreenState, markFullscreenOfferAnswered, requestRaceFullscreen, subscribeFullscreen } from "./race-fullscreen";
import { useI18n } from "@/lib/i18n";
import { RaceFeedbackLayer } from "@/features/race-hud/RaceFeedbackLayer";
import { RaceStartFlags } from "@/features/race-hud/RaceStartFlags";
import { startFlags } from "@/lib/race-start-signals";
import fx from "@/features/race-hud/RaceFeedbackLayer.module.css";
import type { ContactFrame, FeedbackToast } from "@/features/race-hud/feedback";
import { TARGET_SPEED_LABEL, speedVersusTarget } from "@/features/race-hud/speed-target";
import { createTapTracker, nextRaceCamera, type TapTracker } from "@/features/race-scene/camera";
import { RACE_CAMERA_SWITCH, sceneTapHandlers } from "@/features/race-scene/camera-tap";
import { CameraIcon, HintIcon } from "@/features/race-hud/RaceIcons";
import { RaceHapticsToggle, useRaceHapticsCopy } from "@/features/race-hud/RaceHapticsToggle";
import { FIRST_RACE_HINT_COPY } from "@/data/race-first-hints-copy";
import { RACE_HINT_LOG_COPY, RACE_HINT_SETTINGS_COPY } from "@/data/race-hint-log-copy";
import { RACE_INTRO_TITLE } from "@/data/race-intro-title";
import { RaceHintLogPanel } from "@/features/race-hud/RaceHintLog";
import { LOGGED_ROUTE_ACTIONS, type HintLogEntry } from "@/features/race-hud/hint-log";

/** Where the race sound switch (M1-5, sound lane) is placed: the status row
 * over the scene and the pause sheet. */
export type RaceSoundPlacement = "status" | "pause";

export function RaceModePicker({ prefs, update }: { prefs: RacePrefs; update: (p: Partial<RacePrefs>) => void }) {
  const c = useRaceCopy();
  return <div className={styles.modePicker}>
    <div role="radiogroup" aria-label={c.controlMode} className={styles.segmented}>
      {(["simple", "pro"] as const).map(mode => <button type="button" key={mode} role="radio" aria-checked={prefs.mode === mode} onClick={() => update({ mode })}>{c[mode]}</button>)}
    </div>
    <p>{prefs.mode === "pro" ? c.proNote : c.simpleNote}</p>
  </div>;
}

/** M2-1 camera switch copy: the status-row button's name (shared with the
 * replay, features/race-scene/camera-tap.ts) and the tap hint in Settings. */
export { RACE_CAMERA_SWITCH, sceneTapHandlers };
export const RACE_CAMERA_TAP_HINT = {
  ru: "Коснись сцены, чтобы сменить камеру: вокруг лодки, за кормой, сверху. За кормой камера идет за курсом и сама возвращается за лодку.",
  en: "Tap the scene to switch camera: around the boat, behind, above. Behind follows your course and comes back behind the boat by itself.",
  pl: "Dotknij sceny, żeby zmienić kamerę: wokół łodzi, za rufą, z góry. Kamera za rufą podąża za kursem i sama wraca za łódź.",
  es: "Toca la escena para cambiar de cámara: alrededor del barco, tras la popa, desde arriba. Tras la popa sigue tu rumbo y vuelve sola detrás del barco.",
  fr: "Touche la scène pour changer de caméra : autour du bateau, derrière, en hauteur. Derrière suit ton cap et revient seule dans l'axe du bateau.",
  de: "Tippe auf die Szene, um die Kamera zu wechseln: um das Boot, am Heck, von oben. Am Heck folgt sie deinem Kurs und kehrt von selbst hinter das Boot zurück.",
  it: "Tocca la scena per cambiare inquadratura: attorno alla barca, da poppa, dall'alto. Da poppa segue la rotta e torna da sola dietro la barca.",
} as const;

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return <label className={styles.toggle}><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} /></label>;
}

export function RaceCockpit(p: {
  children: ReactNode;
  prefs: RacePrefs; updatePrefs: (patch: Partial<RacePrefs>) => void;
  rudder: number; setRudder: (v: number) => void; courseDelta: (v: number) => void; setCourse: (v: number) => void; targetHeading: number;
  trim: Controls; setTrim: (patch: Partial<Controls>) => void;
  heading: number; speed: number; twa: number; time: string; rank: number;
  windReading: RaceWindReading | null; navigation: RaceNavigationSnapshot | null;
  rows: StandingRow[]; trimAdvice?: string; guidance: RaceGuidance | null; message?: string;
  camera: RaceCamera; setCamera: (v: RaceCamera) => void; onResetCamera: () => void;
  /** onPause toggles the pause (the Menu button, Continue, Esc and P);
   * onExit leaves for the menu and is called only after the confirmation. */
  paused: boolean; onPause: () => void; onExit: () => void; onRestart: () => void;
  /** Diagnostics only: the pause sheet asked before leaving, or the player stayed. */
  onExitPrompt?: (step: "ask" | "stay") => void;
  autopilot: boolean; onAutopilot: () => void;
  muted: boolean; onSound: () => void; penalty: number; countdown?: number;
  /** M3-3: the player is over the line early (race-rules early-start): flag X shows until cleared. */
  recall?: boolean;
  /** The live race id: steering and trim are held during its finish hold. */
  raceId?: string;
  /** Desktop browser only: offer full screen once (never in the native app). */
  fullscreenOffer?: boolean;
  /** SLOT for the race sound switch of M1-5 (sound lane). Rendered in the
   * status row and in the pause sheet; empty until that switch is wired. */
  raceSoundToggle?: (placement: RaceSoundPlacement) => ReactNode;
  /** M3-4: the vibration switch beside race sound (pause sheet and Settings), only where the device can vibrate. */
  haptics?: { on: boolean; setOn: (on: boolean) => void };
  /** M1-3 feedback bus: the toasts near the boat and the contact frame. */
  feedback?: { toasts: readonly FeedbackToast[]; contact: ContactFrame | null };
  /** M1-3: the polar target speed at this wind angle, knots; omitted when unknown. */
  targetSpeed?: number | null;
  /** M4-7: "Show hints again" in Settings: the first race hints are due again. */
  onShowHintsAgain?: () => void;
  /** F5: "How to race" in Settings opens the race intro (the race pauses under it). */
  onShowIntro?: () => void;
  /** F3: the player's recorded track for the big map (the race log samples), read when it draws. */
  track?: () => readonly Readonly<{ x: number; y: number }>[];
  /** F4: this race's hint log, newest first (features/race-hud/hint-log.ts); without it there is no log entry. */
  hintLog?: readonly HintLogEntry[];
}) {
  const c = useRaceCopy();
  const { tl } = useI18n();
  const pc = useRacePauseCopy();
  const haptics = useRaceHapticsCopy();
  const nav = useRaceNavigationCopy();
  const foundationLesson = useFoundationReturnId();
  const labels = useControlLabels();
  const { prefs: controls, update } = useControlPrefs();
  type Tab = "helm" | "sails" | "map" | "settings";
  const [tab, setTab] = useState<Tab>("helm");
  const tabRef = useRef<Tab>("helm");
  const [hintsAgain, setHintsAgain] = useState(false);
  // F3: the big map over the scene, opened from the corner map. The race
  // keeps running. It belongs to the race it was opened in: a restart or the
  // next race (same cockpit, new raceId) starts with the map closed, so it
  // never covers the next countdown. The pause sheet hides it (Esc then
  // resumes the race), and Continue brings it back.
  const raceKey = p.raceId ?? "";
  const [bigMapRace, setBigMapRace] = useState<string | null>(null);
  const bigMap = bigMapRace === raceKey && !p.paused;
  // F4: the hint log panel, like the big map one race only; one of the two is
  // open at a time. Opened during the race it lies over the scene and, like
  // the big map, hides while the race is paused (the pause sheet stays on
  // top, Continue brings it back). Opened from the pause sheet it lies over
  // the sheet, closing it goes back to the sheet, and Continue closes it.
  const [hintLogAt, setHintLogAt] = useState<{ race: string; fromPause: boolean } | null>(null);
  const hintLogOpen = Boolean(p.hintLog) && hintLogAt?.race === raceKey && hintLogAt.fromPause === Boolean(p.paused);
  const closeHintLog = () => setHintLogAt(null);
  const openHintLog = () => { setBigMapRace(null); setHintLogAt({ race: raceKey, fromPause: Boolean(p.paused) }); };
  const openBigMap = () => { setHintLogAt(null); setBigMapRace(raceKey); };
  useEffect(() => { if (!p.paused) setHintLogAt(at => at?.fromPause ? null : at); }, [p.paused]);
  const hintCount = p.hintLog?.length ?? 0;
  const panelRef = useRef<HTMLDivElement>(null);
  const selectTab = (next: Tab) => {
    const previous = tabRef.current;
    if (next === previous) { panelRef.current?.scrollTo(0, 0); return; }
    tabRef.current = next; setTab(next);
    if (next === "map" || previous === "map") recordControlChange("race", "race-map", next === "map", previous === "map");
  };
  const menuRef = useRef<HTMLButtonElement>(null);
  const tapRef = useRef<TapTracker | null>(null);
  const cycleCamera = () => p.setCamera(nextRaceCamera(p.camera));
  const sceneTap = sceneTapHandlers(() => (tapRef.current ??= createTapTracker()), cycleCamera);
  // M1-4 finish hold: the scene stays for 2.5 s with the place plate; the
  // boat is no longer raced, so steering and trim are dimmed and inert.
  const holding = useSyncExternalStore(finishHoldStore.subscribe, () => finishHoldActive(p.raceId ?? ""), () => false);
  // Full screen is offered in the status row during one race on a desktop
  // browser; the pause sheet keeps the entry afterwards.
  const screen = useSyncExternalStore(subscribeFullscreen, fullscreenState, fullscreenServerState);
  const [offerAnswered, setOfferAnswered] = useState(() => fullscreenOfferAnswered());
  const canFullscreen = Boolean(p.fullscreenOffer) && screen === "off";
  const offerFullscreen = canFullscreen && !offerAnswered;
  const goFullscreen = () => { markFullscreenOfferAnswered(); setOfferAnswered(true); requestRaceFullscreen(); };
  useEffect(() => {
    if (!offerFullscreen) return;
    // Seen during this race: the next race no longer shows the row offer.
    return () => markFullscreenOfferAnswered();
  }, [offerFullscreen]);
  const resume = () => { p.onPause(); menuRef.current?.focus(); };
  const mapping = helmMappingFor(controls, "boat");
  const pro = p.prefs.mode === "pro";
  const versus = speedVersusTarget(p.speed, p.targetSpeed);
  const course = p.autopilot ? p.targetHeading : p.heading;
  const helm = { mapping, value: mapping === "rudder" ? `${Math.round(p.rudder * 35)}°` : `${Math.round(course)}°`, unit: mapping === "rudder" ? labels.rudderShort : labels.heading,
    ariaNow: mapping === "rudder" ? p.rudder * 35 : course, ariaMin: mapping === "rudder" ? -35 : 0, ariaMax: mapping === "rudder" ? 35 : 360,
    rudder: p.rudder, setRudder: p.setRudder, onCourseDelta: p.courseDelta };
  const range = (label: string, value: number, change: (v: number) => void, min = 0, max = 1) => <label className={styles.range}><span>{label}<output>{Math.round(value * (max === 1 ? 100 : 1))}{max === 1 ? "%" : "°"}</output></span><input type="range" aria-label={label} min={min} max={max} step={max === 1 ? .01 : 1} value={value} onChange={e => change(Number(e.target.value))} /></label>;
  const sound = p.raceSoundToggle;
  // Steering and trim live in the Helm and Sails tabs; Map and Settings stay usable.
  const held = holding && (tab === "helm" || tab === "sails");
  // F4: the coach line (on unless switched off; prefs written before F4 have no
  // field). Switched off, it drops the steady advice (hold, steer a little, the
  // mode note) but keeps the manoeuvre calls of the route hint, which the
  // player still pays gold for (hint-log.ts LOGGED_ROUTE_ACTIONS).
  const routeCall = p.prefs.guidance && p.guidance ? c.actions[p.guidance.action] : null;
  const coachLine = p.paused ? c.pause : p.prefs.coachStrip !== false ? p.message || routeCall || (pro ? c.proNote : c.simpleNote)
    : p.prefs.guidance && p.guidance && LOGGED_ROUTE_ACTIONS.includes(p.guidance.action) ? routeCall : null;
  const trimLine = Boolean(pro && p.prefs.trimHints && p.trimAdvice);
  const notice = coachLine !== null || p.prefs.guidance || trimLine;
  return <div className={`${styles.cockpit} ${styles.gameLayer}`} data-testid="race-cockpit" data-paused={p.paused || undefined}>
    <div className={styles.workspace}>
      <div className={styles.scene} data-testid="race-3d" {...sceneTap}>{p.children}
        <div className={styles.instrumentsArea}>
          <RaceCornerInstruments navigation={p.navigation} wind={p.windReading} windDisplay={p.prefs.windDisplay}
            miniMap={p.prefs.miniMap} onOpenMap={openBigMap} you={c.you} fleet={c.fleet} />
        </div>
        {bigMap && <RaceBigMap snapshot={p.navigation} track={p.track?.()} guidance={p.prefs.guidance ? p.guidance : null}
          you={c.you} fleet={c.fleet} onClose={() => setBigMapRace(null)} note={tl(RACE_MAP_COPY.raceRunning)} className={styles.bigMap} />}
        {hintLogOpen && !p.paused && <RaceHintLogPanel entries={p.hintLog ?? []} onClose={closeHintLog} className={styles.hintLog} />}
        {/* M1-3: toasts near the boat and the contact frame, above the HUD, under the pause sheet. */}
        <RaceFeedbackLayer toasts={p.feedback?.toasts ?? []} contact={p.feedback?.contact ?? null} />
        {/* M1-3: the big start countdown over the scene (it left the dock notice). */}
        {p.countdown !== undefined && <div className={fx.countdown} data-testid="race-countdown" aria-live="polite" aria-atomic="true">
          <span>{p.countdown || c.startSignal}</span>
        </div>}
        {/* M3-3: class flag and P with the countdown, X on the player's early start. */}
        <RaceStartFlags flags={startFlags(p.countdown, p.recall)} />
        {/* M1-2: one thin status row over the scene; the only Menu control. */}
        <header className={styles.status} role="group" aria-label={pc.status} data-testid="race-status-row">
          <button ref={menuRef} type="button" className={styles.menuButton} onClick={p.onPause}
            aria-haspopup="dialog" aria-expanded={p.paused} data-testid="race-menu">{c.menu}</button>
          {pro && <span className={styles.modeBadge}>PRO</span>}
          <span className={styles.readout} data-testid="race-time">
            <span className={styles.readoutLabel}>{c.time}</span>
            <strong>{p.time}</strong>
            {p.penalty > 0 && <small className={styles.penalty}>{c.penalty(p.penalty)}</small>}
          </span>
          <span className={styles.readout} data-testid="race-place">
            <span className={styles.readoutLabel}>{pc.place}</span>
            <strong>{`${p.rank || "-"}/${p.rows.length}`}</strong>
          </span>
          <span className={styles.readout} data-testid="race-speed">
            <span className={styles.readoutLabel}>{c.speed}</span>
            <strong className={fx.speedValue} data-target={versus.state}>{p.speed.toFixed(1)}</strong>
            {versus.target !== null && <small className={fx.target} data-testid="race-target-speed"><span className={fx.srOnly}>{tl(TARGET_SPEED_LABEL)} </span>/ {versus.target.toFixed(1)}</small>}
            <small>{c.knots}</small>
          </span>
          <span className={styles.statusEnd}>
            {/* M2-1: the camera switch for keyboard and screen readers; on a narrow
                phone the row has no room, a tap on the scene does the same. */}
            <button type="button" onClick={cycleCamera} data-testid="race-camera-cycle"
              aria-label={`${tl(RACE_CAMERA_SWITCH)}: ${c[p.camera]}`} title={`${tl(RACE_CAMERA_SWITCH)}: ${c[p.camera]}`}
              className="hidden min-h-11 min-w-11 items-center justify-center @min-[480px]:inline-flex">
              <span className="inline-flex" aria-hidden="true"><CameraIcon size={22} /></span>
            </button>
            {sound?.("status")}
            {offerFullscreen && <button type="button" className={styles.statusAction} onClick={goFullscreen} data-testid="race-fullscreen-offer">{pc.fullscreen}</button>}
          </span>
        </header>
        {p.paused && <RacePauseSheet copy={c} pauseCopy={pc} onContinue={resume} onRestart={p.onRestart}
          onSettings={() => selectTab("settings")} onExit={p.onExit} onExitPrompt={p.onExitPrompt} confirmExit={!holding}
          showKeys={screen !== "unsupported"} onFullscreen={canFullscreen ? goFullscreen : null}
          sound={p.haptics ? <>{sound?.("pause")}<RaceHapticsToggle on={p.haptics.on} onChange={p.haptics.setOn} /></> : sound?.("pause")} lessonReturn={foundationLesson ? <FoundationReturn compact /> : undefined}
          hints={p.hintLog ? { label: `${tl(RACE_HINT_SETTINGS_COPY.hintsGroup)} (${hintCount})`, open: openHintLog } : undefined} />}
        {hintLogOpen && p.paused && <RaceHintLogPanel paused entries={p.hintLog ?? []} onClose={closeHintLog} className={`${styles.hintLog} ${styles.overPause}`} />}
      </div>
      <aside className={styles.dock} aria-label={labels.controlsTitle}>
        {/* F4: the coach line can be switched off (Settings, Hints); the route and trim lines keep their own switches, and with nothing to say the strip is gone. */}
        {notice && <div className={styles.notice} role="status" aria-live="polite" tabIndex={0} data-testid="race-coach-line">
          {p.hintLog && <button type="button" className={styles.hintLogButton} onClick={openHintLog} aria-pressed={hintLogOpen}
            aria-label={`${tl(RACE_HINT_LOG_COPY.open)} (${hintCount})`} title={`${tl(RACE_HINT_LOG_COPY.open)} (${hintCount})`} data-testid="race-hint-log-open">
            <HintIcon size={20} /><span aria-hidden="true">{hintCount}</span>
          </button>}
          {coachLine}
          {p.prefs.guidance && <small className={styles.trimAdvice} data-testid="race-route-heading">
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              <span>{labels.course}: {Math.round(p.heading)}°</span>
              <span>{c.routeHeading}: {p.guidance ? `${Math.round(p.guidance.suggestedHeading)}° · ${c.metres(p.guidance.distance * METRES_PER_UNIT)}` : "-"}</span>
            </span>
          </small>}
          {trimLine && <small className={styles.trimAdvice}>{p.trimAdvice}</small>}
        </div>}
        <nav className={styles.tabs} aria-label={labels.controlsTitle}>
          {(["helm", "sails", "map", "settings"] as const).map(t => <button type="button" key={t} aria-pressed={tab === t} onClick={() => selectTab(t)}>{t === "settings" && <GearIcon size={22} />}<span>{t === "helm" ? labels.helm : t === "map" ? nav.map : c[t]}</span></button>)}
          <button type="button" aria-pressed={p.autopilot} onClick={p.onAutopilot} disabled={holding}><span>{c.auto}</span></button>
        </nav>
        {/* F2: the Helm panel is pinned (never scrolls, no page pan or zoom from it); the other tabs scroll inside their own panel. */}
        <div key={tab} ref={panelRef} className={`${styles.panel}${tab === "helm" ? ` ${styles.pinned}` : ""}${held ? ` ${styles.held}` : ""}`}
          inert={held || undefined} data-held={held || undefined} data-pinned={tab === "helm" || undefined} data-testid="race-dock-panel">
          {tab === "helm" && <>
            {controls.mode === "wheels" ? <div className={styles.wheels}><WheelDeck hideHint sheetKeysEnabled={false} layout="bottom" helm={helm} prefs={controls} labels={labels}
              main={pro ? { ease: 1 - p.trim.mainSheet, setEase: v => p.setTrim({ mainSheet: 1 - v }) } : null}
              jib={pro ? { ease: 1 - p.trim.jibSheet, setEase: v => p.setTrim({ jibSheet: 1 - v }) } : null}
              note={pro ? labels.wheelHint : c.simpleNote} /></div> : <div className={styles.sliders}>
                {mapping === "course" ? range(labels.course, course, p.setCourse, 0, 360) : range(labels.rudder, p.rudder * 35, v => p.setRudder(v / 35), -35, 35)}
                {pro && range(labels.mainsheet, 1 - p.trim.mainSheet, v => p.setTrim({ mainSheet: 1 - v }))}
                {pro && range(labels.jibsheet, 1 - p.trim.jibSheet, v => p.setTrim({ jibSheet: 1 - v }))}
              </div>}
          </>}
          {tab === "sails" && <div className={styles.options}>
            <Toggle label={c.main} checked={p.trim.mainHoisted !== false} onChange={mainHoisted => p.setTrim({ mainHoisted })} />
            <Toggle label={c.jib} checked={p.trim.jibFurl < .5} onChange={on => p.setTrim({ jibFurl: on ? 0 : 1 })} />
            {range(c.reef, p.trim.reef, reef => p.setTrim({ reef }))}
            <p>{pro ? p.prefs.trimHints ? c.trimHint : c.proNote : c.simpleNote}</p>
          </div>}
          {tab === "map" && <div className={styles.mapPanel}>
            <RaceOverviewMap snapshot={p.navigation} labels={{ ...nav, title: nav.map, you: c.you, fleet: c.fleet }} />
            <RaceWindInstrument reading={p.windReading} display={p.prefs.windDisplay} />
            <h2>{c.fleet}</h2>
            <ol className={styles.fleet}>{p.rows.map((r, i) => <li key={r.id} data-player={r.isPlayer || undefined}><b>{i + 1}</b><span className={styles.fleetDot} style={{ background: r.color }} aria-hidden="true" /><span className={styles.fleetName}>{r.isPlayer ? c.you : r.name}</span></li>)}</ol>
          </div>}
          {tab === "settings" && <div className={styles.options}>
            <div className={styles.modePicker}>
              <strong>{pro ? c.pro : c.simple}</strong>
              <p>{pro ? c.proNote : c.simpleNote}</p>
            </div>
            <div className={styles.segmented} role="radiogroup" aria-label={labels.controlsTitle}>{(["wheels", "sliders"] as const).map(mode => <button key={mode} type="button" role="radio" aria-checked={controls.mode === mode} onClick={() => update({ mode })}>{labels[mode]}</button>)}</div>
            <div className={styles.segmented} role="radiogroup" aria-label={labels.helmSets}>{(["rudder", "course"] as const).map(m => <button key={m} type="button" role="radio" aria-checked={mapping === m} onClick={() => update({ helmMapping: { ...controls.helmMapping, boat: m } })}>{labels[m]}</button>)}</div>
            <Toggle label={labels.returnCenter} checked={controls.helmReturnToCenter} onChange={helmReturnToCenter => update({ helmReturnToCenter })} />
            <Toggle label={labels.jibRight} checked={controls.jibSheetSide === "right"} onChange={on => update({ jibSheetSide: on ? "right" : "left" })} />
            <div className={styles.segmented} role="radiogroup" aria-label={labels.sensitivity}>{([.5, 1, 2] as const).map((s, i) => <button key={s} type="button" role="radio" aria-checked={controls.sensitivity === s} onClick={() => update({ sensitivity: s })}>{[labels.fine, labels.normal, labels.fast][i]}</button>)}</div>
            <div className={styles.segmented} role="radiogroup" aria-label={c.view}>{(["orbit", "stern", "high"] as const).map(v => <button key={v} type="button" role="radio" aria-checked={p.camera === v} onClick={() => p.setCamera(v)}>{c[v]}</button>)}</div>
            <button type="button" className="min-h-11" onClick={p.onResetCamera}>{c.resetCamera}</button>
            <p>{c.cameraGesture} {tl(RACE_CAMERA_TAP_HINT)}</p>
            <RaceWindSettings display={p.prefs.windDisplay} onChange={windDisplay => p.updatePrefs({ windDisplay })} />
            <Toggle label={nav.miniMapSetting} checked={p.prefs.miniMap} onChange={miniMap => p.updatePrefs({ miniMap })} />
            {/* F4: one Hints group: route, Pro trim, the coach line, the first race hints and the log. */}
            <section className={styles.group} data-testid="race-hints-group">
              <h2 className={styles.groupTitle}>{tl(RACE_HINT_SETTINGS_COPY.hintsGroup)}</h2>
              <Toggle label={c.guidance} checked={p.prefs.guidance} onChange={guidance => p.updatePrefs({ guidance })} />
              <Toggle label={c.trimHints} checked={p.prefs.trimHints} onChange={trimHints => p.updatePrefs({ trimHints })} />
              <Toggle label={tl(RACE_HINT_SETTINGS_COPY.coachStrip)} checked={p.prefs.coachStrip !== false} onChange={coachStrip => p.updatePrefs({ coachStrip })} />
              <p>{tl(RACE_HINT_SETTINGS_COPY.coachStripNote)}</p>
              <Toggle label={tl(RACE_HINT_SETTINGS_COPY.firstRaceHints)} checked={p.prefs.firstRaceHints !== false} onChange={firstRaceHints => p.updatePrefs({ firstRaceHints })} />
              {p.onShowHintsAgain && <div data-testid="race-hints-again">
                {/* Asking to see them again also switches them back on, so the confirmation holds. */}
                <button type="button" className="min-h-11" onClick={() => { if (p.prefs.firstRaceHints === false) p.updatePrefs({ firstRaceHints: true }); p.onShowHintsAgain?.(); setHintsAgain(true); }}>{tl(FIRST_RACE_HINT_COPY.again)}</button>
                <p role="status" aria-live="polite">{hintsAgain ? tl(FIRST_RACE_HINT_COPY.againDone) : tl(FIRST_RACE_HINT_COPY.againNote)}</p>
              </div>}
              {p.hintLog && <button type="button" className="min-h-11" onClick={openHintLog} data-testid="race-hint-log-settings">{`${tl(RACE_HINT_LOG_COPY.open)} (${hintCount})`}</button>}
              {p.onShowIntro && <button type="button" className="min-h-11" onClick={p.onShowIntro} aria-haspopup="dialog" data-testid="race-intro-settings">{tl(RACE_INTRO_TITLE)}</button>}
              <p>{tl(RACE_HINT_SETTINGS_COPY.goldNote)}</p>
            </section>
            <section className={styles.group} data-testid="race-graphics-group">
              <h2 className={styles.groupTitle}>{tl(RACE_HINT_SETTINGS_COPY.graphicsGroup)}</h2>
              <Toggle label={tl(RACE_HINT_SETTINGS_COPY.softLight)} checked={p.prefs.softLight === true} onChange={softLight => p.updatePrefs({ softLight })} />
              <p>{tl(RACE_HINT_SETTINGS_COPY.softLightNote)}</p>
              {/* F6: apparent-wind ribbons along the player's sails in the 3D scene. */}
              <Toggle label={tl(RACE_SAIL_FLOW_COPY.label)} checked={p.prefs.sailFlow === true} onChange={sailFlow => p.updatePrefs({ sailFlow })} />
              <p>{tl(RACE_SAIL_FLOW_COPY.note)}</p>
            </section>
            <Toggle label={c.rules} checked={p.prefs.rules} onChange={rules => p.updatePrefs({ rules })} />
            <Toggle label={c.penalties} checked={p.prefs.penalties} onChange={penalties => p.updatePrefs({ penalties })} />
            <Toggle label={c.sound} checked={!p.muted} onChange={p.onSound} />
            {p.haptics && <Toggle label={haptics.label} checked={p.haptics.on} onChange={p.haptics.setOn} />}
            <Toggle label={labels.sound} checked={controls.sound} onChange={sound => update({ sound })} />
            <p>{c.rulesNote}</p>
            <DiagnosticAccess />
          </div>}
        </div>
      </aside>
    </div>
  </div>;
}
