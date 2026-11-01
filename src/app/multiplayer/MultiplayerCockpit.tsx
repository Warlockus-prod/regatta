'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useControlLabels } from "@/features/trainer-controls/labels";
import { helmMappingFor, useControlPrefs } from "@/features/trainer-controls/prefs";
import { WheelDeck } from "@/features/trainer-controls/WheelDeck";
import { METRES_PER_UNIT, raceRanks, type RaceCamera } from "@/features/race-3d/pose";
import { useRaceCopy } from "../game/race-copy";
import styles from "../game/RaceCockpit.module.css";
import local from "./MultiplayerCockpit.module.css";
import { MULTIPLAYER_COURSE, type MultiplayerFrame } from "./presentation";
import { RaceOverviewMap } from "@/features/race-hud/RaceOverviewMap";
import { RaceWindInstrument, RaceWindSettings } from "@/features/race-hud/RaceWindInstrument";
import { useRaceNavigationCopy } from "@/features/race-hud/navigation-copy";
import type { RaceNavigationSnapshot, RaceWindReading } from "@/features/race-hud/navigation-model";
import type { WindDisplay } from "@/lib/race-visual-prefs";
import { GearIcon } from "@/features/trainer-controls/GearIcon";
import { recordControlChange } from "@/lib/diagnostics-controls";
import { RaceCornerInstruments } from "@/features/race-hud/RaceCornerInstruments";
import { RaceBigMap } from "@/features/race-hud/RaceBigMap";
import { RACE_MAP_COPY } from "@/data/race-map-copy";
import { RACE_HINT_SETTINGS_COPY } from "@/data/race-hint-log-copy";
import { RaceStartFlags } from "@/features/race-hud/RaceStartFlags";
import { useRaceSoundCopy } from "@/features/race-hud/RaceSoundToggle";
import { useRaceHaptics, useRaceHapticsCopy } from "@/features/race-hud/RaceHapticsToggle";
import { SERVER_COUNTDOWN_FROM, startFlags } from "@/lib/race-start-signals";
import { readRaceSound, subscribeRaceSound, writeRaceSound } from "@/lib/sounds";
import { claimRaceScrollLock } from "@/components/game-layer";

