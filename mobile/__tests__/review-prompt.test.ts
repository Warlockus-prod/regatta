// Contract: the review sheet is requested only after 3 wins, at most once per
// 120 days, and never when iOS reports it cannot show it. A race counts as a
// win only for a podium that is not last place.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { COOLDOWN_DAYS, WINS_NEEDED, isReviewPodium, recordReviewWin, shouldAsk } from '../src/review/review-prompt';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-store-review', () => ({
  hasAction: jest.fn(async () => true),
  requestReview: jest.fn(async () => {}),
}));

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-10-18T12:00:00Z');

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  (StoreReview.hasAction as jest.Mock).mockResolvedValue(true);
  (StoreReview.requestReview as jest.Mock).mockClear();
});
afterEach(() => jest.useRealTimers());

describe('review prompt', () => {
  it('asks only on the third win', async () => {
    expect(await recordReviewWin('lesson', T0)).toBe(false);
    expect(await recordReviewWin('exam-passed', T0)).toBe(false);
    expect(await recordReviewWin('race-podium', T0)).toBe(true);
    jest.runAllTimers();
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('waits out the cool-down after an ask, then needs 3 new wins', async () => {
    for (let i = 0; i < WINS_NEEDED; i++) await recordReviewWin('lesson', T0);
    const soon = T0 + 10 * DAY;
    for (let i = 0; i < WINS_NEEDED + 2; i++) expect(await recordReviewWin('lesson', soon)).toBe(false);
    const later = T0 + (COOLDOWN_DAYS + 1) * DAY;
    expect(await recordReviewWin('lesson', later)).toBe(true);
  });

  it('does not ask when iOS cannot show the sheet, and keeps the wins', async () => {
    (StoreReview.hasAction as jest.Mock).mockResolvedValue(false);
    for (let i = 0; i < WINS_NEEDED; i++) expect(await recordReviewWin('lesson', T0)).toBe(false);
    (StoreReview.hasAction as jest.Mock).mockResolvedValue(true);
    expect(await recordReviewWin('lesson', T0)).toBe(true);
  });

  // A podium is top 3 and never last: on the easy course (player + 2 AI
  // boats) only 1st and 2nd count.
  it.each([
    [1, 3, true],
    [2, 3, true],
    [3, 3, false],
    [3, 4, true],
    [4, 4, false],
    [3, 5, true],
    [4, 5, false],
    [1, 1, false],
    [0, 3, false],
  ])('isReviewPodium(position %i, %i boats) is %s', (position, boats, expected) => {
    expect(isReviewPodium(position, boats)).toBe(expected);
  });

  it('shouldAsk respects both thresholds', () => {
    expect(shouldAsk({ wins: 2, lastAskAt: null }, T0)).toBe(false);
    expect(shouldAsk({ wins: 3, lastAskAt: null }, T0)).toBe(true);
    expect(shouldAsk({ wins: 9, lastAskAt: T0 - DAY }, T0)).toBe(false);
  });
});
