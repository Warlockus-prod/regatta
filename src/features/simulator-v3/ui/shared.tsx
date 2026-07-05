'use client';

import { pointsOfSail, type PointOfSail } from '@/data/sailing-data';
import { type TickResult } from '@/lib/sailing-physics';
import { type WindMode } from '../runtime/wind-dynamics';

export { type WindMode } from '../runtime/wind-dynamics';

// ============================================================================
// V3 shared types, constants, math, and small UI primitives.
// Kept in one file so PR-1 (structural split) adds a minimal set of new files;
// PR-2 will promote the types/math out of this UI-adjacent module when the
// live runtime lands (see docs/design/simulator-v3/BACKLOG.md).
// ============================================================================

// ---------------------------------------------------------------------------
// Domain types + UI state
// ---------------------------------------------------------------------------

export type Tack = 'starboard' | 'port';
export type ReefLevel = 0 | 1 | 2;
export type ViewMode = 'top' | 'rear' | 'side';
export type SailsRaised = 'both' | 'main' | 'jib';
/** Optional 4th-language pack, mirrors TpExtras in src/lib/i18n.tsx so the
 *  global useI18n().tp is directly assignable to this type. */
export type TpExtras = { es?: string; fr?: string; de?: string; it?: string };
export type TpFn = (ru: string, en: string, pl: string, extras?: TpExtras) => string;
export type FeedbackTone = 'good' | 'warn' | 'danger' | 'info';

export interface UiState {
  twa: number;
  tack: Tack;
  windSpeed: number;
  /** Wind dynamics: steady (base wind only), shift (TWA wander), gust
   *  (episodic TWS bursts). The TWA/TWS sliders always set the BASE wind;
   *  shift/gust modulate around it inside the runtime. */
  windMode: WindMode;
  mainAngle: number;
  jibAngle: number;
  jibFurlPct: number;
  reefLevel: ReefLevel;
  mainTwistPct: number;
  jibTwistPct: number;
  view: ViewMode;
  sailsRaised: SailsRaised;
  showOptimal: boolean;
}

export interface OptimalTrim {
  mainAngle: number;
  jibAngle: number;
  mainTwistPct: number;
  jibTwistPct: number;
}

export interface SimulationModel {
  result: TickResult;
  optimalResult: TickResult;
  pos: PointOfSail;
  signedTwa: number;
  absTwa: number;
  trimScore: number;
  /** Optimal trim at the USER's intended course (ui.twa). Used by the
   *  "Apply optimal" button - clicking it applies the trim the user will
   *  want once the turn completes. Memoized on target TWA. */
  optimal: OptimalTrim;
  /** Optimal trim at the boat's CURRENT TWA, recomputed every frame from
   *  the live apparent wind angle. Used by the ghost overlay on the scene
   *  so it slides to match the boat as it turns, not the pre-turn target. */
  ghostAngles: OptimalTrim;
  /** Live main sheet angle in degrees, derived from runtime.live each frame.
   *  Scenes draw THIS (not ui.mainAngle, which is the slider target) so the
   *  drawn sail eases at winch speed exactly like the physics does. */
  liveMainAngle: number;
  /** Live jib sheet angle in degrees - see liveMainAngle. */
  liveJibAngle: number;
  primaryFeedback: string;
  primaryFeedbackTone: FeedbackTone;
  /** Compass heading the boat is steering to, 0-360 deg. Set by the user's
   *  TWA/tack intent via the runtime hook. HelmPod reads this alongside the
   *  live `result.state.heading` to visualize the turn. */
  targetHeading: number;
}

// ---------------------------------------------------------------------------
// Defaults and lookup tables
// ---------------------------------------------------------------------------

// Default state = properly-trimmed beam reach. The engine can starve into a
// stalled equilibrium if we seed with bad trim (low bs -> AWA stays close to
// TWA -> sail AoA in stall zone -> low drive -> low bs...). Picking sane
// default sail angles avoids that bad-first-impression.
// At TWA=90, TWS=12, a steady-state bs ~6 kn gives AWA ~65. Main at ~52 deg
// and jib at ~54 deg put both AoA in the 12-14 deg sweet spot.
export const DEFAULT_UI: UiState = {
  twa: 90,
  tack: 'starboard',
  windSpeed: 12,
  windMode: 'steady',
  mainAngle: 52,
  jibAngle: 54,
  jibFurlPct: 100,
  reefLevel: 0,
  mainTwistPct: 18,
  jibTwistPct: 14,
  view: 'top',
  sailsRaised: 'both',
  showOptimal: true,
};

export const REEF_VALUES: Record<ReefLevel, number> = {
  0: 0,
  1: 0.45,
  2: 0.85,
};

export const REEF_VISUAL: Record<ReefLevel, number> = {
  0: 1,
  1: 0.78,
  2: 0.56,
};

export const COURSE_PRESETS = [
  { id: 'close', twa: 42 },
  { id: 'beam', twa: 90 },
  { id: 'broad', twa: 135 },
  { id: 'run', twa: 170 },
] as const;

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  // Guard NaN: if the input is not finite, fall back to `min`. Native
  // Math.max/Math.min propagate NaN, which otherwise leaks into SVG
  // attributes and triggers React "Received NaN" warnings on hydration.
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Return `n` if it is a finite number, otherwise `fallback`. Used as a
 * defensive guard on values that feed into SVG attributes or CSS transforms,
 * where NaN propagates into React "Received NaN for the `%s` attribute"
 * warnings on hydration. The underlying engine settles with deterministic
 * numbers, but a handful of derived expressions (optimal trim during a
 * transient, rotations before the first runtime tick lands) can briefly
 * produce NaN during the server render; this keeps the attribute strings
 * clean.
 */
