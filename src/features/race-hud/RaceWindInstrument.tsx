'use client';

import type { WindDisplay } from "@/lib/race-visual-prefs";
import type { RaceWindReading } from "./navigation-model";
import { useRaceNavigationCopy } from "./navigation-copy";
import styles from "./RaceWindInstrument.module.css";
import { bowRelativeWind } from "./wind-dial";

export function RaceWindInstrument({ reading, display, compact = false }: {
  reading: RaceWindReading | null; display: WindDisplay; compact?: boolean;
}) {
  const c = useRaceNavigationCopy();
  const angle = (value: number | null | undefined) => value == null ? c.unknown : `${Math.round(value)}°`;
  const speed = (value: number | null | undefined) => value == null ? c.unknown : `${value.toFixed(1)} ${c.knots}`;
  const compass = Boolean(reading && (display === "compass" || display === "both"));
  // F2: one bow-relative reading drives the number, the side and the arrow.
  // Rounded 0/180 readings name the bow or the stern, never a side.
  const wind = bowRelativeWind(reading?.twaSigned);
  const twa = wind ? wind.degrees : null;
  const side = wind?.side ?? null;
  const sideLabel = side === "ahead" ? c.fromBow : side === "astern" ? c.fromStern : side === "port" ? c.fromPort : c.fromStarboard;
  const sideWord = side === "ahead" ? c.aheadSide : side === "astern" ? c.asternSide : side === "port" ? c.portSide : c.starboardSide;
  return <div className={styles.instrument} data-compact={compact || undefined} data-available={Boolean(reading)} data-testid="race-wind-instrument" aria-label={c.trueWind}>
    {compass && reading && wind && <svg className={styles.compass} viewBox="0 0 100 100" role="img"
      aria-label={`${c.relativeWind}: ${angle(twa)}; ${sideLabel}; ${c.windFrom} ${angle(reading.trueFrom)}; ${c.heading} ${angle(reading.heading)}`} data-testid="race-wind-compass">
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="2" />
      {/* Port red on the left, starboard green on the right, like the sidelights. */}
      <path d="M9.6 40A42 42 0 0 0 9.6 60" fill="none" stroke="var(--race-port,#e5484d)" strokeWidth="5" strokeLinecap="round" />
      <path d="M90.4 40A42 42 0 0 1 90.4 60" fill="none" stroke="var(--race-starboard,#30a46c)" strokeWidth="5" strokeLinecap="round" />
      <path data-testid="race-wind-bow" d="M50 30C57 38 58 52 56 68H44C42 52 43 38 50 30Z" fill="var(--text-secondary)" opacity=".9" />
      {/* The arrow is drawn from the helper's own points: tail on the rim on the
          side the wind blows from, head toward the boat (wind-dial.ts). */}
      <g data-testid="race-relative-wind-arrow" data-angle={wind.angle} data-side={side} fill="none" stroke="var(--text-primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <line data-testid="race-relative-wind-shaft" x1={wind.tail.x} y1={wind.tail.y} x2={wind.head.x} y2={wind.head.y} />
        <polyline data-testid="race-relative-wind-head" points={`${wind.barbs[0].x},${wind.barbs[0].y} ${wind.head.x},${wind.head.y} ${wind.barbs[1].x},${wind.barbs[1].y}`} />
      </g>
    </svg>}
    <div className={styles.readings}>
      {!compact && <div className={styles.caption}>{c.trueWind}</div>}
      <b className={styles.bearing}>
        <span className={styles.kind} aria-hidden="true">TWA</span><span className="sr-only">{c.relativeWind}: </span>
        <span data-testid="race-true-wind-angle">{angle(twa)}</span>
      </b>
      {side && <span className={styles.side} data-testid="race-true-wind-side" data-side={side} title={sideLabel}>
        <span aria-hidden="true">{sideWord}</span><span className="sr-only">{sideLabel}</span>
      </span>}
      <div className={styles.metadata}>
        <span title={`${c.windFrom}: ${angle(reading?.trueFrom)}`}><span aria-hidden="true">TWD </span><span className="sr-only">{c.windFrom}: </span><span data-testid="race-true-wind-direction">{angle(reading?.trueFrom)}</span></span>
        <span className={styles.speed} data-testid="race-true-wind-speed">{speed(reading?.trueKnots)}</span>
      </div>
      {!compact && <dl className={styles.details}>
        <div><dt>{c.heading}</dt><dd>{angle(reading?.heading)}</dd></div>
        <div><dt>{c.apparentWind}</dt><dd>{speed(reading?.apparentKnots)}</dd></div>
      </dl>}
    </div>
  </div>;
}

export function RaceWindSettings({ display, onChange }: { display: WindDisplay; onChange: (value: WindDisplay) => void }) {
  const c = useRaceNavigationCopy();
  return <fieldset className={styles.settings}>
    <legend>{c.windDisplay}</legend>
    <div className={styles.choices} role="radiogroup" aria-label={c.windDisplay}>
      {(["compass", "arrows", "both", "off"] as const).map(value => <button key={value} type="button" role="radio" aria-checked={display === value} onClick={() => onChange(value)}>{c[value]}</button>)}
    </div>
    <p>{c.windNote}</p>
  </fieldset>;
}
