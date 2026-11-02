'use client';

import { useI18n } from "@/lib/i18n";
import { RaceWindInstrument } from "../../race-hud/RaceWindInstrument";
import { useRaceNavigationCopy } from "../../race-hud/navigation-copy";
import { knotsText } from "../../race-hud/units";
import type { SimulationModel } from "./shared";
import { trainerWindSnapshot } from "./trainer-wind";
import styles from "./TrainerWindInstrument.module.css";

/**
 * The race wind card over the Trainer scene (TestFlight 74 feedback): the
 * bow-relative wind angle with its side, TWD, the true wind speed and the
 * boat speed, read from the live session the scene draws. Top-left, like the
 * race corner box. `dial` shows the bow-up dial (3D); the top view already
 * draws the wind around the boat, so it keeps the text only and stays clear of
 * the no-go sector.
 */
export function TrainerWindInstrument({ sim, dial }: { sim: Pick<SimulationModel, "session">; dial: boolean }) {
  const { lang, tl } = useI18n();
  const c = useRaceNavigationCopy();
  const { wind, boatKnots } = trainerWindSnapshot(sim.session?.boat);
  const boatLabel = tl({ ru: "Лодка", en: "Boat", pl: "Jacht", es: "Barco", fr: "Bateau", de: "Boot", it: "Barca" });
  const boatSpeedName = tl({ ru: "Скорость лодки", en: "Boat speed", pl: "Prędkość jachtu", es: "Velocidad del barco", fr: "Vitesse du bateau", de: "Bootsgeschwindigkeit", it: "Velocità della barca" });
  return <section className={styles.layer} aria-label={c.wind} data-testid="trainer-wind-layer">
    <div className={styles.box} data-dial={dial || undefined} data-testid="trainer-wind-box">
      {/* The heading stays visible in every view: the compact race card hides
          its own TWA tag, and a bare angle next to the drawing's AW label
          would not say which wind it is. */}
      <span className={styles.label} data-testid="trainer-wind-heading">{c.wind}<span aria-hidden="true"> TWA</span></span>
      <RaceWindInstrument reading={wind} display={dial ? "compass" : "off"} compact />
      <p className={styles.boat} title={boatSpeedName}>
        <span aria-hidden="true">{boatLabel}</span><span className="sr-only">{boatSpeedName}: </span>
        <b data-testid="trainer-boat-speed">{boatKnots == null ? c.unknown : knotsText(lang, boatKnots)}</b>
      </p>
    </div>
  </section>;
}
