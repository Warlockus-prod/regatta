/**
 * Shared helpers for screen-level tests. Lives in `src/` (not `__tests__/`)
 * so Jest's default testRegex does not auto-discover it as a test file.
 */

import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from './i18n/context';

const initialMetrics = {
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 320, height: 568 },
};

/**
 * Render a screen wrapped in the same providers `app/_layout.tsx` mounts:
 *  - `SafeAreaProvider` with deterministic insets (so `<Screen>` renders
 *    without complaining about missing context).
 *  - `I18nProvider` so `useI18n` resolves. Tests can pre-seed the lang
 *    via AsyncStorage and rely on `waitFor` for hydration. EN is used as
 *    the deterministic first render language because most screen tests
 *    assert English copy.
 *
 * Tests still need to mock `expo-router`, `expo-localization`, and
 * `@react-native-async-storage/async-storage`. See `__tests__/screens/`
 * for the canonical mocks.
 */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <I18nProvider initialLang="en">{ui}</I18nProvider>
    </SafeAreaProvider>,
  );
}
