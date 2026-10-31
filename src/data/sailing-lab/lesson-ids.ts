// ============================================================================
// Sail lesson ids in course order, without the lesson text. Navigation saves a
// learning bookmark on every page and only needs to recognise
// /learn/sails/<id>; importing course.ts for that put the whole sail course
// (about 250 KB of chunk) into the root layout of every page.
// lesson-ids.test.ts deep-compares this list with sailLessons, so adding or
// reordering a lesson fails the test until this file follows.
// ============================================================================

export const SAIL_LESSON_IDS: readonly string[] = [
  "rig-basics",
  "apparent-wind",
  "sheet-control",
  "mainsheet",
  "vang",
  "outhaul",
  "telltales",
  "halyard",
  "jib-lead",
  "slot",
  "trim-doctor",
  "reef",
  "winch-clutch",
];
