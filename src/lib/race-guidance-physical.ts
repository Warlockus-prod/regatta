// Route hint for the metric solo race (M5 step 6, ADR-0015, ADR-0009).
//
// planRaceGuidance (race-guidance.ts) keeps the legacy course only and turns
// every metric course down (its buoy and beat are below the legacy limits).
// This planner gives the metric race the same RaceGuidance shape, so the
// scene route line and the HUD read it unchanged:
// - it runs the bots' planner (planPhysicalBot) on a probe copy of the player
//   with its own PhysicalBotState copy, never the fleet's navigation map; it
//   never steers, never moves the boat and never advances a gate;
// - the targets are the gates the progress code credits (physicalRaceGates):
//   the start line centre, the middle of the round-east, round-north and
//   round-west gates and the player's finish lane on the finish line;
// - on the beat the hint replaces the bots' narrow tacking band (it tacked
//   3 / 8 / 15 times on short / medium / long) by a corridor of
//   clamp(0.35 x leg, 40 m, 150 m) either side of the round-east gate and a
//   layline with hysteresis (course data, PhysicalCourseDefinition.guidance);
// - on the beat the hint's straight line passes the windward mark to port no
//   closer than touching plus clearanceBufferMetres plus markPassMetres; a
//   fetch is checked from anywhere, a close-hauled leg inside the mark's
//   zone (passMarkToPort; M5 step 6 review: the fetch from west of the mark
//   passed 8.3 m off its centre and a boat following it touched the mark);
// - no hint heading lies inside the race's no-go cone (raceScale noGoHalfDeg)
//   plus a margin; the bots' feathering into the wind before the rounding is
//   a speed trick for bots and is not advised.
import { physicalCourseDefinition } from "./race-courses";
import type { PhysicalRaceContext } from "./race-context";
import { guidanceToTarget, type RaceGuidance, type RaceGuidanceAction, type RaceGuidanceLeg } from "./race-guidance";
import { planPhysicalBot, type PhysicalBotState } from "./race-physical-bot";
import { physicalRaceGates } from "./race-physical-progress";
import { angleDiff, bearing, calcTWA, normalizeAngle, type RaceBoat, type RaceCourse, type Vec2 } from "./race-physics";
import { raceScale } from "./race-scale";

export interface PhysicalRaceGuidanceState {
  readonly courseKey: string;
  /** The probe's own planner memory (a copy, never the fleet's). */
  readonly bot: PhysicalBotState;
  /** The hint's own tack on the beat: +1 sails windDir + close-hauled, -1 windDir - close-hauled. */
  readonly beatTack?: 1 | -1;
}

const finitePoint = (p: Vec2 | undefined) => Boolean(p && Number.isFinite(p.x) && Number.isFinite(p.y));
const mid = (g: { a: Readonly<Vec2>; b: Readonly<Vec2> }): Vec2 => ({ x: (g.a.x + g.b.x) / 2, y: (g.a.y + g.b.y) / 2 });

function copyBot(st: PhysicalBotState): PhysicalBotState {
  return { ...st, dip: st.dip && { ...st.dip }, finishLoop: st.finishLoop && { ...st.finishLoop },
    predictive: st.predictive && { ...st.predictive }, escape: st.escape && { ...st.escape } };
}

/** Beat corridor half-width of a course, metres (course data). */
export function physicalGuidanceCorridorMetres(context: PhysicalRaceContext): number {
  const d = physicalCourseDefinition(context.profile), g = d.guidance;
  return Math.max(g.corridorMinMetres, Math.min(g.corridorMaxMetres, g.corridorShare * d.legMetres));
}

/** Read-only advice with independent tack and recovery memory; the caller
 * resets the state for a new race. Null on a course the metric gates do not
 * accept (a damaged or legacy course) or an invalid boat. */
