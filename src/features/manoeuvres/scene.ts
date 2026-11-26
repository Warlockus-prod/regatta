// Top-down 2D harbour view on a canvas. Reads the run, never changes it.
import { hullWorld, OUR_YACHT, toWorld, type Vec2 } from "@/lib/harbour-physics";
import { hullOutline } from "@/lib/harbour-physics";
import type { ManoeuvreExercise, SceneObstacle } from "@/data/manoeuvres";
import type { RunState } from "./runner";

export interface Camera { cx: number; cy: number; span: number }
export interface Palette { water: string; land: string; landEdge: string; boat: string; boatEdge: string; ours: string; oursEdge: string; target: string; buoy: string; danger: string; line: string; text: string; muted: string }

/** Frame the boat and what it is heading for, with a sensible minimum zoom. */
export function frameCamera(exercise: ManoeuvreExercise, run: RunState, aspect: number): Camera {
  const focus = focusPoint(exercise, run);
  const [minX, minY, maxX, maxY] = exercise.bounds;
  const spanX = Math.max(Math.abs(run.pose.x - focus[0]) * 2 + 24, 40);
  const spanY = Math.max(Math.abs(run.pose.y - focus[1]) * 2 + 24, 40);
  // span = visible width; height follows the canvas aspect (width / height).
  const span = Math.min(Math.max(spanX, spanY * aspect), Math.max(maxX - minX, (maxY - minY) * aspect));
  const cx = clampRange((run.pose.x + focus[0]) / 2, minX, maxX, span);
  const cy = clampRange((run.pose.y + focus[1]) / 2, minY, maxY, span / aspect);
  return { cx, cy, span };
}

function clampRange(value: number, min: number, max: number, visible: number) {
  if (max - min <= visible) return (min + max) / 2;
  return Math.min(max - visible / 2, Math.max(min + visible / 2, value));
}

function focusPoint(exercise: ManoeuvreExercise, run: RunState): Vec2 {
  const goal = exercise.target, find = (id: string) => exercise.obstacles.find(o => o.id === id);
  const at = (o?: SceneObstacle): Vec2 => o?.shape.type === "circle" ? [o.shape.x, o.shape.y] : o ? centroid(o.shape.points) : [run.pose.x, run.pose.y];
  switch (goal.type) {
    case "berth": return [goal.x, goal.y];
    case "pickup": return at(find(goal.targetId));
    case "leave": { const c = centroid(goal.zone); return [run.pose.x * 0.6 + c[0] * 0.4, run.pose.y * 0.6 + c[1] * 0.4]; }
    case "turn": return [run.pose.x, run.pose.y];
    case "gates": {
      const gate = goal.gates[Math.min(run.progress.gate, goal.gates.length - 1)], a = at(find(gate[0])), b = at(find(gate[1]));
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }
    case "station": return at(find(goal.markId));
  }
}

