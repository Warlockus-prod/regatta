import type { DrillDef } from '../simulator/missions';

/**
 * Lesson -> simulator drill mapping for the "Try this in the simulator"
 * CTA on each bootcamp lesson detail. The native trainer reads the
 * `drill` query param (see mobile/app/simulator/index.tsx) and, when it
 * names a real drill, switches to Drill mode with that drill active.
 *
 * The values are typed as `DrillDef['id']`, so a drill id that does not
 * exist in the native catalog (`mobile/src/simulator/missions.ts`,
 * `DRILLS`) is a COMPILE error, not a silently-dead link. This is the
 * fix for the earlier breakage where the map pointed at ids like
 * `hold-twa-45` / `tack-clean` that the catalog never defined, so the
 * CTA opened a generic trainer instead of the promised drill.
 *
 * Not every lesson has a matching drill. The native catalog is six
 * upwind/trim drills (twa45, noGo, reach90, shiftReact, gustTrim,
 * noGoRecovery); there is no downwind/jibe drill and no single-drill
 * "race", so `jibing`, `mini-race` and `simple-rules` intentionally have
 * no entry and render no CTA rather than a mislabelled one. (`mini-race`
 * is a course MISSION, a different subsystem the drill deep-link cannot
 * start.)
 */
const LESSON_TO_DRILL: Record<string, DrillDef['id']> = {
  'wind-direction': 'noGo', // where the wind is = feeling the no-go zone
  'points-of-sail': 'reach90', // a beam reach is the canonical point of sail
  'how-sail-works': 'gustTrim', // trim = power: ease in the gust, keep TRIM up
  tacking: 'noGoRecovery', // passing through / recovering from head-to-wind
  'vmg-beating': 'twa45', // best upwind VMG = holding the 40-50 close-hauled angle
};

export function getDrillForLesson(lessonId: string): DrillDef['id'] | null {
  return LESSON_TO_DRILL[lessonId] ?? null;
}

/**
 * Deliberately targets the NATIVE trainer, not the web Trainer embed.
 *
 * The ids above are the NATIVE trainer's drill catalog
 * (`mobile/src/simulator/missions.ts`). The web Trainer has a different,
 * trim-focused catalog (hold-trim, beam-healthy, reduce-heel, ... -
 * src/features/simulator-v3/runtime/scenario-presets.ts) and
 * resolveTrainerDeepLink silently ignores an unknown `drill`, so pointing
 * these links at /simulator-v3 would drop the drill and open a generic
 * trainer. Until the two catalogs are reconciled, a bootcamp lesson keeps
 * opening the screen that actually has its drill.
 */
export function buildSimulatorDrillRoute(
  lessonId: string,
  drillId: DrillDef['id'],
): string {
  return `/simulator?drill=${encodeURIComponent(drillId)}&lesson=${encodeURIComponent(lessonId)}`;
}
