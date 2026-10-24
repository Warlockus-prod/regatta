import { angleDiff, deg2rad, distance, MIN_BOAT_SEPARATION, segmentCrossed, UNITS_PER_KNOT_SECOND, type RaceBoat, type RaceCourse, type Vec2 } from "./race-physics";

/** Educational subset of World Sailing RRS 2025-2028, checked 2026-10-24.
 * Source: https://www.sailing.org/rules-regulations/racingrules
 * Rules 10/11/12 and 14, recall 29.1, mark contact 31, course definition/28.
 * Circles approximate hulls. Tacking, mark-room, obstruction and course-change
 * disputes are not umpired. Seconds below are our stated training penalties,
 * not the official turns under RRS 44. Uncertain liability earns no time penalty. */
export const TRAINING_PENALTIES = { contact: 5, markTouch: 3 } as const;
export const RULE_EVENT_COOLDOWN = 8;
const HULL_LENGTH = MIN_BOAT_SEPARATION;
const HULL_RADIUS = HULL_LENGTH / 2;
const LOOKAHEAD_SECONDS = 3;

export type RacingRule = "10" | "11" | "12" | "14" | "29.1" | "31" | "28";
export type RaceRuleEventKind = "give-way" | "avoid-contact" | "contact" | "early-start" | "start-clear" | "mark-touch" | "wrong-rounding" | "mark-rounded";
export interface RaceRuleEvent {
  id: string;
  kind: RaceRuleEventKind;
  rule: RacingRule;
  boatId: string;
  otherBoatId?: string;
  time: number;
  /** Zero for advice. Positive seconds are added only to this training result. */
  penaltySeconds: number;
}
export interface RaceRulesState {
  penalties: Record<string, number>;
  lastEmitted: Record<string, number>;
  contacts: string[];
  markContacts: string[];
  early: string[];
  laps: Record<string, number>;
}
export interface RaceRulesFrame {
  boats: readonly RaceBoat[];
  course: RaceCourse;
  windDir: number;
  /** Simulation seconds, reset to zero with a new rules state for each race. */
  time: number;
  racing: boolean;
  enabled?: boolean;
  /** False keeps the educational events but makes every penalty zero. */
  penalties?: boolean;
  /** Snapshot before movement. Supply it to diagnose a wrong-side gate crossing. */
  previousPositions?: Readonly<Record<string, Vec2>>;
}

export function createRaceRulesState(): RaceRulesState {
  return { penalties: {}, lastEmitted: {}, contacts: [], markContacts: [], early: [], laps: {} };
}

/** Windward side. Exactly head-to-wind/downwind is ambiguous in our circle model. */
export function raceTack(heading: number, windDir: number): "port" | "starboard" | null {
  const relative = angleDiff(heading, windDir);
  return Math.abs(relative) < 1 || Math.abs(relative) > 179 ? null : relative > 0 ? "starboard" : "port";
}

interface RightOfWay { giveWayId: string; standOnId: string; rule: "10" | "11" | "12"; }
const unit = (heading: number) => ({ x: Math.sin(deg2rad(heading)), y: -Math.cos(deg2rad(heading)) });
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

/** Conservative advice, not a complete umpire. Near head-to-wind, downwind or
 * when boats turn across each other on the same tack we do not assign liability. */
export function raceRightOfWay(a: RaceBoat, b: RaceBoat, windDir: number): RightOfWay | null {
  const ta = raceTack(a.heading, windDir), tb = raceTack(b.heading, windDir);
  const aa = Math.abs(angleDiff(a.heading, windDir)), ab = Math.abs(angleDiff(b.heading, windDir));
  if (!ta || !tb || aa < 42 || ab < 42 || aa > 175 || ab > 175) return null;
  if (ta !== tb) return { giveWayId: ta === "port" ? a.id : b.id, standOnId: ta === "starboard" ? a.id : b.id, rule: "10" };
  if (Math.abs(angleDiff(a.heading, b.heading)) > 20) return null;
  const abPos = { x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y };
  const alongA = dot(abPos, unit(a.heading));
  const alongB = dot({ x: -abPos.x, y: -abPos.y }, unit(b.heading));
  if (alongA > HULL_LENGTH) return { giveWayId: a.id, standOnId: b.id, rule: "12" };
  if (alongB > HULL_LENGTH) return { giveWayId: b.id, standOnId: a.id, rule: "12" };
  const aWindward = -dot(abPos, unit(windDir));
  if (Math.abs(aWindward) < 1) return null;
  return { giveWayId: aWindward > 0 ? a.id : b.id, standOnId: aWindward > 0 ? b.id : a.id, rule: "11" };
}

function velocity(b: RaceBoat): Vec2 {
  const u = unit(b.heading + (b.physics?.leeway ?? 0));
  return { x: u.x * b.speed * UNITS_PER_KNOT_SECOND, y: u.y * b.speed * UNITS_PER_KNOT_SECOND };
}

export function raceClosestApproach(a: RaceBoat, b: RaceBoat): { time: number; distance: number; closing: number } {
  const p = { x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y };
  const av = velocity(a), bv = velocity(b);
  const v = { x: bv.x - av.x, y: bv.y - av.y };
  const vv = dot(v, v), d = Math.hypot(p.x, p.y);
  const time = vv > .001 ? Math.max(0, Math.min(LOOKAHEAD_SECONDS, -dot(p, v) / vv)) : 0;
  return { time, distance: Math.hypot(p.x + v.x * time, p.y + v.y * time), closing: d > .001 ? -dot(p, v) / d : 0 };
}

/** New state + only new/cooldown-expired events. Does not mutate the fleet,
 * progression, previous state or elapsed time. Call before/after separation;
 * the contact tolerance includes the exact separation resolveCollisions uses. */
