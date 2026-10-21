'use client';

import { useMemo, useState, type ReactNode } from "react";
import styles from "./TrainerControls.module.css";
import { ControlSettingsSheet } from "./ControlSettingsSheet";
import { useControlLabels } from "./labels";
import type { ControlPrefs, Surface } from "./prefs";

// The control dock under the boat (owner decision 5): tabs instead of a
// carousel, so a horizontal drag always belongs to the slider under the
// finger. The first tab is the user's Favorites (sliders mode), the wheels
// (wheels mode) or, when the learner came from a lesson, its task; the other
// tabs group every card by topic.

export interface DockCard { id: string; title: string; node: ReactNode; }
export interface DockTab { id: string; label: string; cards: DockCard[]; }

const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" />
  </svg>
);

/** The gear that opens the control settings, for surfaces that place it themselves (desktop panels). */
export function GearButton(props: { label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={`${styles.gear} ${props.className ?? ""}`} aria-label={props.label} title={props.label} onClick={props.onClick}>
      <GearIcon />
    </button>
  );
}

export function ControlDock(props: {
  surface: Surface;
  tabs: DockTab[];
  defaultFavorites: string[];
  prefs: ControlPrefs;
  update: (patch: Partial<ControlPrefs> | ((p: ControlPrefs) => ControlPrefs)) => void;
  /** Rendered as the first tab in wheels mode. */
  wheelDeck?: ReactNode;
  /** A task the learner came for (a lesson exercise): takes the first tab's place and opens first. */
  leadTab?: DockTab;
  hasSheets: boolean;
  rudderAvailable: boolean;
  layout: "bottom" | "column";
  className?: string;
}) {
  const { surface, tabs, defaultFavorites, prefs, update, wheelDeck, leadTab, hasSheets, rudderAvailable, layout, className } = props;
  const labels = useControlLabels();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const wheels = !leadTab && prefs.mode === "wheels" && Boolean(wheelDeck);
  const firstId = leadTab ? leadTab.id : wheels ? "wheels" : "favorites";
  const [active, setActive] = useState<string>(firstId);
  const choose = (id: string) => setActive(id);

  const allCards = useMemo(() => tabs.flatMap((t) => t.cards), [tabs]);
  const favoriteIds = prefs.dock[surface]?.favorites ?? defaultFavorites;
  const favoriteCards = favoriteIds.map((id) => allCards.find((c) => c.id === id)).filter((c): c is DockCard => Boolean(c));

  const tabList: { id: string; label: string }[] = [
    { id: firstId, label: leadTab ? leadTab.label : wheels ? labels.tabs.wheels : labels.tabs.favorites },
    ...tabs.map((t) => ({ id: t.id, label: t.label })),
  ];
  const current = tabList.some((t) => t.id === active) ? active : firstId;

  let panel: ReactNode;
  if (leadTab && current === leadTab.id) panel = leadTab.cards.map((c) => <div key={c.id} className={styles.card}>{c.node}</div>);
  else if (current === "wheels") panel = wheelDeck;
  else if (current === "favorites") {
    panel = (
      <>
        {favoriteCards.map((c) => <div key={c.id} className={styles.card}>{c.node}</div>)}
        <button type="button" className={styles.linkButton} onClick={() => setSettingsOpen(true)}>{labels.edit}</button>
      </>
    );
  } else {
    panel = tabs.find((t) => t.id === current)?.cards.map((c) => <div key={c.id} className={styles.card}>{c.node}</div>);
  }

  return (
    <div className={`${styles.dock} ${className ?? ""}`} data-layout={layout} data-mode={current === "wheels" ? "wheels" : "sliders"} data-testid="control-dock">
      <div className={styles.dockHead}>
        <div className={styles.tabs} role="tablist" aria-label={labels.controlsTitle}>
          {tabList.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tc-tab-${surface}-${t.id}`} aria-selected={current === t.id}
              aria-controls={`tc-panel-${surface}`} onClick={() => choose(t.id)}>{t.label}</button>
          ))}
        </div>
        <button type="button" className={styles.gear} aria-label={labels.openSettings} onClick={() => setSettingsOpen(true)} data-testid="control-settings-open">
          <GearIcon />
        </button>
      </div>
      <div className={`${styles.panel} ${current === "wheels" ? styles.panelWheels : ""}`} role="tabpanel" id={`tc-panel-${surface}`} aria-labelledby={`tc-tab-${surface}-${current}`}>
        {panel}
      </div>
      {settingsOpen && (
        <ControlSettingsSheet
          surface={surface}
          prefs={prefs}
          update={update}
          labels={labels}
          hasSheets={hasSheets}
          rudderAvailable={rudderAvailable}
          favorites={allCards.map((c) => ({ id: c.id, title: c.title }))}
          defaultFavorites={defaultFavorites}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
