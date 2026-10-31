import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { serial } from "./serial";
import { nativeDataEpoch, subscribeNativeDataEpoch } from "./data-epoch";
import { BEST_TIMES_STORAGE_KEY } from "../../../src/lib/best-times";

/** Only race-owned browser rows cross the local file/native storage boundary. */
export const RACE_WEB_STORAGE_KEYS = [
  "regatta.race-resume.v1", "regatta.best-times.v1", "regatta.race.view.v1",
  "regatta.race.camera.v1", "regatta.race.mode.v1", "regatta.race.assists.v1",
  "regatta.venue.v1", "regatta.shore.v1",
  "regatta.muted.v1",
  // M1-1: the race remembers which course briefings this device has seen.
  "regatta.race.briefing-seen.v1",
  // M1-5: race sound on/off, separate from the trainer wheel clicks (src/lib/sounds.ts).
  "regatta.race.sound.v1",
  // M2-5: the race scene's quality step reached on this device (src/features/race-scene/quality.ts).
  "regatta.race.quality.v1",
  // M3-4: vibration on race events on/off (src/lib/race-haptics.ts).
  "regatta.race.haptics.v1",
] as const;
export type RaceWebStorage = Record<string, string | null>;

export function parseRaceStorageEntries(raw: unknown): RaceWebStorage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries: RaceWebStorage = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!(RACE_WEB_STORAGE_KEYS as readonly string[]).includes(key)) return null;
    if (value !== null && (typeof value !== "string" || value.length > 16000)) return null;
    entries[key] = value;
  }
  return entries;
}

export async function persistRaceStorage(entries: RaceWebStorage, epoch = nativeDataEpoch()): Promise<void> {
  const valid = parseRaceStorageEntries(entries);
  if (!valid || Object.prototype.hasOwnProperty.call(valid, BEST_TIMES_STORAGE_KEY)) throw new Error("Invalid race storage message");
  await serial(async () => {
    if (epoch !== nativeDataEpoch()) throw new Error("stale-race-storage");
    const set = Object.entries(valid).filter((entry): entry is [string, string] => entry[1] !== null);
    const remove = Object.entries(valid).filter(([, value]) => value === null).map(([key]) => key);
    if (set.length) await AsyncStorage.multiSet(set);
    if (remove.length) await AsyncStorage.multiRemove(remove);
  });
}

export function useRaceWebStorage() {
  const epoch = useSyncExternalStore(subscribeNativeDataEpoch, nativeDataEpoch, nativeDataEpoch);
  const latestBestRevision = useRef(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ epoch: number; ready: boolean; failed: boolean; entries: RaceWebStorage }>({ epoch, ready: false, failed: false, entries: {} });
  useEffect(() => {
    let active = true;
    serial(() => AsyncStorage.multiGet([...RACE_WEB_STORAGE_KEYS]))
      .then(pairs => { if (active && epoch === nativeDataEpoch()) setState({ epoch, ready: true, failed: false, entries: Object.fromEntries(pairs) }); })
      .catch(() => { if (active && epoch === nativeDataEpoch()) setState({ epoch, ready: false, failed: true, entries: {} }); });
    return () => { active = false; };
  }, [revision, epoch]);
  const persist = useCallback(async (entries: RaceWebStorage) => {
    const ticket = nativeDataEpoch();
    await persistRaceStorage(entries, ticket);
    if (ticket === nativeDataEpoch()) setState(previous => ({ ...previous, entries: { ...previous.entries, ...entries } }));
  }, []);
  const acceptBestStore = useCallback((serialized: string, ticket: number, revision: number) => {
    if (ticket !== nativeDataEpoch() || !Number.isSafeInteger(revision) || revision <= latestBestRevision.current) return;
    latestBestRevision.current = revision;
    setState(previous => ({ ...previous, entries: { ...previous.entries, [BEST_TIMES_STORAGE_KEY]: serialized } }));
  }, []);
  return { ...state, epoch, ready: state.ready && state.epoch === epoch, persist, acceptBestStore,
    retry: () => { setState({ epoch, ready: false, failed: false, entries: {} }); setRevision(value => value + 1); } };
}

/** Install before content loads, preserving changes without a file-origin dependency. */
export const RACE_STORAGE_BRIDGE_SCRIPT = `
(function(){
  if(window.__REGATTA_RACE_STORAGE_BRIDGE__)return;
  window.__REGATTA_RACE_STORAGE_BRIDGE__=true;
  var keys=${JSON.stringify(RACE_WEB_STORAGE_KEYS.filter(key => key !== BEST_TIMES_STORAGE_KEY))};
  var set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  function changed(storage,key,value){
    if(storage!==window.localStorage||keys.indexOf(key)===-1)return;
    var entries={};entries[key]=value;
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"race-storage",entries:entries}));
  }
  Storage.prototype.setItem=function(key,value){var old=this.getItem(key);set.call(this,key,value);if(old!==String(value))changed(this,String(key),String(value));};
  Storage.prototype.removeItem=function(key){var old=this.getItem(key);remove.call(this,key);if(old!==null)changed(this,String(key),null);};
})();true;`;