const centroid = (points: readonly Vec2[]): Vec2 => [points.reduce((a, p) => a + p[0], 0) / points.length, points.reduce((a, p) => a + p[1], 0) / points.length];

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, exercise: ManoeuvreExercise, run: RunState,
  camera: Camera, colors: Palette, options: { plan: boolean; windLabel: string; scaleLabel: string }) {
  const scale = width / camera.span;
  const px = (p: Vec2): [number, number] => [(p[0] - camera.cx) * scale + width / 2, height / 2 - (p[1] - camera.cy) * scale];
  const path = (points: readonly Vec2[], close = true) => {
    ctx.beginPath();
    points.forEach((p, i) => { const [x, y] = px(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    if (close) ctx.closePath();
  };
  ctx.fillStyle = colors.water;
  ctx.fillRect(0, 0, width, height);

  // Goal overlays under everything else.
  const goal = exercise.target;
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors.target;
  if (goal.type === "berth") { path(hullOutline(OUR_YACHT.loa, OUR_YACHT.beam).map(p => toWorld(goal, p))); ctx.stroke(); }
  if (goal.type === "leave" || goal.type === "turn") { path(goal.zone); ctx.stroke(); }
  if (goal.type === "turn") arrow(ctx, px([run.pose.x, run.pose.y]), goal.heading, 26, colors.target);
  if (goal.type === "station") {
    const mark = exercise.obstacles.find(o => o.id === goal.markId);
    if (mark?.shape.type === "circle") { const [x, y] = px([mark.shape.x, mark.shape.y]); ctx.beginPath(); ctx.arc(x, y, goal.radius * scale, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (goal.type === "gates") goal.gates.forEach((gate, i) => {
    const a = exercise.obstacles.find(o => o.id === gate[0])!, b = exercise.obstacles.find(o => o.id === gate[1])!;
    if (a.shape.type !== "circle" || b.shape.type !== "circle") return;
    ctx.globalAlpha = i === run.progress.gate ? 1 : 0.3;
    path([[a.shape.x, a.shape.y], [b.shape.x, b.shape.y]], false);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.setLineDash([]);

  if (options.plan) {
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    path(exercise.plan, false);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const o of exercise.obstacles) {
    if (o.shape.type === "poly") {
      path(o.shape.points);
      const isBoat = o.kind === "boat";
      ctx.fillStyle = isBoat ? colors.boat : colors.land;
      ctx.fill();
      ctx.strokeStyle = isBoat ? colors.boatEdge : colors.landEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (isBoat && o.boat) { const mast = px([o.boat.x + Math.sin(o.boat.heading * Math.PI / 180) * 0.8, o.boat.y + Math.cos(o.boat.heading * Math.PI / 180) * 0.8]); dot(ctx, mast, Math.max(1.5, 0.15 * scale), colors.boatEdge); }
    } else {
      const [x, y] = px([o.shape.x, o.shape.y]);
      const r = Math.max(o.kind === "pile" ? 3 : 4, o.shape.r * scale);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = o.kind === "pile" ? colors.landEdge : o.kind === "person" ? colors.danger : colors.buoy;
      ctx.fill();
      if (o.kind === "person") { ctx.fillStyle = colors.danger; ctx.font = "600 13px var(--font-source-sans), sans-serif"; ctx.fillText("MOB", x + r + 4, y + 4); }
    }
  }

  // Mooring lines.
  for (const line of run.harbour?.lines ?? []) {
    const a = px(toWorld(run.pose, line.cleat)), b = px(line.anchor);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }

  // Our yacht: hull, fenders along both sides, mast, rudder angle.
  const hull = hullWorld(run.pose);
  path(hull);
  ctx.fillStyle = colors.ours;
  ctx.fill();
  ctx.strokeStyle = colors.oursEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = colors.oursEdge;
  for (const side of [-1, 1]) for (const f of [-0.3, 0.05, 0.4]) {
    const [x, y] = px(toWorld(run.pose, [f * OUR_YACHT.loa / 2 * 1.2, side * (OUR_YACHT.beam / 2 + 0.12)]));
    ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, 0.18 * scale), 0, Math.PI * 2); ctx.fill();
  }
  dot(ctx, px(toWorld(run.pose, [1.2, 0])), Math.max(2, 0.2 * scale), colors.oursEdge);
  const rudder = run.harbour?.rudder ?? 0;
  const stern = toWorld(run.pose, [-OUR_YACHT.loa / 2 + 0.6, 0]);
  const blade = toWorld(run.pose, [-OUR_YACHT.loa / 2 + 0.6 - Math.cos(rudder) * 1.4, Math.sin(rudder) * 1.4]);
  ctx.beginPath(); ctx.moveTo(...px(stern)); ctx.lineTo(...px(blade)); ctx.lineWidth = 3; ctx.stroke();

  // Wind arrow, upper left, pointing where the wind blows.
  const wind = exercise.wind;
  const corner: [number, number] = [34, 34];
  ctx.fillStyle = colors.text;
  ctx.font = "600 13px var(--font-source-sans), sans-serif";
  arrow(ctx, corner, (wind.direction + 180) % 360, 22, colors.text);
  ctx.fillText(options.windLabel, 62, 38);

  // Scale bar, lower left.
  const ten = 10 * scale;
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(14, height - 14); ctx.lineTo(14 + ten, height - 14); ctx.stroke();
  ctx.fillText(options.scaleLabel, 14, height - 20);
}

function dot(ctx: CanvasRenderingContext2D, [x, y]: [number, number], r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/** Arrow centred on a point, pointing along a compass bearing. */
function arrow(ctx: CanvasRenderingContext2D, [x, y]: [number, number], bearing: number, length: number, color: string) {
  const a = bearing * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const tip: [number, number] = [x + dx * length / 2, y + dy * length / 2], tail: [number, number] = [x - dx * length / 2, y - dy * length / 2];
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(...tail); ctx.lineTo(...tip); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(...tip);
  ctx.lineTo(tip[0] - dx * 9 - dy * 5, tip[1] - dy * 9 + dx * 5);
  ctx.lineTo(tip[0] - dx * 9 + dy * 5, tip[1] - dy * 9 - dx * 5);
  ctx.closePath(); ctx.fill();
}
