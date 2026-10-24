'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { RegattaScene } from "./RegattaScene";
import { useSailingSim } from "./physics/useSailingSim";
import { useSailAudio } from "./audio/useSailAudio";
import { WindDial } from "./ui/WindDial";
import { WindGlyph, WindReadout } from "./ui/WindReadout";
import { useI18n } from "@/lib/i18n";
import { PICKABLE_VENUES, shoreLabel, venueLabel } from "../../data/venues/venues";
import { useVenue } from "../venues/useVenue";
import { DEFAULT_LABELS, NEUTRAL_YACHT, type SimLabels, type YachtState } from "./types";
import type { CameraView } from "./camera";
import styles from "./Simulator3D.module.css";
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
  helmMappingFor,
  trainerScreenClass,
  useControlLabels,
  useControlPrefs,
  type DockTab,
  type HelmTarget,
} from "../trainer-controls";

// Phones (and landscape phones) get the pinned-boat workspace with the shared
// control dock (docs/design/trainer-controls-concept.md); wider screens keep the
// scene plus side panel. On phones nothing is drawn over the boat: the mode
// buttons sit in the bar above it, the readouts and the steer buttons under
// it, cameras and the guide slide out from the side on demand.
// This module is client-only (dynamic, ssr: false).
const COMPACT_QUERY = "(max-width: 900px), (orientation: landscape) and (max-height: 540px)";
function subscribeCompact(onChange: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const compactNow = () => window.matchMedia(COMPACT_QUERY).matches;

type Mode = "free" | "sail";
const FREE_PRESETS: { key: keyof SimLabels['presets']; state: Partial<YachtState> }[] = [
  { key: 'luff', state: { boomAngle: 4, jibAngle: 4, camber: 0.0, twist: 0.3, luff: 1, heel: 2 } },
  { key: 'close', state: { boomAngle: 10, jibAngle: 8, camber: 0.3, twist: 0.35, luff: 0, heel: 22 } },
  { key: 'beam', state: { boomAngle: 45, jibAngle: 32, camber: 0.7, twist: 0.55, luff: 0, heel: 18 } },
  { key: 'broad', state: { boomAngle: 65, jibAngle: 48, camber: 0.85, twist: 0.7, luff: 0, heel: 12 } },
  { key: 'run', state: { boomAngle: 85, jibAngle: 70, camber: 0.9, twist: 0.9, luff: 0, heel: 5 } },
];

const FREE_DEFAULT: YachtState = { ...NEUTRAL_YACHT, boomAngle: 20, jibAngle: 15, camber: 0.5, twist: 0.42, heel: 16 };

function Slider({ label, value, min, max, step = 0.01, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (value: number) => void; fmt?: (value: number) => string;
}) {
  return <label className={styles.slider}>
    <span><span>{label}</span><span>{fmt ? fmt(value) : value.toFixed(2)}</span></span>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value}
      onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}
function Readout({ label, value }: { label: string; value: string }) {
  return <div className={styles.readout}><span>{label}</span><strong>{value}</strong></div>;
}
function SteerButton({ dir, label, onHold, onRelease, inline }: {
  dir: -1 | 1; label: string; onHold: (dir: -1 | 1) => void; onRelease: () => void; inline?: boolean;
}) {
  return <button aria-label={label} className={inline ? `${styles.steer} ${styles.steerInline}` : styles.steer}
    style={inline ? undefined : dir === -1 ? { left: 12 } : { right: 12 }}
    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onHold(dir); }}
    onPointerUp={onRelease} onPointerCancel={onRelease} onLostPointerCapture={onRelease}
    onBlur={onRelease} onContextMenu={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      if (event.key === " " || event.key === "Enter") { event.preventDefault(); onHold(dir); }
    }}
    onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") onRelease(); }}
  >{dir === -1 ? "‹" : "›"}</button>;
}
export interface Simulator3DProps {
  labels?: Partial<SimLabels>; headerSlot?: ReactNode; className?: string;
  initialMode?: Mode; embed?: boolean;
}
const percent = (value: number) => `${Math.round(value * 100)}%`;
const degrees = (value: number) => `${Math.round(value)}°`;

