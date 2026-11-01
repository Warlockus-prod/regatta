'use client';

import { RaceOverviewMap } from "./RaceOverviewMap";
import { RaceWindInstrument } from "./RaceWindInstrument";
import { useRaceNavigationCopy } from "./navigation-copy";
import type { RaceNavigationSnapshot, RaceWindReading } from "./navigation-model";
import type { WindDisplay } from "@/lib/race-visual-prefs";
import { ExpandIcon } from "./RaceIcons";
import styles from "./RaceCornerInstruments.module.css";

/** The corner map as a button (F3): a tap opens the big map; the expand mark
 * in its corner says so, and its accessible name is "Open course map". */
export function RaceMiniMapButton({ navigation, onOpenMap, you, fleet }: {
  navigation: RaceNavigationSnapshot; onOpenMap: () => void; you: string; fleet: string;
}) {
  const c = useRaceNavigationCopy();
  return <button type="button" className={styles.map} onClick={onOpenMap}
    aria-label={c.openMap} title={c.openMap} aria-haspopup="dialog" data-testid="race-mini-map-button">
    <RaceOverviewMap snapshot={navigation} width={128} height={128} compact
      labels={{ ...c, north: c.northShort, title: c.map, you, fleet }} />
    <span className={styles.expand} aria-hidden="true"><ExpandIcon size={16} /></span>
  </button>;
}

/** Read the existing HUD snapshots, never another simulation or render loop. */
export function RaceCornerInstruments({ navigation, wind, windDisplay, miniMap, onOpenMap, you, fleet }: {
  navigation: RaceNavigationSnapshot | null; wind: RaceWindReading | null;
  windDisplay: WindDisplay; miniMap: boolean; onOpenMap: () => void; you: string; fleet: string;
}) {
  const c = useRaceNavigationCopy();
  return <section className={styles.instruments} aria-label={`${c.map} · ${c.wind}`} data-testid="race-corner-instruments">
    <div className={styles.wind} data-testid="race-corner-wind">
      <span className={styles.label}>{c.wind}</span>
      <RaceWindInstrument reading={wind} display={windDisplay} compact />
    </div>
    {miniMap && navigation && <RaceMiniMapButton navigation={navigation} onOpenMap={onOpenMap} you={you} fleet={fleet} />}
  </section>;
}
