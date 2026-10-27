import { physicalCourseDefinition, physicalCourseWaterBounds } from "./race-courses";
import type { PhysicalRaceContext, PhysicalRaceProfile } from "./race-context";
import { physicalRaceStage, type PhysicalRaceStage } from "./race-physical-progress";
import { angleDiff, bearing, calcTWA, deg2rad, distance, normalizeAngle, rad2deg, type RaceBoat, type RaceCourse, type RaceRoutePath, type Vec2 } from "./race-physics";
import { advanceSailingHeading, sailingDisplacement, HELM_TURN_RATE_DEG_PER_S, KNOT_METRES_PER_SECOND, type SailingSteering } from "./sailing-kinematics";

/** Ephemeral, versioned physical bot state. The fleet boundary owns copies;
 * legacy boat.autopilot, user helm, saved races and diagnostics do not own it. */
export const PHYSICAL_FLEET_HZ = 30;
export interface PhysicalBotState {
  version: 1; profile: PhysicalRaceProfile; tick: number; lap: number;
  tack?: 1 | -1; shed?: boolean; down?: boolean;
  dip?: { ccw: boolean; x: number; r: number };
  finishLoop?: { ccw: boolean };
  plannedHeading?: number;
  predictive?: { heading: number; until: number; stage: PhysicalRaceStage };
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
export function physicalBotTrajectory(boat: RaceBoat, target: number | SailingSteering, m: number,
  water?: ReturnType<typeof physicalCourseWaterBounds>) {
  const boundX = (x: number) => water ? Math.max(water.minX * m, Math.min(water.maxX * m, x)) : x;
  const boundY = (y: number) => water ? Math.max(water.minY * m, Math.min(water.maxY * m, y)) : y;
  let heading = boat.heading, x = boundX(boat.pos.x * m), y = boundY(boat.pos.y * m);
  const path: { x: number; y: number }[] = [];
  for (let t = sample; t <= horizon; t += sample) {
    heading = advanceSailingHeading(heading, boat.speed, typeof target === "number" ? { mode: "helm", rudder: physicalBotRudder(heading, target), lowSpeedAssist: true } : target, sample);
    const move = sailingDisplacement(heading, boat.physics?.leeway ?? 0, boat.speed, sample);
    x = boundX(x + move.east); y = boundY(y - move.north); path.push({ x, y });
  }
  return path;
}

/** Internal helper for the validated immutable perception frame. Predict
 * reachable turns at the present speed. This is bounded bot advice, not a
 * guarantee about future human input, future acceleration or RRS liability. */
export function avoidPhysicalBotHeading(boat: RaceBoat,
  perception: readonly { id: string; path: readonly Vec2[] }[], plannedHeading: number,
  context: PhysicalRaceContext, course: RaceCourse, memory: PhysicalBotState): number {
  const stage = physicalRaceStage(boat), now = memory.tick / PHYSICAL_FLEET_HZ;
  if (memory.predictive && memory.predictive.until > now && memory.predictive.stage === stage) return memory.predictive.heading;
  const d = physicalCourseDefinition(context.profile), m = context.metresPerUnit;
  const water = physicalCourseWaterBounds(context.profile);
  const safe = d.hardware.boatDiameterMetres + d.hardware.clearanceBufferMetres;
  const neighbours = perception.filter(other => other.id !== boat.id).map(other => other.path);
  const hardware = course.marks.map(mark => ({ x: mark.pos.x * m, y: mark.pos.y * m,
    radius: mark.radius * m + d.hardware.boatDiameterMetres / 2 + d.hardware.clearanceBufferMetres }));
  // Temporary luffing is also an avoidance action. Keep the same candidate
  // set on both sides of the close-hauled boundary; floating point rounding
  // must not decide whether a boat may slow while clearing an obstruction.
  const candidates = [plannedHeading, ...(memory.predictive ? [memory.predictive.heading] : []),
    ...[5, -5, 10, -10, 20, -20, 40, -40, 60, -60, 90, -90, 135, -135, 180].map(delta => normalizeAngle(plannedHeading + delta))]
    .filter((heading, i, all) => all.indexOf(heading) === i);
  const scored = candidates.map(heading => {
    const path = physicalBotTrajectory(boat, heading, m, water);
    let clearance = Infinity;
    for (const other of neighbours) for (let i = 0; i < path.length; i++) clearance = Math.min(clearance, Math.hypot(path[i].x - other[i].x, path[i].y - other[i].y) - safe);
    for (const mark of hardware) for (const point of path) clearance = Math.min(clearance, Math.hypot(point.x - mark.x, point.y - mark.y) - mark.radius);
    return { heading, clearance, deviation: Math.abs(angleDiff(plannedHeading, heading)) };
  });
  const clear = scored.filter(row => row.clearance >= 0);
  const best = clear.length ? clear.sort((a, b) => a.deviation - b.deviation)[0]
    : scored.sort((a, b) => b.clearance - a.clearance || a.deviation - b.deviation)[0];
  memory.predictive = { heading: best.heading, until: now + sample, stage };
  return best.heading;
}

