// Race hub preferences: race mode (simple or pro), the shore switch and the venue.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { __resetVenueForTests, useVenue } from '../src/persistence/venue';

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetVenueForTests();
});

it('starts simple, with the shore on, at Göcek', async () => {
  const { result } = renderHook(() => useVenue());
  await waitFor(() => expect(result.current.venue.id).toBe('gocek'));
  expect(result.current.mode).toBe('simple');
  expect(result.current.shoreOn).toBe(true);
});

it('switching the shore off draws open sea but keeps the picked venue', async () => {
  const { result } = renderHook(() => useVenue());
  act(() => result.current.setVenue('split'));
  act(() => result.current.setShoreOn(false));
  expect(result.current.venue.id).toBe('open');
  expect(result.current.venue.lands).toHaveLength(0);
  expect(result.current.picked.id).toBe('split');
  act(() => result.current.setShoreOn(true));
  expect(result.current.venue.id).toBe('split');
  await waitFor(async () => expect(await AsyncStorage.getItem('regatta.shore.v1')).toBe('on'));
});

it('keeps the race mode and reads it back after a restart', async () => {
  const first = renderHook(() => useVenue());
  act(() => first.result.current.setRaceMode('pro'));
  await waitFor(async () => expect(await AsyncStorage.getItem('regatta.race.mode.v1')).toBe('pro'));
  __resetVenueForTests();
  const second = renderHook(() => useVenue());
  await waitFor(() => expect(second.result.current.mode).toBe('pro'));
});
