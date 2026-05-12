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

export function buildSimulatorDrillRoute(
  lessonId: string,
  drillId: string,
): string {
  return `/simulator?drill=${encodeURIComponent(drillId)}&lesson=${encodeURIComponent(lessonId)}`;
}
