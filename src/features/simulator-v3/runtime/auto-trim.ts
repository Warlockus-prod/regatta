import type { BoatParams, BoatState, Controls, TickResult } from '@/lib/sailing-physics';
import { crewTrim, restingTrim } from '@/lib/helm-trim';
import { helmProfileFor } from '@/features/race-hud/target';
import { fromJibSheet, fromMainSheet, type OptimalTrim, type UiState } from '../ui/shared';
import { uiToControls } from './create-runtime-state';

// The Trainer's side of the one sheet solver (src/lib/helm-trim.ts, package 13
// stage D, ADR-0022). The auto-trim switch, the "Best" button, the course
// presets, "Best VMG" and the ghost of the best trim all go through here, and
// here only to the solver, so none of them keeps a table of its own.

const tenth = (n: number) => Math.round(n * 10) / 10;

/** Solver controls as the Trainer's sheet controls show them: degrees off the
 * centreline (one decimal, as the wheels set them) and twist in percent. */
export function trimAngles(controls: Controls, params: BoatParams): OptimalTrim {
  return {
    mainAngle: tenth(fromMainSheet(controls.mainSheet, params.mainMaxOff)),
    jibAngle: tenth(fromJibSheet(controls.jibSheet, params.jibMinOff, params.jibMaxOff)),
    mainTwistPct: Math.round(controls.mainTwist * 100),
    jibTwistPct: Math.round(controls.jibTwist * 100),
  };
}

const signed = (ui: UiState, twa: number) => (ui.tack === 'starboard' ? twa : -twa);

/** "Best" and the course presets: the auto-trim at rest on the course the
 * learner set (or `twa`, a preset's course), with the sails the learner has
 * up. `result` is the settled boat, the 100% of the trim score. */
export function trainerOptimum(ui: UiState, params: BoatParams, twa = ui.twa): { trim: OptimalTrim; result: TickResult } {
  const controls = uiToControls(ui, params);
  const key = JSON.stringify([signed(ui, twa), ui.windSpeed, controls.reef, controls.jibFurl, controls.mainHoisted, params]);
  const hit = optimumCache.get(key);
  if (hit) return hit;
  const rest = restingTrim(signed(ui, twa), ui.windSpeed, controls, params);
  const answer = { trim: trimAngles(rest.controls, params), result: rest.result };
  if (optimumCache.size >= OPTIMUM_CACHE_SIZE) optimumCache.delete(optimumCache.keys().next().value!);
  optimumCache.set(key, answer);
  return answer;
}
/** Solved courses, so the presets, "Best" and the trim score share one solve. */
const optimumCache = new Map<string, { trim: OptimalTrim; result: TickResult }>();
const OPTIMUM_CACHE_SIZE = 64;

/** One step of the auto-trim on the live boat: what the crew sheets to now. */
export function autoTrimStep(boat: BoatState, ui: UiState, params: BoatParams): OptimalTrim {
  return trimAngles(crewTrim(boat, uiToControls(ui, params), params, ui.windSpeed), params);
}

/** True when a solver answer differs from what the controls hold, by more
 * than the wheels' tenth of a degree or a whole percent of twist. */
export function trimDiffers(ui: UiState, trim: OptimalTrim): boolean {
  return Math.abs(ui.mainAngle - trim.mainAngle) > 0.05 || Math.abs(ui.jibAngle - trim.jibAngle) > 0.05
    || ui.mainTwistPct !== trim.mainTwistPct || ui.jibTwistPct !== trim.jibTwistPct;
}

/** "Best VMG": the best VMG angle of the race's cruiser polar for this wind
 * (helm-angles.ts via helmProfileFor, the angle BEST VMG sails in the metric
 * race), upwind when the boat sails 90 deg or higher, downwind when it sails
 * lower. Upwind it never goes inside the cruiser's no-go zone (42 deg, the
 * cone the Trainer draws and warns about): in 12 kn and more the polar's
 * optimum is 40 deg, so the preset sails the zone's edge, which makes good
 * within 1% of it. The tack stays: the preset never tacks or gybes by itself. */
export function bestVmgTwa(ui: Pick<UiState, 'twa' | 'windSpeed'>): number {
  const { angles, noGoDeg } = helmProfileFor(ui.windSpeed, 'cruiser');
  return ui.twa <= 90 ? Math.max(angles.upwind.twa, Math.ceil(noGoDeg)) : angles.downwind.twa;
}
