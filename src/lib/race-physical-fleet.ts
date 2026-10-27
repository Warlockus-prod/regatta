import { readRaceContext, type PhysicalRaceContext } from "./race-context";
import { advancePhysicalRaceProgress, physicalRaceGates, type PhysicalRaceStage } from "./race-physical-progress";
import { isPhysicalRaceBoat, isPhysicalRaceInput, stepPhysicalBoat, type PhysicalRaceInput, type PhysicalRaceMotion } from "./race-physical-motion";
import { avoidPhysicalBotHeading, physicalBotRudder, physicalBotTrajectory, planPhysicalBot, PHYSICAL_FLEET_HZ, type PhysicalBotState } from "./race-physical-bot";
import { resolveCollisions, type RaceBoat, type RaceCourse } from "./race-physics";

export interface PhysicalFleetEntry {
  readonly boat: RaceBoat;
  readonly input: PhysicalRaceInput | "bot";
  readonly speedMul?: number;
}
export interface PhysicalFleetFrame {
  readonly entries: readonly PhysicalFleetEntry[];
  readonly navigation?: ReadonlyMap<string, PhysicalBotState>;
  readonly context: PhysicalRaceContext;
  readonly course: RaceCourse;
  readonly dt: number;
  readonly raceTime: number;
  readonly racing: boolean;
  readonly windDir: number;
  readonly gust: number;
  readonly windStrengthMul: number;
}
export interface PhysicalFleetStep {
  readonly boats: RaceBoat[];
  readonly navigation: ReadonlyMap<string, PhysicalBotState>;
  readonly motions: ReadonlyMap<string, PhysicalRaceMotion>;
  readonly progress: readonly { boatId: string; stage: PhysicalRaceStage;
    event: "start" | "round-east" | "round-north" | "mark" | "finish" | null }[];
}
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const stateKeys = new Set(["version", "profile", "tick", "lap", "tack", "shed", "down", "dip", "finishLoop", "plannedHeading", "predictive"]);
const stages: readonly PhysicalRaceStage[] = ["start", "round-east", "round-north", "round-west", "finish", "complete"];
function copyState(value: PhysicalBotState | undefined, context: PhysicalRaceContext, lap: number): PhysicalBotState | null {
  if (value === undefined) return { version: 1, profile: context.profile, tick: 0, lap };
  if (!object(value) || Object.keys(value).some(key => !stateKeys.has(key))
    || value.version !== 1 || value.profile !== context.profile || !Number.isSafeInteger(value.tick) || value.tick < 0
    || ![0, 1, 2].includes(value.lap) || value.lap > lap
    || value.tack !== undefined && value.tack !== -1 && value.tack !== 1
    || [value.shed, value.down].some(v => v !== undefined && typeof v !== "boolean")
    || value.plannedHeading !== undefined && !finite(value.plannedHeading)
    || value.dip !== undefined && (!object(value.dip) || typeof value.dip.ccw !== "boolean"
      || !finite(value.dip.x) || !finite(value.dip.r) || value.dip.r <= 0)
    || value.finishLoop !== undefined && (!object(value.finishLoop) || typeof value.finishLoop.ccw !== "boolean")
    || value.predictive !== undefined && (!object(value.predictive) || !finite(value.predictive.heading)
      || !finite(value.predictive.until) || value.predictive.until < value.tick / PHYSICAL_FLEET_HZ - 1e-7
      || value.predictive.until > value.tick / PHYSICAL_FLEET_HZ + .5 + 1e-7 || !stages.includes(value.predictive.stage))) return null;
  return { ...value, ...(value.dip ? { dip: { ...value.dip } } : {}),
    ...(value.finishLoop ? { finishLoop: { ...value.finishLoop } } : {}),
    ...(value.predictive ? { predictive: { ...value.predictive } } : {}) };
}
function copyBoat(boat: RaceBoat): RaceBoat | null {
  if (!isPhysicalRaceBoat(boat) || typeof boat.id !== "string" || !boat.id.trim() || boat.id.length > 100) return null;
  const a = boat.autopilot;
  if (a !== undefined && (!object(a) || ![0, 1, 2].includes(a.lap)
    || a.tack !== undefined && a.tack !== -1 && a.tack !== 1
    || [a.shed, a.down].some(v => v !== undefined && typeof v !== "boolean")
    || a.dip !== undefined && (!object(a.dip) || typeof a.dip.ccw !== "boolean" || !finite(a.dip.x) || !finite(a.dip.r) || a.dip.r <= 0)
    || a.finishLoop !== undefined && (!object(a.finishLoop) || typeof a.finishLoop.ccw !== "boolean"))) return null;
  return { ...boat, pos: { ...boat.pos }, ...(boat.physics ? { physics: { ...boat.physics } } : {}),
    ...(boat.trim ? { trim: { ...boat.trim } } : {}), ...(a ? { autopilot: { ...a,
      ...(a.dip ? { dip: { ...a.dip } } : {}), ...(a.finishLoop ? { finishLoop: { ...a.finishLoop } } : {}) } } : {}) };
}

