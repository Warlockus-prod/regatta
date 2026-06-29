/**
 * HTTP clients for the AI coach + race-result endpoints.
 *
 * The web routes live at:
 *   POST https://weektoregatta.com/api/coach        - returns AI coaching JSON
 *   POST https://weektoregatta.com/api/race-result  - persists a finished race
 *
 * Per ADR-0001 the mobile app consumes the existing web backend as-is.
 * No new dependencies; we use `fetch` and an `AbortController` for the
 * 8-second timeout. Each call returns a typed envelope so callers can
 * branch cleanly on `ok` without reaching into raw HTTP errors.
 */
import type { Lang } from '../i18n/languages';

export const API_BASE = 'https://weektoregatta.com';
export const REQUEST_TIMEOUT_MS = 8000;

/**
 * Generic envelope every API helper resolves to. Network failures and
 * timeouts surface as `{ ok: false, error }` rather than throwing - the
 * caller's UI can render an inline retry CTA without try/catch wrapping.
 */
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  /** HTTP status when the server responded; omitted on network error. */
  status?: number;
}

/**
 * One sample row in the race log we ship to /api/coach. Shape matches the
 * web simulator's race recorder so the existing Anthropic prompts parse it
 * unchanged.
 */
export interface CoachLogSample {
  /** Seconds since the start signal. */
  t: number;
  x: number;
  y: number;
  /** Heading degrees, 0 = north, clockwise. */
  heading: number;
  /** True wind angle from bow, signed degrees. */
  twa: number;
  /** Boat speed through water, knots. */
  speed: number;
  /** Lap count for windward / leeward courses. v1 mobile course is single lap. */
  lap: number;
}

export interface CoachLogEvent {
  type: 'mark-rounded' | 'tack' | 'finish' | 'no-go-entered' | 'start';
  t: number;
  note?: string;
}

export interface CoachRequest {
  difficulty: 'easy' | 'medium' | 'hard';
  courseInfo: {
    /** Wind FROM-direction in degrees, 0 = north. */
    windDirection: number;
    windwardMark: { x: number; y: number };
    /** Y of the start / finish line (canvas px). */
    startY: number;
  };
  /** Seconds from start to finish, or null if the player did not finish. */
  finishTime: number | null;
  position: number;
  totalBoats: number;
  samples: CoachLogSample[];
  events: CoachLogEvent[];
  lang: Lang;
}

/** One mistake the coach flagged. The web Coaching shape exposes both
 *  legacy `*Ru` field names and the cleaner aliases; we accept either. */
export interface CoachMistake {
  timeStart: number;
  timeEnd: number;
  severity: 'minor' | 'major';
  /** Cleaner alias added by the web normaliser. */
  title?: string;
  /** Legacy field. Always populated. */
  titleRu?: string;
  explanation?: string;
  explanationRu?: string;
  fix?: string;
  fixRu?: string;
}

export interface CoachResponse {
  coaching: {
    overall: string;
    score: number;
    mistakes: CoachMistake[];
    strengths: string[];
    nextGoal?: string;
    nextGoalRu?: string;
  };
  usage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
  };
}

export interface RaceResultRequest {
  difficulty: 'easy' | 'medium' | 'hard';
  windStrength: 'light' | 'medium' | 'heavy';
  missionId?: string | null;
  finishTimeSec: number;
  position?: number | null;
  totalBoats?: number | null;
  tacks?: number | null;
  noGoEntries?: number | null;
  topSpeed?: number | null;
  score?: number | null;
  /** Server requires a nickname; mobile passes a default string when
   *  the player has not chosen one yet. */
  nicknameFallback?: string;
}

export interface RaceResultResponse {
  ok: true;
  id: number;
}

/**
 * Wrapper around `fetch` that adds an `AbortController` timeout and
 * collapses thrown errors into the `ApiResult` envelope. Centralises
 * the JSON content-type handling so each helper stays a one-liner.
 */
async function postJson<TReq, TRes>(
  url: string,
  body: TReq,
): Promise<ApiResult<TRes>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let parsed: unknown = null;
    try {
      parsed = await resp.json();
    } catch {
      // Server returned a non-JSON body. Surface as a transport error
      // so the caller's retry CTA can re-fire the request.
      return { ok: false, status: resp.status, error: 'Invalid response' };
    }
    if (!resp.ok) {
      const errMsg =
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        typeof (parsed as { error: unknown }).error === 'string'
          ? (parsed as { error: string }).error
          : `HTTP ${resp.status}`;
      return { ok: false, status: resp.status, error: errMsg };
    }
    return { ok: true, status: resp.status, data: parsed as TRes };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Request timed out' };
    }
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit a finished race for the leaderboard. The web route requires a
 * `regatta_sid` cookie; mobile callers receive a 400 today (until
 * ADR-0006 lands a proper auth model), but the local AsyncStorage
 * persistence still keeps the result on-device so the user can review
 * and request AI coaching offline of the leaderboard.
 */
export async function submitRaceResult(
  payload: RaceResultRequest,
): Promise<ApiResult<RaceResultResponse>> {
  return postJson<RaceResultRequest, RaceResultResponse>(
    `${API_BASE}/api/race-result`,
    payload,
  );
}

/**
 * Request AI coaching for a race log. Returns the parsed `coaching`
 * object on success. The web route may return 200 with `fallback: true`
 * when the API key is unset; we treat that as a soft error so the UI
 * can show the retry CTA.
 */
export async function requestCoaching(
  payload: CoachRequest,
): Promise<ApiResult<CoachResponse>> {
  const res = await postJson<CoachRequest, CoachResponse & { fallback?: boolean }>(
    `${API_BASE}/api/coach`,
    payload,
  );
  if (res.ok && res.data && 'fallback' in res.data && res.data.fallback === true) {
    return { ok: false, status: res.status, error: 'Coach unavailable' };
  }
  return res;
}
