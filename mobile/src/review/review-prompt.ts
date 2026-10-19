/**
 * App Store review prompt, asked only after the user has had real wins.
 *
 * A "win" is a passed lesson quiz or sail theory check, a passed mock exam or
 * a race podium (top 3, never last: see isReviewPodium). Opening a lesson is
 * not a win. After WINS_NEEDED wins we ask iOS to show its native rating sheet
 * (SKStoreReviewController via expo-store-review). iOS itself decides whether
 * the sheet appears and caps it at 3 times a year, so we also keep our own
 * cool-down: at most once per COOLDOWN_DAYS, and the win counter restarts
 * after each ask.
 *
 * Storage: `regatta.review.v1` = JSON `{ wins: number, lastAskAt: number | null }`.
 * Everything fails silently: a review prompt must never break a lesson, an
 * exam or a race.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const STORAGE_KEY = 'regatta.review.v1';
export const WINS_NEEDED = 3;
export const COOLDOWN_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Let the finish / result screen settle before the system sheet slides in. */
const ASK_DELAY_MS = 1500;

export type ReviewWin = 'lesson' | 'exam-passed' | 'race-podium';

type ReviewState = { wins: number; lastAskAt: number | null };

async function readState(): Promise<ReviewState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { wins: 0, lastAskAt: null };
    const parsed = JSON.parse(raw) as Partial<ReviewState>;
    return {
      wins: typeof parsed.wins === 'number' && parsed.wins >= 0 ? parsed.wins : 0,
      lastAskAt: typeof parsed.lastAskAt === 'number' ? parsed.lastAskAt : null,
    };
  } catch {
    return { wins: 0, lastAskAt: null };
  }
}

/**
 * A race finish that counts as a review win: top 3, and never last. The easy
 * course races 2 AI boats, so "top 3" alone would count every finish there,
 * last place included; 3rd of 4 still counts, 3rd of 3 does not.
 */
export function isReviewPodium(position: number, totalBoats: number): boolean {
  return position >= 1 && position <= Math.min(3, totalBoats - 1);
}

/** Pure decision, exported for tests. */
export function shouldAsk(state: ReviewState, now: number): boolean {
  if (state.wins < WINS_NEEDED) return false;
  if (state.lastAskAt != null && now - state.lastAskAt < COOLDOWN_DAYS * DAY_MS) return false;
  return true;
}

/**
 * Record a win and, when it is time, ask for a review. Returns true when the
 * system sheet was requested (iOS may still decide not to show it).
 */
export async function recordReviewWin(_kind: ReviewWin, now: number = Date.now()): Promise<boolean> {
  try {
    const state = await readState();
    const next: ReviewState = { ...state, wins: state.wins + 1 };
    if (!shouldAsk(next, now) || !(await StoreReview.hasAction())) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return false;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ wins: 0, lastAskAt: now }));
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, ASK_DELAY_MS);
    return true;
  } catch {
    return false;
  }
}
