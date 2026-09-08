'use client';
import type { SceneLabels } from "../types";
import styles from "../Simulator3D.module.css";

export function WindReadout({ awa, aws, tws, showFlow, onToggle, labels: L }: {
  awa: number; aws: number; tws: number; showFlow: boolean; onToggle: () => void; labels: SceneLabels;
}) {
  const moving = aws > .5;
  return <div className={styles.windReadout}>
    <svg width="54" height="54" viewBox="0 0 64 64" role="img" aria-label={L.relativeWind}>
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" opacity=".25" />
      <path d="M32 19 Q25 27 27 41 L37 41 Q39 27 32 19Z" fill="currentColor" opacity=".9" />
      {moving && <g transform={`rotate(${awa} 32 32)`} className={styles.airArrow}>
        <path d="M32 5V18 M27 13L32 18L37 13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>}
    </svg>
    <div className={styles.windNumbers}>
      <strong>{L.apparent} <span>{aws.toFixed(1)} kn</span></strong>
      <span>{moving ? `${Math.round(Math.abs(awa))}° · ${L.relativeWind}` : L.calmWind}</span>
      <span>{L.trueWind}: {tws.toFixed(0)} kn</span>
    </div>
    <button className={styles.button} aria-pressed={showFlow} onClick={onToggle}>{L.flow}</button>
  </div>;
}
