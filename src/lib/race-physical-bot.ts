import { physicalCourseDefinition, physicalCourseWaterBounds } from "./race-courses";
import type { PhysicalRaceContext, PhysicalRaceProfile } from "./race-context";
import { physicalRaceGates, physicalRaceStage, type PhysicalRaceStage } from "./race-physical-progress";
import { angleDiff, bearing, calcTWA, deg2rad, distance, normalizeAngle, rad2deg, segmentCrossed, type RaceBoat, type RaceCourse, type RaceRoutePath, type Vec2 } from "./race-physics";
import { advanceSailingHeading, sailingDisplacement, HELM_TURN_RATE_DEG_PER_S, KNOT_METRES_PER_SECOND, type SailingSteering } from "./sailing-kinematics";

/** Ephemeral, versioned physical bot state. The fleet boundary owns copies;
 * legacy boat.autopilot, user helm, saved races and diagnostics do not own it. */
export const PHYSICAL_FLEET_HZ = 30;
export interface PhysicalBotState {
  version: 1; profile: PhysicalRaceProfile; tick: number; lap: number;
  tack?: 1 | -1; shed?: boolean; down?: boolean;
  turnSide?: 1 | -1;
  dip?: { ccw: boolean; x: number; r: number };
  finishLoop?: { ccw: boolean };
  plannedHeading?: number;
  predictive?: { heading: number; until: number; stage: PhysicalRaceStage };
  /** Consecutive ticks in irons or pinned by a hull (ADR-0015 point 5). */
  stall?: number;
  /** A committed bear-away, held without re-evaluation until `until` (s). */
  escape?: { heading: number; until: number };
}
/** What the fleet tells a bot about this tick beyond the shared perception:
 * the wind, and the unit normal (race units, east x, south y) pointing away
 * from the hulls whose centres are within the escape contact distance. */
export interface PhysicalBotSituation {
  readonly windDir: number;
  readonly contactNormal?: Readonly<Vec2> | null;
}
/** Another boat's predicted centre paths in metres. A bot's own path is one
 * line; a boat no bot steers (the player) is a cone of lines and gets extra room. */
export interface PhysicalBotPerception {
  readonly id: string;
  readonly path: readonly Vec2[];
  readonly alternatives?: readonly (readonly Vec2[])[];
  readonly extraMetres?: number;
}
export interface PhysicalBotPlan { heading: number; turn: number; path: RaceRoutePath; beating: boolean; rounding: { center: Vec2; radius: number } }
interface PathFix { tangent: number; right: number; path: RaceRoutePath }

/** Same physical helm for planning, prediction and actual bot input. */
export function physicalBotRudder(heading: number, target: number): number {
  return Math.max(-1, Math.min(1, angleDiff(heading, target) / HELM_TURN_RATE_DEG_PER_S));
}

function onCircle(p: Vec2, c: Vec2, r: number, ccw: boolean): PathFix {
  const phi = bearing(c, p), d = distance(p, c);
  const path: RaceRoutePath = { kind: "circle", center: { ...c }, radius: r, ccw };
  return ccw ? { tangent: normalizeAngle(phi - 90), right: d - r, path } : { tangent: normalizeAngle(phi + 90), right: r - d, path };
}

function onVertical(p: Vec2, x: number, north: boolean, toY: number): PathFix {
  const path: RaceRoutePath = { kind: "vertical", x, north, to: { x, y: toY } };
  return north ? { tangent: 0, right: p.x - x, path } : { tangent: 180, right: x - p.x, path };
}

/** A stable offset in [-1, 1] per boat id, for spreading boats over lanes. */
function laneOf(id: string, lanes: number): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return ((h % lanes) / (lanes - 1)) * 2 - 1;
}

/** Internal helper for a validated fleet frame. Only the fleet-owned memory
 * copy changes. Geometry is explicit in metres; no legacy route default is
 * changed and there is no result emission or right-of-way adjudication. */
