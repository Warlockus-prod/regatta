import AsyncStorage from "@react-native-async-storage/async-storage";
import { serial } from "./serial";

export const STERNIK_STORAGE_KEY = "regatta.sternik.offline.web-storage.v1";
export const STERNIK_STORAGE_KEYS = ["sternik.progress.v1", "sternik.explLang.v1", "sternik.examBase.v1", "sternik.explHint.v1", "sternik.radio.weak.v1"] as const;
export const STERNIK_MESSAGE_LIMIT = 512 * 1024;
const OWNED_MARKER = "sternik.offline.native-owned.v1";
export type SternikEntries = Record<string, string>;

/** Complete bounded snapshots, never arbitrary native storage commands. */
export function parseSternikEntries(value: unknown): SternikEntries | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  let total = 0;
  const entries: SternikEntries = {};
  for (const [key, item] of Object.entries(value)) {
    if (!(STERNIK_STORAGE_KEYS as readonly string[]).includes(key) || typeof item !== "string") return null;
    if (item.length > (key === "sternik.progress.v1" ? 256 : 64) * 1024) return null;
    total += item.length;
    if (total > 384 * 1024) return null;
    entries[key] = key === "sternik.explLang.v1" ? "pl" : item;
  }
  return entries;
}

export async function readSternikEntries(): Promise<SternikEntries | null> {
  return serial(async () => {
    const raw = await AsyncStorage.getItem(STERNIK_STORAGE_KEY);
    if (raw === null) return null;
    const entries = parseSternikEntries(JSON.parse(raw));
    if (!entries) throw new Error("invalid-sternik-storage");
    return entries;
  });
}

export async function persistSternikEntries(value: unknown): Promise<SternikEntries> {
  const entries = parseSternikEntries(value);
  if (!entries) throw new Error("invalid-sternik-storage");
  await serial(() => AsyncStorage.setItem(STERNIK_STORAGE_KEY, JSON.stringify(entries)));
  return entries;
}

export function sternikHref(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1024 || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://weektoregatta.com");
    if (!["/sternik", "/sternik/teoria", "/sternik/test", "/sternik/egzamin", "/sternik/ustny"].includes(url.pathname) || url.search.length > 512 || url.hash.length > 100) return null;
    url.searchParams.set("lang", "pl"); url.searchParams.set("embed", "1");
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}

/** Same-origin local HTML can import legacy WKWebView progress without HTTP.
 * The marker is set only after a durable native ack. A missing native row after
 * migration means Clear all data, so a stale WK copy must not resurrect it. */
export function sternikBootstrap(entries: SternikEntries | null, href: string): string {
  const route = new URL(sternikHref(href) ?? "/sternik?lang=pl&embed=1", "https://weektoregatta.com");
  return `(function(){
    window.__REGATTA_NATIVE_APP__=true;window.__REGATTA_APP_LANG__="pl";window.__REGATTA_STERNIK_OFFLINE__=true;window.__REGATTA_OFFLINE_BUNDLE__=true;
    window.__REGATTA_EMBED__=${JSON.stringify({ path: route.pathname, query: route.search.slice(1) })};
    try{var entries=${JSON.stringify(entries)},keys=${JSON.stringify(STERNIK_STORAGE_KEYS)},marker=${JSON.stringify(OWNED_MARKER)};
      if(entries!==null){keys.forEach(function(key){if(Object.prototype.hasOwnProperty.call(entries,key))localStorage.setItem(key,entries[key]);else localStorage.removeItem(key);});}
      else if(localStorage.getItem(marker)==="1"){keys.forEach(function(key){localStorage.removeItem(key);});}
      localStorage.setItem("sternik.explLang.v1","pl");
      window.addEventListener("regatta:sternik-storage-saved",function(){try{localStorage.setItem(marker,"1");}catch(e){}});
    }catch(e){}
  })();true;`;
}

export function sternikStorageEvent(success: boolean): string {
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(success ? "regatta:sternik-storage-saved" : "regatta:sternik-storage-error")},{detail:${JSON.stringify(success ? {} : { code: "storage-unavailable" })}}));true;`;
}
