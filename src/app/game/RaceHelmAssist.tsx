'use client';

// Package 13 (ADR-0022): the race's helm assists on screen. The on-screen
// arrows (Simple: they move the course and the boat holds it; Pro: they are
// the rudder while held, R-6), the tack or gybe button, BEST VMG (R-7: in Pro
// only the helm) and the VMG line for the HUD. Presentational: GameClient owns
// the assist (src/lib/helm-assist.ts) and the loop publishes HelmView.

import { useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { HELM_ASSIST_COPY } from "@/data/helm-assist-copy";
import { RACE_UNITS } from "@/features/race-hud/units";
import type { HelmView } from "@/lib/helm-assist";
import styles from "./RaceCockpit.module.css";

const ArrowIcon = ({ dir }: { dir: -1 | 1 }) => <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d={dir < 0 ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
</svg>;

/** One arrow: held while the pointer is down (pointer capture, so a slide
 * off the button still lets go), a keyboard press is one short tap. */
function HelmArrow({ dir, label, onArrow, disabled }: { dir: -1 | 1; label: string; onArrow: (dir: -1 | 0 | 1) => void; disabled: boolean }) {
  const down = useRef(false);
  const release = () => { if (down.current) { down.current = false; onArrow(0); } };
  return <button type="button" className={styles.helmArrow} aria-label={label} title={label} disabled={disabled} data-testid={dir < 0 ? "race-helm-left" : "race-helm-right"}
    onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture?.(e.pointerId); down.current = true; onArrow(dir); }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    onContextMenu={e => e.preventDefault()}
    onClick={e => { if (e.detail !== 0) return; onArrow(dir); window.setTimeout(() => onArrow(0), 120); }}>
    <ArrowIcon dir={dir} />
  </button>;
}

export interface RaceHelmAssistProps {
  pro: boolean;
  view: HelmView;
  /** The boat's angle to the wind now, signed (the button says tack or gybe by it). */
  twa: number;
  heading: number;
  disabled: boolean;
  onArrow: (dir: -1 | 0 | 1) => void;
  onTurn: () => void;
  onBestVmg: () => void;
}

/** The tack or gybe button and the BEST VMG switch, with or without the arrows. */
function AssistButtons({ pro, view, twa, disabled, onTurn, onBestVmg }: Omit<RaceHelmAssistProps, "onArrow" | "heading">) {
  const { tl } = useI18n();
  const kind = view.turning?.kind ?? (Math.abs(twa) < 90 ? "tack" : "gybe");
  const name = tl(HELM_ASSIST_COPY[kind]);
  const turning = view.turning ? tl(HELM_ASSIST_COPY.turning).replace("{turn}", name).replace("{n}", `${Math.round(view.turning.heading)}°`) : null;
  const best = tl(pro ? HELM_ASSIST_COPY.bestVmgPro : HELM_ASSIST_COPY.bestVmgSimple);
  return <>
    <button type="button" className={styles.helmAction} onClick={onTurn} disabled={disabled} aria-pressed={view.turning !== null}
      aria-label={turning ?? name} title={turning ?? name} data-testid="race-helm-turn" data-kind={kind}>
      <span>{view.turning ? `${Math.round(view.turning.heading)}°` : name}</span>
    </button>
    <button type="button" className={styles.helmAction} onClick={onBestVmg} disabled={disabled} aria-pressed={view.hold === "vmg"}
      data-testid="race-helm-best-vmg"><span>{best}</span></button>
  </>;
}

/** Arrows mode: Simple has big arrows over the two assists and the course line;
 * Pro one row (arrows round the assists) over the sheets. */
export function RaceHelmArrows(p: RaceHelmAssistProps & { sheets?: ReactNode }) {
  const { tl } = useI18n();
  const left = tl(p.pro ? HELM_ASSIST_COPY.rudderLeft : HELM_ASSIST_COPY.courseLeft);
  const right = tl(p.pro ? HELM_ASSIST_COPY.rudderRight : HELM_ASSIST_COPY.courseRight);
  const twa = Math.round(p.twa);
  if (p.pro) return <div className={styles.helmAssist} data-layout="pro-arrows" data-testid="race-helm-arrows">
    <div className={styles.helmRow}>
      <HelmArrow dir={-1} label={left} onArrow={p.onArrow} disabled={p.disabled} />
      <AssistButtons {...p} />
      <HelmArrow dir={1} label={right} onArrow={p.onArrow} disabled={p.disabled} />
    </div>
    {p.sheets}
  </div>;
  const course = p.view.course ?? p.heading;
  return <div className={styles.helmAssist} data-layout="simple-arrows" data-testid="race-helm-arrows">
    <div className={`${styles.helmRow} ${styles.helmArrows}`}>
      <HelmArrow dir={-1} label={left} onArrow={p.onArrow} disabled={p.disabled} />
      <HelmArrow dir={1} label={right} onArrow={p.onArrow} disabled={p.disabled} />
    </div>
    <div className={styles.helmRow}><AssistButtons {...p} /></div>
    <p className={styles.helmStatus} data-testid="race-helm-status">
      <span>{tl(HELM_ASSIST_COPY.course)} {Math.round(course)}°</span>
      <span>{tl(HELM_ASSIST_COPY.angle)} {Math.abs(twa)}°</span>
    </p>
  </div>;
}

/** Wheel or slider mode: the two assists in one row above the helm. */
export function RaceHelmAssistRow(p: Omit<RaceHelmAssistProps, "onArrow" | "heading">) {
  return <div className={`${styles.helmRow} ${styles.helmAssistRow}`} data-testid="race-helm-assist-row"><AssistButtons {...p} /></div>;
}

const TrendIcon = ({ trend }: { trend: -1 | 0 | 1 }) => <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
  {trend === 0 ? <path d="M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    : <path d={trend > 0 ? "M7 2 12 9H2z" : "M7 12 2 5h10z"} fill="currentColor" />}
</svg>;

/** The VMG line (VMC on a reach): the value in a state colour against the
 * polar's best (on target, below it), never cyan, and the trend. */
export function RaceVmgLine({ vmg, pro }: { vmg: HelmView["vmg"]; pro: boolean }) {
  const { tl, lang } = useI18n();
  if (!vmg) return null;
  const label = pro ? vmg.leg === "reach" ? "VMC" : "VMG"
    : tl(vmg.leg === "upwind" ? HELM_ASSIST_COPY.vmgUp : vmg.leg === "downwind" ? HELM_ASSIST_COPY.vmgDown : HELM_ASSIST_COPY.vmcMark);
  const ratio = vmg.targetKn > 0.05 ? vmg.kn / vmg.targetKn : null;
  const state = ratio === null ? "none" : ratio >= 0.95 ? "on" : ratio < 0.8 ? "below" : "near";
  const format = (n: number) => new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
  const trend = tl(vmg.trend > 0 ? HELM_ASSIST_COPY.trendUp : vmg.trend < 0 ? HELM_ASSIST_COPY.trendDown : HELM_ASSIST_COPY.trendFlat);
  const knots = RACE_UNITS.knots[lang];
  return <p className={styles.vmgLine} data-testid="race-vmg" data-target={state} data-leg={vmg.leg}
    aria-label={`${label} ${format(vmg.kn)} ${knots}, ${tl(HELM_ASSIST_COPY.target)} ${format(vmg.targetKn)}, ${trend}`}>
    <span className={styles.vmgLabel}>{label}</span>
    <strong>{format(vmg.kn)}</strong>
    <small>/ {format(vmg.targetKn)} {knots}</small>
    <span className={styles.vmgTrend} data-trend={vmg.trend}><TrendIcon trend={vmg.trend} /></span>
  </p>;
}