export function planPhysicalBot(boat: RaceBoat, course: RaceCourse, windDir: number, context: PhysicalRaceContext,
  st: PhysicalBotState): PhysicalBotPlan {
  const d = physicalCourseDefinition(context.profile), m = context.metresPerUnit, p = boat.pos;
  const A = { closeHauled: 45, lookahead: d.rounding.lookaheadMetres / m,
    loopRadius: d.rounding.radiusMetres / m, loopDrop: d.rounding.centreDropMetres / m,
    legMax: d.rounding.centreDropMetres / m, legShare: .55, finalMax: 90 / m, finalShare: .35,
    radiusGrowth: 1.15, shedHysteresis: .6, featherSlow: 12, featherFast: 3, fastMargin: .8,
    featherGain: .4, featherMax: 24, featherBand: 7.2 / m,
    band: { top: d.rounding.centreDropMetres / 2 / m, slope: .25, max: d.rounding.radiusMetres / m },
    startBand: 24 / m, loopBand: 18 / m,
    dip: { drop: 18 / m, minR: (d.rounding.radiusMetres + d.hardware.boatDiameterMetres / 2) / m,
      maxR: d.rounding.radiusMetres * 2 / m, slack: 15 / m },
    finishLoop: { drop: 30 / m, radius: 48 / m }, finishLanes: 7, finishLaneMargin: 15 / m };
  const radiusPerKnot = KNOT_METRES_PER_SECOND / m / deg2rad(HELM_TURN_RATE_DEG_PER_S);
  st.lap = boat.lapDone;
  const v = boat.speed > .05 ? boat.speed : 0;
  const line = boat.lapDone > 0 ? course.finishLine : course.startLine;
  const cx = (line.a.x + line.b.x) / 2, ly = line.a.y, half = Math.abs(line.b.x - line.a.x) / 2;
  const mark = course.marks[0].pos;
  const targetSpeed = A.loopRadius / (radiusPerKnot * A.radiusGrowth);
  if (st.dip && p.y >= ly + d.spawn.belowLineMetres / m && Math.abs(p.x - cx) < half - 6 / m) st.dip = undefined;
  let fix: PathFix;
  let band = 0;              // > 0: tack up this corridor along an upwind path
  let forceTack: 0 | 1 | -1 = 0;
  let freeOverTop = false;   // follow the loop over the mark even through the wind

  if (!boat.started) {
    const below = p.y > ly;
    if (below && Math.abs(p.x - cx) < half - 6 / m && !st.dip) {
      fix = onVertical(p, cx, true, ly - 36 / m);
      band = A.startBand;
    } else {
      if (!st.dip) {
        // The recovery path is a roomy planned loop, distinct from the actual
        // physical turning radius. Choose the current turning side and bring
        // its rising leg back across the registered start line.
        const twa = calcTWA(boat.heading, windDir);
        const ccw = Math.abs(twa) > 150 ? p.x < cx : twa < 0;
        const r = v > 0 ? Math.max(A.dip.minR, Math.min(A.dip.maxR, radiusPerKnot * Math.max(v, 3))) : A.dip.maxR;
        st.dip = { ccw, r, x: p.x + (ccw ? -1 : 1) * r * Math.abs(Math.cos(deg2rad(boat.heading))) };
      }
      const recoveryRadius = Math.max(A.dip.minR, Math.min(A.dip.maxR, st.dip.r));
      if (recoveryRadius !== st.dip.r) st.dip = { ...st.dip, r: recoveryRadius };
      const { ccw, r } = st.dip, side = ccw ? -1 : 1;
      const w = Math.sqrt(Math.max(0, r * r - A.dip.drop * A.dip.drop));
      const desiredX = Math.max(cx + side * w - A.dip.slack, Math.min(cx + side * w + A.dip.slack, st.dip.x));
      // A recovery circle must clear both fixed line endpoints. The previous
      //42m minimum could not fit between them with this hull/committee size.
      const left = course.marks[1], right = course.marks[2];
      const clearance = (radius: number) => Math.sqrt(Math.max(0,
        (r + radius + (d.hardware.boatDiameterMetres / 2 + d.hardware.clearanceBufferMetres) / m) ** 2 - A.dip.drop ** 2));
      const minX = left.pos.x + clearance(left.radius), maxX = right.pos.x - clearance(right.radius);
      const x = Math.max(minX, Math.min(maxX, desiredX));
      fix = onCircle(p, { x, y: ly + A.dip.drop }, r, ccw);
      if (below) { band = A.loopBand; forceTack = ccw ? -1 : 1; }
    }
  } else if (boat.lapDone === 0) {
    st.dip = undefined;
    const c = { x: mark.x, y: mark.y + A.loopDrop }, r = A.loopRadius;
    const room = Math.max(0, course.startLine.a.y - c.y);
    const leg = Math.min(A.legMax, A.legShare * room);
    if (!st.down && p.y <= c.y && p.x < c.x - r / 2) st.down = true;
    else if (st.down && p.y >= c.y + leg && p.x > c.x) st.down = false;
    const climbing = !st.down && p.y > c.y;
    if (!st.down) fix = p.y <= c.y ? onCircle(p, c, r, true) : onVertical(p, c.x + r, true, c.y);
    else fix = p.y >= c.y + leg ? onCircle(p, { x: c.x, y: c.y + leg }, r, true) : onVertical(p, c.x - r, false, c.y + leg);
    if (climbing) band = Math.min(A.band.max, Math.max(A.band.top, A.band.slope * (p.y - c.y)));
    if (!st.down && p.y <= c.y) freeOverTop = true;
    const toTop = p.y - c.y;
    if (climbing && toTop < Math.min(A.finalMax, A.finalShare * room)) st.shed = v > targetSpeed;
    else if (climbing && v > 0 && toTop < leg) {
      if (v > targetSpeed) st.shed = true;
      else if (v < targetSpeed - A.shedHysteresis) st.shed = false;
    } else st.shed = false;
  } else {
    if (p.y > ly + 3 / m && !st.finishLoop) st.finishLoop = { ccw: p.x >= cx };
    if (st.finishLoop) {
      fix = onCircle(p, { x: cx, y: ly - A.finishLoop.drop }, A.finishLoop.radius, st.finishLoop.ccw);
      band = A.loopBand;
    } else fix = onVertical(p, cx + laneOf(boat.id, A.finishLanes) * Math.max(0, half - A.finishLaneMargin), false, ly + 18 / m);
  }

  if (st.tack === undefined) st.tack = calcTWA(boat.heading, windDir) >= 0 ? 1 : -1;
  const tackTo = (side: 1 | -1) => { st.tack = side; };
  let desired = normalizeAngle(fix.tangent - rad2deg(Math.atan2(fix.right, A.lookahead)));
  if (st.shed) {
    // Point a few degrees off the wind, changing side to hold the leg; further
    // off it, sail a little freer to get back; well above the target speed,
    // point almost into the wind, which sheds speed fastest.
    if (fix.right > A.featherBand) tackTo(-1); else if (fix.right < -A.featherBand) tackTo(1);
    const off = Math.max(0, st.tack === -1 ? fix.right : -fix.right);
    const base = v > targetSpeed + A.fastMargin ? A.featherFast : A.featherSlow;
    desired = normalizeAngle(windDir + st.tack * Math.min(A.featherMax, base + A.featherGain * off));
  } else {
    const twa = calcTWA(desired, windDir);
    if (band > 0 && Math.abs(calcTWA(fix.tangent, windDir)) < A.closeHauled + 5) {
      if (forceTack) tackTo(forceTack);
      else if (fix.right > band) tackTo(-1);
      else if (fix.right < -band) tackTo(1);
      desired = normalizeAngle(windDir + st.tack * A.closeHauled);
    } else if (Math.abs(twa) < A.closeHauled && !freeOverTop) {
      if (twa > A.closeHauled - 5 && st.tack === -1) tackTo(1);
      else if (twa < -(A.closeHauled - 5) && st.tack === 1) tackTo(-1);
      desired = normalizeAngle(windDir + st.tack * A.closeHauled);
    } else if (Math.abs(twa) >= A.closeHauled) tackTo(twa >= 0 ? 1 : -1);
  }
  return { heading: desired, turn: physicalBotRudder(boat.heading, desired), path: fix.path,
    beating: Boolean(st.shed) || (band > 0 && Math.abs(calcTWA(fix.tangent, windDir)) < A.closeHauled + 5),
    rounding: { center: { x: mark.x, y: mark.y + A.loopDrop }, radius: A.loopRadius } };
}

