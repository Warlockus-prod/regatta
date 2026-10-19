/**
 * Funnel events: the few user milestones that tell the owner whether people
 * who arrive actually learn (lessons, radio tasks) and sit the mock exams, and
 * where App Store installs come from. Names and fields are validated on the
 * server against src/lib/analytics-events.ts.
 *
 * All helpers are fire-and-forget through clientLog() and never throw.
 */

import { clientInfo } from './client-log';
import {
  EMBED_STORAGE_KEY,
  isCampaignToken,
  type ClientKind,
  type ExamBase,
  type LessonCourse,
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
