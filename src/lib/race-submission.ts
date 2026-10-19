// Validation shared by the routes that store client-submitted races:
// /api/player (nickname), /api/race-result (leaderboard) and /api/replay,
// plus publicRows() for the routes that read leaderboards back out
// (/api/leaderboard, /api/daily).

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

/**
 * Nickname as stored and shown on the leaderboard: letters of any alphabet,
 * digits, `-`, `_`, space and `.`, at most NICKNAME_MAX chars. Returns null
 * when nothing usable is left.
 */
export function sanitizeNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/[^\p{L}\p{N}\-_ .]/gu, '').slice(0, NICKNAME_MAX).trim();
  return clean.length >= NICKNAME_MIN ? clean : null;
}

/**
 * Plausible finish time for one race. The quickest web and mobile course
 * (mobile "short", par 75 s) has never been sailed under ~54 s in prod, and
 * at the engine's MAX_SPEED the round trip alone takes ~27 s, so anything
 * under 20 s is a forged leaderboard entry. Two hours covers a race left
 * running in a background tab.
 */
export const FINISH_SEC_MIN = 20;
export const FINISH_SEC_MAX = 2 * 60 * 60;

export function isPlausibleFinishSec(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= FINISH_SEC_MIN && v <= FINISH_SEC_MAX;
}

/** Mission and course ids are short slugs (`clean-laps`, `short`, `daily`). */
export const MISSION_ID_MAX = 40;

/** `undefined`/`null` -> null (free race); a valid slug -> itself; else 'invalid'. */
export function parseMissionId(v: unknown): string | null | 'invalid' {
  if (v == null) return null;
  if (typeof v !== 'string' || v.length === 0 || v.length > MISSION_ID_MAX || !/^[A-Za-z0-9_-]+$/.test(v)) return 'invalid';
  return v;
}

/**
 * Leaderboard rows as sent to clients. The raw `regatta_sid` is the
 * unauthenticated write key (rename via /api/player, results via
 * /api/race-result, likes, per-session AI budgets), so it never leaves the
 * server: it is stripped from every row and replaced by `isMe`, true only for
 * the caller's own cookie sid, so the UI can still highlight "you".
 */
export function publicRows<T extends { sid?: string | null }>(
  rows: T[],
  mySid: string | null | undefined,
): Array<Omit<T, 'sid'> & { isMe: boolean }> {
  return rows.map(({ sid, ...rest }) => ({ ...rest, isMe: !!mySid && sid === mySid }));
}
