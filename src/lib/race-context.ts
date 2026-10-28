export const PHYSICAL_RACE_PROFILES = Object.freeze(["short", "medium", "long"] as const);
export type PhysicalRaceProfile = typeof PHYSICAL_RACE_PROFILES[number];

type RaceCoordinates = {
  readonly version: 1;
  readonly geometryRevision: 1;
  readonly coordinateUnits: "race-world-v1";
  readonly metresPerUnit: 0.6;
};
export type LegacyRaceContext = RaceCoordinates & { readonly model: "legacy-race-v1"; readonly profile: "standard" };
export type PhysicalRaceContext = RaceCoordinates & { readonly model: "physical-cruiser-v1"; readonly profile: PhysicalRaceProfile };
export type RaceContext = LegacyRaceContext | PhysicalRaceContext;
export type RaceClassId = "legacy-race-v1:standard:r1" | `physical-cruiser-v1:${PhysicalRaceProfile}:r1`;
export type ReadRaceContext = { ok: true; context: RaceContext } | { ok: false; reason: "invalid" | "unsupported" };

// Readers must land before any new result can enter the legacy score buckets.
// Enable only with the native/PB/server class and physical engine checkpoints.
export const PHYSICAL_RACE_EMISSION_ENABLED = false;

const coordinates = { version: 1, geometryRevision: 1, coordinateUnits: "race-world-v1", metresPerUnit: 0.6 } as const;
export const LEGACY_RACE_CONTEXT: LegacyRaceContext = Object.freeze({ ...coordinates, model: "legacy-race-v1", profile: "standard" });
const physical: Readonly<Record<PhysicalRaceProfile, PhysicalRaceContext>> = Object.freeze({
  short: Object.freeze({ ...coordinates, model: "physical-cruiser-v1", profile: "short" }),
  medium: Object.freeze({ ...coordinates, model: "physical-cruiser-v1", profile: "medium" }),
  long: Object.freeze({ ...coordinates, model: "physical-cruiser-v1", profile: "long" }),
});

export function physicalRaceContext(profile: PhysicalRaceProfile): PhysicalRaceContext {
  if (!(PHYSICAL_RACE_PROFILES as readonly string[]).includes(profile)) throw new RangeError("Unsupported physical race profile");
  return physical[profile];
}

/** Absence belongs to historical records. Explicit future metadata must never
 * be reinterpreted as legacy, pixel coordinates or a current default course. */
export function readRaceContext(value: unknown): ReadRaceContext {
  if (value === undefined || value === null) return { ok: true, context: LEGACY_RACE_CONTEXT };
  if (typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "invalid" };
  const a = value as Record<string, unknown>;
  if (![a.version, a.geometryRevision].every(n => typeof n === "number" && Number.isInteger(n) && n >= 1)
    || typeof a.model !== "string" || typeof a.profile !== "string" || typeof a.coordinateUnits !== "string"
    || typeof a.metresPerUnit !== "number" || !Number.isFinite(a.metresPerUnit) || a.metresPerUnit <= 0) return { ok: false, reason: "invalid" };
  if (a.version !== 1 || a.geometryRevision !== 1 || a.coordinateUnits !== "race-world-v1" || a.metresPerUnit !== 0.6) return { ok: false, reason: "unsupported" };
  if (a.model === "legacy-race-v1" && a.profile === "standard") return { ok: true, context: LEGACY_RACE_CONTEXT };
  if (a.model === "physical-cruiser-v1" && (PHYSICAL_RACE_PROFILES as readonly string[]).includes(a.profile)) {
    return { ok: true, context: physicalRaceContext(a.profile as PhysicalRaceProfile) };
  }
  return { ok: false, reason: "unsupported" };
}

/** Base course class only. Record buckets additionally include mode and race
 * conditions; the server derives a class from validated metadata. */
export function raceClassId(context: RaceContext): RaceClassId {
  const read = readRaceContext(context);
  if (!read.ok) throw new RangeError("Unsupported race context");
  return `${read.context.model}:${read.context.profile}:r1` as RaceClassId;
}