/** Explicit, unwired physical fleet transaction. Validate every driver and
 * navigation state before working on copies. Plan from one perception frame;
 * use the shared force/helm laws and grade propelled motion before separation.
 * No hardware response, judging, recorder, user steering or result emission is
 * enabled here. One call is exactly one 30 Hz engine tick. Its integer clock
 * also advances during countdown independently of the official race clock;
 * a paused engine does not call this function. */
export function stepPhysicalRaceFleet(frame: PhysicalFleetFrame): PhysicalFleetStep | null {
  if (!object(frame)) return null;
  const read = readRaceContext(frame.context);
  if (!read.ok || read.context.model !== "physical-cruiser-v1" || !physicalRaceGates(read.context, frame.course)
    || !Array.isArray(frame.entries) || frame.entries.length < 1 || frame.entries.length > 5
    || frame.navigation !== undefined && (!(frame.navigation instanceof Map) || frame.navigation.size > 5)
    || frame.dt !== 1 / PHYSICAL_FLEET_HZ || !finite(frame.raceTime) || frame.raceTime < 0
    || typeof frame.racing !== "boolean" || !finite(frame.windDir) || !finite(frame.gust) || frame.gust < 0
    || !finite(frame.windStrengthMul) || frame.windStrengthMul < 0) return null;
  const boats: RaceBoat[] = [], motions = new Map<string, PhysicalRaceMotion>(), navigation = new Map<string, PhysicalBotState>();
  const ids = new Set<string>();
  const entries: PhysicalFleetFrame["entries"] = frame.entries;
  for (const entry of entries) {
    if (!object(entry) || entry.speedMul !== undefined && !finite(entry.speedMul)
      || entry.input !== "bot" && !isPhysicalRaceInput(entry.input)) return null;
    const boat = copyBoat(entry.boat);
    if (!boat || ids.has(boat.id)) return null;
    ids.add(boat.id);
    if (!advancePhysicalRaceProgress(boat, { from: boat.pos, to: boat.pos }, read.context, frame.course, frame.raceTime, false)) return null;
    if (entry.input === "bot") {
      const state = copyState(frame.navigation?.get(boat.id), read.context, boat.lapDone);
      if (!state) return null;
      navigation.set(boat.id, state);
    } else if (frame.navigation?.has(boat.id)) return null;
    boats.push(boat);
  }
  if (frame.navigation && [...frame.navigation.keys()].some(id => !navigation.has(id))) return null;
  for (const boat of boats) {
    const state = navigation.get(boat.id);
    if (!state || boat.lapDone === 2) continue;
    state.tick += 1;
    if (!Number.isSafeInteger(state.tick)) return null;
    state.plannedHeading = planPhysicalBot(boat, frame.course, frame.windDir, read.context, state).heading;
  }
  // Immutable positions, headings and shared steering inputs for this frame.
  const perception = boats.flatMap((boat, i) => {
    if (boat.lapDone === 2) return [];
    const input = entries[i].input;
    const target = input === "bot" ? navigation.get(boat.id)!.plannedHeading! : input.steering;
    return [{ id: boat.id, path: physicalBotTrajectory(boat, target, read.context.metresPerUnit) }];
  });
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i], boat = boats[i];
    if (boat.lapDone === 2) continue;
    let input: PhysicalRaceInput;
    if (entry.input === "bot") {
      const state = navigation.get(boat.id)!;
      const heading = avoidPhysicalBotHeading(boat, perception, state.plannedHeading!, frame.windDir, read.context, state);
      input = { steering: { mode: "helm", rudder: physicalBotRudder(boat.heading, heading), lowSpeedAssist: true }, autoTrim: true };
    } else input = entry.input;
    const motion = stepPhysicalBoat(boat, frame.dt, frame.windDir, frame.gust, input, read.context,
      { speedMul: entry.speedMul, windStrengthMul: frame.windStrengthMul });
    if (!motion || !isPhysicalRaceBoat(boat)) return null;
    motions.set(boat.id, motion);
  }
  resolveCollisions(boats, frame.dt);
  const progress: PhysicalFleetStep["progress"][number][] = [];
  for (const boat of boats) {
    const motion = motions.get(boat.id) ?? { from: boat.pos, to: boat.pos };
    const result = advancePhysicalRaceProgress(boat, motion, read.context, frame.course, frame.raceTime, frame.racing);
    if (!result || !isPhysicalRaceBoat(boat)) return null;
    progress.push({ boatId: boat.id, ...result });
  }
  return { boats, navigation, motions, progress };
}