export function evaluateRaceRules(previous: RaceRulesState, frame: RaceRulesFrame): { state: RaceRulesState; events: RaceRuleEvent[] } {
  if (frame.enabled === false || !frame.racing || !Number.isFinite(frame.time)) return { state: previous, events: [] };
  const state: RaceRulesState = { penalties: { ...previous.penalties }, lastEmitted: { ...previous.lastEmitted }, contacts: [], markContacts: [], early: [...previous.early], laps: { ...previous.laps } };
  const events: RaceRuleEvent[] = [];
  const emit = (kind: RaceRuleEventKind, rule: RacingRule, boatId: string, otherBoatId?: string, penalty = 0, once = false) => {
    const key = `${kind}:${boatId}:${otherBoatId ?? ""}:${rule}`;
    const last = previous.lastEmitted[key];
    if (last !== undefined && (once || frame.time - last < RULE_EVENT_COOLDOWN)) return;
    const penaltySeconds = frame.penalties === false ? 0 : penalty;
    state.lastEmitted[key] = frame.time;
    if (penaltySeconds) state.penalties[boatId] = (state.penalties[boatId] ?? 0) + penaltySeconds;
    events.push({ id: `${key}:${frame.time.toFixed(3)}`, kind, rule, boatId, ...(otherBoatId ? { otherBoatId } : {}), time: frame.time, penaltySeconds });
  };
  const boats = frame.boats.filter(b => b.lapDone < 2 && Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y));
  const lineY = (frame.course.startLine.a.y + frame.course.startLine.b.y) / 2;
  for (const boat of frame.boats) {
    if (previous.laps[boat.id] === 0 && boat.lapDone === 1) emit("mark-rounded", "28", boat.id, undefined, 0, true);
    state.laps[boat.id] = boat.lapDone;
    if (boat.lapDone >= 2) continue;
    if (!boat.started && boat.pos.y < lineY - 1) {
      if (!state.early.includes(boat.id)) {
        state.early.push(boat.id);
        emit("early-start", "29.1", boat.id);
      }
    } else if (state.early.includes(boat.id) && (boat.started || boat.pos.y > lineY + HULL_RADIUS)) {
      state.early = state.early.filter(id => id !== boat.id);
      emit("start-clear", "29.1", boat.id);
    }
    const activeMarks = boat.started ? boat.lapDone === 0 ? [frame.course.marks[0]] : frame.course.marks.filter(m => m.type === "start" || m.type === "finish")
      : frame.course.marks.filter(m => m.type === "start");
    for (const mark of activeMarks) {
      const key = `${boat.id}:${frame.course.marks.indexOf(mark)}`;
      const touching = distance(boat.pos, mark.pos) <= mark.radius + HULL_RADIUS;
      if (touching) {
        state.markContacts.push(key);
        if (!previous.markContacts.includes(key)) emit("mark-touch", "31", boat.id, undefined, TRAINING_PENALTIES.markTouch);
      } else if (previous.markContacts.includes(key) && distance(boat.pos, mark.pos) < mark.radius + HULL_RADIUS + 4) state.markContacts.push(key);
    }
    const prev = frame.previousPositions?.[boat.id], mark = frame.course.marks[0];
    if (prev && boat.started && boat.lapDone === 0 && (boat.roundPhase ?? 0) === 0 && boat.pos.y < prev.y) {
      const inner = mark.radius + HULL_RADIUS, outer = inner + 70;
      if (segmentCrossed(prev, boat.pos, { x: mark.pos.x - inner, y: mark.pos.y }, { x: mark.pos.x - outer, y: mark.pos.y })) emit("wrong-rounding", "28", boat.id);
    }
  }
  for (let i = 0; i < boats.length; i++) for (let j = i + 1; j < boats.length; j++) {
    const a = boats[i], b = boats[j];
    const d = distance(a.pos, b.pos);
    if (d > HULL_LENGTH * 8) continue;
    const pair = [a.id, b.id].sort().join("|");
    const approach = raceClosestApproach(a, b);
    const inMarkZone = boatsNearActiveMark(a, b, frame.course);
    const row = inMarkZone ? null : raceRightOfWay(a, b, frame.windDir);
    if (approach.closing > .1 && approach.distance < HULL_LENGTH * 1.5 && approach.time < LOOKAHEAD_SECONDS) {
      if (row) emit("give-way", row.rule, row.giveWayId, row.standOnId);
      // Rule 14 still matters when priority is known or cannot be resolved here.
      emit("avoid-contact", "14", row?.standOnId ?? a.id, row?.giveWayId ?? b.id);
      if (!row) emit("avoid-contact", "14", b.id, a.id);
    }
    if (d <= HULL_LENGTH + .1) {
      state.contacts.push(pair);
      if (!previous.contacts.includes(pair) && approach.closing > UNITS_PER_KNOT_SECOND * .2) {
        if (row) emit("contact", row.rule, row.giveWayId, row.standOnId, TRAINING_PENALTIES.contact);
        else { emit("contact", "14", a.id, b.id); emit("contact", "14", b.id, a.id); }
      }
    } else if (previous.contacts.includes(pair) && d < HULL_LENGTH + 4) state.contacts.push(pair);
  }
  return { state, events };
}

/** Mark-room needs entry/overlap/tack history (RRS 18). Never fabricate a
 * right-of-way penalty from a single frame in that zone. */
function boatsNearActiveMark(a: RaceBoat, b: RaceBoat, course: RaceCourse): boolean {
  if (!a.started || !b.started || a.lapDone !== 0 || b.lapDone !== 0) return false;
  const mark = course.marks[0];
  return Math.min(distance(a.pos, mark.pos), distance(b.pos, mark.pos)) < HULL_LENGTH * 3;
}
