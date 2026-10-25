// Presentation geometry for the optional training route. It reads the race
// aid and never steers, advances a mark gate or judges right of way.
import type { RaceGuidance } from "@/lib/race-guidance";
import type { Vec2 } from "@/lib/race-physics";

export interface GuidancePoint extends Vec2 { turning: boolean }
const RAD = Math.PI / 180;
const headingVector = (heading: number): Vec2 => ({ x: Math.sin(heading * RAD), y: -Math.cos(heading * RAD) });
const between = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const length = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);
const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;

/** Show the shared planner's recovery/rounding circle, rather than joining
 * corner waypoints inside the boat's turning radius. Tacking/feathering is
 * shown as a short current sailing leg, not a promise of a distant layline. */
function plannedPath(position: Vec2, heading: number, guidance: RaceGuidance): GuidancePoint[] {
  const route = guidance.path!;
  const forward = headingVector(heading);
  const points: GuidancePoint[] = [];
  const join = (end: Vec2, turning: boolean) => {
    const reach = Math.min(35, length(position, end) * .4);
    const control = { x: position.x + forward.x * reach, y: position.y + forward.y * reach };
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      points.push({ ...between(between(position, control, t), between(control, end, t), t), turning });
    }
  };
  if (guidance.beating) {
    const advice = headingVector(guidance.suggestedHeading);
    const end = { x: position.x + advice.x * 100, y: position.y + advice.y * 100 };
    const bend = Math.abs(((guidance.suggestedHeading - heading + 540) % 360) - 180) > 12;
    const near = between(position, end, .35);
    join(near, bend);
    points.push({ ...end, turning: false });
  } else if (route.kind === "circle") {
    const phi = Math.atan2(position.x - route.center.x, -(position.y - route.center.y));
    const sign = route.ccw ? -1 : 1;
    const at = (radians: number): Vec2 => ({ x: route.center.x + Math.sin(radians) * route.radius, y: route.center.y - Math.cos(radians) * route.radius });
    const start = phi + sign * .2;
    join(at(start), true);
    for (let i = 1; i <= 36; i++) points.push({ ...at(start + sign * Math.PI * i / 36), turning: true });
  } else {
    const end = route.to;
    const near = between(position, end, Math.min(.25, 35 / Math.max(1, length(position, end))));
    join(near, Math.abs(((guidance.suggestedHeading - heading + 540) % 360) - 180) > 12);
    const steps = Math.max(1, Math.min(24, Math.ceil(length(near, end) / 35)));
    for (let i = 1; i <= steps; i++) points.push({ ...between(near, end, i / steps), turning: false });
  }
  return points;
}

/** A short, rounded route to the current gate. An upwind target is reached
 * by two sailing legs instead of a blue line straight through the no-go zone.
 * This is an illustrative layline, without traffic or shoreline routing. */
export function guidancePath(position: Vec2, heading: number, windFrom: number, guidance: RaceGuidance): GuidancePoint[] {
  const target = guidance.target;
  if (guidance.leg === "complete" || ![position.x, position.y, heading, windFrom, target.x, target.y, guidance.suggestedHeading].every(Number.isFinite)) return [];
  if (guidance.path) return plannedPath(position, heading, guidance);
  const distance = length(position, target);
  if (distance < 8) return [];
  const first = headingVector(guidance.suggestedHeading);
  let corner: Vec2 | null = null;
  if (guidance.targetInNoGo) {
    const second = headingVector(2 * windFrom - guidance.suggestedHeading);
    const delta = { x: target.x - position.x, y: target.y - position.y };
    const divisor = cross(first, second);
    const along = cross(delta, second) / divisor;
    const after = cross(first, delta) / divisor;
    if (Math.abs(divisor) > 0.01 && along > 12 && after > 12) {
      corner = { x: position.x + first.x * along, y: position.y + first.y * along };
    }
  }
  const firstEnd = corner ?? target;
  const initialLength = length(position, firstEnd);
  const cut = Math.min(42, initialLength * 0.2);
  const turnEnd = between(position, firstEnd, cut / initialLength);
  const forward = headingVector(heading);
  const control = { x: position.x + forward.x * cut * 0.55, y: position.y + forward.y * cut * 0.55 };
  const turning = Math.abs(((guidance.suggestedHeading - heading + 540) % 360) - 180) > 12;
  const points: GuidancePoint[] = [];
  const curve = (a: Vec2, b: Vec2, c: Vec2, yellow: boolean) => {
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      points.push({ ...between(between(a, b, t), between(b, c, t), t), turning: yellow });
    }
  };
  const line = (a: Vec2, b: Vec2) => {
    const steps = Math.max(1, Math.min(24, Math.ceil(length(a, b) / 35)));
    for (let i = 1; i <= steps; i++) points.push({ ...between(a, b, i / steps), turning: false });
  };
  curve(position, control, turnEnd, turning);
  if (corner) {
    const nextCut = Math.min(45, initialLength * 0.18, length(corner, target) * 0.18);
    const before = between(corner, position, nextCut / initialLength);
    const after = between(corner, target, nextCut / length(corner, target));
    line(turnEnd, before);
    curve(before, corner, after, true);
    line(after, target);
  } else line(turnEnd, target);
  return points;
}
