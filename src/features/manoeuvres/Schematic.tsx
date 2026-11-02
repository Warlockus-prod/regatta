'use client';

// Static diagram of a manoeuvre, drawn from the same scene data the exercise runs on.
import { hullWorld, OUR_YACHT, toWorld, hullOutline, type Vec2 } from "@/lib/harbour-physics";
import type { ManoeuvreExercise } from "@/data/manoeuvres";
import styles from "./Manoeuvres.module.css";

export default function Schematic({ exercise, label, words }: { exercise: ManoeuvreExercise; label: string; words: { wind: string; start: string; target: string } }) {
  const [minX, minY, maxX, maxY] = exercise.bounds;
  // A band above the harbour holds the wind arrow and its label.
  const pad = 4, w = maxX - minX + pad * 2, band = Math.max(10, w * 0.09), h = maxY - minY + pad * 2 + band;
  // SVG y grows downward: flip north up.
  const pt = (p: Vec2) => `${(p[0] - minX + pad).toFixed(2)},${(maxY - p[1] + pad + band).toFixed(2)}`;
  const poly = (points: readonly Vec2[]) => points.map(pt).join(" ");
  const goal = exercise.target;
  const u = w / 100; // stroke unit, proportional to the drawing size
  const target: Vec2 | null = goal.type === "berth" ? [goal.x, goal.y] : null;
  const windTo = (exercise.wind.direction + 180) * Math.PI / 180;
  const arm = band * 0.35, wm: Vec2 = [minX + w * 0.06, maxY + band / 2 + pad / 2];
  const wa: Vec2 = [wm[0] - Math.sin(windTo) * arm, wm[1] - Math.cos(windTo) * arm];
  const wb: Vec2 = [wm[0] + Math.sin(windTo) * arm, wm[1] + Math.cos(windTo) * arm];
  const [sx, sy] = pt([exercise.start.x, exercise.start.y]).split(",").map(Number);
  return <figure className={styles.schematic}>
    <svg viewBox={`0 0 ${w.toFixed(2)} ${h.toFixed(2)}`} role="img" aria-label={label}>
      <defs>
        <marker id={`arrow-${exercise.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      <rect x="0" y="0" width={w} height={h} className={styles.svgWater} />
      {(goal.type === "leave" || goal.type === "turn") && <polygon points={poly(goal.zone)} className={styles.svgTarget} strokeWidth={u * 0.5} />}
      {goal.type === "gates" && goal.gates.map(([a, b]) => {
        const A = exercise.obstacles.find(o => o.id === a)!, B = exercise.obstacles.find(o => o.id === b)!;
        return A.shape.type === "circle" && B.shape.type === "circle"
          ? <polyline key={a} points={poly([[A.shape.x, A.shape.y], [B.shape.x, B.shape.y]])} className={styles.svgTarget} strokeWidth={u * 0.5} /> : null;
      })}
      {goal.type === "station" && (() => {
        const m = exercise.obstacles.find(o => o.id === goal.markId)!;
        if (m.shape.type !== "circle") return null;
        const [cx, cy] = pt([m.shape.x, m.shape.y]).split(",").map(Number);
        return <circle cx={cx} cy={cy} r={goal.radius} className={styles.svgTarget} strokeWidth={u * 0.5} />;
      })()}
      {exercise.obstacles.map(o => o.shape.type === "poly"
        ? <polygon key={o.id} points={poly(o.shape.points)} className={o.kind === "boat" ? styles.svgBoat : styles.svgLand} strokeWidth={u * 0.25} />
        : (() => { const [cx, cy] = pt([o.shape.x, o.shape.y]).split(",").map(Number); return <circle key={o.id} cx={cx} cy={cy} r={Math.max(o.shape.r, u * 0.7)} className={o.kind === "person" ? styles.svgDanger : o.kind === "pile" ? styles.svgPile : styles.svgBuoy} />; })())}
      {target && <polygon points={poly(hullOutline(OUR_YACHT.loa, OUR_YACHT.beam).map(p => toWorld({ x: target[0], y: target[1], heading: (goal as { heading: number }).heading }, p)))} className={styles.svgTarget} strokeWidth={u * 0.5} />}
      <polyline points={poly(exercise.plan)} className={styles.svgPlan} strokeWidth={u * 0.45} markerEnd={`url(#arrow-${exercise.id})`} />
      <polygon points={poly(hullWorld(exercise.start))} className={styles.svgOurs} strokeWidth={u * 0.3} />
      <line x1={pt(wa).split(",")[0]} y1={pt(wa).split(",")[1]} x2={pt(wb).split(",")[0]} y2={pt(wb).split(",")[1]} className={styles.svgWind} strokeWidth={u * 0.6} markerEnd={`url(#arrow-${exercise.id})`} />
      <text x={Number(pt(wm).split(",")[0]) + arm + u * 2} y={Number(pt(wm).split(",")[1]) + u * 1.1} className={styles.svgText} fontSize={u * 3.2}>{words.wind} {exercise.wind.speed}</text>
      <text x={sx} y={sy + u * 6} className={styles.svgText} fontSize={u * 3.2} textAnchor="middle">{words.start}</text>
    </svg>
  </figure>;
}