const horizon = 12, sample = .5;
/** Coasting in the prediction (ADR-0015 point 5): while the predicted heading
 * is inside the no-go zone the predicted speed decays by exp(-dt / tau). */
export interface PhysicalBotCoast { readonly windDir: number; readonly noGoTwaDeg: number; readonly tauSeconds: number }
export function physicalBotTrajectory(boat: RaceBoat, target: number | SailingSteering, m: number,
  water?: ReturnType<typeof physicalCourseWaterBounds>, coast?: PhysicalBotCoast) {
  const boundX = (x: number) => water ? Math.max(water.minX * m, Math.min(water.maxX * m, x)) : x;
  const boundY = (y: number) => water ? Math.max(water.minY * m, Math.min(water.maxY * m, y)) : y;
  let heading = boat.heading, x = boundX(boat.pos.x * m), y = boundY(boat.pos.y * m), speed = boat.speed;
  const decay = coast ? Math.exp(-sample / coast.tauSeconds) : 1;
  const path: { x: number; y: number }[] = [];
  for (let t = sample; t <= horizon; t += sample) {
    // The decayed speed also sets the helm authority of the next turn.
    heading = advanceSailingHeading(heading, speed, typeof target === "number" ? { mode: "helm", rudder: physicalBotRudder(heading, target), lowSpeedAssist: true } : target, sample);
    if (coast && Math.abs(calcTWA(heading, coast.windDir)) < coast.noGoTwaDeg) speed *= decay;
    const move = sailingDisplacement(heading, boat.physics?.leeway ?? 0, speed, sample);
    x = boundX(x + move.east); y = boundY(y - move.north); path.push({ x, y });
  }
  return path;
}

