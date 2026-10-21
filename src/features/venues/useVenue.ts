'use client';

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_VENUE, VENUE_STORAGE_KEY, findVenue, type Venue, type VenueId } from "../../data/venues/venues";

// The venue the learner picked, shared by the 3D boat and the website races
// (localStorage "regatta.venue.v1"; Göcek when nothing is stored).
const EVENT = "regatta:venue";

function read(): VenueId {
  try {
    return findVenue(localStorage.getItem(VENUE_STORAGE_KEY)).id;
  } catch {
    return DEFAULT_VENUE;
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

export function useVenue(): [Venue, (id: VenueId) => void] {
  const id = useSyncExternalStore(subscribe, read, () => DEFAULT_VENUE);
  const set = useCallback((next: VenueId) => {
    try { localStorage.setItem(VENUE_STORAGE_KEY, next); } catch { /* private mode: keep for this page only */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [findVenue(id), set];
}
