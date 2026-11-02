// TestFlight 74 feedback (2026-11-01): the Trainer gets the same wind card as
// the race. This pure adapter turns the live trainer boat state into the race
// HUD's wind reading, so the card shows the physics the scene is drawing and
// never a slider target or a constant. No React, so it is unit tested.

import type { BoatState } from "@/lib/sailing-physics";
import type { CameraView } from "../../simulator-3d/camera";
import { raceWindReading, type RaceWindReading } from "../../race-hud/navigation-model";

export interface TrainerWindSnapshot {
  /** Bow-relative wind reading in the race HUD shape (TWA sign: + from starboard). */
  readonly wind: RaceWindReading | null;
  /** Boat speed through the water, knots; null when the state is broken. */
  readonly boatKnots: number | null;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function trainerWindSnapshot(boat: Pick<BoatState, "heading" | "trueWindDir" | "trueWindSpeed" | "boatSpeed" | "leeway"> | null | undefined): TrainerWindSnapshot {
  if (!boat) return Object.freeze({ wind: null, boatKnots: null });
  const boatKnots = finite(boat.boatSpeed) && boat.boatSpeed >= 0 ? boat.boatSpeed : null;
  const wind = raceWindReading({
    heading: boat.heading,
    windFrom: boat.trueWindDir,
    windKnots: boat.trueWindSpeed,
    boatSpeedKn: boatKnots ?? 0,
    leeway: finite(boat.leeway) ? boat.leeway : 0,
  });
  return Object.freeze({ wind, boatKnots });
}

/**
 * Which wind card the scene shows: the bow-up dial in 3D, text only on the top
 * view (the drawing already shows the wind around the boat) and on the 3D deck
 * camera (the dial would sit on the mainsail luff and the boom there), none on
 * the side and rear drawings, which keep their own header in that corner.
 */
export function trainerWindCardMode(view: string, boatView: CameraView): "dial" | "text" | null {
  if (view === "3d") return boatView === "deck" ? "text" : "dial";
  if (view === "top") return "text";
  return null;
}
