import { distance, MIN_BOAT_SEPARATION, type RaceCourse, type Vec2 } from "./race-physics";

/** Start positions of the solo (legacy) race, M0-2.
 * The player keeps the old slot: centre of the line, 30 units below it, close
 * hauled on port (heading 45). Every bot starts on the same tack, in an echelon
 * behind and to the side, so nobody crosses the player on the other tack and
 * nobody overlaps the player to leeward. Slots stay inside the bots' start
 * corridor (`raceAutopilotPlan`, |x - centre| < 70), where they sail straight
 * up instead of looping, and clear of the start marks.
 * Bots, race physics and the multiplayer server are unchanged; the metric
 * race has the same echelon in metres in `physicalFleetSpawns` (M5). */
export const LEGACY_SPAWN = Object.freeze({
  maxOpponents: 4,
  playerBelowLine: 30,
  heading: 45,
  /** Sideways distance per slot. */
  slotSpacing: 34,
  /** Extra distance below the player per slot, so bots start clear astern. */
  slotStagger: 30,
});

export interface RaceSpawn { pos: Vec2; heading: number }

/** A bot's speedMul: the difficulty's aiSpeedMul with a little spread
 * (0.97-1.03). `random` is injectable for seeded runs (tests, a seeded e2e);
 * Math.random stays the production default. */
export function raceBotSpeedMul(aiSpeedMul: number, random: () => number = Math.random): number {
  return aiSpeedMul * (0.97 + random() * 0.06);
}

/** Bot slots alternate left and right of the player: -1, +1, -2, +2. */
const slotOf = (i: number) => (i % 2 ? 1 : -1) * Math.ceil((i + 1) / 2);

/** Player first, then `opponents` bots. Pure: a fresh array on every call. */
export function legacyRaceSpawns(course: RaceCourse, opponents: number): RaceSpawn[] {
  if (!Number.isInteger(opponents) || opponents < 0 || opponents > LEGACY_SPAWN.maxOpponents) {
    throw new RangeError("Unsupported legacy fleet size");
  }
  const { a, b } = course.startLine;
  const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const s = LEGACY_SPAWN;
  const spawns: RaceSpawn[] = [{ pos: { x: centre.x, y: centre.y + s.playerBelowLine }, heading: s.heading }];
  for (let i = 0; i < opponents; i++) {
    const slot = slotOf(i);
    spawns.push({
      pos: { x: centre.x + slot * s.slotSpacing, y: centre.y + s.playerBelowLine + Math.abs(slot) * s.slotStagger },
      heading: s.heading,
    });
  }
  return spawns;
}

/** Static checks a start layout must pass before any boat moves. */
export function spawnLayoutProblems(course: RaceCourse, spawns: readonly RaceSpawn[]): string[] {
  const problems: string[] = [];
  for (let i = 0; i < spawns.length; i++) {
    for (let j = i + 1; j < spawns.length; j++) {
      if (distance(spawns[i].pos, spawns[j].pos) < MIN_BOAT_SEPARATION) problems.push(`boats ${i} and ${j} overlap`);
    }
    for (const mark of course.marks) {
      if (distance(spawns[i].pos, mark.pos) < mark.radius + MIN_BOAT_SEPARATION) problems.push(`boat ${i} on mark ${mark.label}`);
    }
    if (spawns[i].heading !== spawns[0].heading) problems.push(`boat ${i} starts on a crossing course`);
  }
  return problems;
}
