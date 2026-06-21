/**
 * Global leaderboard client. Reads the shared board the web shows at
 * /api/leaderboard. The app already SUBMITS scores via /api/race-result
 * (see coach.ts submitRaceResult) but until now never displayed the global
 * board - this is the read side.
 *
 * GET /api/leaderboard?difficulty=<easy|medium|hard>&wind=<light|medium|heavy>
 *   -> { rows: GlobalLeaderboardRow[], mode, difficulty, wind }
 *
 * Per ADR-0001 the app consumes the existing web backend as-is.
 */
import { API_BASE, type ApiResult } from './coach';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Wind = 'light' | 'medium' | 'heavy';

export interface GlobalLeaderboardRow {
  nickname: string;
  sid: string;
  finish_time_sec: number;
  score: number | null;
  ts: number;
}

export interface GlobalLeaderboardResponse {
  rows: GlobalLeaderboardRow[];
  mode: string;
  difficulty: string;
  wind: string;
}

const TIMEOUT_MS = 8000;

export async function fetchGlobalLeaderboard(
  difficulty: Difficulty,
  wind: Wind,
): Promise<ApiResult<GlobalLeaderboardResponse>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(
      `${API_BASE}/api/leaderboard?difficulty=${difficulty}&wind=${wind}`,
      { signal: ctrl.signal },
    );
    let parsed: unknown = null;
    try {
      parsed = await resp.json();
    } catch {
      return { ok: false, status: resp.status, error: 'Invalid response' };
    }
    if (!resp.ok) {
      const err =
        parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : `HTTP ${resp.status}`;
      return { ok: false, status: resp.status, error: err };
    }
    const data = parsed as GlobalLeaderboardResponse;
    if (!Array.isArray(data.rows)) {
      return { ok: false, status: resp.status, error: 'Malformed response' };
    }
    return { ok: true, status: resp.status, data };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Request timed out' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}