export function finite(n: number | undefined | null, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function pointOfSailFor(absTwa: number): PointOfSail {
  for (const pos of pointsOfSail) {
    if (absTwa >= pos.angleMin && absTwa < pos.angleMax) return pos;
  }
  return pointsOfSail[pointsOfSail.length - 1];
}

export function toMainSheet(angle: number, maxOff: number): number {
  return clamp(1 - angle / maxOff, 0, 1);
}

export function toJibSheet(angle: number, minOff: number, maxOff: number): number {
  const span = maxOff - minOff;
  if (span <= 0) return 0;
  return clamp(1 - (angle - minOff) / span, 0, 1);
}

// Inverse of toMainSheet / toJibSheet: recover the sheet angle in degrees
// from a normalized 0..1 sheet value. Used to draw the runtime's LIVE
// (interpolated) controls on the scenes.
export function fromMainSheet(sheet: number, maxOff: number): number {
  return clamp(1 - sheet, 0, 1) * maxOff;
}

export function fromJibSheet(sheet: number, minOff: number, maxOff: number): number {
  return minOff + clamp(1 - sheet, 0, 1) * (maxOff - minOff);
}

// Convert (centerX, centerY, radius, angleFromNorthCW) to Cartesian.
export function polarPoint(cx: number, cy: number, radius: number, degFromUp: number) {
  const rad = degToRad(degFromUp);
  return {
    x: cx + Math.sin(rad) * radius,
    y: cy - Math.cos(rad) * radius,
  };
}

// SVG path for a pie-wedge (sector) between two angles measured from north
// clockwise, between inner and outer radii.
export function sectorPath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  startDeg: number,
  endDeg: number,
): string {
  const outerStart = polarPoint(cx, cy, outer, startDeg);
  const outerEnd = polarPoint(cx, cy, outer, endDeg);
  const innerEnd = polarPoint(cx, cy, inner, endDeg);
  const innerStart = polarPoint(cx, cy, inner, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${outerStart.x.toFixed(1)} ${outerStart.y.toFixed(1)}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x.toFixed(1)} ${outerEnd.y.toFixed(1)}`,
    `L ${innerEnd.x.toFixed(1)} ${innerEnd.y.toFixed(1)}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x.toFixed(1)} ${innerStart.y.toFixed(1)}`,
    'Z',
  ].join(' ');
}

// Standard polar to Cartesian using math convention (angle from +x axis, CCW positive)
export function polarPointXY(cx: number, cy: number, r: number, deg: number) {
  const rad = degToRad(deg);
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

// SVG arc helper for heel indicator
export function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarPointXY(cx, cy, r, startDeg);
  const end = polarPointXY(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r} ${r} 0 ${large} ${sweep} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

// ---------------------------------------------------------------------------
// Small UI primitives shared by pods
// ---------------------------------------------------------------------------

export function PodCard({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div
      className={`rounded-xl ${compact ? 'p-2' : 'p-3'} space-y-2`}
      style={{
        background: 'rgba(8, 24, 48, 0.72)',
        border: '1px solid rgba(0, 212, 255, 0.22)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </div>
  );
}

export function PodLabel({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div
      className={`${compact ? 'text-[9px]' : 'text-[10px]'} uppercase tracking-wider font-bold`}
      style={{ color: 'var(--accent-cyan)' }}
    >
      {text}
    </div>
  );
}

export function PodSlider(props: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  sliderValue: number;
  onChange: (v: number) => void;
  compact?: boolean;
  tone?: 'cyan' | 'warn' | 'danger' | 'good';
}) {
  const { label, value, min, max, step, sliderValue, onChange, compact, tone = 'cyan' } = props;
  const color =
    tone === 'danger'
      ? 'var(--danger)'
      : tone === 'warn'
      ? 'var(--warning)'
      : tone === 'good'
      ? 'var(--success)'
      : 'var(--accent-cyan)';
  return (
    <label className="block">
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
        <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-[var(--text-secondary)] truncate`}>
          {label}
        </span>
        <span
          className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-mono font-bold tabular-nums`}
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color, height: compact ? '14px' : '18px' }}
      />
    </label>
  );
}

export function PodSegmented<T extends string | number>(props: {
  options: { value: T; label: string }[];
  active: T;
  onSelect: (v: T) => void;
  compact?: boolean;
}) {
  const { options, active, onSelect, compact } = props;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onSelect(opt.value)}
          className={`${
            compact ? 'px-1.5 py-1 text-[9px]' : 'px-2 py-1.5 text-[10px]'
          } rounded-md border font-semibold transition truncate`}
          style={{
            borderColor: active === opt.value ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.22)',
            background: active === opt.value ? 'rgba(0, 212, 255, 0.14)' : 'transparent',
            color: active === opt.value ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StatusDot({
  tone,
  text,
  compact,
}: {
  tone: 'good' | 'warn' | 'danger';
  text: string;
  compact?: boolean;
}) {
  const color =
    tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warning)' : 'var(--success)';
  return (
    <div
      className={`flex items-center gap-1.5 ${compact ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-wider`}
      style={{ color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {text}
    </div>
  );
}
