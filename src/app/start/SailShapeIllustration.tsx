"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { createIllustrationAttempt } from "@/lib/learning/illustration-attempt";
import type { SailShapeContent } from "@/data/sail-shape";
import type { Lang } from "@/lib/languages";
import { renderSailShapeMarkers } from "@/lib/learning/sail-shape-markers";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import styles from "./sail-shape.module.css";

export default function SailShapeIllustration({ copy, lang, children }: { copy: SailShapeContent; lang: Lang; children: ReactNode }) {
  const [mode, setMode] = useState<"scheme" | "picture">("scheme");
  const [frameIndex, setFrameIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt] = useState(createIllustrationAttempt);
  const [token, setToken] = useState(0);
  useEffect(() => () => { attempt.invalidate(); }, [attempt]);
  function restart() { setToken(attempt.start()); }
  const frame = copy.frames[frameIndex];
  function chooseMode(value: typeof mode) {
    const unchanged = value === mode;
    recordWebDiagnostic({ type: "learning.visual", surface: "learn", lesson: "how-sail-works", action: "mode", mode: value, frame: frame.id, outcome: unchanged ? "noop" : "accepted", ...(unchanged ? { reason: "unchanged" as const } : {}) });
    if (unchanged) return;
    restart(); setFailed(false); setMode(value);
  }
  function chooseFrame(index: number) {
    const unchanged = index === frameIndex;
    recordWebDiagnostic({ type: "learning.visual", surface: "learn", lesson: "how-sail-works", action: "frame", mode, frame: copy.frames[index].id, outcome: unchanged ? "noop" : "accepted", ...(unchanged ? { reason: "unchanged" as const } : {}) });
    if (unchanged) return;
    restart(); setFrameIndex(index); setFailed(false);
  }
  function imageResult(ok: boolean) {
    if (!attempt.settle(token)) return;
    recordWebDiagnostic({ type: "learning.visual", surface: "learn", lesson: "how-sail-works", action: ok ? "image-ready" : "image-error", mode: "picture", frame: frame.id, outcome: ok ? "accepted" : "failed", ...(!ok ? { reason: "asset-load" as const } : {}) });
    if (!ok) { restart(); setMode("scheme"); setFailed(true); }
  }
  return <div className={styles.wrap} data-learning-view={mode}>
    <div className={styles.choices} role="group" aria-label={copy.view[lang]}>
      {(["scheme", "picture"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => chooseMode(value)}>{copy[value][lang]}</button>)}
    </div>
    {failed && <p role="status">{copy.unavailable[lang]}</p>}
    {mode === "picture" && <figure className={styles.figure}>
      <div className={styles.choices} role="group" aria-label={copy.shape[lang]}>
        {copy.frames.map((item, index) => <button key={item.id} type="button" aria-pressed={frameIndex === index} onClick={() => chooseFrame(index)}>{item.label[lang]}</button>)}
      </div>
      <div className={styles.photo}>
        <Image key={`${frame.id}-${token}`} src={frame.src} width={1536} height={1024} unoptimized alt={frame.description[lang]} onLoad={() => imageResult(true)} onError={() => imageResult(false)} />
        <Image className={styles.markers} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSailShapeMarkers())}`} width={1536} height={1024} unoptimized alt="" aria-hidden />
      </div>
      <figcaption aria-live="polite">{frame.note[lang]}</figcaption>
      <ol className={styles.key}>{copy.markers.map((label, index) => <li key={index}>{label[lang]}</li>)}</ol>
      <p className={styles.limit}>{copy.limit[lang]}</p>
    </figure>}
    {mode === "picture" && <h3>{copy.forceView[lang]}</h3>}
    {children}
  </div>;
}
