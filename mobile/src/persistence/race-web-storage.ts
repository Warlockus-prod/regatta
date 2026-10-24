import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { serial } from "./serial";

/** Only race-owned browser rows cross the local file/native storage boundary. */
export const RACE_WEB_STORAGE_KEYS = [
  "regatta.race-resume.v1", "regatta.best-times.v1", "regatta.race.view.v1",
  "regatta.race.camera.v1", "regatta.race.mode.v1", "regatta.race.assists.v1",
  "regatta.venue.v1", "regatta.shore.v1",
  "regatta.muted.v1",
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

export async function persistRaceStorage(entries: RaceWebStorage): Promise<void> {
  const valid = parseRaceStorageEntries(entries);
  if (!valid) throw new Error("Invalid race storage message");
  await serial(async () => {
    const set = Object.entries(valid).filter((entry): entry is [string, string] => entry[1] !== null);
    const remove = Object.entries(valid).filter(([, value]) => value === null).map(([key]) => key);
    if (set.length) await AsyncStorage.multiSet(set);
    if (remove.length) await AsyncStorage.multiRemove(remove);
  });
}

export function useRaceWebStorage() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ ready: boolean; failed: boolean; entries: RaceWebStorage }>({ ready: false, failed: false, entries: {} });
  useEffect(() => {
    let active = true;
    serial(() => AsyncStorage.multiGet([...RACE_WEB_STORAGE_KEYS]))
      .then(pairs => { if (active) setState({ ready: true, failed: false, entries: Object.fromEntries(pairs) }); })
      .catch(() => { if (active) setState({ ready: false, failed: true, entries: {} }); });
    return () => { active = false; };
  }, [revision]);
  const persist = useCallback(async (entries: RaceWebStorage) => {
    await persistRaceStorage(entries);
    setState(previous => ({ ...previous, entries: { ...previous.entries, ...entries } }));
  }, []);
  return { ...state, persist, retry: () => { setState({ ready: false, failed: false, entries: {} }); setRevision(value => value + 1); } };
}

/** Install before content loads, preserving changes without a file-origin dependency. */
export const RACE_STORAGE_BRIDGE_SCRIPT = `
(function(){
  if(window.__REGATTA_RACE_STORAGE_BRIDGE__)return;
  window.__REGATTA_RACE_STORAGE_BRIDGE__=true;
  var keys=${JSON.stringify(RACE_WEB_STORAGE_KEYS)};
  var set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  function changed(storage,key,value){
    if(storage!==window.localStorage||keys.indexOf(key)===-1)return;
    var entries={};entries[key]=value;
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"race-storage",entries:entries}));
  }
  Storage.prototype.setItem=function(key,value){var old=this.getItem(key);set.call(this,key,value);if(old!==String(value))changed(this,String(key),String(value));};
  Storage.prototype.removeItem=function(key){var old=this.getItem(key);remove.call(this,key);if(old!==null)changed(this,String(key),null);};
})();true;`;
