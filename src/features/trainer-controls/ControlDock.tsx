'use client';

import DiagnosticAccess from "@/components/diagnostics/DiagnosticAccess";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./TrainerControls.module.css";
import { GearIcon } from "./GearIcon";
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
  const wheels = prefs.mode === "wheels" && Boolean(wheelDeck);
  const controlsId = wheels ? "wheels" : "favorites";
  const firstId = leadTab?.id ?? controlsId;
  const [active, setActive] = useState<string>(firstId);
  // Package 32, game screen: over a full-screen scene the wheels stand alone and the tab strip
  // hides behind one menu button (the styles act on data-menu only inside a staged workspace).
  // Picking the wheels again, or touching the scene, puts the strip away.
  const [menu, setMenu] = useState(false);
  // Owner, TestFlight 84 ("the controls do not fold back for a full screen"): the slider panel
  // folds down to its tab strip and the scene takes the space; any tab opens it again.
  const [collapsed, setCollapsed] = useState(false);
  const choose = (id: string) => { setActive(id); setCollapsed(false); if (id === "wheels") setMenu(false); };
  const dockRef = useRef<HTMLDivElement>(null);

  const allCards = useMemo(() => tabs.flatMap((t) => t.cards), [tabs]);
  const favoriteIds = prefs.dock[surface]?.favorites ?? defaultFavorites;
  const favoriteCards = favoriteIds.map((id) => allCards.find((c) => c.id === id)).filter((c): c is DockCard => Boolean(c));

  const tabList: { id: string; label: string }[] = [
    ...(leadTab ? [{ id: leadTab.id, label: leadTab.label }] : []),
    { id: controlsId, label: wheels ? labels.tabs.wheels : labels.tabs.favorites },
    ...tabs.map((t) => ({ id: t.id, label: t.label })),
  ];
  const current = tabList.some((t) => t.id === active) ? active : firstId;
  const foldable = layout === "bottom" && current !== "wheels";
  const folded = foldable && collapsed;

  // The menu over the wheels is dismissed like any sheet: by a touch outside it.
  const dismissable = menu && current === "wheels";
  useEffect(() => {
    if (!dismissable) return;
    const outside = (event: PointerEvent) => { if (!dockRef.current?.contains(event.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [dismissable]);

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
    <div ref={dockRef} className={`${styles.dock} ${className ?? ""}`} data-layout={layout} data-mode={current === "wheels" ? "wheels" : "sliders"} data-menu={menu ? "open" : "closed"} data-collapsed={folded || undefined} data-testid="control-dock">
      {wheels && <button type="button" className={styles.menuButton} aria-label={labels.controlsTitle} title={labels.controlsTitle} aria-expanded={menu}
        aria-controls={`tc-head-${surface}`} onClick={() => setMenu(true)} data-testid="control-menu-open">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>}
      <div className={styles.dockHead} id={`tc-head-${surface}`}>
        <div className={styles.tabs} role="tablist" aria-label={labels.controlsTitle}>
          {tabList.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tc-tab-${surface}-${t.id}`} aria-selected={current === t.id}
              aria-controls={`tc-panel-${surface}`} onClick={() => choose(t.id)}>{t.label}</button>
          ))}
        </div>
        {foldable && <button type="button" className={styles.gear} aria-label={folded ? labels.expand : labels.collapse} title={folded ? labels.expand : labels.collapse}
          aria-expanded={!folded} aria-controls={`tc-panel-${surface}`} onClick={() => setCollapsed((v) => !v)} data-testid="control-dock-fold">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={folded ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>}
        <button type="button" className={styles.gear} aria-label={labels.openSettings} onClick={() => setSettingsOpen(true)} data-testid="control-settings-open">
          <GearIcon />
        </button>
      </div>
      <div className={`${styles.panel} ${current === "wheels" ? styles.panelWheels : ""}`} role="tabpanel" id={`tc-panel-${surface}`} aria-labelledby={`tc-tab-${surface}-${current}`} hidden={folded}>
        {panel}
        <DiagnosticAccess />
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
