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
import { finishHoldActive, finishHoldStore } from "./race-finish-hold";
import { RacePauseSheet } from "./RacePauseSheet";
import { useRacePauseCopy } from "./race-pause-copy";
import { fullscreenOfferAnswered, fullscreenServerState, fullscreenState, markFullscreenOfferAnswered, requestRaceFullscreen, subscribeFullscreen } from "./race-fullscreen";
import { useI18n } from "@/lib/i18n";
import { RaceFeedbackLayer } from "@/features/race-hud/RaceFeedbackLayer";
import fx from "@/features/race-hud/RaceFeedbackLayer.module.css";
import type { ContactFrame, FeedbackToast } from "@/features/race-hud/feedback";
import { TARGET_SPEED_LABEL, speedVersusTarget } from "@/features/race-hud/speed-target";

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
  /** The live race id: steering and trim are held during its finish hold. */
  raceId?: string;
  /** Desktop browser only: offer full screen once (never in the native app). */
  fullscreenOffer?: boolean;
  /** SLOT for the race sound switch of M1-5 (sound lane). Rendered in the
   * status row and in the pause sheet; empty until that switch is wired. */
  raceSoundToggle?: (placement: RaceSoundPlacement) => ReactNode;
  /** M1-3 feedback bus: the toasts near the boat and the contact frame. */
  feedback?: { toasts: readonly FeedbackToast[]; contact: ContactFrame | null };
  /** M1-3: the polar target speed at this wind angle, knots; omitted when unknown. */
  targetSpeed?: number | null;
}) {
  const c = useRaceCopy();
  const { tl } = useI18n();
  const pc = useRacePauseCopy();
  const nav = useRaceNavigationCopy();
  const foundationLesson = useFoundationReturnId();
  const labels = useControlLabels();
  const { prefs: controls, update } = useControlPrefs();
  type Tab = "helm" | "sails" | "map" | "settings";
  const [tab, setTab] = useState<Tab>("helm");
  const tabRef = useRef<Tab>("helm");
  const panelRef = useRef<HTMLDivElement>(null);
  const selectTab = (next: Tab) => {
    const previous = tabRef.current;
    if (next === previous) { panelRef.current?.scrollTo(0, 0); return; }
    tabRef.current = next; setTab(next);
    if (next === "map" || previous === "map") recordControlChange("race", "race-map", next === "map", previous === "map");
  };
  const menuRef = useRef<HTMLButtonElement>(null);
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
  return <div className={`${styles.cockpit} ${styles.gameLayer}`} data-testid="race-cockpit" data-paused={p.paused || undefined}>
    <div className={styles.workspace}>
      <div className={styles.scene} data-testid="race-3d">{p.children}
        <div className={styles.instrumentsArea}>
          <RaceCornerInstruments navigation={p.navigation} wind={p.windReading} windDisplay={p.prefs.windDisplay}
            miniMap={p.prefs.miniMap} onOpenMap={() => selectTab("map")} you={c.you} fleet={c.fleet} />
        </div>
        {/* M1-3: toasts near the boat and the contact frame, above the HUD, under the pause sheet. */}
        <RaceFeedbackLayer toasts={p.feedback?.toasts ?? []} contact={p.feedback?.contact ?? null} />
        {/* M1-3: the big start countdown over the scene (it left the dock notice). */}
        {p.countdown !== undefined && <div className={fx.countdown} data-testid="race-countdown" aria-live="polite" aria-atomic="true">
          <span>{p.countdown || c.startSignal}</span>
        </div>}
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
            {sound?.("status")}
            {offerFullscreen && <button type="button" className={styles.statusAction} onClick={goFullscreen} data-testid="race-fullscreen-offer">{pc.fullscreen}</button>}
          </span>
        </header>
        {p.paused && <RacePauseSheet copy={c} pauseCopy={pc} onContinue={resume} onRestart={p.onRestart}
          onSettings={() => selectTab("settings")} onExit={p.onExit} onExitPrompt={p.onExitPrompt} confirmExit={!holding}
          showKeys={screen !== "unsupported"} onFullscreen={canFullscreen ? goFullscreen : null}
          sound={sound?.("pause")} lessonReturn={foundationLesson ? <FoundationReturn compact /> : undefined} />}
      </div>
      <aside className={styles.dock} aria-label={labels.controlsTitle}>
        <div className={styles.notice} role="status" aria-live="polite" tabIndex={0}>
          {p.paused ? c.pause : p.message || (p.prefs.guidance && p.guidance ? c.actions[p.guidance.action] : pro ? c.proNote : c.simpleNote)}
          {p.prefs.guidance && <small className={styles.trimAdvice} data-testid="race-route-heading">
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              <span>{labels.course}: {Math.round(p.heading)}°</span>
              <span>{c.routeHeading}: {p.guidance ? `${Math.round(p.guidance.suggestedHeading)}° · ${c.metres(p.guidance.distance * METRES_PER_UNIT)}` : "-"}</span>
            </span>
          </small>}
          {pro && p.prefs.trimHints && p.trimAdvice && <small className={styles.trimAdvice}>{p.trimAdvice}</small>}
        </div>
        <nav className={styles.tabs} aria-label={labels.controlsTitle}>
          {(["helm", "sails", "map", "settings"] as const).map(t => <button type="button" key={t} aria-pressed={tab === t} onClick={() => selectTab(t)}>{t === "settings" && <GearIcon size={16} />}<span>{t === "helm" ? labels.helm : t === "map" ? nav.map : c[t]}</span></button>)}
          <button type="button" aria-pressed={p.autopilot} onClick={p.onAutopilot} disabled={holding}><span>{c.auto}</span></button>
        </nav>
        <div key={tab} ref={panelRef} className={`${styles.panel}${held ? ` ${styles.held}` : ""}`} inert={held || undefined} data-held={held || undefined}>
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
            <p>{c.cameraGesture}</p>
            <RaceWindSettings display={p.prefs.windDisplay} onChange={windDisplay => p.updatePrefs({ windDisplay })} />
            <Toggle label={nav.miniMapSetting} checked={p.prefs.miniMap} onChange={miniMap => p.updatePrefs({ miniMap })} />
            <Toggle label={c.guidance} checked={p.prefs.guidance} onChange={guidance => p.updatePrefs({ guidance })} />
            <Toggle label={c.trimHints} checked={p.prefs.trimHints} onChange={trimHints => p.updatePrefs({ trimHints })} />
            <Toggle label={c.rules} checked={p.prefs.rules} onChange={rules => p.updatePrefs({ rules })} />
            <Toggle label={c.penalties} checked={p.prefs.penalties} onChange={penalties => p.updatePrefs({ penalties })} />
            <Toggle label={c.sound} checked={!p.muted} onChange={p.onSound} />
            <Toggle label={labels.sound} checked={controls.sound} onChange={sound => update({ sound })} />
            <p>{c.rulesNote}</p>
            <DiagnosticAccess />
          </div>}
        </div>
      </aside>
    </div>
  </div>;
}
