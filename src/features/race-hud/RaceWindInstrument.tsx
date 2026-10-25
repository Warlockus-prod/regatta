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
  return <div className={styles.instrument} data-compact={compact || undefined} data-available={Boolean(reading)} data-testid="race-wind-instrument" aria-label={c.trueWind}>
    {compass && reading && <svg className={styles.compass} viewBox="0 0 100 100" role="img"
      aria-label={`${c.compass}: ${c.windFrom} ${angle(reading.trueFrom)}; ${c.heading} ${angle(reading.heading)}`} data-testid="race-wind-compass">
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
      <path d="M50 10v6M90 50h-6M50 90v-6M10 50h6" stroke="currentColor" strokeWidth="2" />
      <text x="50" y="28" textAnchor="middle" fill="currentColor" fontSize="12">{c.northShort}</text>
      <g transform={`rotate(${reading.heading} 50 50)`} fill="var(--text-secondary)" opacity=".75"><path d="M50 36 44 54 50 50 56 54Z" /></g>
      <g transform={`rotate(${reading.trueFrom} 50 50)`} fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 22v36m-6-7 6 7 6-7" />
      </g>
    </svg>}
    <div className={styles.readings}>
      {!compact && <div className={styles.caption}>{c.trueWind}</div>}
      <b className={styles.bearing} data-testid="race-true-wind-direction">{angle(reading?.trueFrom)}</b>
      <div className={styles.speed} data-testid="race-true-wind-speed">{speed(reading?.trueKnots)}</div>
      {!compact && <dl className={styles.details}>
        <div><dt>{c.heading}</dt><dd>{angle(reading?.heading)}</dd></div>
        <div><dt>{c.twa}</dt><dd>{angle(reading && Math.abs(reading.twaSigned))}</dd></div>
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
