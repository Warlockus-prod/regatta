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
import Gallery from '../../app/gallery/index';
import { galleryItems } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Gallery screen', () => {
  it('renders the count summary', async () => {
    const view = renderWithProviders(<Gallery />);
    await waitFor(() =>
      view.getByText(new RegExp(`${galleryItems.length} items`)),
    );
  });

  it('renders the first item title', async () => {
    const view = renderWithProviders(<Gallery />);
    const firstTitle = legacyPick(galleryItems[0]!, 'title', 'en');
    await waitFor(() => view.getByText(firstTitle));
  });

  it('shows year badges for items that carry one', async () => {
    const view = renderWithProviders(<Gallery />);
    const itemsWithBadge = galleryItems.filter((i) => i.badge);
    if (itemsWithBadge.length === 0) return;
    await waitFor(() => view.getAllByText(itemsWithBadge[0]!.badge!));
  });
});
