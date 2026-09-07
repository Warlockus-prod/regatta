import { NO_GO_HALF_DEG } from "@/lib/sailing-physics";
import { solvePolarPoint } from "@/lib/sailing-physics/polar";

/** A bounded wind/reef cache. Every target is a converged force-model solve;
 * full downwind range is searched, including a dead run. */
export function createTargetSolver() {
  const polars = new Map<string, { points: Map<number, number>; up: number; down: number }>();
  return (twaAbs: number, twsKn: number, reef: number) => {
    const key = `${twsKn}:${reef}`;
    let polar = polars.get(key);
    if (!polar) {
      const points = new Map<number, number>();
      let up = 45, down = 180, bestUp = -Infinity, bestDown = -Infinity;
      for (let angle = NO_GO_HALF_DEG; angle <= 180; angle += 3) {
        const solved = solvePolarPoint(angle, twsKn, reef);
        const speed = solved.converged ? solved.speed : 0;
        points.set(angle, speed);
        const vmg = speed * Math.cos(angle * Math.PI / 180);
        if (angle < 90 && vmg > bestUp) { bestUp = vmg; up = angle; }
        if (angle > 90 && -vmg > bestDown) { bestDown = -vmg; down = angle; }
      }
      polar = { points, up, down };
      if (polars.size >= 8) polars.delete(polars.keys().next().value!);
      polars.set(key, polar);
    }
    const angle = Math.max(NO_GO_HALF_DEG, Math.min(180, Math.round(twaAbs)));
    if (!polar.points.has(angle)) {
      const solved = solvePolarPoint(angle, twsKn, reef);
      polar.points.set(angle, solved.converged ? solved.speed : 0);
    }
    return { target: twaAbs < NO_GO_HALF_DEG ? 0 : polar.points.get(angle)!, vmgUp: polar.up, vmgDown: polar.down };
  };
}
