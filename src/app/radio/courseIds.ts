import { THEORY_ORDER } from "./teoria/courseMap";

// ============================================================================
// The ids the /radio hub counts progress against, without importing the data
// they come from. The hub only shows "12/18 chapters, 40/324 questions, 3/19
// scenarios"; importing the SRC bank, the theory text and the simulator
// scenarios for that shipped about 83 KB gzip of chunks on the course's front
// page. courseIds.test.ts deep-compares every list with its source, so adding
// a question, a chapter or a scenario fails the test until this file follows.
// ============================================================================

/** Theory chapters in course order (THEORY_CHAPTERS is sorted by this list). */
export const THEORY_CHAPTER_IDS: readonly string[] = THEORY_ORDER;

/** UKE SRC question bank: part 1 and part 2, numbered from 1 without gaps. */
export const SRC_PART_SIZES = { 1: 174, 2: 150 } as const;

export const SRC_QUESTION_IDS: readonly string[] = ([1, 2] as const).flatMap((part) =>
  Array.from({ length: SRC_PART_SIZES[part] }, (_, i) => `src-${part}-${i + 1}`),
);

/** Simulator scenarios, in SCENARIOS order. */
export const SCENARIO_IDS: readonly string[] = [
  "fire-mayday",
  "mob-mayday",
  "engine-panpan",
  "securite-hazard",
  "radio-check",
  "false-cancel",
  "routine-marina",
  "vts-report",
  "panpan-medico",
  "dsc-test",
  "routine-ship",
  "group-call",
  "mayday-relay",
  "receive-distress",
  "receive-call",
  "scan-memory",
  "position-input",
  "id-add-lyngby",
  "id-delete-lyngby",
];
