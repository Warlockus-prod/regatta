// Contract: a bootcamp lesson counts as an App Store review win only when its
// quiz is passed for the first time. "Open" (which navigates straight into a
// trainer or a race) and a failed quiz never count, so the iOS rating sheet
// cannot slide over the screen the learner just opened.
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import * as StoreReview from 'expo-store-review';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'wind-direction' }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import BootcampLesson from '../../app/bootcamp/[id]';
import { getQuizForLesson, pickPrompt } from '../../src/bootcamp/quiz-data';
import { renderWithProviders } from '../../src/test-utils';

const REVIEW_KEY = 'regatta.review.v1';
const QUIZ_KEY = 'regatta.bootcamp-quiz.v1';
const questions = getQuizForLesson('wind-direction');

type View = ReturnType<typeof renderWithProviders>;

async function settle() {
  // Let the AsyncStorage-backed hooks (progress, quiz results) hydrate.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function storedWins(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(REVIEW_KEY);
  return raw ? (JSON.parse(raw) as { wins: number }).wins : null;
}

/** Answers every question, all correct or all wrong, and finishes the quiz. */
async function takeQuiz(view: View, correct: boolean) {
  for (const [index, q] of questions.entries()) {
    const option = q.options.find((o) => o.correct === correct)!;
    fireEvent.press(view.getByText(pickPrompt(option.label, 'en')));
    fireEvent.press(view.getByText('Check answer'));
    const last = index === questions.length - 1;
    fireEvent.press(view.getByText(last ? 'Finish quiz' : 'Next question'));
  }
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.mocked(StoreReview.requestReview).mockClear();
});

describe('Bootcamp lesson review wins', () => {
  it('"Open" completes the lesson but is not a review win', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    const open = await waitFor(() => view.getByText('Open'));
    await settle();
    fireEvent.press(open);
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('regatta.progress.bootcamp.v1')).toContain('wind-direction');
    });
    await settle();
    expect(await AsyncStorage.getItem(REVIEW_KEY)).toBeNull();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('a passed quiz counts once; a retake of the passed quiz does not', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    fireEvent.press(await waitFor(() => view.getByText('Start quiz')));
    await settle();
    await takeQuiz(view, true);
    fireEvent.press(view.getByText('Mark complete'));
    await waitFor(async () => expect(await storedWins()).toBe(1));

    // Retake and pass again: the stored result already passed.
    await waitFor(async () => expect(await AsyncStorage.getItem(QUIZ_KEY)).not.toBeNull());
    fireEvent.press(view.getByText('Try again'));
    await takeQuiz(view, true);
    fireEvent.press(view.getByText('Mark complete'));
    await settle();
    expect(await storedWins()).toBe(1);
  });

  it('a failed quiz is not a review win', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    fireEvent.press(await waitFor(() => view.getByText('Start quiz')));
    await settle();
    await takeQuiz(view, false);
    fireEvent.press(view.getByText('Mark complete'));
    await waitFor(async () => expect(await AsyncStorage.getItem(QUIZ_KEY)).not.toBeNull());
    await settle();
    expect(await AsyncStorage.getItem(REVIEW_KEY)).toBeNull();
  });
});
