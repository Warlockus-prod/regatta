/**
 * Lesson -> simulator drill mapping for the "Try this in the simulator"
 * CTA on each bootcamp lesson detail. The simulator screen reads the
 * `drill` query param and pre-loads the matching drill (Drill mode).
 *
 * Drill ids match the catalog Dev-A defines in `mobile/src/simulator/*`.
 * If a drill id changes there, update the corresponding entry here.
 *
 * Lessons without a drill (e.g. simple-rules - rules of right of way are
 * not a drill) intentionally return null so the CTA renders nothing.
 */

const LESSON_TO_DRILL: Record<string, string> = {
  'wind-direction': 'hold-twa-45',
  'points-of-sail': 'hold-twa-90',
  'how-sail-works': 'max-speed-on-reach',
  'tacking': 'tack-clean',
  'jibing': 'jibe-clean',
  'vmg-beating': 'windward-mark-mission',
  'mini-race': 'course-mission',
};

export function getDrillForLesson(lessonId: string): string | null {
  return LESSON_TO_DRILL[lessonId] ?? null;
}

/**
 * Deliberately targets the NATIVE trainer, not the web Trainer embed.
 *
 * The ids above (hold-twa-45, tack-clean, ...) are the NATIVE trainer's drill
 * catalog. The web Trainer has a different, trim-focused catalog (hold-trim,
 * beam-healthy, reduce-heel, ... - src/features/simulator-v3/runtime/
 * scenario-presets.ts) and resolveTrainerDeepLink silently ignores an unknown
 * `drill`, so pointing these links at /simulator-v3 would drop the drill and
 * open a generic trainer. Until the two catalogs are reconciled, a bootcamp
 * lesson keeps opening the screen that actually has its drill.
 */
export function buildSimulatorDrillRoute(
  lessonId: string,
  drillId: string,
): string {
  return `/simulator?drill=${encodeURIComponent(drillId)}&lesson=${encodeURIComponent(lessonId)}`;
}
