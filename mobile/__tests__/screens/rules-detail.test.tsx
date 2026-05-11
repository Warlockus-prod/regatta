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
  useLocalSearchParams: () => ({
    id: (globalThis as any).__regattaRulesId ?? 'port-vs-starboard',
  }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import RuleScenarioDetail from '../../app/rules/[id]';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
  (globalThis as any).__regattaRulesId = 'port-vs-starboard';
});

afterEach(() => {
  delete (globalThis as any).__regattaRulesId;
});

describe('Rule scenario detail', () => {
  it('renders the scenario title for a known id', async () => {
    const view = renderWithProviders(<RuleScenarioDetail />);
    await waitFor(() => view.getByText('Port vs Starboard Tack'));
  });

  it('renders the scene and question sections up front', async () => {
    const view = renderWithProviders(<RuleScenarioDetail />);
    await waitFor(() => view.getByText(/SCENE/i));
    view.getByText(/QUESTION/i);
  });

  it('hides the answer/why/practice sections until the user reveals', async () => {
    const view = renderWithProviders(<RuleScenarioDetail />);
    await waitFor(() => view.getByText(/SCENE/i));
    expect(view.queryByText(/^ANSWER$/i)).toBeNull();
    expect(view.queryByText(/^WHY$/i)).toBeNull();
    expect(view.queryByText(/^IN PRACTICE$/i)).toBeNull();
  });

  it('reveals all three answer sections after the Show answer button is pressed', async () => {
    const view = renderWithProviders(<RuleScenarioDetail />);
    const cta = await waitFor(() => view.getByText('Show answer'));
    fireEvent.press(cta);
    await waitFor(() => view.getByText(/^ANSWER$/i));
    view.getByText(/^WHY$/i);
    view.getByText(/^IN PRACTICE$/i);
  });

  it('renders the localized "not found" copy when id is unknown', async () => {
    (globalThis as any).__regattaRulesId = 'this-scenario-does-not-exist';
    const view = renderWithProviders(<RuleScenarioDetail />);
    await waitFor(() => view.getByText(/Scenario not found/i));
  });
});