/** A boat no bot steers, as the bots see it: straight lines at its present
 * speed on its heading and up to +-coneDeg off it, in metres. Its future
 * input is unknown, so a bot keeps clear of the whole cone. */
export function physicalHumanCone(boat: RaceBoat, coneDeg: number, m: number,
  water?: ReturnType<typeof physicalCourseWaterBounds>): Vec2[][] {
  const boundX = (x: number) => water ? Math.max(water.minX * m, Math.min(water.maxX * m, x)) : x;
  const boundY = (y: number) => water ? Math.max(water.minY * m, Math.min(water.maxY * m, y)) : y;
  return [-coneDeg, -coneDeg / 2, 0, coneDeg / 2, coneDeg].map(offset => {
    const move = sailingDisplacement(normalizeAngle(boat.heading + offset), 0, boat.speed, sample);
    let x = boundX(boat.pos.x * m), y = boundY(boat.pos.y * m);
    const path: Vec2[] = [];
    for (let t = sample; t <= horizon; t += sample) { x = boundX(x + move.east); y = boundY(y - move.north); path.push({ x, y }); }
    return path;
  });
}

/** Unit vector of a heading in race axes (east x, south y). */
const headingVector = (heading: number): Vec2 => ({ x: Math.sin(deg2rad(heading)), y: -Math.cos(deg2rad(heading)) });

/** True when the helm's shortest turn from `heading` to `target` sweeps the bow through the wind. */
function turnsThroughWind(heading: number, target: number, windDir: number): boolean {
  const turn = angleDiff(heading, target), toWind = angleDiff(heading, windDir);
  return toWind !== 0 && Math.sign(toWind) === Math.sign(turn) && Math.abs(toWind) < Math.abs(turn);
}

/** The deterministic bear-away: wind +- bearAwayTwaDeg, on the side away
 * from the touching hulls when the helm reaches it without crossing the
 * wind; otherwise the non-crossing heading (TWA 75, 105 or 150 on either
 * gybe) that opens most from them; otherwise, and with no contact, the
 * present tack; head to wind (|TWA| <= 2 deg) on a side fixed by the boat id. */
export function physicalBotBearAway(boat: RaceBoat, situation: PhysicalBotSituation, bearAwayTwaDeg: number): number {
  const twa = calcTWA(boat.heading, situation.windDir);
  const port = normalizeAngle(situation.windDir - bearAwayTwaDeg), starboard = normalizeAngle(situation.windDir + bearAwayTwaDeg);
  const n = situation.contactNormal;
  if (n) {
    const away = (heading: number) => { const v = headingVector(heading); return v.x * n.x + v.y * n.y; };
    const a = away(starboard), b = away(port);
    if (Math.abs(a - b) > 1e-9) {
      const tackSide = a > b ? starboard : port;
      if (!turnsThroughWind(boat.heading, tackSide, situation.windDir)) return tackSide;
      // Away from the hull lies only through the wind, which a stopped boat
      // crosses at a few deg/s and may stall in again. Bear away instead
      // (gybing if need be) to the heading that opens most from the hull
      // without crossing the wind; if none opens, keep the present tack below.
      const bearAway = [75, 105, 150, -75, -105, -150].map(twa => normalizeAngle(situation.windDir + twa))
        .filter(heading => !turnsThroughWind(boat.heading, heading, situation.windDir) && away(heading) > 1e-9)
        .sort((x, y) => away(y) - away(x))[0];
      if (bearAway !== undefined) return bearAway;
    }
  }
  if (Math.abs(twa) > 2) return twa > 0 ? starboard : port;
  return laneOf(boat.id, 2) > 0 ? starboard : port;
}

