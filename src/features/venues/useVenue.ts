'use client';

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_VENUE, SHORE_STORAGE_KEY, VENUE_STORAGE_KEY, effectiveVenue, findVenue,
  type Venue, type VenueId,
} from "../../data/venues/venues";

// The venue the learner picked and whether the shore is shown, shared by the
// 3D boat and the website races (localStorage "regatta.venue.v1" and
// "regatta.shore.v1"; Göcek with the shore on when nothing is stored).
const EVENT = "regatta:venue";

function readVenue(): VenueId {
  try {
    const id = findVenue(localStorage.getItem(VENUE_STORAGE_KEY)).id;
    return id === "open" ? DEFAULT_VENUE : id;
  } catch {
    return DEFAULT_VENUE;
  }
}

function readShore(): boolean {
  try {
    return localStorage.getItem(SHORE_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: keep for this page only */ }
  window.dispatchEvent(new Event(EVENT));
}

export interface VenueState {
  /** What the scene draws (open sea when the shore is off). */
  venue: Venue;
  /** The venue chosen in the picker, kept while the shore is off. */
  picked: Venue;
  shoreOn: boolean;
  setVenue: (id: VenueId) => void;
  setShoreOn: (on: boolean) => void;
}

export function useVenue(): VenueState {
  const id = useSyncExternalStore(subscribe, readVenue, () => DEFAULT_VENUE);
  const shoreOn = useSyncExternalStore(subscribe, readShore, () => true);
  const setVenue = useCallback((next: VenueId) => write(VENUE_STORAGE_KEY, next), []);
  const setShoreOn = useCallback((on: boolean) => write(SHORE_STORAGE_KEY, on ? "on" : "off"), []);
  return { venue: effectiveVenue(id, shoreOn), picked: findVenue(id), shoreOn, setVenue, setShoreOn };
}
