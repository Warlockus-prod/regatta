/**
 * The race's helm control in the app (package 13, ADR-0022): arrows, wheels
 * or sliders. The same row as the web race (`regatta.race.helm.v1`, one of
 * RACE_WEB_STORAGE_KEYS), so the choice made in the race hub, in Settings or in
 * the race's own settings before the start is one choice. A new install
 * steers with the arrows; a device that saved the trainers' controls keeps
 * their mode until a race control is picked (src/lib/race-helm.ts).
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RACE_HELM_KEY, resolveRaceHelmControl, type RaceHelmControl } from '../../../src/lib/race-helm';
import { useControlPrefs } from './controls';
import { persistRaceStorage, subscribeRaceStorageWrites } from './race-web-storage';

export function useRaceHelmSetting() {
  const { prefs, ready: controlsReady } = useControlPrefs();
  const [stored, setStored] = useState<string | null | undefined>(undefined);
  const reload = useCallback(() => {
    let live = true;
    AsyncStorage.getItem(RACE_HELM_KEY)
      .then((value) => { if (live) setStored(value); })
      .catch(() => { if (live) setStored(null); });
    return () => { live = false; };
  }, []);
  useEffect(reload, [reload]);
  // The race page may change it (its storage bridge writes the same row).
  useEffect(() => subscribeRaceStorageWrites((entries) => {
    if (Object.prototype.hasOwnProperty.call(entries, RACE_HELM_KEY)) setStored(entries[RACE_HELM_KEY]);
  }), []);
  const helm = resolveRaceHelmControl(stored, prefs.saved === true ? prefs.mode : null);
  const setHelm = useCallback((next: RaceHelmControl) => {
    setStored(next);
    void persistRaceStorage({ [RACE_HELM_KEY]: next }).catch(() => undefined);
  }, []);
  return { helm, ready: controlsReady && stored !== undefined, setHelm };
}
