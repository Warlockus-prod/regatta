'use client';

import type { ReactNode } from "react";
import styles from "./TrainerControls.module.css";

// Phone and tablet layout shared by the trainers: the boat is pinned and
// never scrolls away. Portrait: scene on top (it takes all spare height,
// never less than 40%), the readouts, then the control dock; only the dock
// panel scrolls. Landscape phone: scene left, dock as a right column.
// Desktop layouts stay with each surface.

export function TrainerWorkspace(props: {
  embed: boolean;
  scene: ReactNode;
  /** Readouts under the scene (speed, coach line). */
  readouts?: ReactNode;
  dock: ReactNode;
  className?: string;
}) {
  const { embed, scene, readouts, dock, className } = props;
  return (
    <div className={`${styles.workspace} ${embed ? styles.workspaceEmbed : ""} ${className ?? ""}`} data-testid="trainer-workspace">
      <div className={styles.sceneColumn}>
        <div className={styles.scene}>{scene}</div>
        {readouts && <div className={styles.readouts}>{readouts}</div>}
      </div>
      {dock}
    </div>
  );
}

/** Root class for a trainer screen on phones: fixed height under the site navigation, 100dvh in the app. */
export function trainerScreenClass(embed: boolean) {
  return `${styles.screen} ${embed ? styles.screenEmbed : ""}`;
}