export function planPhysicalRaceGuidance(boat: RaceBoat, course: RaceCourse, context: PhysicalRaceContext, windDir: number,
  previous?: PhysicalRaceGuidanceState | null): { guidance: RaceGuidance | null; state: PhysicalRaceGuidanceState | null } {
  const none = { guidance: null, state: null };
  if (!boat || !finitePoint(boat.pos) || ![boat.heading, boat.speed, boat.lapDone, windDir].every(Number.isFinite)
    || boat.speed < 0 || ![0, 1, 2].includes(boat.lapDone) || ![0, 1, 2].includes(boat.roundPhase ?? 0)) return none;
  let gates: ReturnType<typeof physicalRaceGates>;
  try { gates = physicalRaceGates(context, course); } catch { return none; }
  if (!gates) return none;
  const d = physicalCourseDefinition(context.profile), g = d.guidance, m = context.metresPerUnit;
  const scale = raceScale(context.profile), noGo = scale.noGoHalfDeg + g.noGoMarginDeg;
  const closeHauled = Math.max(noGo, g.closeHauledTwaDeg);
  const mark = course.marks[0];
  const courseKey = JSON.stringify([context.profile, course.startLine, course.finishLine, mark.pos, mark.radius]);
  const same = previous?.courseKey === courseKey && previous.bot?.profile === context.profile;
  const bot: PhysicalBotState = same ? copyBot(previous!.bot) : { version: 1, profile: context.profile, tick: 0, lap: boat.lapDone };
  bot.tick += 1;
  // A shallow probe: the planner writes only its own memory (`bot`).
  const probe: RaceBoat = { ...boat, pos: { ...boat.pos }, autopilot: undefined };
  const plan = planPhysicalBot(probe, course, windDir, context, bot);
  let beatTack = same ? previous!.beatTack : undefined;

  const stage = boat.lapDone >= 2 ? "complete" : !boat.started ? "start" : boat.lapDone === 1 ? "finish"
    : (boat.roundPhase ?? 0) === 2 ? "round-west" : (boat.roundPhase ?? 0) === 1 ? "round-north" : "round-east";
  const finishLine = gates.finish, startLine = gates.start;
  let leg: RaceGuidanceLeg, target: Vec2, heading = plan.heading, beating = plan.beating;
  if (stage === "complete") {
    leg = "complete"; target = { ...boat.pos }; heading = boat.heading; beating = false;
  } else if (stage === "start") {
    leg = bot.dip ? "return-start" : "start"; target = mid(startLine);
  } else if (stage === "finish") {
    leg = "finish";
    // The player's finish lane on the line, kept clear of both line ends.
    const lo = Math.min(finishLine.a.x, finishLine.b.x), hi = Math.max(finishLine.a.x, finishLine.b.x);
    const inset = Math.min((hi - lo) / 2, (d.hardware.boatDiameterMetres / 2 + d.hardware.committeeRadiusMetres) / m);
    const laneX = plan.path.kind === "vertical" ? plan.path.x : (lo + hi) / 2;
    target = { x: Math.max(lo + inset, Math.min(hi - inset, laneX)), y: finishLine.a.y };
  } else if (stage === "round-east") {
    target = mid(gates.rounding[0]);
    leg = plan.path.kind === "circle" || bot.down ? "round-port" : "windward";
    const rise = boat.pos.y - target.y;
    if (rise > 0 && !bot.down) {
      // The beat: corridor and layline, in the hint's own tack memory.
      leg = "windward"; beating = true;
      const corridor = physicalGuidanceCorridorMetres(context) / m;
      const offset = boat.pos.x - target.x;
      if (beatTack === undefined) beatTack = calcTWA(boat.heading, windDir) >= 0 ? 1 : -1;
      const toGate = bearing(boat.pos, target), twa = calcTWA(toGate, windDir), side: 1 | -1 = twa >= 0 ? 1 : -1;
      let fetching = false;
      if (Math.abs(twa) >= closeHauled && (side === beatTack || Math.abs(twa) >= closeHauled + g.laylineMarginDeg)) {
        // On the layline (or past it on the other tack): fetch the gate.
        beatTack = side; heading = toGate; fetching = true;
      } else {
        if (offset > corridor) beatTack = -1;
        else if (offset < -corridor) beatTack = 1;
        heading = normalizeAngle(windDir + beatTack * closeHauled);
      }
      // Never a straight line into the windward mark: pass it to port with room.
      const clearance = (d.hardware.boatDiameterMetres / 2 + d.hardware.buoyRadiusMetres + d.hardware.clearanceBufferMetres + g.markPassMetres) / m;
      // A fetch is a straight line to the gate and is checked from anywhere;
      // a close-hauled leg only inside the mark's zone (further out the
      // layline fetch comes first).
      const near = Math.hypot(boat.pos.x - mark.pos.x, boat.pos.y - mark.pos.y) < scale.markZoneUnits;
      const passed = fetching || near ? passMarkToPort(boat.pos, heading, fetching ? target : null, mark.pos, clearance, windDir, closeHauled) : heading;
      if (passed !== heading) {
        heading = passed;
        beatTack = calcTWA(heading, windDir) >= 0 ? 1 : -1;
      }
    }
  } else {
    leg = "round-port";
    target = mid(gates.rounding[stage === "round-north" ? 1 : 2]);
  }
  if (leg !== "windward") beatTack = undefined;
  if (leg !== "complete") heading = outsideNoGo(heading, windDir, noGo, boat.heading);
  const guidance = guidanceToTarget(boat, target, windDir, closeHauled, leg);
  applyPlannedHeading(guidance, boat.heading, windDir, heading);
  guidance.path = plan.path;
  guidance.beating = beating;
  return { guidance, state: { courseKey, bot, ...(beatTack !== undefined ? { beatTack } : {}) } };
}

