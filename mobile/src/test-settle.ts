/**
 * Test helper, kept apart from test-utils.tsx so hook tests can use it
 * without the i18n provider (and its expo-localization import).
 */
import { act } from '@testing-library/react-native';
import { serial } from './persistence/serial';

/**
 * Wait, inside act, until every progress read and write queued so far has
 * landed and the hooks have applied what storage returned. A progress action
 * (open a lesson, record a check) updates memory at once and merges into
 * storage through the queue (src/persistence/serial.ts); a test that ends
 * right after the action leaves that last state update to land outside act.
 * The macrotask turn lets reads outside the queue (sail progress, races) and
 * the `.then` continuations finish too. Not for tests with fake timers.
 */
export async function settleProgress(): Promise<void> {
  await act(async () => {
    await serial(async () => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
