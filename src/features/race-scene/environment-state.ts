import type { YachtState } from "@/features/simulator-3d/types";

export const SAILING_SUN: [number, number, number] = [56, 64, 28];
export interface WorldPoint { x: number; z: number }
export type SailingState = Pick<YachtState, "travel" | "wind" | "speedKn" | "heading">;
export interface SailingHull { id: string; travel: WorldPoint; heading: number; speedKn: number }
export interface SailingEnvironmentFrame {
  travel: WorldPoint;
  flow: WorldPoint;
  windiness: number;
}
const finite = (value: number | undefined, fallback: number) => value !== undefined && Number.isFinite(value) ? value : fallback;

/** Both scene adapters use world travel for the waves. Heading rotates the
 * yacht, never the water or the venue around it. Calm wind stays calm. */
export function sailingEnvironmentFrame(state: SailingState | null): SailingEnvironmentFrame {
  const from = finite(state?.wind?.from, 0) * Math.PI / 180;
  const knots = Math.max(0, finite(state?.wind?.knots, 12));
  return {
    travel: { x: finite(state?.travel?.x, 0), z: finite(state?.travel?.z, 0) },
    flow: { x: -Math.sin(from), z: Math.cos(from) },
    windiness: Math.min(1, knots / 18),
  };
}

/** The trainer starts at travel (0,0), in the middle of the same venue chart
 * the race uses. Offsetting the chart preserves the yacht/water wave phase. */
export function trainerChartOrigin(area: { width: number; height: number }, metresPerUnit: number): WorldPoint {
  return { x: area.width * metresPerUnit / 2, z: area.height * metresPerUnit / 2 };
}

/** A posed trainer has no travel or speed, so it leaves no moving wake. */
export function sailingHull(state: SailingState | null, id = "player"): SailingHull {
  return { id, travel: sailingEnvironmentFrame(state).travel,
    heading: finite(state?.heading, 90), speedKn: Math.max(0, finite(state?.speedKn, 0)) };
}
