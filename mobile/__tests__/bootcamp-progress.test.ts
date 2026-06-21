import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBootcampProgress } from '../src/persistence/bootcamp';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const STORAGE_KEY = 'regatta.progress.bootcamp.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useBootcampProgress - hydration', () => {
  it('starts with ready=false then flips to ready=true', async () => {
    const { result } = renderHook(() => useBootcampProgress());
    expect(result.current.ready).toBe(false);
    expect(result.current.completedIds.size).toBe(0);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.completedIds.size).toBe(0);
  });

  it('rehydrates from existing storage', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['wind-direction', 'points-of-sail']),
    );
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.completedIds.size).toBe(2);
    expect(result.current.isCompleted('wind-direction')).toBe(true);
    expect(result.current.isCompleted('points-of-sail')).toBe(true);
    expect(result.current.isCompleted('not-here')).toBe(false);
  });

  it('handles corrupted storage gracefully', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not valid JSON');
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.completedIds.size).toBe(0);
  });

  it('handles non-array storage gracefully', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ wind: true }));
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.completedIds.size).toBe(0);
  });

  it('filters non-string entries from storage', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['wind-direction', 42, null, 'points-of-sail']),
    );
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.completedIds.size).toBe(2);
    expect(result.current.isCompleted('wind-direction')).toBe(true);
    expect(result.current.isCompleted('points-of-sail')).toBe(true);
  });
});

describe('useBootcampProgress - markCompleted', () => {
  it('adds an id to the in-memory set', async () => {
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.markCompleted('wind-direction');
    });

    expect(result.current.isCompleted('wind-direction')).toBe(true);
    expect(result.current.completedIds.has('wind-direction')).toBe(true);
  });

  it('persists to AsyncStorage', async () => {
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.markCompleted('wind-direction');
    });

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? '[]');
      expect(parsed).toContain('wind-direction');
    });
  });

  it('is idempotent (multiple calls do not duplicate)', async () => {
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.markCompleted('wind-direction');
      result.current.markCompleted('wind-direction');
      result.current.markCompleted('wind-direction');
    });

    expect(result.current.completedIds.size).toBe(1);
  });

  it('accumulates multiple distinct lessons', async () => {
    const { result } = renderHook(() => useBootcampProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.markCompleted('wind-direction');
      result.current.markCompleted('points-of-sail');
      result.current.markCompleted('rules');
    });

    expect(result.current.completedIds.size).toBe(3);
  });
});