export function MultiplayerCockpit(p: {
  children: ReactNode; results?: ReactNode; frame: MultiplayerFrame | null;
  phase: "countdown" | "racing" | "finished"; countdown: number; reconnecting: boolean; code: string;
  rudder: number; course: number | null; setRudder: (v: number) => void; setCourse: (v: number) => void; courseDelta: (v: number) => void;
  camera: RaceCamera; setCamera: (v: RaceCamera) => void; onResetCamera: () => void; onLeave: () => void;
  guidanceOn: boolean; setGuidanceOn: (on: boolean) => void;
  windReading: RaceWindReading | null; navigation: RaceNavigationSnapshot | null;
  windDisplay: WindDisplay; setWindDisplay: (display: WindDisplay) => void;
  miniMap: boolean; setMiniMap: (value: boolean) => void;
  /** F4: the softer light, the same race setting as the solo race (absent: no switch). */
  softLight?: boolean; setSoftLight?: (on: boolean) => void;
  /** F3: the player's track this race, recorded by the client (the online race keeps no log). */
  track?: () => readonly Readonly<{ x: number; y: number }>[];
}) {
  const c = useRaceCopy();
  const nav = useRaceNavigationCopy();
  const labels = useControlLabels();
  const { tl } = useI18n();
  const { prefs, update } = useControlPrefs();
  // M3-3: the start signals play here too, so the race sound switch is here as well.
  const raceSoundOn = useSyncExternalStore(subscribeRaceSound, readRaceSound, () => true);
  const raceSound = useRaceSoundCopy();
  // M3-4: the vibration switch beside race sound, only where the device can vibrate.
  const raceHaptics = useRaceHaptics("multiplayer");
  const hapticsCopy = useRaceHapticsCopy();
  type Tab = "helm" | "map" | "settings";
  const [tab, setTab] = useState<Tab>("helm");
  const tabRef = useRef<Tab>("helm");
  const panelRef = useRef<HTMLDivElement>(null);
  const [bigMap, setBigMap] = useState(false);
  const selectTab = (next: Tab) => {
    const previous = tabRef.current;
    if (next === previous) { panelRef.current?.scrollTo(0, 0); return; }
    tabRef.current = next; setTab(next);
    if (next === "map" || previous === "map") recordControlChange("multiplayer", "race-map", next === "map", previous === "map");
  };
  // F2: while the race is on screen the page does not scroll (the cockpit
  // fills the viewport under the site header), so the helm cannot be swiped
  // away; the page starts at the top so the whole cockpit is in view.
  useEffect(() => {
    const release = claimRaceScrollLock();
    window.scrollTo(0, 0);
    return release;
  }, []);
  const mapping = helmMappingFor(prefs, "boat");
  const player = p.frame?.boats.find(boat => boat.isPlayer);
  const heading = player?.heading ?? 0;
  const course = p.course ?? heading;
  const ranks = raceRanks(p.frame?.boats ?? [], MULTIPLAYER_COURSE);
  const fleet = [...(p.frame?.boats ?? [])].sort((a, b) => (ranks.get(a.id) ?? 99) - (ranks.get(b.id) ?? 99));
  const online = tl({ ru: "Онлайн", en: "Online", pl: "Online", es: "En línea", fr: "En ligne", de: "Online", it: "Online" });
  const auto = tl({ ru: "Паруса в сетевой гонке настраиваются автоматически. Ты управляешь рулем.", en: "Sails trim automatically in online races. You control the helm.", pl: "W wyścigu online żagle trymują się automatycznie. Ty sterujesz.", es: "En las regatas en línea, las velas se ajustan solas. Tú gobiernas.", fr: "En ligne, les voiles se règlent seules. Tu contrôles la barre.", de: "Online trimmen sich die Segel automatisch. Du bedienst das Steuer.", it: "Nelle regate online le vele si regolano da sole. Tu governi il timone." });
  const reconnect = tl({ ru: "Переподключаемся", en: "Reconnecting", pl: "Łączenie ponowne", es: "Reconectando", fr: "Reconnexion", de: "Verbindung wird wiederhergestellt", it: "Riconnessione" });
  const waiting = tl({ ru: "Ждем данные о лодках", en: "Waiting for boat positions", pl: "Czekamy na pozycje łodzi", es: "Esperando las posiciones de los barcos", fr: "En attente des positions des bateaux", de: "Warten auf Bootspositionen", it: "In attesa delle posizioni delle barche" });
  const helm = { mapping, value: mapping === "rudder" ? `${Math.round(p.rudder * 35)}°` : `${Math.round(course)}°`,
    unit: mapping === "rudder" ? labels.rudderShort : labels.heading,
    ariaNow: mapping === "rudder" ? p.rudder * 35 : course, ariaMin: mapping === "rudder" ? -35 : 0, ariaMax: mapping === "rudder" ? 35 : 360,
    rudder: p.rudder, setRudder: p.setRudder, onCourseDelta: p.courseDelta };
  const range = (label: string, value: number, min: number, max: number, onChange: (v: number) => void) => <label className={styles.range}><span>{label}<output>{Math.round(value)}°</output></span><input type="range" aria-label={label} min={min} max={max} step="1" value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
  const pinned = p.phase !== "finished" && tab === "helm";
  const minutes = Math.floor((p.frame?.time ?? 0) / 60);
  const seconds = Math.floor((p.frame?.time ?? 0) % 60).toString().padStart(2, "0");
  return <div className={styles.cockpit} data-testid="multiplayer-cockpit">
    <header className={styles.toolbar}>
      <button type="button" onClick={p.onLeave}>{c.menu}</button>
      <strong>REGATTA <span>{online}</span></strong>
      <span className={local.identity}>{p.code}</span>
    </header>
    <div className={styles.metrics}>
      <div><span>{c.speed}</span><strong>{player?.speed.toFixed(1) ?? "-"}<small>{c.knots}</small></strong></div>
      {[[c.time, `${minutes}:${seconds}`, ""], [c.position, `${player ? ranks.get(player.id) ?? "-" : "-"}/${fleet.length}`, ""]].map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>)}
    </div>
    <div className={styles.workspace}>
      <div className={styles.scene} data-testid="multiplayer-scene">{p.children}
        <RaceCornerInstruments navigation={p.navigation} wind={p.windReading} windDisplay={p.windDisplay}
          miniMap={p.miniMap} onOpenMap={() => setBigMap(true)} you={c.you} fleet={c.fleet} />
        {/* F3: the big map over the scene; the race keeps running and the dock stays usable. */}
        {bigMap && <RaceBigMap snapshot={p.navigation} track={p.track?.()} guidance={p.guidanceOn ? p.frame?.guidance ?? null : null}
          you={c.you} fleet={c.fleet} onClose={() => setBigMap(false)} note={tl(RACE_MAP_COPY.raceRunning)} />}
        {/* M3-3: class flag and P over the server countdown in RRS 26 order, down at the start. */}
        <RaceStartFlags flags={startFlags(p.phase === "countdown" && !p.reconnecting ? p.countdown : null, false, SERVER_COUNTDOWN_FROM)} />
      </div>
      <aside className={styles.dock} aria-label={labels.controlsTitle} data-testid="multiplayer-dock">
        <div className={styles.notice} role="status" aria-live="polite" tabIndex={0}>
          {p.reconnecting ? reconnect : p.phase === "countdown" ? <strong>{p.countdown}</strong> : !p.frame ? waiting : <>
            <span>{auto}</span>
            {p.guidanceOn && p.frame.guidance && <small className={styles.trimAdvice} data-testid="multiplayer-guidance">{c.actions[p.frame.guidance.action]} · {Math.round(p.frame.guidance.distance * METRES_PER_UNIT)} m</small>}
          </>}
        </div>
        {p.phase !== "finished" && <nav className={`${styles.tabs} ${local.tabs}`} aria-label={labels.controlsTitle}>
          {(["helm", "map", "settings"] as const).map(id => <button key={id} type="button" aria-pressed={tab === id} onClick={() => selectTab(id)}>{id === "settings" && <GearIcon size={22} />}<span>{id === "helm" ? labels.helm : id === "map" ? nav.map : c[id]}</span></button>)}
        </nav>}
        {/* F2: the Helm panel is pinned like the solo race (RaceCockpit.module.css .pinned). */}
        <div key={tab} ref={panelRef} className={`${styles.panel}${pinned ? ` ${styles.pinned}` : ""}`} data-pinned={pinned || undefined} data-testid="multiplayer-dock-panel">
          {p.phase === "finished" ? <div className={local.results}>{p.results}</div> : tab === "helm" ? <div className={local.controls} inert={p.phase !== "racing" || p.reconnecting || !p.frame}>
            {prefs.mode === "wheels" ? <div className={styles.wheels}><WheelDeck hideHint layout="bottom" helm={helm} prefs={prefs} labels={labels} /></div>
              : <div className={styles.sliders}>{mapping === "course" ? range(labels.course, course, 0, 360, p.setCourse) : range(labels.rudder, p.rudder * 35, -35, 35, v => p.setRudder(v / 35))}</div>}
          </div> : tab === "map" ? <div className={styles.mapPanel}>
            <RaceOverviewMap snapshot={p.navigation} labels={{ ...nav, title: nav.map, you: c.you, fleet: c.fleet }} />
            <RaceWindInstrument reading={p.windReading} display={p.windDisplay} />
            <h2>{c.fleet}</h2>
            <ol className={styles.fleet}>{fleet.map((boat, i) => <li key={boat.id}><b>{i + 1}</b><span style={{ color: boat.color }}>{boat.isPlayer ? c.you : boat.name}</span>{boat.isPlayer && <strong>●</strong>}</li>)}</ol>
          </div>
          : <div className={styles.options}>
            <span className={local.settingsLabel}>{labels.mode}</span>
            <div className={styles.segmented} role="radiogroup" aria-label={labels.mode}>{(["wheels", "sliders"] as const).map(mode => <button key={mode} type="button" role="radio" aria-checked={prefs.mode === mode} onClick={() => update({ mode })}>{labels[mode]}</button>)}</div>
            <span className={local.settingsLabel}>{labels.helmSets}</span>
            <div className={styles.segmented} role="radiogroup" aria-label={labels.helmSets}>{(["rudder", "course"] as const).map(value => <button key={value} type="button" role="radio" aria-checked={mapping === value} onClick={() => { p.setRudder(0); update({ helmMapping: { ...prefs.helmMapping, boat: value } }); }}>{labels[value]}</button>)}</div>
            <label className={styles.toggle}><span>{labels.returnCenter}</span><input type="checkbox" role="switch" checked={prefs.helmReturnToCenter} onChange={e => update({ helmReturnToCenter: e.target.checked })} /></label>
            <div className={styles.segmented} role="radiogroup" aria-label={labels.sensitivity}>{([0.5, 1, 2] as const).map((s, i) => <button key={s} type="button" role="radio" aria-checked={prefs.sensitivity === s} onClick={() => update({ sensitivity: s })}>{[labels.fine, labels.normal, labels.fast][i]}</button>)}</div>
            <span className={local.settingsLabel}>{c.view}</span>
            <div className={styles.segmented} role="radiogroup" aria-label={c.view}>{(["orbit", "stern", "high"] as const).map(view => <button key={view} type="button" role="radio" aria-checked={p.camera === view} onClick={() => p.setCamera(view)}>{c[view]}</button>)}</div>
            <button type="button" className="min-h-11" onClick={p.onResetCamera}>{c.resetCamera}</button>
            <p>{c.cameraGesture}</p>
            <RaceWindSettings display={p.windDisplay} onChange={p.setWindDisplay} />
            <label className={styles.toggle}><span>{nav.miniMapSetting}</span><input type="checkbox" role="switch" checked={p.miniMap} onChange={e => p.setMiniMap(e.target.checked)} /></label>
            <label className={styles.toggle}><span>{c.guidance}</span><input type="checkbox" role="switch" checked={p.guidanceOn} onChange={e => p.setGuidanceOn(e.target.checked)} /></label>
            {p.setSoftLight && <>
              <label className={styles.toggle}><span>{tl(RACE_HINT_SETTINGS_COPY.softLight)}</span><input type="checkbox" role="switch" checked={p.softLight === true} onChange={e => p.setSoftLight?.(e.target.checked)} data-testid="race-soft-light-switch" /></label>
              <p>{tl(RACE_HINT_SETTINGS_COPY.softLightNote)}</p>
            </>}
            <label className={styles.toggle}><span>{labels.sound}</span><input type="checkbox" role="switch" checked={prefs.sound} onChange={e => update({ sound: e.target.checked })} /></label>
            {/* Same switch row as the settings around it; the change is the gesture that may unlock audio. */}
            <label className={styles.toggle}><span>{raceSound.label}</span><input type="checkbox" role="switch" checked={raceSoundOn} onChange={e => writeRaceSound(e.target.checked, "multiplayer")} data-testid="race-sound-switch" /></label>
            {raceHaptics.available && <label className={styles.toggle}><span>{hapticsCopy.label}</span><input type="checkbox" role="switch" checked={raceHaptics.on} onChange={e => raceHaptics.setOn(e.target.checked)} data-testid="race-haptics-switch" /></label>}
            <p>{auto}</p>
          </div>}
        </div>
      </aside>
    </div>
  </div>;
}