export function Simulator3D({ labels, headerSlot, className, initialMode = "free", embed = false }: Simulator3DProps) {
  const L: SimLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels,
    scene: { ...DEFAULT_LABELS.scene, ...labels?.scene },
    presets: { ...DEFAULT_LABELS.presets, ...labels?.presets },
    coach: { ...DEFAULT_LABELS.coach, ...labels?.coach },
    sailStatus: { ...DEFAULT_LABELS.sailStatus, ...labels?.sailStatus },
    sailHint: { ...DEFAULT_LABELS.sailHint, ...labels?.sailHint },
    maneuver: { ...DEFAULT_LABELS.maneuver, ...labels?.maneuver },
    tour: { ...DEFAULT_LABELS.tour, ...labels?.tour },
  }), [labels]);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [free, setFree] = useState<YachtState>({ ...FREE_DEFAULT });
  const yachtRef = useRef<YachtState>({ ...FREE_DEFAULT });
  const [view, setView] = useState<CameraView>("whole");
  const [cameraRevision, setCameraRevision] = useState(0);
  const [showFlow, setShowFlow] = useState(true);
  const [light, setLight] = useState(embed);
  const [guide, setGuide] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const { lang } = useI18n();
  const { venue, picked, shoreOn, setVenue, setShoreOn } = useVenue();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (mode === "free") Object.assign(yachtRef.current, free, { rigResolved: false, sailSide: undefined, heading: undefined, travel: undefined, jibShape: undefined, fill: 1, airSpeed: 12, apparentWind: undefined, wind: undefined, speedKn: 0 });
  }, [free, mode]);
  const sim = useSailingSim(yachtRef, mode === "sail");
  const t = sim.telemetry;
  const { reset } = sim;
  useEffect(() => { if (mode === "sail") reset(); }, [mode, reset]);
  const { enabled, toggle, update, setActive } = useSailAudio();
  const compact = useSyncExternalStore(subscribeCompact, compactNow, () => false);
  const { prefs, update: updatePrefs } = useControlPrefs();
  const controlLabels = useControlLabels();
  const wheels = prefs.mode === "wheels";
  const helmMapping = helmMappingFor(prefs, "boat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Course mapping (an option for the 3D boat): a gentle assist turns the rudder toward the chosen heading.
  const [courseTarget, setCourseTarget] = useState<number | null>(null);
  useEffect(() => { setActive(mode === "sail"); }, [mode, setActive]);
  useEffect(() => {
    if (mode === "sail" && enabled) update(t.awsKn, sim.wind.twsKn, t.speedKn,
      t.coach.startsWith("luff") || t.coach === "inIrons", performance.now() / 1000);
  }, [mode, enabled, update, t.awsKn, t.speedKn, t.coach, sim.wind.twsKn]);
  const setControlRef = useRef(sim.setControl);
  useEffect(() => { setControlRef.current = sim.setControl; });
  const hold = (dir: -1 | 1) => setControlRef.current("rudder", dir * 0.7);
  const release = () => setControlRef.current("rudder", 0);
  useEffect(() => {
    if (mode !== "sail" || wheels) return;
    const pressed = new Set<string>();
    const sync = () => setControlRef.current("rudder", pressed.has("ArrowRight") ? 0.7 : pressed.has("ArrowLeft") ? -0.7 : 0);
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, button, [contenteditable='true']")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault(); pressed.add(event.key); sync();
    };
    const up = (event: KeyboardEvent) => { if (pressed.delete(event.key)) sync(); };
    const blur = () => { pressed.clear(); setControlRef.current("rudder", 0); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    window.addEventListener("blur", blur); document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", visibility);
      blur();
    };
  }, [mode, wheels]);
  useEffect(() => {
    if (mode !== "sail" || !wheels || helmMapping !== "course" || courseTarget === null) return;
    const error = ((courseTarget - t.heading) % 360 + 540) % 360 - 180;
    setControlRef.current("rudder", Math.max(-1, Math.min(1, error / 25)));
  }, [mode, wheels, helmMapping, courseTarget, t.heading]);
  const setFreeField = (patch: Partial<YachtState>) => setFree((state) => ({ ...state, ...patch }));
  const selectView = (next: CameraView) => { setView(next); setCameraRevision((revision) => revision + 1); };
  const header = <header className={styles.header}>
      <div className={styles.modes}>
        <button className={styles.button} aria-pressed={mode === "sail"} onClick={() => setMode("sail")}>{L.modeSail}</button>
        <button className={styles.button} aria-pressed={mode === "free"} onClick={() => setMode("free")}>{L.modeFree}</button>
        <button className={styles.button} aria-label={L.tour.open} aria-expanded={guide} onClick={() => { setGuide(!guide); panelRef.current?.scrollTo({ top: 0 }); }}>?</button>
      </div>
      {headerSlot}
    </header>;
  const guideBlock = guide && <details open className={styles.guide}>
      <summary>{L.tour.open}</summary>
      <ol>{L.tour.steps.map((step) => <li key={step.title}><strong>{step.title}.</strong> {step.body}</li>)}</ol>
    </details>;
  const cameraBar = <>
        <div className={styles.toolbar}>
          {(["whole", "sails", "stern", "deck"] as const).map((item) => <button key={item} className={styles.button}
            aria-pressed={view === item || (item === "sails" && (view === "main" || view === "jib"))} onClick={() => selectView(item)}>{L.scene[item]}</button>)}
          <button className={styles.button} style={{ marginLeft: "auto" }} aria-label={L.scene.resetView}
            onClick={() => selectView("whole")}>↺</button>
          <label className={styles.venueSelect}>
            <input type="checkbox" checked={shoreOn} onChange={(e) => setShoreOn(e.target.checked)} />
            <span>{shoreLabel[lang]}</span>
          </label>
          <label className={styles.venueSelect}>
            <span>{venueLabel[lang]}</span>
            <select value={picked.id} disabled={!shoreOn} onChange={(e) => setVenue(e.target.value as typeof picked.id)}>
              {PICKABLE_VENUES.map((v) => <option key={v.id} value={v.id}>{v.name[lang]}</option>)}
            </select>
          </label>
        </div>
        {(["sails", "main", "jib"] as CameraView[]).includes(view) && <div className={styles.sailViews}>
          {(["sails", "main", "jib"] as const).map((item) => <button key={item} className={styles.button} aria-pressed={view === item} onClick={() => selectView(item)}>{item === "sails" ? L.scene.both : L.scene[item]}</button>)}
        </div>}
  </>;
  const windReadout = <>
        {mode === "sail" && <WindReadout awa={t.awaSigned} aws={t.awsKn} tws={sim.wind.twsKn}
          showFlow={showFlow} onToggle={() => setShowFlow(!showFlow)} labels={L.scene} />}
  </>;
  const viewport = <div className={styles.viewport}>
          <RegattaScene stateRef={yachtRef} maxDpr={light ? 1 : embed ? 1.5 : 1.75} postFx={!light && !embed}
            showFlow={showFlow && mode === "sail"} view={view} revision={cameraRevision} sceneLabel={L.badge} loadingLabel={L.scene.loading} errorLabel={L.scene.error} retryLabel={L.scene.retry}
            venue={venue} />
          {mode === "sail" && !wheels && !compact && <>
            <SteerButton dir={-1} label={L.steerLeft} onHold={hold} onRelease={release} />
            <SteerButton dir={1} label={L.steerRight} onHold={hold} onRelease={release} />
          </>}
        </div>;
  const readouts = mode === "sail" ? <>
          <div className={styles.stats}>
            <Readout label={L.speed} value={`${t.speedKn.toFixed(1)} kn`} />
            <Readout label={L.heel} value={degrees(t.heelDeg)} />
            <Readout label={L.scene.heading} value={degrees(t.heading)} />
          </div>
          <p className={styles.coach} data-maneuver={t.maneuver}>
            {t.maneuver === "sailing" ? L.coach[t.coach] : L.maneuver[t.maneuver]}
          </p>
        </> : <p className={styles.coach}>{L.orbitHint}</p>;
  const sheetValue = (ease: number, angle: number) => `${percent(ease)} (${degrees(angle)})`;
  const mainSlider = <Slider label={L.mainsheet} value={sim.controls.mainSheet} min={0} max={1} fmt={(v) => sheetValue(v, t.boomAngleDeg)} onChange={(v) => sim.setControl("mainSheet", v)} />;
  const jibSlider = <Slider label={L.jibsheet} value={sim.controls.jibSheet} min={0} max={1} fmt={(v) => sheetValue(v, t.jibAngleDeg)} onChange={(v) => sim.setControl("jibSheet", v)} />;
  const sailState = <div className={styles.sailFeedback}>
            <span>{L.scene.main}: {t.mainStatus === "luffing" ? L.sailHint.mainLuffing : t.mainStatus === "stalled" ? L.sailHint.mainStalled : L.sailStatus[t.mainStatus]}</span>
            <span>{L.scene.jib}: {t.jibStatus === "luffing" ? L.sailHint.jibLuffing : t.jibStatus === "stalled" ? L.sailHint.jibStalled : L.sailStatus[t.jibStatus]}</span>
          </div>;
  const rudderControls = <>
            <Slider label={L.helm} value={sim.controls.rudder} min={-1} max={1} fmt={(v) => degrees(v * 35)} onChange={(v) => { setCourseTarget(null); sim.setControl("rudder", v); }} />
            <button className={styles.button} onClick={() => { setCourseTarget(null); release(); }}>{L.helm}: 0°</button>
  </>;
  const reefSlider = <Slider label={L.reef} value={sim.controls.reef} min={0} max={1} fmt={percent} onChange={(v) => sim.setControl("reef", v)} />;
  const windControls = <>
            <Slider label={L.windSpeed} value={sim.wind.twsKn} min={0} max={28} step={1} fmt={(v) => `${v} kn`} onChange={(v) => sim.setWind((w) => ({ ...w, twsKn: v }))} />
            <Slider label={L.wind} value={sim.wind.fromDeg} min={0} max={359} step={1} fmt={degrees} onChange={(v) => sim.setWind((w) => ({ ...w, fromDeg: v }))} />
  </>;
  const instruments = <div>
            <WindDial twaSigned={t.twaSigned} awaSigned={t.awaSigned} label={L.scene.windDial} />
            <Readout label={L.scene.target} value={`${t.targetSpeedKn.toFixed(1)} kn`} />
            <Readout label="VMG" value={`${t.vmg.toFixed(1)} kn`} />
            <Readout label={L.scene.apparent} value={`${t.awsKn.toFixed(1)} kn / ${degrees(t.awaDeg)}`} />
            <Readout label={L.bestVmg} value={degrees(t.vmgTargetAngle)} />
          </div>;
  const toggleSound = () => { toggle(); updatePrefs({ sound: !enabled }); };
  const extras = <div className="mt-2 flex flex-wrap gap-1">
          <button className={styles.button} aria-pressed={light} onClick={() => setLight(!light)}>{L.scene.light}</button>
          {mode === "sail" && <button className={styles.button} aria-pressed={enabled} onClick={toggleSound}>{L.sound}</button>}
          {mode === "sail" && <button className={styles.button} onClick={reset}>{L.reset}</button>}
        </div>;
  const helmTarget: HelmTarget = helmMapping === "course"
    ? {
        mapping: "course",
        value: degrees(courseTarget ?? t.heading),
        unit: controlLabels.heading,
        ariaNow: Math.round(courseTarget ?? t.heading),
        ariaMin: 0,
        ariaMax: 359,
        onCourseDelta: (d) => { setCourseTarget((c) => (((c ?? t.heading) + d) % 360 + 360) % 360); return null; },
      }
    : {
        mapping: "rudder",
        value: degrees(sim.controls.rudder * 35),
        unit: controlLabels.rudderShort,
        ariaNow: Math.round(sim.controls.rudder * 35),
        ariaMin: -35,
        ariaMax: 35,
        rudder: sim.controls.rudder,
        setRudder: (v) => sim.setControl("rudder", v),
      };
  const wheelDeck = (layout: "bottom" | "column") => <WheelDeck
    layout={layout}
    prefs={prefs}
    labels={controlLabels}
    arrowKeysSteer
    helm={helmTarget}
    main={{ ease: sim.controls.mainSheet, angleDeg: t.boomAngleDeg, setEase: (v) => sim.setControl("mainSheet", v) }}
    jib={{ ease: sim.controls.jibSheet, angleDeg: t.jibAngleDeg, setEase: (v) => sim.setControl("jibSheet", v) }}
  />;

  if (compact && mode === "sail") {
    const dockTabs: DockTab[] = [
      { id: "sails", label: controlLabels.tabs.sails, cards: [
        { id: "main", title: L.mainsheet, node: mainSlider },
        { id: "jib", title: L.jibsheet, node: jibSlider },
        { id: "sailState", title: `${L.scene.main}, ${L.scene.jib}`, node: <>{sailState}<p className={styles.sheetScale}>{L.sheetScale}</p></> },
        { id: "reef", title: L.reef, node: reefSlider },
      ] },
      { id: "helm", label: controlLabels.tabs.helm, cards: [{ id: "rudder", title: L.helm, node: rudderControls }] },
      { id: "wind", label: controlLabels.tabs.wind, cards: [{ id: "wind", title: L.windSpeed, node: windControls }] },
      { id: "more", label: controlLabels.tabs.more, cards: [
        { id: "instruments", title: L.scene.instruments, node: instruments },
        { id: "extras", title: `${L.scene.light}, ${L.sound}, ${L.reset}`, node: <><p className={styles.hint}>{L.scene.sailingHint}</p>{extras}</> },
      ] },
    ];
    const sailsView = (["sails", "main", "jib"] as CameraView[]).includes(view);
    const sceneBar = <SceneBar
      status={<div className={styles.modes}>
        <button className={styles.button} aria-pressed onClick={() => setMode("sail")}>{L.modeSail}</button>
        <button className={styles.button} aria-pressed={false} onClick={() => setMode("free")}>{L.modeFree}</button>
      </div>}
      actions={<>
        <ViewButton iconOnly label={controlLabels.view} current={L.scene[sailsView ? "sails" : view as "whole" | "stern" | "deck"]} open={viewsOpen}
          controls="boat-views" onToggle={() => { setGuide(false); setViewsOpen((v) => !v); }} />
        <BarIconButton label={L.tour.open} onClick={() => { setViewsOpen(false); setGuide((g) => !g); }}>?</BarIconButton>
      </>}
    />;
    const compactReadouts = <>
      <div className={styles.statsRow}>
        {!wheels && <SteerButton inline dir={-1} label={L.steerLeft} onHold={hold} onRelease={release} />}
        <div className={styles.stats4}>
          <Readout label={L.speed} value={`${t.speedKn.toFixed(1)} kn`} />
          <Readout label={L.heel} value={degrees(t.heelDeg)} />
          <Readout label={L.scene.heading} value={degrees(t.heading)} />
          <div className={styles.readout}><span>AWA</span><strong className={styles.windCell}>
            <WindGlyph awa={t.awaSigned} moving={t.awsKn > .5} size={22} label={L.scene.relativeWind} />{degrees(t.awaDeg)}</strong></div>
        </div>
        {!wheels && <SteerButton inline dir={1} label={L.steerRight} onHold={hold} onRelease={release} />}
      </div>
      <p className={styles.coach} data-maneuver={t.maneuver}>
        {t.maneuver === "sailing" ? L.coach[t.coach] : L.maneuver[t.maneuver]}
      </p>
    </>;
    return <div className={`${trainerScreenClass(embed)} ${styles.compactRoot} ${className ?? ""}`}>
      {headerSlot && <div className={styles.compactSlot}>{headerSlot}</div>}
      <TrainerWorkspace
        embed={embed}
        sceneBar={sceneBar}
        scene={<div className={styles.compactScene}>
          {viewport}
          <SceneDrawer id="boat-views" open={viewsOpen} title={controlLabels.views} closeLabel={controlLabels.close} onClose={() => setViewsOpen(false)}>
            <DrawerGroup>
              {(["whole", "sails", "stern", "deck"] as const).map((item) => <DrawerItem key={item}
                pressed={view === item || (item === "sails" && sailsView)}
                onClick={() => { selectView(item); if (item !== "sails") setViewsOpen(false); }}>{L.scene[item]}</DrawerItem>)}
            </DrawerGroup>
            {sailsView && <DrawerGroup>
              {(["sails", "main", "jib"] as const).map((item) => <DrawerItem key={item} pressed={view === item}
                onClick={() => { selectView(item); setViewsOpen(false); }}>{item === "sails" ? L.scene.both : L.scene[item]}</DrawerItem>)}
            </DrawerGroup>}
            <DrawerGroup>
              <p className={styles.drawerLabel}>{venueLabel[lang]}</p>
              <DrawerItem pressed={shoreOn} onClick={() => setShoreOn(!shoreOn)}>{shoreLabel[lang]}</DrawerItem>
              {shoreOn && PICKABLE_VENUES.map((v) => <DrawerItem key={v.id} pressed={picked.id === v.id}
                onClick={() => { setVenue(v.id); setViewsOpen(false); }}>{v.name[lang]}</DrawerItem>)}
            </DrawerGroup>
            <DrawerGroup>
              <DrawerItem pressed={showFlow} onClick={() => setShowFlow(!showFlow)}>{L.scene.flow}</DrawerItem>
              <DrawerItem onClick={() => { selectView("whole"); setViewsOpen(false); }}>↺ {L.scene.resetView}</DrawerItem>
            </DrawerGroup>
          </SceneDrawer>
          <SceneDrawer id="boat-guide" open={guide} title={L.tour.open} closeLabel={controlLabels.close} onClose={() => setGuide(false)}>
            <ol className={styles.guideSteps}>{L.tour.steps.map((step) => <li key={step.title}><strong>{step.title}.</strong> {step.body}</li>)}</ol>
            <DrawerItem onClick={() => setGuide(false)}>{controlLabels.close}</DrawerItem>
          </SceneDrawer>
        </div>}
        readouts={compactReadouts}
        dock={<ControlDock
          surface="boat"
          layout="bottom"
          prefs={prefs}
          update={updatePrefs}
          hasSheets
          rudderAvailable
          defaultFavorites={["main", "jib", "sailState"]}
          tabs={dockTabs}
          wheelDeck={wheelDeck("bottom")}
        />}
      />
    </div>;
  }

  return <div className={`${styles.root} ${embed ? styles.embed : ""} ${className ?? ""}`}>
    {header}
    <div className={styles.layout}>
      <section className={styles.visual} aria-label={L.badge}>
        {cameraBar}
        {windReadout}
        {viewport}
        {view === "sails" && <p className={styles.coach}>{L.scene.fullSailPlan}</p>}
        {readouts}
      </section>
      <aside ref={panelRef} className={styles.panel} data-trainer-settings-host>
    {guideBlock}
        {mode === "sail" && <div className={styles.panelHead}>
          <GearButton label={controlLabels.openSettings} onClick={() => setSettingsOpen(true)} />
        </div>}
        {mode === "sail" && wheels && <div className={styles.deckBox}>{wheelDeck("column")}</div>}
        <p className={styles.hint}>{mode === "sail" ? L.scene.sailingHint : L.freeModeHint}</p>
        {mode === "sail" ? <>
          {!wheels && <>{mainSlider}{jibSlider}</>}
          <p className={styles.sheetScale}>{L.sheetScale}</p>
          {sailState}
          <details className={styles.details}><summary>{L.scene.more}</summary><div>
            {!wheels && rudderControls}
            {reefSlider}
            {windControls}
            <button className={styles.button} onClick={reset}>{L.reset}</button>
          </div></details>
          <details className={styles.details}><summary>{L.scene.instruments}</summary>{instruments}</details>
        </> : <>
          <div className="mb-3 flex flex-wrap gap-1">{FREE_PRESETS.map((preset) => <button key={preset.key} className={styles.button}
            onClick={() => setFree({ ...FREE_DEFAULT, reef: 0, ...preset.state })}>{L.presets[preset.key]}</button>)}</div>
          <Slider label={L.mainsheet} value={free.boomAngle} min={0} max={85} step={1} fmt={degrees} onChange={(v) => setFreeField({ boomAngle: v })} />
          <Slider label={L.jibsheet} value={free.jibAngle} min={0} max={70} step={1} fmt={degrees} onChange={(v) => setFreeField({ jibAngle: v })} />
          <details className={styles.details}><summary>{L.scene.more}</summary><div>
            <Slider label={L.camber} value={free.camber} min={0} max={1} fmt={percent} onChange={(v) => setFreeField({ camber: v })} />
            <Slider label={L.twist} value={free.twist} min={0} max={1} fmt={percent} onChange={(v) => setFreeField({ twist: v })} />
            <Slider label={L.luffing} value={free.luff} min={0} max={1} fmt={percent} onChange={(v) => setFreeField({ luff: v })} />
            <Slider label={L.reef} value={free.reef} min={0} max={1} fmt={percent} onChange={(v) => setFreeField({ reef: v })} />
            <Slider label={L.rudder} value={free.rudderAngle} min={-35} max={35} step={1} fmt={degrees} onChange={(v) => setFreeField({ rudderAngle: v })} />
            <Slider label={L.heel} value={free.heel} min={0} max={35} step={1} fmt={degrees} onChange={(v) => setFreeField({ heel: v })} />
            <button className={styles.button} onClick={() => setFree({ ...FREE_DEFAULT })}>{L.reset}</button>
          </div></details>
        </>}
        {extras}
      </aside>
    </div>
    {settingsOpen && <ControlSettingsSheet surface="boat" prefs={prefs} update={updatePrefs} labels={controlLabels} hasSheets rudderAvailable
      favorites={[]} defaultFavorites={[]} onClose={() => setSettingsOpen(false)} />}
  </div>;
}
export default Simulator3D;
