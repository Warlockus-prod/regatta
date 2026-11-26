export const WIND_DISPLAYS = ["off", "compass", "arrows", "both"] as const;
export type WindDisplay = typeof WIND_DISPLAYS[number];

export interface RaceAssists {
  guidance: boolean;
  trimHints: boolean;
  rules: boolean;
  penalties: boolean;
  windDisplay: WindDisplay;
  miniMap: boolean;
  /** F4: the one-line coach advice in the dock (on a phone, floating over the scene's lower edge). */
  coachStrip: boolean;
  /** F4: the first race hints of M4-7, shown once per device. */
  firstRaceHints: boolean;
  /** F4: softer light in the race scene (less glare, a slightly darker picture) and larger marks with a dark ring. */
  softLight: boolean;
  /** F6: apparent-wind ribbons along the player's sails in the race scene (off by default). */
  sailFlow: boolean;
}

export const DEFAULT_RACE_ASSISTS: Readonly<RaceAssists> = Object.freeze({
  guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true,
  coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false,
});

export function isWindDisplay(value: unknown): value is WindDisplay {
  return typeof value === "string" && (WIND_DISPLAYS as readonly string[]).includes(value);
}

/** A stored boolean, else the fallback's, else the default (a record written before the field existed). */
function flag(value: unknown, fallback: unknown, standard: boolean): boolean {
  return typeof value === "boolean" ? value : typeof fallback === "boolean" ? fallback : standard;
}

/** Legacy and malformed records keep valid fields without admitting new enum values. */
export function sanitizeRaceAssists(raw: unknown, fallback: Readonly<RaceAssists> = DEFAULT_RACE_ASSISTS): RaceAssists {
  const value = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    guidance: typeof value.guidance === "boolean" ? value.guidance : fallback.guidance,
    trimHints: typeof value.trimHints === "boolean" ? value.trimHints : fallback.trimHints,
    rules: typeof value.rules === "boolean" ? value.rules : fallback.rules,
    penalties: typeof value.penalties === "boolean" ? value.penalties : fallback.penalties,
    miniMap: typeof value.miniMap === "boolean" ? value.miniMap : typeof fallback.miniMap === "boolean" ? fallback.miniMap : true,
    coachStrip: flag(value.coachStrip, fallback.coachStrip, DEFAULT_RACE_ASSISTS.coachStrip),
    firstRaceHints: flag(value.firstRaceHints, fallback.firstRaceHints, DEFAULT_RACE_ASSISTS.firstRaceHints),
    softLight: flag(value.softLight, fallback.softLight, DEFAULT_RACE_ASSISTS.softLight),
    sailFlow: flag(value.sailFlow, fallback.sailFlow, DEFAULT_RACE_ASSISTS.sailFlow),
    windDisplay: isWindDisplay(value.windDisplay) ? value.windDisplay : isWindDisplay(fallback.windDisplay) ? fallback.windDisplay : DEFAULT_RACE_ASSISTS.windDisplay,
  };
}
