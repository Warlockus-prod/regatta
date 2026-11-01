'use client';

import type { WindDisplay } from "@/lib/race-visual-prefs";
import type { RaceWindReading } from "./navigation-model";
import { useRaceNavigationCopy } from "./navigation-copy";
import styles from "./RaceWindInstrument.module.css";

export function RaceWindInstrument({ reading, display, compact = false }: {
  reading: RaceWindReading | null; display: WindDisplay; compact?: boolean;
}) {
  const c = useRaceNavigationCopy();
  const angle = (value: number | null | undefined) => value == null ? c.unknown : `${Math.round(value)}°`;
  const speed = (value: number | null | undefined) => value == null ? c.unknown : `${value.toFixed(1)} ${c.knots}`;
  const compass = Boolean(reading && (display === "compass" || display === "both"));
  const twa = reading ? Math.round(Math.abs(reading.twaSigned)) : null;
  // The displayed endpoints have no port/starboard side. Use the shared
  // trainer sign for the source of true wind, never the legacy race TWA sign.
  const side = !reading ? null : twa === 0 ? "ahead" : twa === 180 ? "astern" : reading.twaSigned < 0 ? "port" : "starboard";
  const sideLabel = side === "ahead" ? c.fromBow : side === "astern" ? c.fromStern : side === "port" ? c.fromPort : c.fromStarboard;
  const sideMark = side === "ahead" ? "↑" : side === "astern" ? "↓" : side === "port" ? c.portShort : c.starboardShort;
  return <div className={styles.instrument} data-compact={compact || undefined} data-available={Boolean(reading)} data-testid="race-wind-instrument" aria-label={c.trueWind}>
    {compass && reading && <svg className={styles.compass} viewBox="0 0 100 100" role="img"
      aria-label={`${c.relativeWind}: ${angle(twa)}; ${sideLabel}; ${c.windFrom} ${angle(reading.trueFrom)}; ${c.heading} ${angle(reading.heading)}`} data-testid="race-wind-compass">
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
      <path d="M50 10v6M90 50h-6M50 90v-6M10 50h6" stroke="currentColor" strokeWidth="2" />
      <path data-testid="race-wind-bow" d="M50 36 42 60 50 56 58 60Z" fill="var(--text-secondary)" opacity=".85" />
      <g data-testid="race-relative-wind-arrow" transform={`rotate(${reading.twaSigned} 50 50)`} fill="none" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10v22m-6-7 6 7 6-7" />
      </g>
    </svg>}
    <div className={styles.readings}>
      {!compact && <div className={styles.caption}>{c.trueWind}</div>}
      <b className={styles.bearing}>
        <span className={styles.kind} aria-hidden="true">TWA</span><span className="sr-only">{c.relativeWind}: </span>
        <span data-testid="race-true-wind-angle">{angle(twa)}</span>
        {side && <span className={styles.side} data-testid="race-true-wind-side" data-side={side} title={sideLabel}>
          <span aria-hidden="true">{sideMark}</span><span className="sr-only">{sideLabel}</span>
        </span>}
      </b>
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
