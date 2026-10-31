'use client';

// M1-2 pause sheet of the solo race: a sheet over the dimmed scene with
// Continue, Restart, Settings and Exit. Exit asks first (the race in progress
// is not counted); during the finish hold the race is already over, so Exit
// leaves at once. The dock beside or below the scene stays usable, so
// "Race settings" opens its settings tab while the race stays paused.
// No animation: the sheet appears and disappears at once.

import { useState, type ReactNode } from "react";
import type { RaceCopy } from "./race-copy";
import type { RacePauseCopy } from "./race-pause-copy";
import styles from "./RaceCockpit.module.css";

export interface RacePauseSheetProps {
  copy: Pick<RaceCopy, "pause" | "resume">;
  pauseCopy: RacePauseCopy;
  onContinue: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onExit: () => void;
  /** False during the finish hold: nothing is lost by leaving. */
  confirmExit: boolean;
  /** Desktop keyboard hint (Esc or P). */
  showKeys: boolean;
  /** Full-screen entry on a desktop browser, null elsewhere. */
  onFullscreen: (() => void) | null;
  /** Race sound switch from the sound lane (M1-5), if it is wired. */
  sound?: ReactNode;
  /** "Back to lesson" when the race was opened from a lesson. */
  lessonReturn?: ReactNode;
}

export function RacePauseSheet(p: RacePauseSheetProps) {
  const [confirming, setConfirming] = useState(false);
  const exit = () => { if (p.confirmExit) setConfirming(true); else p.onExit(); };
  return <div className={styles.pauseLayer} data-testid="race-pause">
    <div className={styles.pauseSheet} role="dialog" aria-modal="false" aria-labelledby="race-pause-title">
      {confirming ? <>
        <h2 id="race-pause-title">{p.pauseCopy.exitQuestion}</h2>
        <p>{p.pauseCopy.exitNote}</p>
        <div className={styles.pauseActions}>
          <button type="button" autoFocus className={styles.pausePrimary} onClick={() => setConfirming(false)}>{p.pauseCopy.stay}</button>
          <button type="button" onClick={p.onExit} data-testid="race-exit-confirm">{p.pauseCopy.exit}</button>
        </div>
      </> : <>
        <h2 id="race-pause-title">{p.copy.pause}</h2>
        <div className={styles.pauseActions}>
          <button type="button" autoFocus className={styles.pausePrimary} onClick={p.onContinue}>{p.copy.resume}</button>
          <button type="button" onClick={p.onRestart}>{p.pauseCopy.restart}</button>
          <button type="button" onClick={p.onSettings}>{p.pauseCopy.raceSettings}</button>
          {p.onFullscreen && <button type="button" onClick={p.onFullscreen}>{p.pauseCopy.fullscreen}</button>}
          <button type="button" onClick={exit}>{p.pauseCopy.exit}</button>
        </div>
        {(p.sound || p.lessonReturn) && <div className={styles.pauseExtras}>{p.sound}{p.lessonReturn}</div>}
        {p.showKeys && <p className={styles.pauseKeys}>{p.pauseCopy.keys}</p>}
      </>}
    </div>
  </div>;
}
