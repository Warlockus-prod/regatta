/**
 * The two pilot lessons on the v3 template (ADR-0015): the template order,
 * the image and drawing layers, and the rule that looking at them never
 * passes a lesson. The other lessons keep their layout.
 */
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual('react').useEffect(effect, [effect]),
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: (globalThis as { __pilotId?: string }).__pilotId ?? 'wind-direction' }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US' }] }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import BootcampLesson from '../../app/bootcamp/[id]';
import { SailingCourseScreen } from '../../src/sailing/SailingCourseScreen';
import { renderWithProviders, settleProgress } from '../../src/test-utils';
import { SAIL_PROGRESS_KEY } from '../../../src/features/sailing-lab/lessons/progress';
import { bootcampPilots, lessonCopy, sailPilots } from '../../src/lessons/pilots';
import { scenes } from '../../src/lessons/graphics/scenes';
import { sailHandlingPhoto } from '../../src/lessons/graphics/photos';
import { readLearningSnapshot } from '../../src/home/useLearningSnapshot';

const setLesson = (id: string) => { (globalThis as { __pilotId?: string }).__pilotId = id; };
// Position of each text as a whole text node in the rendered tree.
const order = (json: string, texts: string[]) => texts.map((t) => json.indexOf(JSON.stringify(t)));

beforeEach(async () => {
  await AsyncStorage.clear();
  setLesson('wind-direction');
});

describe('wind-direction on the lesson template', () => {
  it('goal, the drawing, the explanation, the mistake, then the check and the practice', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText('TEST YOUR UNDERSTANDING'));
    const json = JSON.stringify(view.toJSON());
    const names = ['Goal', 'Where the wind comes from', 'How it works', 'Common mistake', 'TEST YOUR UNDERSTANDING', 'Practice', 'Open'];
    const at = order(json, names);
    expect(names.filter((_, i) => at[i]! < 0)).toEqual([]);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The old compass drawing and its focus card are replaced.
    expect(view.queryByText('FOCUS THIS TIME')).toBeNull();
    await settleProgress();
  });

  it('the states are named by meaning and change the drawing and the explanation', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    const state = await waitFor(() => view.getByTestId('diagram-state-1'));
    expect(view.getByText('From starboard')).toBeTruthy();
    expect(view.getByTestId('diagram-image').props.accessibilityLabel).toMatch(/straight onto the bow/);
    fireEvent.press(state);
    expect(view.getByTestId('diagram-state-1').props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByTestId('diagram-image').props.accessibilityLabel).toMatch(/starboard side.*boom is on the port side/);
    expect(view.getByText(/port is the leeward side/)).toBeTruthy();
    await settleProgress();
  });

  it('looking at every state does not pass the lesson', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByTestId('diagram-state-2'));
    for (const i of [1, 2, 0]) fireEvent.press(view.getByTestId(`diagram-state-${i}`));
    await settleProgress();
    const snapshot = await readLearningSnapshot();
    expect(snapshot.bootcamp.quizResults['wind-direction']).toBeUndefined();
    expect(view.getByText(/at least 70% of the check below/)).toBeTruthy();
  });

  it('a lesson not on the template keeps its layout', async () => {
    setLesson('points-of-sail');
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText('FOCUS THIS TIME'));
    expect(view.queryByText('Goal')).toBeNull();
    await settleProgress();
  });
});