/** The heading, or one that passes the windward mark to port at `clearance`
 * (race units, centre to centre). The straight line checked runs from the
 * boat to `target` when the hint fetches the gate, otherwise along `heading`
 * up to the mark's row (where the round-east gate lies). If that line comes
 * closer than `clearance`, the hint bears away to the tangent of the
 * clearance circle that keeps the mark to port; when that tangent lies inside
 * the close-hauled cone (the boat sails into the mark on the tack whose
 * tangent is head to wind) it takes the other tack, which sails away from
 * the mark on its port side. */
export function passMarkToPort(pos: Readonly<Vec2>, heading: number, target: Readonly<Vec2> | null, mark: Readonly<Vec2>,
  clearance: number, windDir: number, closeHauled: number): number {
  const ux = Math.sin(heading * Math.PI / 180), uy = -Math.cos(heading * Math.PI / 180);
  let length: number;
  if (target) length = Math.hypot(target.x - pos.x, target.y - pos.y);
  else if (uy < -1e-6 && pos.y > mark.y) length = (pos.y - mark.y) / -uy;
  else return heading;
  const px = mark.x - pos.x, py = mark.y - pos.y;
  const along = Math.max(0, Math.min(length, px * ux + py * uy));
  if (Math.hypot(px - ux * along, py - uy * along) >= clearance) return heading;
  const range = Math.hypot(px, py);
  const tangent = normalizeAngle(bearing(pos, mark) + (range > clearance ? Math.asin(clearance / range) * 180 / Math.PI : 90));
  return Math.abs(calcTWA(tangent, windDir)) >= closeHauled ? tangent : normalizeAngle(windDir + closeHauled);
}

/** The heading itself, or the nearest edge of the no-go cone (on the side of
 * the heading; head to wind exactly, on the boat's present tack). */
export function outsideNoGo(heading: number, windDir: number, limit: number, current: number): number {
  const twa = calcTWA(heading, windDir);
  if (Math.abs(twa) >= limit) return heading;
  const side = Math.abs(twa) > 1e-9 ? Math.sign(twa) : calcTWA(current, windDir) >= 0 ? 1 : -1;
  return normalizeAngle(windDir + side * limit);
}

/** The legacy hint's turn and action rules (race-guidance.ts), except that a
 * change under the 5 degree hold band never reads as a tack or gybe: running
 * dead downwind to the finish lane, a 1-3 degree correction across the run
 * said "Prepare to gybe" (seen in the browser, M5 step 6). */
function applyPlannedHeading(guidance: RaceGuidance, currentHeading: number, windDir: number, heading: number): void {
  const change = angleDiff(currentHeading, heading);
  guidance.suggestedHeading = heading;
  guidance.turn = Math.abs(change) < 5 ? 0 : change > 0 ? 1 : -1;
  const before = angleDiff(currentHeading, windDir), after = angleDiff(heading, windDir);
  let action: RaceGuidanceAction = guidance.turn === 0 ? "hold" : guidance.turn > 0 ? "steer-starboard" : "steer-port";
  if (guidance.turn !== 0 && Math.abs(before) > 1 && Math.abs(after) > 1 && Math.sign(before) !== Math.sign(after)) action = Math.abs(before) + Math.abs(after) < 180 ? "tack" : "gybe";
  if (guidance.leg === "return-start") action = "return-start";
  if (guidance.leg === "round-port" && action === "hold") action = "round-port";
  if (guidance.leg === "complete") action = "hold";
  guidance.action = action;
}
