"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { miniTaskCopy as copy } from "@/data/foundation-mini-tasks";
import type { Lang } from "@/lib/languages";
import { renderAngleTask, SCENE_HEIGHT, SCENE_WIDTH } from "@/lib/learning/foundation-drawings";
import { boomForAngle, inNoGoZone, isTaskFinished, MINI_TASK_HOLD_MS, onTarget, shownWindAngle, type MiniTask as Task } from "@/lib/learning/mini-task";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";
import styles from "./start.module.css";

/** The lesson's own practice: one handle, and the result is seen here, not reported. */
export default function MiniTask({ task, lang, done, disabled, onDone }: { task: Task; lang: Lang; done: boolean; disabled: boolean; onDone: () => void }) {
  const [angle, setAngle] = useState(task.start);
  const [step, setStep] = useState(done ? task.targets.length : 0);
  const finished = isTaskFinished(task, step);
  const holding = !finished && onTarget(task, step, angle);
  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => setStep(current => current + 1), MINI_TASK_HOLD_MS);
    return () => clearTimeout(timer);
  }, [holding, step]);
  useEffect(() => { if (finished && !done) onDone(); }, [finished, done, onDone]);

  const shown = Math.round(shownWindAngle(angle));
  const target = finished ? null : task.targets[step];
  const svg = renderAngleTask({ angle, boom: boomForAngle(angle), target: target?.angle ?? null, noGo: NO_GO_HALF_DEG, shownAngle: shown, windLabel: copy.wind[lang] });
  const prompt = target?.prompt[lang] ?? "";
  return <div className={styles.miniTask} data-testid="mini-task">
    <h3>{copy.title[lang]}</h3>
    <p className={styles.taskPrompt} role="status" data-testid="mini-task-status">
      {finished ? <strong className={styles.success}>✓ {copy.success[lang]}</strong> : holding ? copy.hold[lang] : prompt}
    </p>
    {finished && <p>{task.done[lang]}</p>}
    <figure className={styles.diagram}>
      <Image src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} width={SCENE_WIDTH} height={SCENE_HEIGHT} unoptimized alt={`${copy.control[lang]}: ${shown}°`} />
    </figure>
    <label className={styles.taskControl}>
      <span>{copy.control[lang]}: {shown}°</span>
      <input type="range" min={task.min} max={task.max} step={1} value={angle} disabled={disabled} aria-valuetext={`${shown}°`} data-testid="mini-task-angle" onChange={event => setAngle(Number(event.target.value))} />
    </label>
    {!finished && inNoGoZone(angle) && <p className={styles.secondary} data-testid="mini-task-no-go">{copy.noGo[lang]}</p>}
    <ol className={styles.taskSteps}>
      {task.targets.map((item, index) => <li key={item.angle} data-reached={index < step ? "true" : undefined} aria-current={index === step ? "step" : undefined}>{index < step ? "✓ " : ""}{shownWindAngle(item.angle)}°</li>)}
    </ol>
    {finished && <button type="button" className={styles.next} disabled={disabled} onClick={() => { setStep(0); setAngle(task.start); }}>{copy.again[lang]}</button>}
  </div>;
}
