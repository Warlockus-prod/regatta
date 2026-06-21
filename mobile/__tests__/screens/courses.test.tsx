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
import { pointsOfSail } from '../../src/data';
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

  it('shows angle range and speed labels on each card', async () => {
    const view = renderWithProviders(<Courses />);
    await waitFor(() =>
      expect(view.getAllByText('ANGLE').length).toBe(pointsOfSail.length),
    );
    expect(view.getAllByText('SPEED').length).toBe(pointsOfSail.length);
  });
});
