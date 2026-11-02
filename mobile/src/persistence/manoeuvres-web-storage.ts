import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { serial } from "./serial";
import { nativeDataEpoch, subscribeNativeDataEpoch } from "./data-epoch";

// Manoeuvres keeps its stars in the page's localStorage (src/features/manoeuvres/progress.ts).
// A bundled page runs from a file origin, whose storage the app does not rely on,
// so the one progress row crosses into AsyncStorage the way the race rows do
// (race-web-storage.ts): the screen writes it into the page before it runs, and
// the page posts every change back. The global clear removes it with every
// other "regatta." key (clear-native-data.ts).

export const MANOEUVRES_WEB_STORAGE_KEY = "regatta.manoeuvres.v1";
const MAX_CHARS = 4096;
export type ManoeuvresWebStorage = Record<string, string | null>;

/** The stored row as the page writes it: version 1 and 1-3 stars per exercise id. */
export function isManoeuvresStoreText(value: string): boolean {
  if (value.length > MAX_CHARS) return false;
  try {
    const data = JSON.parse(value) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data) || (data as { version?: unknown }).version !== 1) return false;
    const stars = (data as { stars?: unknown }).stars;
    if (!stars || typeof stars !== "object" || Array.isArray(stars)) return false;
    return Object.entries(stars).every(([id, n]) => /^[a-z0-9-]{1,48}$/.test(id) && (n === 1 || n === 2 || n === 3));
  } catch {
    return false;
  }
}

/** Only the Manoeuvres row, null (removed) or a valid store text; anything else is refused whole. */
export function parseManoeuvresStorageEntries(raw: unknown): ManoeuvresWebStorage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries: ManoeuvresWebStorage = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key !== MANOEUVRES_WEB_STORAGE_KEY) return null;
    if (value !== null && (typeof value !== "string" || !isManoeuvresStoreText(value))) return null;
    entries[key] = value;
  }
  return Object.keys(entries).length ? entries : null;
}

export async function persistManoeuvresStorage(entries: ManoeuvresWebStorage, epoch = nativeDataEpoch()): Promise<void> {
  const valid = parseManoeuvresStorageEntries(entries);
  if (!valid) throw new Error("Invalid manoeuvres storage message");
  await serial(async () => {
    if (epoch !== nativeDataEpoch()) throw new Error("stale-manoeuvres-storage");
    const value = valid[MANOEUVRES_WEB_STORAGE_KEY];
    if (value === null) await AsyncStorage.removeItem(MANOEUVRES_WEB_STORAGE_KEY);
    else await AsyncStorage.setItem(MANOEUVRES_WEB_STORAGE_KEY, value);
  });
}

/** Reads the stored row once per data epoch. A failed read is not "no progress":
 * the page is not opened (it would save over the stored stars) until a retry succeeds. */
export function useManoeuvresWebStorage() {
  const epoch = useSyncExternalStore(subscribeNativeDataEpoch, nativeDataEpoch, nativeDataEpoch);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ epoch: number; ready: boolean; failed: boolean; entries: ManoeuvresWebStorage }>({ epoch: -1, ready: false, failed: false, entries: {} });
  useEffect(() => {
    let active = true;
    serial(() => AsyncStorage.getItem(MANOEUVRES_WEB_STORAGE_KEY))
      .then(value => {
        if (!active || epoch !== nativeDataEpoch()) return;
        // A corrupt row is not given to the page: it starts without progress.
        setState({ epoch, ready: true, failed: false, entries: { [MANOEUVRES_WEB_STORAGE_KEY]: value !== null && isManoeuvresStoreText(value) ? value : null } });
      })
      .catch(() => { if (active && epoch === nativeDataEpoch()) setState({ epoch, ready: false, failed: true, entries: {} }); });
    return () => { active = false; };
  }, [epoch, revision]);
  const persist = useCallback(async (entries: ManoeuvresWebStorage) => {
    const ticket = nativeDataEpoch();
    await persistManoeuvresStorage(entries, ticket);
    if (ticket === nativeDataEpoch()) setState(previous => ({ ...previous, entries: { ...previous.entries, ...entries } }));
  }, []);
  const current = state.epoch === epoch;
  return { epoch, ready: current && state.ready, failed: current && state.failed, entries: state.entries, persist,
    retry: () => { setState({ epoch, ready: false, failed: false, entries: {} }); setRevision(value => value + 1); } };
}

/** Installed before the page runs. Rows the app writes in (SimWebView's NATIVE_STORAGE_SYNC_FLAG) are not posted back. */
export const MANOEUVRES_STORAGE_BRIDGE_SCRIPT = `
(function(){
  if(window.__REGATTA_MANOEUVRES_STORAGE_BRIDGE__)return;
  window.__REGATTA_MANOEUVRES_STORAGE_BRIDGE__=true;
  var key=${JSON.stringify(MANOEUVRES_WEB_STORAGE_KEY)};
  var set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  function changed(storage,name,value){
    if(storage!==window.localStorage||name!==key||window.__REGATTA_NATIVE_STORAGE_SYNC__)return;
    var entries={};entries[name]=value;
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"manoeuvres-storage",entries:entries}));
  }
  Storage.prototype.setItem=function(name,value){var old=this.getItem(name);set.call(this,name,value);if(old!==String(value))changed(this,String(name),String(value));};
  Storage.prototype.removeItem=function(name){var old=this.getItem(name);remove.call(this,name);if(old!==null)changed(this,String(name),null);};
})();true;`;
