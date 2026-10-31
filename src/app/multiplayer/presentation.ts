import type { Snapshot } from "@/lib/mp-client";
import { angleDiff, makeStandardCourse, normalizeAngle, raceTrim } from "@/lib/race-physics";
import { trimForDrive } from "@/lib/sailing-physics/polar";
import type { Controls } from "@/lib/sailing-physics/types";
import type { Race3DBoat } from "@/features/race-3d/pose";
import { guidanceToTarget, type RaceGuidance } from "@/lib/race-guidance";
import { FLEET_COLORS as BOAT_FLEET_COLORS } from "@/features/race-hud/boat-colors";

export const MULTIPLAYER_COURSE = makeStandardCourse();
/** M1-7: the shared race palette (boat-colors.ts), so no boat is the action
 * cyan. The solo player's violet stays out: here every boat is a person, and a
 * room of more than six repeats colours, each boat still named on its tag. */
export const FLEET_COLORS: readonly string[] = [...BOAT_FLEET_COLORS];
export interface MultiplayerFrame { boats: Race3DBoat[]; windDir: number; windKnots: number; time: number; guidance: RaceGuidance | null }
export interface MultiplayerHelmInput { left: boolean; right: boolean; rudder: number; course: number | null }

/** A presentation adapter, not a client race simulation. Every position,
 * speed, lap and finish comes from the interpolated authoritative snapshot.
 * The server does not publish rig/heel, so only automatic sail pose is
 * reconstructed locally; it never feeds back into motion or race results. */
export function createMultiplayerPresentation() {
  const colors = new Map<string, string>();
  const rig = new Map<string, { at: number; trim: Controls }>();
  return {
    reset() { colors.clear(); rig.clear(); },
    frame(snapshot: Snapshot, players: readonly { id: string; nickname: string }[], myId: string, windStrength: string): MultiplayerFrame {
      const windDir = Number.isFinite(snapshot.wind.dir) ? normalizeAngle(snapshot.wind.dir) : 0;
      const gust = Number.isFinite(snapshot.wind.gust) ? Math.max(0, snapshot.wind.gust) : 1;
      const windKnots = 12 * (windStrength === "light" ? 0.65 : windStrength === "heavy" ? 1.3 : 1) * gust;
      for (const player of players) if (!colors.has(player.id)) colors.set(player.id, FLEET_COLORS[colors.size % FLEET_COLORS.length]);
      const boats = snapshot.boats.filter(b => [b.x, b.y, b.h, b.s, b.l].every(Number.isFinite)).map(b => {
        if (!colors.has(b.id)) colors.set(b.id, FLEET_COLORS[colors.size % FLEET_COLORS.length]);
        const physics = { trueWindDir: windDir, trueWindSpeed: windKnots, heading: normalizeAngle(b.h), boatSpeed: b.s, heel: 0, leeway: 0 };
        let visual = rig.get(b.id);
        if (!visual || snapshot.t < visual.at || snapshot.t - visual.at >= 0.5) {
          visual = { at: snapshot.t, trim: trimForDrive(physics, visual?.trim ?? raceTrim(undefined)) };
          rig.set(b.id, visual);
        }
        return { id: b.id, name: players.find(player => player.id === b.id)?.nickname ?? "",
          color: colors.get(b.id)!, pos: { x: b.x, y: b.y }, heading: physics.heading, speed: b.s,
          lapDone: b.l, finishTime: b.f ?? undefined, isPlayer: b.id === myId,
          physics, trim: { ...visual.trim } };
      });
      const player = boats.find(boat => boat.isPlayer);
      const target = snapshot.boats.find(boat => boat.id === myId)?.target;
      const guidance = player && player.lapDone < 2 && player.finishTime === undefined && target && [target.x, target.y].every(Number.isFinite)
        ? guidanceToTarget(player, target, windDir) : null;
      return { boats, windDir, windKnots, time: snapshot.t, guidance };
    },
  };
}

/** Both wheel mappings use the existing, bounded input.turn wire command.
 * Heading hold is a client control aid over received headings, with no
 * prediction or locally advanced position. Keyboard steering takes priority. */
export function multiplayerTurn(input: MultiplayerHelmInput, heading: number): number {
  const keys = Number(input.right) - Number(input.left);
  if (keys !== 0) return keys;
  const value = input.course === null ? input.rudder : angleDiff(heading, input.course) / 12;
  return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
}

/** Sliders set an absolute heading, even when several events precede a render. */
export function withMultiplayerCourse(input: MultiplayerHelmInput, course: number): MultiplayerHelmInput {
  return Number.isFinite(course) ? { ...input, rudder: 0, course: normalizeAngle(course) } : input;
}
