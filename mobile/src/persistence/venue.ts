/**
 * The regatta venue the learner picked for races (src/data/venues).
 *
 * Storage shape:
 *   key   = `regatta.venue.v1` (the same key the website uses)
 *   value = a venue id string ("gocek", "split", "mazury", "solent", "open");
 *           anything else reads as Göcek.
 */

import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_VENUE, VENUE_STORAGE_KEY, findVenue, type Venue, type VenueId } from '../../../src/data/venues/venues';

let current: VenueId = DEFAULT_VENUE;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): Promise<void> {
  if (!loading) {
    loading = AsyncStorage.getItem(VENUE_STORAGE_KEY)
      .then((v) => { current = findVenue(v).id; })
      .catch(() => { current = DEFAULT_VENUE; })
      .finally(emit);
  }
  return loading;
}

export function setVenue(id: VenueId) {
  current = findVenue(id).id;
  emit();
  void AsyncStorage.setItem(VENUE_STORAGE_KEY, current).catch(() => undefined);
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => current;

/** The picked venue, shared by the Race hub and the race screen. */
export function useVenue(): [Venue, (id: VenueId) => void] {
  useEffect(() => { void load(); }, []);
  const id = useSyncExternalStore(subscribe, snapshot, snapshot);
  return [findVenue(id), setVenue];
}

/** For tests: forget the in-memory copy. */
export function __resetVenueForTests() {
  current = DEFAULT_VENUE;
  loading = null;
}