describe('rig-basics on the lesson template', () => {
  it('goal, the annotated image first, How it works next, then theory and mistake; the check and the boat are the next steps', async () => {
    const view = renderWithProviders(<SailingCourseScreen lessonId="rig-basics" />);
    await waitFor(() => view.getByText('Sail, boom and mast'));
    const json = JSON.stringify(view.toJSON());
    const at = order(json, ['Goal', 'Sail, boom and mast', 'How it works', 'Halyard hoists, sheet trims', 'Common mistake', 'Sources', 'Continue to the check']);
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The old five-line schematic is replaced, the drawing starts closed.
    expect(view.queryByText('Select a line: its number matches the diagram.')).toBeNull();
    expect(view.queryByTestId('diagram-image')).toBeNull();
    expect(view.getByTestId('how-it-works').props.accessibilityState).toMatchObject({ expanded: false });
    // Step 2 holds the unchanged check, step 3 the boat.
    fireEvent.press(view.getByRole('button', { name: '2. Check' }));
    expect(view.getByText('Check your understanding')).toBeTruthy();
    expect(view.queryByText('Sail, boom and mast')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: '3. On the boat' }));
    expect(view.getByText('Observe on the boat')).toBeTruthy();
  });

  it('How it works opens one drawing with the three lines, and the key follows the line', async () => {
    const view = renderWithProviders(<SailingCourseScreen lessonId="rig-basics" />);
    fireEvent.press(await waitFor(() => view.getByTestId('how-it-works')));
    expect(view.getByTestId('how-it-works').props.accessibilityState).toMatchObject({ expanded: true });
    expect(view.getAllByTestId('diagram-image')).toHaveLength(1);
    expect(['Halyard', 'Mainsheet', 'Vang'].map((n) => view.getAllByText(n).length > 0)).toEqual([true, true, true]);
    fireEvent.press(view.getByTestId('diagram-state-2'));
    expect(view.getByTestId('diagram-image').props.accessibilityLabel).toMatch(/Highlighted: the vang/);
    expect(view.getByText(/The topping lift holds the boom from above/)).toBeTruthy();
  });

  it('choosing every part of the image never checks the theory', async () => {
    const view = renderWithProviders(<SailingCourseScreen lessonId="rig-basics" />);
    await waitFor(() => view.getByTestId('part-mast'));
    for (const id of ['boom', 'cover', 'mast', 'cloth']) fireEvent.press(view.getByTestId(`part-${id}`));
    expect(view.getByRole('header', { name: '1. Sailcloth' })).toBeTruthy();
    expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
    fireEvent.press(view.getByRole('button', { name: '2. Check' }));
    expect(view.getByRole('button', { name: 'Save theory check' }).props.accessibilityState.disabled).toBe(true);
  });

  it('a sail lesson not on the template keeps its own diagram', async () => {
    const view = renderWithProviders(<SailingCourseScreen lessonId="apparent-wind" />);
    await waitFor(() => view.getByText(/Change boat speed/));
    expect(view.queryByText('Goal')).toBeNull();
  });
});

describe('lesson template words', () => {
  const langs = ['ru', 'en', 'pl', 'es', 'fr', 'de', 'it'] as const;
  const labels = [
    ...Object.values(lessonCopy),
    ...[...Object.values(bootcampPilots), ...Object.values(sailPilots)].flatMap((p) => [p!.goal, p!.situation, p!.mistake, ...(p!.explanation ?? [])]),
    ...Object.values(scenes).flatMap((sc) => [sc.title, sc.summary, sc.stateGroup, sc.limit, ...sc.legend, ...sc.states.flatMap((st) => [st.label, st.note, st.description])]),
    sailHandlingPhoto.title, sailHandlingPhoto.description, sailHandlingPhoto.caption,
    ...sailHandlingPhoto.points.flatMap((p) => [p.label, p.body]),
  ];

  it('every string exists in all seven languages, without Russian leaking into the others', () => {
    for (const label of labels) {
      for (const lang of langs) expect(label[lang].trim().length).toBeGreaterThan(0);
      for (const lang of langs.filter((l) => l !== 'ru')) expect([lang, label[lang]]).toEqual([lang, expect.not.stringMatching(/[А-Яа-яЁё]/)]);
    }
  });

  it('keeps the typography rules: no long dashes, no curly quotes, Polish with its letters', () => {
    // Long dashes, curly quotes and the ellipsis sign, built from code points so
    // the source file itself stays within the typography rule.
    const banned = new RegExp(`[${[0x2013, 0x2014, 0x201c, 0x201d, 0x201e, 0x2018, 0x2019, 0x2026].map((c) => String.fromCharCode(c)).join('')}]`);
    for (const label of labels) {
      for (const lang of langs) expect(label[lang]).not.toMatch(banned);
    }
    expect(labels.some((l) => /[ąćęłńóśźż]/.test(l.pl))).toBe(true);
  });
});
