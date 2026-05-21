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
import Anatomy from '../../app/anatomy/index';
import { anatomyParts } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Anatomy screen', () => {
  it('renders the parts count summary', async () => {
    const view = renderWithProviders(<Anatomy />);
    await waitFor(() =>
      view.getByText(new RegExp(`${anatomyParts.length} parts`)),
    );
  });

  it('renders the first part name in EN', async () => {
    const view = renderWithProviders(<Anatomy />);
    const firstName = legacyPick(anatomyParts[0]!, 'name', 'en');
    await waitFor(() => view.getByText(firstName));
  });

  it('renders website poster previews in EN', async () => {
    const view = renderWithProviders(<Anatomy />);
    await waitFor(() => view.getByText('Sailing Yacht - Main Elements'));
    expect(view.getByText('Deck and Cockpit')).toBeTruthy();
  });
});
