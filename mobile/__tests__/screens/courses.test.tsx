import { waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import Courses from '../../app/courses/index';
import { maneuvers, pointsOfSail } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Courses (points of sail) screen', () => {
  it('renders all five points by EN name', async () => {
    const view = renderWithProviders(<Courses />);
    await waitFor(() =>
      view.getByText(legacyPick(pointsOfSail[0]!, 'name', 'en')),
    );
    for (const point of pointsOfSail) {
      const name = legacyPick(point, 'name', 'en');
      expect(view.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it('shows tacking and jibing as step-by-step procedures', async () => {
    const view = renderWithProviders(<Courses />);
    await waitFor(() => view.getByText('Turns: tacking and jibing'));
    const turns = maneuvers.filter((m) => (m.stepsEn?.length ?? 0) > 0);
    expect(turns.map((m) => m.id)).toEqual(['tacking', 'jibing']);
    for (const m of turns) {
      expect(view.getAllByText(legacyPick(m, 'name', 'en')).length).toBeGreaterThan(0);
      for (const call of m.commandsEn!) expect(view.getByText(call)).toBeTruthy();
      for (const mistake of m.mistakesEn!) expect(view.getByText(mistake)).toBeTruthy();
    }
    expect(view.getAllByText('STEP BY STEP').length).toBe(2);
  });

  it('shows angle range and speed labels on each card', async () => {
    const view = renderWithProviders(<Courses />);
    await waitFor(() =>
      expect(view.getAllByText('ANGLE').length).toBe(pointsOfSail.length),
    );
    expect(view.getAllByText('SPEED').length).toBe(pointsOfSail.length);
  });
});
