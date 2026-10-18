/**
 * The catalog of events the browser may send to /api/log, and the funnel
 * fields each one may carry. Shared by the client helpers (src/lib/funnel.ts,
 * ClientErrorReporter) and the /api/log route, which drops any event that is
 * not on this list and keeps only fields that pass these checks.
 *
 * Everything here stays anonymous: ids of lessons and tasks, scores and short
 * placement tokens, never free text from the user.
 *
 * Server-side events (`race.finish`, `coach.requested`) are written straight
 * through insertEvent() by their own routes and are deliberately NOT on this
 * list, so a client cannot forge them through /api/log.
 */

export const CLIENT_EVENTS = [
  'page.view',
  'page.engaged',
  'js.uncaught',
  'js.rejection',
  'exam.start',
  'exam.finish',
  'lesson.complete',
  'radio.task.complete',
  'app_store.click',
] as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[number];

const CLIENT_EVENT_SET: ReadonlySet<string> = new Set(CLIENT_EVENTS);

export function isClientEvent(evt: unknown): evt is ClientEventName {
  return typeof evt === 'string' && CLIENT_EVENT_SET.has(evt);
}

/** Which exam a mock-exam event belongs to. */
export type ExamBase = 'sternik' | 'src';
/** Which course a lesson.complete event belongs to. */
export type LessonCourse = 'bootcamp' | 'sails' | 'radio-theory';
/** Where the page runs: a normal browser, or a WebView inside the iOS app. */
export type ClientKind = 'web' | 'app';

const EXAM_BASES: ReadonlySet<string> = new Set<ExamBase>(['sternik', 'src']);
const LESSON_COURSES: ReadonlySet<string> = new Set<LessonCourse>(['bootcamp', 'sails', 'radio-theory']);
const CLIENT_KINDS: ReadonlySet<string> = new Set<ClientKind>(['web', 'app']);

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const CT_RE = /^[a-z0-9_]{1,40}$/;

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

type FieldCheck = (v: unknown) => boolean;

// One validator per field. A field is stored only if its event allows it AND
// the value passes the check; anything else is silently dropped.
const FIELD_CHECKS: Record<string, FieldCheck> = {
  embed: (v) => typeof v === 'boolean',
  client: (v) => typeof v === 'string' && CLIENT_KINDS.has(v),
  base: (v) => typeof v === 'string' && EXAM_BASES.has(v),
  score: (v) => isInt(v, 0, 1000),
  total: (v) => isInt(v, 1, 1000),
  passed: (v) => typeof v === 'boolean',
  timedOut: (v) => typeof v === 'boolean',
  durationSec: (v) => isInt(v, 0, 86_400),
  course: (v) => typeof v === 'string' && LESSON_COURSES.has(v),
  lessonId: (v) => typeof v === 'string' && ID_RE.test(v),
  taskId: (v) => typeof v === 'string' && ID_RE.test(v),
  ct: (v) => typeof v === 'string' && CT_RE.test(v),
};

const SHELL = ['embed', 'client'] as const;

const EVENT_FIELDS: Record<ClientEventName, readonly string[]> = {
  'page.view': SHELL,
  'page.engaged': SHELL,
  'js.uncaught': SHELL,
  'js.rejection': SHELL,
  'exam.start': [...SHELL, 'base'],
  'exam.finish': [...SHELL, 'base', 'score', 'total', 'passed', 'timedOut', 'durationSec'],
  'lesson.complete': [...SHELL, 'course', 'lessonId'],
  'radio.task.complete': [...SHELL, 'taskId', 'score'],
  'app_store.click': [...SHELL, 'ct'],
};

/**
 * Pick the validated funnel fields of `evt` out of an untrusted request body.
 * Returns an empty object when nothing valid is present.
 */
export function pickEventFields(
  evt: ClientEventName,
  body: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const key of EVENT_FIELDS[evt]) {
    const v = body[key];
    if (v !== undefined && FIELD_CHECKS[key](v)) out[key] = v as string | number | boolean;
  }
  return out;
}

/** True when `ct` is a valid App Store campaign token for app_store.click. */
export function isCampaignToken(ct: string): boolean {
  return CT_RE.test(ct);
}
