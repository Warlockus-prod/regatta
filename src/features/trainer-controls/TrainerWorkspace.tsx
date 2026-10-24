'use client';

import { useCallback, useMemo, useState, type ReactNode } from "react";
import styles from "./TrainerControls.module.css";
import { ReservedPanelContext } from "./ReservedPanel";

// Phone and tablet layout shared by the trainers: the boat is pinned and
// never scrolls away, and nothing is drawn over it. Portrait: the scene bar
// (status, view and help buttons), the scene (all spare height), the
// readouts, then the control dock; only the dock panel scrolls. Landscape phone: the bar and the scene fill the left column, the
// readouts and the dock stack in the right one. Desktop layouts stay with
// each surface.

export function TrainerWorkspace(props: {
  embed: boolean;
  /** Strip above the scene (SceneBar). */
  sceneBar?: ReactNode;
  scene: ReactNode;
  /** Readouts under the scene (speed, coach line). */
  readouts?: ReactNode;
  dock: ReactNode;
  className?: string;
}) {
  const { embed, sceneBar, scene, readouts, dock, className } = props;
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [panels, setPanels] = useState<string[]>([]);
  const reserve = useCallback((id: string) => {
    setPanels(current => current.includes(id) ? current : [...current, id]);
    return () => setPanels(current => current.filter(value => value !== id));
  }, []);
  const reservation = useMemo(() => ({ host, reserve }), [host, reserve]);
  return (
    <ReservedPanelContext.Provider value={reservation}>
    <div className={`${styles.workspace} ${embed ? styles.workspaceEmbed : ""} ${className ?? ""}`} data-panel-open={panels.length > 0} data-testid="trainer-workspace">
      <div className={styles.sceneColumn}>
        {sceneBar}
        <div className={styles.scene}>{scene}</div>
      </div>
      <div className={styles.sideColumn}>
        {readouts && <div className={styles.readouts} data-testid="trainer-readouts">{readouts}</div>}
        <div className={styles.controlArea} data-panel-open={panels.length > 0}>
          {dock}
          <div ref={setHost} className={styles.reservedPanelHost} hidden={panels.length === 0} data-testid="trainer-panel-host" />
        </div>
      </div>
    </div>
    </ReservedPanelContext.Provider>
  );
}

/** Root class for a trainer screen on phones: fixed height under the site navigation, 100dvh in the app. */
export function trainerScreenClass(embed: boolean) {
  return `${styles.screen} ${embed ? styles.screenEmbed : ""}`;
}
