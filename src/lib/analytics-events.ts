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
 *
 * First-race funnel (M0-12, src/lib/funnel.ts trackRace*): `race.countdown`,
 * `race.first_tack`, `race.first_mark`, `race.end` and `race.replay` fire once
 * per race (a saved or shared replay once per opening, without race fields),
 * and every race event of a live race carries `raceNo`,
 * the count of races this device has started including this one, so
 * `raceNo = 1` is the device's first race. `race.end` counts every ended race
 * (finished or timed out); the server's `race.finish` counts only the times a
 * player saved to the leaderboard. The two never describe the same thing, so
 * neither is double counted.
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
  'race.countdown',
  'race.first_tack',
  'race.first_mark',
  'race.end',
  'race.replay',
] as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[number];

const CLIENT_EVENT_SET: ReadonlySet<string> = new Set(CLIENT_EVENTS);

export function isClientEvent(evt: unknown): evt is ClientEventName {
  return typeof evt === 'string' && CLIENT_EVENT_SET.has(evt);
}

/**
 * Milestones that are rare and each one counts: the client never dedups them
 * and gives them their own per-page budget (src/lib/client-log.ts), so a
 * second exam or a repeated radio task on the same page is not dropped.
 */
export const FUNNEL_EVENTS: ReadonlySet<string> = new Set<ClientEventName>([
  'exam.start',
  'exam.finish',
  'lesson.complete',
  'radio.task.complete',
  'app_store.click',
  'race.countdown',
  'race.first_tack',
  'race.first_mark',
  'race.end',
  'race.replay',
]);

// ---------------------------------------------------------------------------
// When the browser sends nothing at all (client-log.ts, GoogleAnalytics.tsx).
// ---------------------------------------------------------------------------

/**
 * Set to `true` by the iOS app before page scripts run (WebView
 * injectedJavaScriptBeforeContentLoaded) when the user switched "Anonymous
 * analytics" off. Pages then send nothing to /api/log and never load GA.
 */
export const NO_ANALYTICS_GLOBAL = '__REGATTA_NO_ANALYTICS__';
/** sessionStorage flag with the same meaning ('1'), for hosts that prefer it. */
export const NO_ANALYTICS_STORAGE_KEY = 'regatta.noanalytics.v1';
/**
 * sessionStorage flag ('1') that the page runs inside the app (?embed=1 seen
 * earlier in this WebView session). Written and read by detectShell() in
 * funnel.ts, read by the GA4 loader.
 */
export const EMBED_STORAGE_KEY = 'regatta.embed.v1';

// ---------------------------------------------------------------------------
// Error reports that are not ours to fix.
// ---------------------------------------------------------------------------

/** Code injected by a browser extension, or by Safari for one (masked URL). */
const EXTENSION_URL_RE = /^(?:chrome|moz|safari|safari-web|ms-browser)-extension:|^webkit-masked-url:/i;
const FIRST_URL_RE = /[a-z][a-z0-9+.-]*:\/\/[^\s)'"|]+/i;

/**
 * True for a js.uncaught / js.rejection report that comes from a browser
 * extension (its file or its top stack frame is an extension URL) or is the
 * opaque "Script error." of a cross-origin script with no file. These made up
 * nearly all of the JS-error KPI and point at nothing we can fix. Checked in
 * the browser (ClientErrorReporter) and again in /api/log.
 */
export function isBrowserNoise(report: { msg?: unknown; src?: unknown; stack?: unknown }): boolean {
  const src = typeof report.src === 'string' ? report.src.trim() : '';
  if (src && EXTENSION_URL_RE.test(src)) return true;
  const stack = typeof report.stack === 'string' ? report.stack : '';
  const topFrameUrl = stack.match(FIRST_URL_RE)?.[0] ?? '';
  if (topFrameUrl && EXTENSION_URL_RE.test(topFrameUrl)) return true;
  return report.msg === 'Script error.' && !src;
}

