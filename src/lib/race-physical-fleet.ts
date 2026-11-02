import { readRaceContext, type PhysicalRaceContext } from "./race-context";
import { advancePhysicalRaceProgress, physicalRaceGates, physicalRaceStage, type PhysicalRaceStage } from "./race-physical-progress";
import { isPhysicalRaceBoat, isPhysicalRaceInput, stepPhysicalBoat, type PhysicalRaceInput, type PhysicalRaceMotion } from "./race-physical-motion";
import { avoidPhysicalBotHeading, physicalBotRudder, physicalBotTrajectory, physicalHumanCone, planPhysicalBot, PHYSICAL_FLEET_HZ,
  type PhysicalBotPerception, type PhysicalBotState } from "./race-physical-bot";
import type { RaceBoat, RaceCourse, Vec2 } from "./race-physics";
import type { PhysicalRaceContact } from "./race-physical-contact";
import { constrainPhysicalRaceTravel, type PhysicalRaceImpact } from "./race-physical-response";
import { physicalCourseDefinition, physicalCourseWaterBounds } from "./race-courses";
// M5 step 6: the metric route hint travels with the lazily loaded metric engine.
export { planPhysicalRaceGuidance } from "./race-guidance-physical";

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
  /** Travelled motion per active boat after contact, with its polyline bends. */
  readonly motions: ReadonlyMap<string, PhysicalRaceMotion>;
  readonly contacts: readonly PhysicalRaceContact[];
  readonly initialContacts: readonly PhysicalRaceContact[];
  readonly impacts: readonly PhysicalRaceImpact[];
  readonly progress: readonly { boatId: string; stage: PhysicalRaceStage;
    event: "start" | "round-east" | "round-north" | "mark" | "finish" | null }[];
}
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const stateKeys = new Set(["version", "profile", "tick", "lap", "tack", "shed", "down", "turnSide", "dip", "finishLoop", "plannedHeading", "predictive", "stall", "escape"]);
const stages: readonly PhysicalRaceStage[] = ["start", "round-east", "round-north", "round-west", "finish", "complete"];
function copyState(value: PhysicalBotState | undefined, context: PhysicalRaceContext, lap: number): PhysicalBotState | null {
  if (value === undefined) return { version: 1, profile: context.profile, tick: 0, lap };
  if (!object(value) || Object.keys(value).some(key => !stateKeys.has(key))
    || value.version !== 1 || value.profile !== context.profile || !Number.isSafeInteger(value.tick) || value.tick < 0
    || ![0, 1, 2].includes(value.lap) || value.lap > lap
    || value.tack !== undefined && value.tack !== -1 && value.tack !== 1
    || value.turnSide !== undefined && value.turnSide !== -1 && value.turnSide !== 1
    || [value.shed, value.down].some(v => v !== undefined && typeof v !== "boolean")
    || value.plannedHeading !== undefined && !finite(value.plannedHeading)
    || value.dip !== undefined && (!object(value.dip) || typeof value.dip.ccw !== "boolean"
      || !finite(value.dip.x) || !finite(value.dip.r) || value.dip.r <= 0)
    || value.finishLoop !== undefined && (!object(value.finishLoop) || typeof value.finishLoop.ccw !== "boolean")
    || value.predictive !== undefined && (!object(value.predictive) || !finite(value.predictive.heading)
      || !finite(value.predictive.until) || value.predictive.until < value.tick / PHYSICAL_FLEET_HZ - 1e-7
      || value.predictive.until > value.tick / PHYSICAL_FLEET_HZ + .5 + 1e-7 || !stages.includes(value.predictive.stage))
    || value.stall !== undefined && (!Number.isSafeInteger(value.stall) || value.stall < 0)
    // A committed escape ends within its hold (ADR-0015 point 5), never before this tick.
    || value.escape !== undefined && (!object(value.escape) || Object.keys(value.escape).some(key => key !== "heading" && key !== "until")
      || !finite(value.escape.heading) || !finite(value.escape.until)
      || value.escape.until < value.tick / PHYSICAL_FLEET_HZ - 1e-7
      || value.escape.until > value.tick / PHYSICAL_FLEET_HZ + physicalCourseDefinition(context.profile).bots.escape.holdSeconds + 1e-7)) return null;
  return { ...value, ...(value.dip ? { dip: { ...value.dip } } : {}),
    ...(value.finishLoop ? { finishLoop: { ...value.finishLoop } } : {}),
    ...(value.predictive ? { predictive: { ...value.predictive } } : {}),
    ...(value.escape ? { escape: { ...value.escape } } : {}) };
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
 * use the shared force/helm laws and grade only impact-constrained travel.
 * Recovery precedes travel and cannot award gates. Judging, recorder, live
 * user steering and result emission remain unwired. One call is exactly one
 *30Hz engine tick. Its integer clock
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
  const context = read.context;
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
  const definition = physicalCourseDefinition(context.profile), m = context.metresPerUnit;
  const water = physicalCourseWaterBounds(context.profile), prediction = definition.bots.prediction;
  const coast = { windDir: frame.windDir, noGoTwaDeg: prediction.noGoTwaDeg, tauSeconds: prediction.coastTauSeconds };
  const perception: PhysicalBotPerception[] = boats.flatMap((boat, i) => {
    if (boat.lapDone === 2) return [];
    const input = entries[i].input;
    const memory = navigation.get(boat.id);
    // Observe the last actual avoidance command, not a nominal route that
    // the other boat is currently steering away from. New decisions remain
    // simultaneous; an unknown future reaction is never treated as certain.
    const target = input === "bot" ? memory!.predictive?.stage === physicalRaceStage(boat)
      ? memory!.predictive.heading : memory!.plannedHeading! : input.steering;
    const path = physicalBotTrajectory(boat, target, m, water, coast);
    // ADR-0015 point 5: bots cannot know the player's next input, so they
    // keep clear of a cone around its heading with extra room, whatever the
    // right of way.
    return [input === "bot" ? { id: boat.id, path }
      : { id: boat.id, path, alternatives: physicalHumanCone(boat, prediction.humanConeDeg, m, water), extraMetres: prediction.humanExtraMetres }];
  });
  // Contact normals from this frame's start positions (the previous tick's
  // result), taken for every boat before any boat moves: a pure planner
  // input, away from every hull whose centre is within the escape contact
  // distance, independent of entry order.
  const touchUnits = definition.bots.escape.contactCentreMetres / m;
  const contactNormals = new Map<string, Vec2 | null>(boats.map(boat => {
    let x = 0, y = 0, touching = false;
    for (const other of boats) {
      if (other === boat || other.lapDone === 2) continue;
      const dx = boat.pos.x - other.pos.x, dy = boat.pos.y - other.pos.y, gap = Math.hypot(dx, dy);
      if (gap > touchUnits) continue;
      touching = true;
      if (gap > 0) { x += dx / gap; y += dy / gap; }
    }
    const length = Math.hypot(x, y);
    return [boat.id, !touching ? null : length > 1e-9 ? { x: x / length, y: y / length } : { x: 1, y: 0 }];
  }));
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i], boat = boats[i];
    if (boat.lapDone === 2) continue;
    let input: PhysicalRaceInput;
    if (entry.input === "bot") {
      const state = navigation.get(boat.id)!;
      const heading = avoidPhysicalBotHeading(boat, perception, state.plannedHeading!, read.context, frame.course, state,
        { windDir: frame.windDir, contactNormal: contactNormals.get(boat.id) ?? null });
      input = { steering: { mode: "helm", rudder: physicalBotRudder(boat.heading, heading), lowSpeedAssist: true }, autoTrim: true };
    } else input = entry.input;
    // ADR-0015 point 5: bots sail the player's boat step, crew and rig
    // transfer included (ADR-0014 had them on an instant sail transfer).
    const motion = stepPhysicalBoat(boat, frame.dt, frame.windDir, frame.gust, input, read.context,
      { speedMul: entry.speedMul, windStrengthMul: frame.windStrengthMul, rigTransfer: true });
    if (!motion || !isPhysicalRaceBoat(boat)) return null;
    motions.set(boat.id, motion);
  }
  const response = constrainPhysicalRaceTravel({ boats, motions, context: read.context, course: frame.course, dt: frame.dt });
  if (!response) return null;
  for (const boat of boats) {
    const travelled = response.motions.get(boat.id);
    if (!travelled) continue;
    boat.pos = { ...travelled.to };
    const damping = response.speedMultipliers.get(boat.id)!;
    boat.speed *= damping;
    if (boat.physics) boat.physics.boatSpeed *= damping;
  }
  const progress: PhysicalFleetStep["progress"][number][] = [];
  for (const boat of boats) {
    // The whole travelled polyline (ADR-0015: sliding bends it) goes to
    // progress here and to the caller in `motions`, never just its chord.
    const motion = response.motions.get(boat.id) ?? { from: boat.pos, to: boat.pos };
    const result = advancePhysicalRaceProgress(boat, motion, read.context, frame.course, frame.raceTime, frame.racing);
    if (!result || !isPhysicalRaceBoat(boat)) return null;
    progress.push({ boatId: boat.id, ...result });
  }
  return { boats, navigation, motions: response.motions, contacts: response.contacts,
    initialContacts: response.initialContacts, impacts: response.impacts, progress };
}
