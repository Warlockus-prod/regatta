/**
 * Funnel events: the few user milestones that tell the owner whether people
 * who arrive actually learn (lessons, radio tasks) and sit the mock exams, and
 * where App Store installs come from. Names and fields are validated on the
 * server against src/lib/analytics-events.ts.
 *
 * All helpers are fire-and-forget through clientLog() and never throw.
 */

import { analyticsDisabled, clientInfo } from './client-log';
import {
  EMBED_STORAGE_KEY,
  RACE_AT_SEC_MAX,
  RACE_FLEET_MAX,
  RACE_NO_MAX,
  isCampaignToken,
  type ClientKind,
  type ExamBase,
  type LessonCourse,
  type RaceFunnelDifficulty,
  type RaceFunnelMode,
  type RaceFunnelWind,
  type ReplaySource,
} from './analytics-events';

// The iOS app opens course pages with ?embed=1 (mobile/src/course/SectionWebView,
// SimWebView, OfflineRadioCourse). In-section links drop the query string, so
// the flag is remembered for the rest of the WebView session, under the same
// key the GA4 loader checks (one constant, so the two can never disagree).
export function detectShell(): { embed: boolean; client: ClientKind } {
  if (typeof window === 'undefined') return { embed: false, client: 'web' };
  let embed = /[?&]embed=1(?:&|$)/.test(window.location.search);
  try {
    if (embed) window.sessionStorage.setItem(EMBED_STORAGE_KEY, '1');
    else embed = window.sessionStorage.getItem(EMBED_STORAGE_KEY) === '1';
  } catch { /* storage blocked: rely on the URL alone */ }
  // react-native-webview injects window.ReactNativeWebView before page scripts.
  const inApp = embed || Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
  return { embed, client: inApp ? 'app' : 'web' };
}

function postToApp(message: Record<string, unknown>): void {
  try {
    const bridge = (window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } }).ReactNativeWebView;
    bridge?.postMessage(JSON.stringify(message));
  } catch { /* not in a WebView */ }
}

export function trackExamStart(base: ExamBase): void {
  clientInfo('exam.start', { ...detectShell(), base });
}

export interface ExamFinish {
  base: ExamBase;
  score: number;
  total: number;
  passed: boolean;
  timedOut?: boolean;
  durationSec?: number;
}

/**
 * Exam results otherwise live only in localStorage. Sent to /api/log and, inside
 * the iOS app, relayed to the native shell as { type: 'exam-finished', ... } so
 * the app's own analytics sees it even when the page runs offline (file://).
 */
export function trackExamFinish(result: ExamFinish): void {
  clientInfo('exam.finish', { ...detectShell(), ...result });
  postToApp({
    type: 'exam-finished',
    base: result.base,
    score: result.score,
    total: result.total,
    passed: result.passed,
  });
}

export function trackLessonComplete(course: LessonCourse, lessonId: string): void {
  clientInfo('lesson.complete', { ...detectShell(), course, lessonId });
}

export function trackRadioTaskComplete(taskId: string, score: number): void {
  clientInfo('radio.task.complete', { ...detectShell(), taskId, score: Math.round(score) });
}

export function trackAppStoreClick(ct: string): void {
  clientInfo('app_store.click', { ...detectShell(), ct });
}

// ---------------------------------------------------------------------------
// First-race funnel (M0-12): countdown -> first tack -> first mark -> end ->
// replay. Every step fires at most once per race, keyed by the race id the
// game generates for each new race, so a caller may report every tack and
// every mark: only the first one is sent. Each event carries raceNo, the
// count of races started on this device (localStorage, stops at RACE_NO_MAX),
// so raceNo = 1 is the first race. Inside the app's race WebView localStorage
// may not survive a relaunch, so there the "first race" count is an upper
// bound. Without storage raceNo is left out rather than guessed.
// ---------------------------------------------------------------------------

/** localStorage key of the device's race counter. */
export const RACE_COUNT_STORAGE_KEY = 'regatta.race-count.v1';

export interface RaceFunnelSetup {
  mode: RaceFunnelMode;
  difficulty: RaceFunnelDifficulty;
  wind: RaceFunnelWind;
  missionId?: string | null;
  /** True for the daily challenge. */
  daily?: boolean;
}

export interface RaceFunnelEnd {
  /** False when the race ended by the time limit before the player finished. */
  finished: boolean;
  /** Final place, sent only for a finished race. */
  position?: number;
  totalBoats?: number;
  /** Race clock at the end, in seconds. */
  durationSec?: number;
  /** Tacks and gybes (wind side flips) the player made. */
  tacks?: number;
}

interface ActiveRace {
  id: string;
  fields: Record<string, string | number | boolean>;
  tacked: boolean;
  marked: boolean;
  ended: boolean;
  replayed: boolean;
}