/** Which exam a mock-exam event belongs to. */
export type ExamBase = 'sternik' | 'src';
/** Which course a lesson.complete event belongs to. */
export type LessonCourse = 'bootcamp' | 'sails' | 'radio-theory';
/** Where the page runs: a normal browser, or a WebView inside the iOS app. */
export type ClientKind = 'web' | 'app';
/** Race setup carried by every race funnel event. */
export type RaceFunnelMode = 'simple' | 'pro';
export type RaceFunnelDifficulty = 'easy' | 'medium' | 'hard';
export type RaceFunnelWind = 'light' | 'medium' | 'heavy';
/**
 * Where a replay was opened: the finish screen of the race just sailed, a race
 * saved in the app's history, or a shared replay link (/r/CODE).
 */
export type ReplaySource = 'result' | 'saved' | 'shared';

/** Upper bound of raceNo; the client stops counting here. */
export const RACE_NO_MAX = 1000;
/** Race clock bound for first_tack / first_mark, in seconds (two hours). */
export const RACE_AT_SEC_MAX = 7200;
/** Largest fleet a race can report (player plus bots), with headroom. */
export const RACE_FLEET_MAX = 64;

const EXAM_BASES: ReadonlySet<string> = new Set<ExamBase>(['sternik', 'src']);
const LESSON_COURSES: ReadonlySet<string> = new Set<LessonCourse>(['bootcamp', 'sails', 'radio-theory']);
const CLIENT_KINDS: ReadonlySet<string> = new Set<ClientKind>(['web', 'app']);
const RACE_MODES: ReadonlySet<string> = new Set<RaceFunnelMode>(['simple', 'pro']);
const RACE_DIFFICULTIES: ReadonlySet<string> = new Set<RaceFunnelDifficulty>(['easy', 'medium', 'hard']);
const RACE_WINDS: ReadonlySet<string> = new Set<RaceFunnelWind>(['light', 'medium', 'heavy']);
const REPLAY_SOURCES: ReadonlySet<string> = new Set<ReplaySource>(['result', 'saved', 'shared']);

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const CT_RE = /^[a-z0-9_]{1,40}$/;
const VIEW_ID_RE = /^[a-z0-9]{6,32}$/;

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
  // Random id of one page view, shared by its page.view and page.engaged.
  viewId: (v) => typeof v === 'string' && VIEW_ID_RE.test(v),
  // Race funnel: setup, progress and result of one race.
  raceNo: (v) => isInt(v, 1, RACE_NO_MAX),
  mode: (v) => typeof v === 'string' && RACE_MODES.has(v),
  difficulty: (v) => typeof v === 'string' && RACE_DIFFICULTIES.has(v),
  wind: (v) => typeof v === 'string' && RACE_WINDS.has(v),
  missionId: (v) => typeof v === 'string' && ID_RE.test(v),
  daily: (v) => typeof v === 'boolean',
  atSec: (v) => isInt(v, 0, RACE_AT_SEC_MAX),
  finished: (v) => typeof v === 'boolean',
  position: (v) => isInt(v, 1, RACE_FLEET_MAX),
  totalBoats: (v) => isInt(v, 1, RACE_FLEET_MAX),
  tacks: (v) => isInt(v, 0, 1000),
  source: (v) => typeof v === 'string' && REPLAY_SOURCES.has(v),
};

const SHELL = ['embed', 'client'] as const;
const RACE = [...SHELL, 'raceNo', 'mode', 'difficulty', 'wind', 'missionId', 'daily'] as const;

const EVENT_FIELDS: Record<ClientEventName, readonly string[]> = {
  'page.view': [...SHELL, 'viewId'],
  'page.engaged': [...SHELL, 'viewId'],
  'js.uncaught': SHELL,
  'js.rejection': SHELL,
  'exam.start': [...SHELL, 'base'],
  'exam.finish': [...SHELL, 'base', 'score', 'total', 'passed', 'timedOut', 'durationSec'],
  'lesson.complete': [...SHELL, 'course', 'lessonId'],
  'radio.task.complete': [...SHELL, 'taskId', 'score'],
  'app_store.click': [...SHELL, 'ct'],
  'race.countdown': RACE,
  'race.first_tack': [...RACE, 'atSec'],
  'race.first_mark': [...RACE, 'atSec'],
  'race.end': [...RACE, 'finished', 'position', 'totalBoats', 'durationSec', 'tacks'],
  'race.replay': [...RACE, 'source'],
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
