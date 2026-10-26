export const WIND_DISPLAYS = ["off", "compass", "arrows", "both"] as const;
export type WindDisplay = typeof WIND_DISPLAYS[number];

export interface RaceAssists {
  guidance: boolean;
  trimHints: boolean;
  rules: boolean;
  penalties: boolean;
  windDisplay: WindDisplay;
  miniMap: boolean;
}

export const DEFAULT_RACE_ASSISTS: Readonly<RaceAssists> = Object.freeze({
  guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true,
});

export function isWindDisplay(value: unknown): value is WindDisplay {
  return typeof value === "string" && (WIND_DISPLAYS as readonly string[]).includes(value);
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
    windDisplay: isWindDisplay(value.windDisplay) ? value.windDisplay : isWindDisplay(fallback.windDisplay) ? fallback.windDisplay : DEFAULT_RACE_ASSISTS.windDisplay,
  };
}
