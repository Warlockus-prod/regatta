/**
 * Race preferences picked in the Race hub: the regatta venue
 * (src/data/venues), whether its shore is shown, and the race mode.
 *
 * Storage shape (AsyncStorage, the venue and shore keys match the website):
 *   `regatta.venue.v1`     = venue id ("gocek", "split", "mazury", "solent");
 *                            anything else reads as Göcek.
 *   `regatta.shore.v1`     = "off" hides the shore and the islands (open sea).
 *   `regatta.race.mode.v1` = "pro" (the learner trims the sheets) or "simple"
 *                            (auto trim, the default).
 */

import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_VENUE, SHORE_STORAGE_KEY, VENUE_STORAGE_KEY, effectiveVenue, findVenue,
  type Venue, type VenueId,
} from '../../../src/data/venues/venues';

export type RaceMode = 'simple' | 'pro';
export const RACE_MODE_STORAGE_KEY = 'regatta.race.mode.v1';

interface State { venue: VenueId; shoreOn: boolean; mode: RaceMode }

let current: State = { venue: DEFAULT_VENUE, shoreOn: true, mode: 'simple' };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): Promise<void> {
  if (!loading) {
    loading = AsyncStorage.multiGet([VENUE_STORAGE_KEY, SHORE_STORAGE_KEY, RACE_MODE_STORAGE_KEY])
      .then((pairs) => {
        const get = (k: string) => pairs.find(([key]) => key === k)?.[1] ?? null;
        const venue = findVenue(get(VENUE_STORAGE_KEY)).id;
        current = {
          venue: venue === 'open' ? DEFAULT_VENUE : venue,
          shoreOn: get(SHORE_STORAGE_KEY) !== 'off',
          mode: get(RACE_MODE_STORAGE_KEY) === 'pro' ? 'pro' : 'simple',
        };
      })
      .catch(() => undefined)
      .finally(emit);
  }
  return loading;
}

function update(patch: Partial<State>, key: string, value: string) {
  current = { ...current, ...patch };
  emit();
  void AsyncStorage.setItem(key, value).catch(() => undefined);
}

export function setVenue(id: VenueId) { update({ venue: id }, VENUE_STORAGE_KEY, id); }
export function setShoreOn(on: boolean) { update({ shoreOn: on }, SHORE_STORAGE_KEY, on ? 'on' : 'off'); }
export function setRaceMode(mode: RaceMode) { update({ mode }, RACE_MODE_STORAGE_KEY, mode); }

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => current;

export interface RacePrefs {
  /** What the race draws (open sea when the shore is off). */
  venue: Venue;
  /** The venue chosen in the picker, kept while the shore is off. */
  picked: Venue;
  shoreOn: boolean;
  mode: RaceMode;
  setVenue: (id: VenueId) => void;
  setShoreOn: (on: boolean) => void;
  setRaceMode: (mode: RaceMode) => void;
}

/** Live race preferences, shared by the Race hub and the race screen. */
export function useVenue(): RacePrefs {
  useEffect(() => { void load(); }, []);
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  return {
    venue: effectiveVenue(s.venue, s.shoreOn),
    picked: findVenue(s.venue),
    shoreOn: s.shoreOn,
    mode: s.mode,
    setVenue,
    setShoreOn,
    setRaceMode,
  };
}

/** For tests: forget the in-memory copy. */
export function __resetVenueForTests() {
  current = { venue: DEFAULT_VENUE, shoreOn: true, mode: 'simple' };
  loading = null;
}
