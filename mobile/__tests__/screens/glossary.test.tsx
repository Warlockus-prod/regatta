import { fireEvent, waitFor } from '@testing-library/react-native';

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
import Glossary from '../../app/glossary/index';
import { glossaryTerms } from '../../src/data';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Glossary screen', () => {
  it('renders the search input + counter', async () => {
    const view = renderWithProviders(<Glossary />);
    // Counter shows total before search: e.g. "51 of 51"
    await waitFor(() =>
      view.getByText(`${glossaryTerms.length} of ${glossaryTerms.length}`),
    );
  });

  it('filters the list when the user types', async () => {
    const view = renderWithProviders(<Glossary />);
    const input = await waitFor(() => view.getByPlaceholderText(/Search/i));
    fireEvent.changeText(input, 'wind');
    // After typing, the visible counter dropped below total.
    await waitFor(() => {
      const counterRegex = new RegExp(
        `\\d+ of ${glossaryTerms.length}`,
      );
      const counter = view.getByText(counterRegex);
      const match = counter.props.children;
      expect(typeof match === 'string' ? match : match.join('')).not.toBe(
        `${glossaryTerms.length} of ${glossaryTerms.length}`,
      );
    });
  });

  it('shows "Nothing found" when query has zero matches', async () => {
    const view = renderWithProviders(<Glossary />);
    const input = await waitFor(() => view.getByPlaceholderText(/Search/i));
    fireEvent.changeText(input, 'zzzzzzzzzzzzz');
    await waitFor(() => view.getByText(/Nothing found/i));
  });
});
