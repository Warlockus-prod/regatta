'use client';

import { useEffect, useRef } from "react";
import styles from "./TrainerControls.module.css";
import type { ControlLabels } from "./labels";
import { helmMappingFor, type ControlPrefs, type Surface } from "./prefs";
import type { Sensitivity } from "./mapping";

export interface FavoriteOption { id: string; title: string; }

function Segmented<T extends string | number>(props: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={props.label}>
      {props.options.map(([v, text]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={props.value === v} onClick={() => props.onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

function Toggle(props: { id: string; label: string; note?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.toggleRow}>
      <label htmlFor={props.id}>{props.label}{props.note && <small>{props.note}</small>}</label>
      <input id={props.id} type="checkbox" role="switch" className={styles.switch} checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
    </div>
  );
}

export function ControlSettingsSheet(props: {
  surface: Surface;
  prefs: ControlPrefs;
  update: (patch: Partial<ControlPrefs> | ((p: ControlPrefs) => ControlPrefs)) => void;
  labels: ControlLabels;
  hasSheets: boolean;
  /** Surfaces that can steer with the rudder (Trainer as an option, 3D boat by default). */
  rudderAvailable: boolean;
  favorites: FavoriteOption[];
  defaultFavorites: string[];
  onClose: () => void;
}) {
  const { surface, prefs, update, labels, hasSheets, rudderAvailable, favorites, defaultFavorites, onClose } = props;
  const dialogRef = useRef<HTMLDivElement>(null);
  const mapping = helmMappingFor(prefs, surface);
  const chosen = prefs.dock[surface]?.favorites ?? defaultFavorites;
  const order = [...chosen.filter((id) => favorites.some((f) => f.id === id)), ...favorites.map((f) => f.id).filter((id) => !chosen.includes(id))];

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);

  const setFavorites = (ids: string[]) => update((p) => ({ ...p, dock: { ...p.dock, [surface]: { favorites: ids } } }));
  const move = (id: string, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setFavorites(next.filter((x) => chosen.includes(x)));
  };

  return (
    <div className={styles.sheetBackdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tc-settings-title" data-testid="control-settings">
        <h2 id="tc-settings-title">{labels.settings}</h2>

        <section className={styles.sheetGroup}>
          <span className={styles.groupLabel}>{labels.mode}</span>
          <Segmented label={labels.mode} value={prefs.mode} options={[["sliders", labels.sliders], ["wheels", labels.wheels]]} onChange={(mode) => update({ mode })} />
          <p className={styles.note}>{labels.modeNote}</p>
        </section>

        {rudderAvailable && (
          <section className={styles.sheetGroup}>
            <span className={styles.groupLabel}>{labels.helmSets}</span>
            <Segmented label={labels.helmSets} value={mapping} options={[["course", labels.course], ["rudder", labels.rudder]]}
              onChange={(m) => update((p) => ({ ...p, helmMapping: { ...p.helmMapping, [surface]: m } }))} />
            {mapping === "rudder" && (
              <Toggle id="tc-return" label={labels.returnCenter} note={labels.returnCenterNote} checked={prefs.helmReturnToCenter} onChange={(v) => update({ helmReturnToCenter: v })} />
            )}
          </section>
        )}

        <section className={styles.sheetGroup}>
          <span className={styles.groupLabel}>{labels.sensitivity}</span>
          <Segmented<Sensitivity> label={labels.sensitivity} value={prefs.sensitivity} options={[[0.5, labels.fine], [1, labels.normal], [2, labels.fast]]} onChange={(sensitivity) => update({ sensitivity })} />
        </section>

        <section className={styles.sheetGroup}>
          {hasSheets && <Toggle id="tc-jib-right" label={labels.jibRight} checked={prefs.jibSheetSide === "right"} onChange={(v) => update({ jibSheetSide: v ? "right" : "left" })} />}
          <Toggle id="tc-sound" label={labels.sound} note={labels.soundNote} checked={prefs.sound} onChange={(v) => update({ sound: v })} />
        </section>

        {favorites.length > 0 && (
          <section className={styles.sheetGroup}>
            <span className={styles.groupLabel}>{labels.favoritesEdit}</span>
            <ul className={styles.favList}>
              {order.map((id, i) => {
                const f = favorites.find((x) => x.id === id)!;
                const on = chosen.includes(id);
                return (
                  <li key={id}>
                    <input id={`tc-fav-${id}`} type="checkbox" checked={on}
                      onChange={(e) => setFavorites(e.target.checked ? order.filter((x) => x === id || chosen.includes(x)) : chosen.filter((x) => x !== id))} />
                    <label htmlFor={`tc-fav-${id}`}>{f.title}</label>
                    <button type="button" aria-label={`${f.title}: ${labels.moveUp}`} disabled={i === 0} onClick={() => move(id, -1)}>↑</button>
                    <button type="button" aria-label={`${f.title}: ${labels.moveDown}`} disabled={i === order.length - 1} onClick={() => move(id, 1)}>↓</button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className={styles.linkButton} onClick={() => setFavorites(defaultFavorites)}>{labels.resetOrder}</button>
          </section>
        )}

        <button type="button" className={styles.primary} onClick={onClose}>{labels.done}</button>
      </div>
    </div>
  );
}