/** Irons and pin escape (ADR-0015 point 5). Counts stall ticks on the bot's
 * own memory; after afterSeconds commits to the bear-away and holds it for
 * holdSeconds without re-evaluation. Returns the committed heading or null. */
function escapeHeading(boat: RaceBoat, situation: PhysicalBotSituation, memory: PhysicalBotState, now: number,
  e: ReturnType<typeof physicalCourseDefinition>["bots"]["escape"]): number | null {
  if (memory.escape) {
    if (memory.escape.until > now + 1e-9) return memory.escape.heading;
    memory.escape = undefined;
  }
  const irons = boat.speed < e.slowKn && Math.abs(calcTWA(boat.heading, situation.windDir)) < e.noGoTwaDeg;
  const pinned = boat.speed < e.pinnedKn && !!situation.contactNormal;
  memory.stall = irons || pinned ? (memory.stall ?? 0) + 1 : 0;
  if (memory.stall < Math.round(e.afterSeconds * PHYSICAL_FLEET_HZ)) return null;
  const heading = physicalBotBearAway(boat, situation, e.bearAwayTwaDeg);
  memory.escape = { heading, until: now + e.holdSeconds };
  memory.stall = 0;
  return heading;
}

/** Internal helper for the validated immutable perception frame. Predict
 * reachable turns at the present speed. This is bounded bot advice, not a
 * guarantee about future human input, future acceleration or RRS liability. */
