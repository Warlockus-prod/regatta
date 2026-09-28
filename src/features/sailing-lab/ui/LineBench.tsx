'use client';

import { useState } from "react";
import type { Language } from "../../../lib/product/catalog";
import { lineActions, lineCopy, lineReasons } from "../../../data/sailing-lab/line-bench-copy";
import { benchCommands, benchFaultReason, lineBenchHint, lineBenchOptions, lineBenchReadout } from "../rig/line-bench-guide";
import { handleLine, newLineBench } from "../rig/line-handling";
import { lineBenchSvg } from "../rig/line-bench-diagram";
import styles from "./SailingCourse.module.css";

export function LineBench({ lang }: { lang: Language }) {
  const [state, setState] = useState(newLineBench);
  const hint = lineBenchHint(state);
  return <section className={styles.prose} aria-labelledby="line-bench-title">
    <h2 id="line-bench-title">{lineCopy.title[lang]}</h2>
    <p>{lineCopy.task[lang]}</p>
    <div className={styles.benchWorkspace}>
    <div>
    <figure className={`${styles.figure} ${styles.benchFigure}`}>
      <div role="img" aria-label={`${lineCopy.legend[lang]} ${lineBenchReadout(state, lang)}`} dangerouslySetInnerHTML={{ __html: lineBenchSvg(state) }} />
      <figcaption className={styles.benchLegend}>{(["toSail", "clutch", "winch", "tail"] as const).map((key, i) => <span key={key}>{i + 1}. {lineCopy[key][lang]}</span>)}</figcaption>
    </figure>
    <div className={styles.benchStatus} aria-live="polite">
      <strong>{lineCopy.heldBy[lang]}: {lineCopy[state.owner][lang]}</strong>
      <span>{lineCopy.paidOut[lang]}: {Math.round(state.paidOut * 100)} cm</span>
    </div>
    <p className={styles.note}>{lineBenchReadout(state, lang)}</p>
    </div>
    <div>
    {state.fault && <div role="alert" className={styles.benchFeedback}><strong>{lineCopy.blocked[lang]}</strong><p>{lineReasons[benchFaultReason[state.fault]][lang]}</p></div>}
    {hint ? <div className={styles.benchGuidance}>
      <p>{hint.reason[lang]}</p>
      <button type="button" data-testid="bench-next" className={styles.primary} onClick={() => setState(current => handleLine(current, hint.action))}>{hint.label[lang]}</button>
    </div> : <p role="status">✓ {lineCopy.complete[lang]}</p>}
    <details className={styles.sources}>
      <summary>{lineCopy.controls[lang]}</summary>
      <div className={styles.controls}>{lineBenchOptions(state).map(id => <button key={id} type="button" onClick={() => setState(current => handleLine(current, benchCommands[id]))}>{lineActions[id][lang]}</button>)}</div>
    </details>
    </div>
    </div>
    <button type="button" className={styles.secondary} onClick={() => setState(newLineBench())}>{lineCopy.reset[lang]}</button>
    <p className={styles.note}>{lineCopy.limit[lang]}</p>
  </section>;
}
