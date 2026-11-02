'use client';

import { useI18n } from "@/lib/i18n";
import { useControlLabels } from "@/features/trainer-controls/labels";
import { helmMappingFor, useControlPrefs } from "@/features/trainer-controls/prefs";
import { RACE_HINT_SETTINGS_COPY } from "@/data/race-hint-log-copy";
import { RACE_SAIL_FLOW_COPY } from "@/data/race-sail-flow-copy";
import { useRaceCopy } from "./race-copy";
import type { RacePrefs } from "./race-prefs";
import { useRaceHelmControl } from "./race-helm-prefs";
import { HELM_ASSIST_COPY, HELM_CONTROL_TERMS } from "@/data/helm-assist-copy";
import { RACE_HELM_CONTROLS } from "@/lib/race-helm";
import styles from "./RaceCockpit.module.css";

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return <label className={styles.toggle}><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} /></label>;
}

/**
 * Package 11 (audit B9): the race settings that are chosen before the start,
 * outside the race: steering controls, graphics and the learning rules. The race lobby shows them under "Race
 * settings"; the race's own Settings tab keeps only camera, sound and hints.
 */
export function RaceSetupSettings({ prefs, updatePrefs }: { prefs: RacePrefs; updatePrefs: (patch: Partial<RacePrefs>) => void }) {
  const c = useRaceCopy();
  const { tl } = useI18n();
  const labels = useControlLabels();
  const { prefs: controls, update } = useControlPrefs();
  const { helm, setHelm } = useRaceHelmControl();
  const mapping = helmMappingFor(controls, "boat");
  return <div className={styles.options} data-setup="" data-testid="race-setup-settings">
    <section className={styles.group}>
      {/* Package 13 (ADR-0022): the race's own helm control, arrows for a new install. */}
      <h3 className={styles.groupTitle}>{tl(HELM_ASSIST_COPY.settingsTitle)}</h3>
      <div className={styles.segmented} role="radiogroup" aria-label={tl(HELM_ASSIST_COPY.settingsTitle)} data-testid="race-helm-choice">{RACE_HELM_CONTROLS.map(mode => <button key={mode} type="button" role="radio" aria-checked={helm === mode} onClick={() => setHelm(mode)}>{tl(HELM_CONTROL_TERMS[mode])}</button>)}</div>
      <p>{tl(HELM_ASSIST_COPY.settingsNote)}</p>
      {/* The wheel and the slider keep the trainers' own settings. */}
      {helm !== "arrows" && <>
        <div className={styles.segmented} role="radiogroup" aria-label={labels.helmSets}>{(["rudder", "course"] as const).map(m => <button key={m} type="button" role="radio" aria-checked={mapping === m} onClick={() => update({ helmMapping: { ...controls.helmMapping, boat: m } })}>{labels[m]}</button>)}</div>
        <Toggle label={labels.returnCenter} checked={controls.helmReturnToCenter} onChange={helmReturnToCenter => update({ helmReturnToCenter })} />
        <Toggle label={labels.jibRight} checked={controls.jibSheetSide === "right"} onChange={on => update({ jibSheetSide: on ? "right" : "left" })} />
        <div className={styles.segmented} role="radiogroup" aria-label={labels.sensitivity}>{([.5, 1, 2] as const).map((s, i) => <button key={s} type="button" role="radio" aria-checked={controls.sensitivity === s} onClick={() => update({ sensitivity: s })}>{[labels.fine, labels.normal, labels.fast][i]}</button>)}</div>
      </>}
    </section>
    <section className={styles.group} data-testid="race-graphics-group">
      <h3 className={styles.groupTitle}>{tl(RACE_HINT_SETTINGS_COPY.graphicsGroup)}</h3>
      <Toggle label={tl(RACE_HINT_SETTINGS_COPY.softLight)} checked={prefs.softLight === true} onChange={softLight => updatePrefs({ softLight })} />
      <p>{tl(RACE_HINT_SETTINGS_COPY.softLightNote)}</p>
      {/* F6: apparent-wind ribbons along the player's sails in the 3D scene. */}
      <Toggle label={tl(RACE_SAIL_FLOW_COPY.label)} checked={prefs.sailFlow === true} onChange={sailFlow => updatePrefs({ sailFlow })} />
      <p>{tl(RACE_SAIL_FLOW_COPY.note)}</p>
    </section>
    <Toggle label={c.rules} checked={prefs.rules} onChange={rules => updatePrefs({ rules })} />
    <Toggle label={c.penalties} checked={prefs.penalties} onChange={penalties => updatePrefs({ penalties })} />
    <p>{c.rulesNote}</p>
  </div>;
}