export function avoidPhysicalBotHeading(boat: RaceBoat,
  perception: readonly PhysicalBotPerception[], plannedHeading: number,
  context: PhysicalRaceContext, course: RaceCourse, memory: PhysicalBotState, situation?: PhysicalBotSituation): number {
  const stage = physicalRaceStage(boat), now = memory.tick / PHYSICAL_FLEET_HZ;
  const d = physicalCourseDefinition(context.profile), m = context.metresPerUnit;
  if (situation) {
    // The escape runs every tick, ahead of the half-second avoidance hold, and
    // still refreshes the predictive memory the fleet validates and observes.
    const escape = escapeHeading(boat, situation, memory, now, d.bots.escape);
    if (escape !== null) {
      memory.turnSide = undefined;
      // Never past the escape's own end, so the hold lasts holdSeconds, not
      // up to half a second more through the predictive hold below.
      memory.predictive = { heading: escape, until: Math.min(now + sample, memory.escape!.until), stage };
      return escape;
    }
  }
  if (memory.predictive && memory.predictive.until > now && memory.predictive.stage === stage) return memory.predictive.heading;
  const water = physicalCourseWaterBounds(context.profile);
  const safe = d.hardware.boatDiameterMetres + d.hardware.clearanceBufferMetres;
  const p = d.bots.prediction;
  const coast: PhysicalBotCoast | undefined = situation ? { windDir: situation.windDir, noGoTwaDeg: p.noGoTwaDeg, tauSeconds: p.coastTauSeconds } : undefined;
  const neighbours = perception.filter(other => other.id !== boat.id)
    .flatMap(other => [other.path, ...(other.alternatives ?? [])].map(path => ({ path, extra: other.extraMetres ?? 0 })));
  const hardware = course.marks.map(mark => ({ x: mark.pos.x * m, y: mark.pos.y * m,
    radius: mark.radius * m + d.hardware.boatDiameterMetres / 2 + d.hardware.clearanceBufferMetres }));
  const gates = physicalRaceGates(context, course)!;
  const gate = stage === "round-east" ? gates.rounding[0] : stage === "round-north" ? gates.rounding[1]
    : stage === "round-west" ? gates.rounding[2] : null;
  const missesGate = (path: readonly Vec2[]) => {
    if (!gate) return false;
    const a = { x: gate.a.x * m, y: gate.a.y * m }, b = { x: gate.b.x * m, y: gate.b.y * m };
    let previous = { x: boat.pos.x * m, y: boat.pos.y * m };
    for (const point of path) {
      const crossesLine = stage === "round-north" ? previous.x >= a.x && point.x < a.x
        : stage === "round-east" ? previous.y >= a.y && point.y < a.y : previous.y <= a.y && point.y > a.y;
      if (crossesLine && !segmentCrossed(previous, point, a, b)) return true;
      previous = point;
    }
    return false;
  };
  // Temporary luffing is also an avoidance action. Keep the same candidate
  // set on both sides of the close-hauled boundary; floating point rounding
  // must not decide whether a boat may slow while clearing an obstruction.
  // M5: below 2 kn a luff into the no-go zone only stops the boat (ADR-0015
  // point 5), so slow boats do not take those avoidance candidates.
  const slowLuff = (heading: number) => !!situation && boat.speed < 2
    && Math.abs(calcTWA(heading, situation.windDir)) < p.noGoTwaDeg;
  const candidates = [plannedHeading, ...(memory.predictive ? [memory.predictive.heading] : []).filter(h => !slowLuff(h)),
    ...[5, -5, 10, -10, 20, -20, 40, -40, 60, -60, 90, -90, 135, -135, 180].map(delta => normalizeAngle(plannedHeading + delta)).filter(h => !slowLuff(h))]
    .filter((heading, i, all) => all.indexOf(heading) === i);
  const scored = candidates.map(heading => {
    const path = physicalBotTrajectory(boat, heading, m, water, coast);
    let clearance = Infinity;
    for (const other of neighbours) for (let i = 0; i < path.length; i++) clearance = Math.min(clearance, Math.hypot(path[i].x - other.path[i].x, path[i].y - other.path[i].y) - safe - other.extra);
    for (const mark of hardware) for (const point of path) clearance = Math.min(clearance, Math.hypot(point.x - mark.x, point.y - mark.y) - mark.radius);
    return { heading, clearance, missesGate: missesGate(path), deviation: Math.abs(angleDiff(plannedHeading, heading)) };
  });
  const clear = scored.filter(row => row.clearance >= 0);
  // Among clear turns, avoid crossing the next rounding line outside its
  // registered gate. This is route advice, never hypothetical progress credit.
  const eligible = clear.some(row => !row.missesGate) ? clear.filter(row => !row.missesGate) : clear;
  const plannedDelta = angleDiff(boat.heading, plannedHeading);
  // Keep a chosen turn side below the shared helm's full speed authority
  // while the route target is behind the boat.
  // Otherwise safe rearward targets straddling180degrees can alternate the
  // shortest turn every half-second and leave a slow boat facing the wind.
  // Safety and the actual next gate retain priority over this hysteresis.
  const reducedAuthority = advanceSailingHeading(0, boat.speed,
    { mode: "helm", rudder: 1, lowSpeedAssist: true }, 1) < HELM_TURN_RATE_DEG_PER_S;
  if (!reducedAuthority || Math.abs(plannedDelta) <= 90) memory.turnSide = undefined;
  const consistent = eligible.filter(row => memory.turnSide === undefined
    || Math.sign(angleDiff(boat.heading, row.heading)) === memory.turnSide);
  const stable = consistent.length ? consistent : eligible;
  // No clear turn: the most clearance. ADR-0015 point 5 tried the fixed
  // bear-away here; it steered boats into each other and the committee boat
  // (18 of 36 bot-only fleets touched, 2026-11-01), so the bear-away stays
  // with the irons/pin escape above. Below 2 kn only the planned route
  // heading itself can still lie inside the no-go zone.
  const heading = stable.length ? stable.sort((a, b) => a.deviation - b.deviation)[0].heading
    : scored.sort((a, b) => b.clearance - a.clearance || a.deviation - b.deviation)[0].heading;
  const turn = Math.sign(angleDiff(boat.heading, heading));
  memory.turnSide = reducedAuthority && Math.abs(plannedDelta) > 90 && turn !== 0 ? turn as 1 | -1 : undefined;
  memory.predictive = { heading, until: now + sample, stage };
  return heading;
}