// One race at a time per page load; a new race id replaces it.
let activeRace: ActiveRace | null = null;

function nextRaceNo(): number | undefined {
  try {
    const prev = Number.parseInt(window.localStorage.getItem(RACE_COUNT_STORAGE_KEY) ?? '', 10);
    const next = Math.min(RACE_NO_MAX, (Number.isInteger(prev) && prev > 0 ? prev : 0) + 1);
    window.localStorage.setItem(RACE_COUNT_STORAGE_KEY, String(next));
    return next;
  } catch {
    return undefined;
  }
}

/** Rounded and clamped to [min, max]; undefined for a non-finite number. */
function bounded(v: number | undefined, min: number, max: number): number | undefined {
  if (v === undefined || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function withDefined(fields: Record<string, string | number | boolean | undefined>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) out[k] = v;
  return out;
}

/** The player started the countdown of race `raceId`. Counts the race on this device. */
export function trackRaceCountdown(raceId: string, setup: RaceFunnelSetup): void {
  if (typeof window === 'undefined' || !raceId || activeRace?.id === raceId) return;
  // Analytics off: no event and no counting either.
  if (analyticsDisabled()) return;
  const fields = withDefined({
    raceNo: nextRaceNo(),
    mode: setup.mode,
    difficulty: setup.difficulty,
    wind: setup.wind,
    missionId: setup.missionId ?? undefined,
    daily: setup.daily ? true : undefined,
  });
  activeRace = { id: raceId, fields, tacked: false, marked: false, ended: false, replayed: false };
  clientInfo('race.countdown', { ...detectShell(), ...fields });
}

/** Any tack or gybe of the player in race `raceId`; only the first is sent. */
export function trackRaceTack(raceId: string, atSec: number): void {
  const race = activeRace;
  if (!race || race.id !== raceId || race.tacked) return;
  race.tacked = true;
  clientInfo('race.first_tack', { ...detectShell(), ...race.fields, ...withDefined({ atSec: bounded(atSec, 0, RACE_AT_SEC_MAX) }) });
}

/** Any mark rounding of the player in race `raceId`; only the first is sent. */
export function trackRaceMark(raceId: string, atSec: number): void {
  const race = activeRace;
  if (!race || race.id !== raceId || race.marked) return;
  race.marked = true;
  clientInfo('race.first_mark', { ...detectShell(), ...race.fields, ...withDefined({ atSec: bounded(atSec, 0, RACE_AT_SEC_MAX) }) });
}

/** Race `raceId` ended, finished or by the time limit; sent once. */
export function trackRaceEnd(raceId: string, end: RaceFunnelEnd): void {
  const race = activeRace;
  if (!race || race.id !== raceId || race.ended) return;
  race.ended = true;
  clientInfo('race.end', {
    ...detectShell(),
    ...race.fields,
    ...withDefined({
      finished: end.finished,
      position: end.finished ? bounded(end.position, 1, RACE_FLEET_MAX) : undefined,
      totalBoats: bounded(end.totalBoats, 1, RACE_FLEET_MAX),
      durationSec: bounded(end.durationSec, 0, 86_400),
      tacks: bounded(end.tacks, 0, 1000),
    }),
  });
}

/**
 * A replay was opened. From the finish screen pass the race id: it is sent
 * once per race with that race's fields. A saved or shared replay belongs to
 * no live race and is sent on every opening.
 */
export function trackRaceReplay(source: ReplaySource, raceId?: string): void {
  const race = activeRace;
  if (source === 'result') {
    if (!race || race.id !== raceId || race.replayed) return;
    race.replayed = true;
    clientInfo('race.replay', { ...detectShell(), ...race.fields, source });
    return;
  }
  clientInfo('race.replay', { ...detectShell(), source });
}

const APP_STORE_URL = 'https://apps.apple.com/app/id6768134329';
// App Store Connect counts a campaign only when the link also carries the
// team's provider token (`pt`, App Analytics > Campaigns > Generate link). It
// is public, not a secret. Until it is filled in, `ct` still reaches the site's
// own app_store.click event, but App Analytics groups the installs as "web".
const APP_STORE_PROVIDER_TOKEN = '';

/** App Store link tagged with a placement token, e.g. appStoreUrl('web_home'). */
export function appStoreUrl(ct: string): string {
  if (!isCampaignToken(ct)) return APP_STORE_URL;
  const params = new URLSearchParams();
  if (APP_STORE_PROVIDER_TOKEN) params.set('pt', APP_STORE_PROVIDER_TOKEN);
  params.set('ct', ct);
  params.set('mt', '8');
  return `${APP_STORE_URL}?${params.toString()}`;
}
