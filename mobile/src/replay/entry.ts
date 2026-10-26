import { readRaceContext } from "../../../src/lib/race-context";
import { validateNativeRace } from "../../../src/lib/race-native";

export type NativeReplayEntry =
  | { kind: "missing" }
  | { kind: "legacy-pixel" }
  | { kind: "shared" }
  | { kind: "unavailable"; reason: "unsupported" | "corrupt" };

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Only historical records without a canonical payload belong to the pixel
 * viewer. A rejected world-space payload must never be rescaled as pixels. */
export function classifyNativeReplayEntry(record: unknown): NativeReplayEntry {
  if (record === null || record === undefined) return { kind: "missing" };
  if (!object(record)) return { kind: "unavailable", reason: "corrupt" };
  if (record.webRace === undefined) return { kind: "legacy-pixel" };
  const value = record.webRace;
  if (!object(value)) return { kind: "unavailable", reason: "corrupt" };
  if (value.schema !== 1) return {
    kind: "unavailable",
    reason: typeof value.schema === "number" && Number.isInteger(value.schema) && value.schema > 1 ? "unsupported" : "corrupt",
  };
  const context = readRaceContext(value.raceContext);
  if (!context.ok) return { kind: "unavailable", reason: context.reason === "unsupported" ? "unsupported" : "corrupt" };
  return validateNativeRace(value) ? { kind: "shared" } : { kind: "unavailable", reason: "corrupt" };
}
