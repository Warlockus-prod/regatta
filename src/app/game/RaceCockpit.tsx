'use client';

import { useState, type ReactNode } from "react";
import { WheelDeck } from "@/features/trainer-controls/WheelDeck";
import { useControlLabels } from "@/features/trainer-controls/labels";
import { helmMappingFor, useControlPrefs } from "@/features/trainer-controls/prefs";
import type { Controls } from "@/lib/sailing-physics/types";
import type { StandingRow } from "@/features/race-hud/RaceHud";
import type { RaceGuidance } from "@/lib/race-guidance";
import { useRaceCopy } from "./race-copy";
import type { RacePrefs } from "./race-prefs";
import styles from "./RaceCockpit.module.css";

export function RaceModePicker({ prefs, update }: { prefs: RacePrefs; update: (p: Partial<RacePrefs>) => void }) {
  const c = useRaceCopy();
  return <div className={styles.modePicker}>
    <div role="radiogroup" aria-label={c.settings} className={styles.segmented}>
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
  rudder: number; setRudder: (v: number) => void; courseDelta: (v: number) => void;
  trim: Controls; setTrim: (patch: Partial<Controls>) => void;
  heading: number; speed: number; twa: number; time: string; rank: number;
  rows: StandingRow[]; guidance: RaceGuidance | null; message?: string;
  camera: "high" | "stern"; setCamera: (v: "high" | "stern") => void;
  paused: boolean; onPause: () => void; onExit: () => void;
  autopilot: boolean; onAutopilot: () => void;
  muted: boolean; onSound: () => void; penalty: number; countdown?: number;
}) {
  const c = useRaceCopy();
  const labels = useControlLabels();
  const { prefs: controls, update } = useControlPrefs();
  const [tab, setTab] = useState<"helm" | "sails" | "fleet" | "settings">("helm");
  const mapping = helmMappingFor(controls, "boat");
  const pro = p.prefs.mode === "pro";
  const helm = { mapping, value: mapping === "rudder" ? `${Math.round(p.rudder * 35)}°` : `${Math.round(p.heading)}°`, unit: mapping === "rudder" ? labels.rudderShort : labels.heading,
    ariaNow: mapping === "rudder" ? p.rudder * 35 : p.heading, ariaMin: mapping === "rudder" ? -35 : 0, ariaMax: mapping === "rudder" ? 35 : 360,
    rudder: p.rudder, setRudder: p.setRudder, onCourseDelta: p.courseDelta };
  const range = (label: string, value: number, change: (v: number) => void, min = 0, max = 1) => <label className={styles.range}><span>{label}<output>{Math.round(value * (max === 1 ? 100 : 1))}{max === 1 ? "%" : "°"}</output></span><input type="range" min={min} max={max} step={max === 1 ? .01 : 1} value={value} onChange={e => change(Number(e.target.value))} /></label>;
  return <div className={styles.cockpit} data-testid="race-cockpit">
    <header className={styles.toolbar}>
      <button type="button" onClick={p.onExit}>{c.menu}</button>
      <strong>REGATTA <span>{pro ? "PRO" : "3D"}</span></strong>
      <button type="button" onClick={p.onPause} aria-pressed={p.paused}>{p.paused ? c.resume : c.pause}</button>
    </header>
    <div className={styles.metrics}>
      {[[c.speed, `${p.speed.toFixed(1)}`, c.knots], [c.wind, `${Math.round(Math.abs(p.twa))}°`, "TWA"], [c.time, p.time, p.penalty ? `+${p.penalty} s` : ""], [c.position, `${p.rank || "-"}/${p.rows.length}`, ""]].map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>)}
    </div>
    <div className={styles.workspace}>
      <div className={styles.scene} data-testid="race-3d">{p.children}</div>
      <aside className={styles.dock} aria-label={labels.controlsTitle}>
        <div className={styles.notice} role="status" aria-live="polite">
          {p.countdown !== undefined ? <strong>{p.countdown || "START"}</strong> : p.paused ? c.pause : p.message || (p.prefs.guidance && p.guidance ? `${c.actions[p.guidance.action]} · ${Math.round(p.guidance.distance * .6)} m` : pro ? c.proNote : c.simpleNote)}
        </div>
        <nav className={styles.tabs} aria-label={labels.controlsTitle}>
          {(["helm", "sails", "fleet", "settings"] as const).map(t => <button type="button" key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t === "helm" ? labels.helm : c[t]}</button>)}
        </nav>
        <div className={styles.panel}>
          {tab === "helm" && <>
            <div className={styles.controlHeading}><span>{pro ? c.pro : c.simple}</span><button type="button" aria-pressed={p.autopilot} onClick={p.onAutopilot}>{c.auto}</button></div>
            {controls.mode === "wheels" ? <div className={styles.wheels}><WheelDeck hideHint layout="bottom" helm={helm} prefs={controls} labels={labels}
              main={pro ? { ease: 1 - p.trim.mainSheet, setEase: v => p.setTrim({ mainSheet: 1 - v }) } : null}
              jib={pro ? { ease: 1 - p.trim.jibSheet, setEase: v => p.setTrim({ jibSheet: 1 - v }) } : null}
              note={pro ? labels.wheelHint : c.simpleNote} /></div> : <div className={styles.sliders}>
                {range(labels.rudder, p.rudder * 35, v => p.setRudder(v / 35), -35, 35)}
                {pro && range(labels.mainsheet, 1 - p.trim.mainSheet, v => p.setTrim({ mainSheet: 1 - v }))}
                {pro && range(labels.jibsheet, 1 - p.trim.jibSheet, v => p.setTrim({ jibSheet: 1 - v }))}
              </div>}
          </>}
          {tab === "sails" && <div className={styles.options}>
            <Toggle label={c.main} checked={p.trim.mainHoisted !== false} onChange={mainHoisted => p.setTrim({ mainHoisted })} />
            <Toggle label={c.jib} checked={p.trim.jibFurl < .5} onChange={on => p.setTrim({ jibFurl: on ? 0 : 1 })} />
            {range(c.reef, p.trim.reef, reef => p.setTrim({ reef }))}
            <p>{pro ? c.trimHint : c.simpleNote}</p>
          </div>}
          {tab === "fleet" && <ol className={styles.fleet}>{p.rows.map((r, i) => <li key={r.id}><b>{i + 1}</b><span style={{ color: r.color }}>{r.name}</span>{r.isPlayer && <strong>●</strong>}</li>)}</ol>}
          {tab === "settings" && <div className={styles.options}>
            <RaceModePicker prefs={p.prefs} update={p.updatePrefs} />
            <div className={styles.segmented} role="radiogroup" aria-label={labels.controlsTitle}>{(["wheels", "sliders"] as const).map(mode => <button key={mode} type="button" role="radio" aria-checked={controls.mode === mode} onClick={() => update({ mode })}>{labels[mode]}</button>)}</div>
            <div className={styles.segmented} role="radiogroup" aria-label={labels.helmSets}>{(["rudder", "course"] as const).map(m => <button key={m} type="button" role="radio" aria-checked={mapping === m} onClick={() => update({ helmMapping: { ...controls.helmMapping, boat: m } })}>{labels[m]}</button>)}</div>
            <Toggle label={labels.returnCenter} checked={controls.helmReturnToCenter} onChange={helmReturnToCenter => update({ helmReturnToCenter })} />
            <Toggle label={labels.jibRight} checked={controls.jibSheetSide === "right"} onChange={on => update({ jibSheetSide: on ? "right" : "left" })} />
            <div className={styles.segmented} role="radiogroup" aria-label={labels.sensitivity}>{([.5, 1, 2] as const).map((s, i) => <button key={s} type="button" role="radio" aria-checked={controls.sensitivity === s} onClick={() => update({ sensitivity: s })}>{[labels.fine, labels.normal, labels.fast][i]}</button>)}</div>
            <div className={styles.segmented} role="radiogroup" aria-label={c.view}>{(["high", "stern"] as const).map(v => <button key={v} type="button" role="radio" aria-checked={p.camera === v} onClick={() => p.setCamera(v)}>{c[v]}</button>)}</div>
            <Toggle label={c.guidance} checked={p.prefs.guidance} onChange={guidance => p.updatePrefs({ guidance })} />
            <Toggle label={c.rules} checked={p.prefs.rules} onChange={rules => p.updatePrefs({ rules })} />
            <Toggle label={c.penalties} checked={p.prefs.penalties} onChange={penalties => p.updatePrefs({ penalties })} />
            <Toggle label={c.sound} checked={!p.muted} onChange={() => { p.onSound(); update({ sound: p.muted }); }} />
            <p>{c.rulesNote}</p>
          </div>}
        </div>
      </aside>
    </div>
  </div>;
}
