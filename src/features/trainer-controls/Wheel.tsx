'use client';

import { useId, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./TrainerControls.module.css";
import { angleDelta } from "./mapping";

// One rotary control: the big helm wheel or a small winch-like sheet wheel.
// Direct manipulation with one finger in a circle (pointer events, so mouse
// and pen work too), keyboard steps for focus users, and role="slider" so
// screen readers get an adjustable control with a spoken value.

export interface WheelProps {
  kind: "helm" | "sheet";
  /** Visual rotation of the wheel in degrees. */
  rotation: number;
  label: string;
  /** Spoken and shown value, e.g. "43%, eased" or "113° course to wind". */
  valueText: string;
  caption: ReactNode;
  ariaNow: number;
  ariaMin: number;
  ariaMax: number;
  /** Signed wheel degrees since the last move, clockwise positive. */
  onTurn: (deltaDeg: number) => void;
  onRelease?: () => void;
  /** Pointer down or focus; return false to stop the gesture from turning. */
  onActivate?: () => void;
  /** Keyboard step: +-1 small, +-5 large, +-Infinity to the stop. */
  onStep: (steps: number) => void;
  small?: boolean;
  style?: CSSProperties;
  testId?: string;
}

/** Touches nearer than this share of the radius to the hub do not turn the wheel (the angle jumps there). */
const HUB_DEAD_ZONE = 0.22;

export function Wheel(props: WheelProps) {
  const { kind, rotation, label, valueText, caption, ariaNow, ariaMin, ariaMax, onTurn, onRelease, onActivate, onStep, small, style, testId } = props;
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; last: number } | null>(null);
  const markerId = `tcArrow${useId().replace(/:/g, "")}`;

  const polar = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return { a: (Math.atan2(dy, dx) * 180) / Math.PI, dist: Math.hypot(dx, dy) / (r.width / 2) };
  };

  const spokes = kind === "helm" ? 8 : 4;
  return (
    <div
      ref={ref}
      className={`${styles.wheel} ${small ? styles.wheelSmall : ""}`}
      style={style}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={valueText}
      aria-valuenow={Number(ariaNow.toFixed(3))}
      aria-valuemin={ariaMin}
      aria-valuemax={ariaMax}
      data-testid={testId}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        onActivate?.();
        try { ref.current?.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        drag.current = { id: e.pointerId, last: polar(e).a };
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const p = polar(e);
        if (p.dist < HUB_DEAD_ZONE) { d.last = p.a; return; }
        const delta = angleDelta(d.last, p.a);
        d.last = p.a;
        if (delta !== 0) onTurn(delta);
      }}
      onPointerUp={(e) => { if (drag.current?.id === e.pointerId) { drag.current = null; onRelease?.(); } }}
      onPointerCancel={(e) => { if (drag.current?.id === e.pointerId) { drag.current = null; onRelease?.(); } }}
      onFocus={() => onActivate?.()}
      onKeyDown={(e) => {
        const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5, Home: -Infinity, End: Infinity };
        const s = map[e.key];
        if (s === undefined) return;
        e.preventDefault();
        e.stopPropagation();
        onStep(s);
      }}
    >
      <svg viewBox="-112 -112 224 224" aria-hidden="true" className={styles.wheelSvg}>
        <g transform={`rotate(${rotation})`}>
          <circle r="84" className={styles.wheelRim} strokeWidth={kind === "helm" ? 14 : 20} />
          {Array.from({ length: spokes }, (_, i) => (
            <g key={i} transform={`rotate(${(i * 360) / spokes})`}>
              <line x1="0" y1="0" x2="0" y2="-84" className={styles.wheelSpoke} strokeWidth={kind === "helm" ? 6 : 9} />
              {kind === "helm" && <circle cx="0" cy="-100" r="7" className={styles.wheelHandle} />}
            </g>
          ))}
          {Array.from({ length: 36 }, (_, i) => (
            <line key={`t${i}`} x1="0" y1="-74" x2="0" y2={i % 9 === 0 ? -64 : -69} transform={`rotate(${i * 10})`} className={styles.wheelTick} />
          ))}
          <circle r={kind === "helm" ? 22 : 30} className={styles.wheelHub} />
          {kind === "helm" && <rect x="-5" y="-96" width="10" height="20" rx="3" className={styles.wheelKing} />}
        </g>
        {kind === "sheet" && <path d="M -40 -40 A 57 57 0 0 1 40 -40" className={styles.wheelArrow} markerEnd={`url(#${markerId})`} />}
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0L10 5L0 10z" className={styles.wheelArrowHead} />
          </marker>
        </defs>
      </svg>
      <div className={styles.wheelCaption}>{caption}</div>
    </div>
  );
}
