'use client';

// F4 race hint log (hint-log.ts): the list of what the coach and the judge
// said in this race, newest first, with the race time, at 16 px. Two hosts:
// the panel over the race scene (opened from the coach line or the race
// Settings; the race keeps running, the dock with the helm stays usable) and
// the pause sheet, which shows the same list in place of its buttons. The
// hook keeps the log of the race on the page and clears it for a new race.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { RACE_HINT_LOG_COPY } from "@/data/race-hint-log-copy";
import { createHintLog, hintLogTime, logHint, type HintLog, type HintLogEntry, type HintLogKind } from "./hint-log";
import type { FeedbackTone } from "./feedback";
import { CloseIcon } from "./RaceIcons";
import styles from "./RaceHintLog.module.css";

/** The log of the race on the page: add a line at a race time, clear for a new race. */
export function useRaceHintLog() {
  const [log, setLog] = useState<HintLog>(createHintLog);
  const add = useCallback((kind: HintLogKind, text: string, tone: FeedbackTone, at: number) => setLog(l => logHint(l, { kind, text, tone }, at)), []);
  const clear = useCallback(() => setLog(createHintLog()), []);
  return { entries: log.entries, add, clear };
}

/** The lines, newest first; an empty race says what will appear. */
export function RaceHintLogList({ entries }: { entries: readonly HintLogEntry[] }) {
  const { tl } = useI18n();
  if (!entries.length) return <p className={styles.empty}>{tl(RACE_HINT_LOG_COPY.empty)}</p>;
  return <ol className={styles.list} data-testid="race-hint-log-list">
    {entries.map(e => <li key={e.id} className={styles.entry} data-tone={e.tone} data-kind={e.kind}>
      <span className={styles.meta}><time><span className={styles.srOnly}>{tl(RACE_HINT_LOG_COPY.time)} </span>{hintLogTime(e.at)}</time> <span>{tl(RACE_HINT_LOG_COPY.kinds[e.kind])}</span></span>
      <span className={styles.text}>{e.text}</span>
    </li>)}
  </ol>;
}

/** The panel over the race scene. Esc or Close shut it (Esc before the race's
 * own Esc, which would pause or resume); focus goes to Close when it opens and
 * back to where it was when it closes, unless something else (the pause
 * sheet) has taken it meanwhile. `paused`: opened from the pause sheet,
 * so the note does not say the race keeps going. */
export function RaceHintLogPanel({ entries, onClose, className, paused = false }: { entries: readonly HintLogEntry[]; onClose: () => void; className?: string; paused?: boolean }) {
  const { tl } = useI18n();
  const titleId = `race-hint-log-${useId().replace(/:/g, "")}`;
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeHandler = useRef(onClose);
  useEffect(() => { closeHandler.current = onClose; }, [onClose]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault(); event.stopImmediatePropagation();
      closeHandler.current();
    };
    window.addEventListener("keydown", escape, true);
    // Focus goes back only when it was lost with the panel (it was inside it, now on the body):
    // a panel hidden by the pause sheet must not take focus from the sheet's Continue.
    return () => {
      window.removeEventListener("keydown", escape, true);
      const now = document.activeElement;
      if (opener?.isConnected && (!now || now === document.body)) opener.focus();
    };
  }, []);
  return <section className={`${styles.overlay}${className ? ` ${className}` : ""}`} role="dialog" aria-modal="false" aria-labelledby={titleId} data-testid="race-hint-log"
    onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
    <div className={styles.head}>
      <h2 id={titleId}>{tl(RACE_HINT_LOG_COPY.title)}</h2>
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={tl(RACE_HINT_LOG_COPY.close)} title={tl(RACE_HINT_LOG_COPY.close)}
        data-testid="race-hint-log-close"><CloseIcon size={22} /></button>
    </div>
    <div className={styles.body}><RaceHintLogList entries={entries} /></div>
    <p className={styles.note}>{tl(RACE_HINT_LOG_COPY.newestFirst)}{paused ? "" : ` ${tl(RACE_HINT_LOG_COPY.raceRunning)}`}</p>
  </section>;
}
