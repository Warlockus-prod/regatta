/**
 * Live-weather provider contract (Phase 1 of docs/design/live-weather/DESIGN.md).
 *
 * A WeatherProvider returns a single "now" snapshot for a lat/lon. Wind is
 * always present; wave data is optional (null for inland points or when the
 * marine model has no coverage). Every snapshot carries an attribution string
 * that clients are required to display (Open-Meteo CC BY 4.0, etc).
 */

export interface WeatherNow {
  /** Provider id, e.g. 'open-meteo'. */
  provider: string;
  /** ISO-8601 forecast time the snapshot is for. */
  ts: string;
  wind: {
    /** Wind speed in knots. */
    speedKn: number;
    /** Direction the wind is coming FROM, degrees true (0-360). */
    dirDeg: number;
    /** Gust speed in knots, or null when the provider gives no gust value. */
    gustKn: number | null;
  };
  /** Wave snapshot, or null when no marine data is available for this point. */
  wave: {
    /** Significant wave height in metres. */
    heightM: number;
    /** Mean wave direction, degrees true (0-360). */
    dirDeg: number;
    /** Mean wave period in seconds. */
    periodS: number;
  } | null;
  /**
   * Ocean / tidal current snapshot, or null when the marine model gives no
   * current for this point (inland, no coverage, or zero velocity). Optional
   * and additive (Phase 3 of docs/design/live-weather/DESIGN.md): older
   * clients ignore it, the synthetic sim is unaffected.
   */
  current?: {
    /** Current speed in knots. */
    setKn: number;
    /** Compass direction the current flows TOWARD, degrees true (0-360). */
    dirDeg: number;
  } | null;
  /** Required attribution string clients must display. */
  attribution: string;
}

export interface WeatherProvider {
  /** Stable provider id (matches WeatherNow.provider). */
  id: string;
  /** Fetch the current wind/wave snapshot for a coordinate. Throws on failure. */
  getNow(lat: number, lon: number): Promise<WeatherNow>;
}
