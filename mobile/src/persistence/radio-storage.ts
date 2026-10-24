import AsyncStorage from "@react-native-async-storage/async-storage";
import { serial } from "./serial";

export const RADIO_STORAGE_KEY = "regatta.radio.offline.web-storage.v1";
export const RADIO_MESSAGE_LIMIT = 768 * 1024;
export const RADIO_STORAGE_KEYS = [
  "radio.src.progress.v1", "radio.src.progress.v2", "radio.src.theory.progress.v2",
  "regatta.radio.offline.lang.v2", "sternik.examBase.v1", "sternik.explHint.v1", "sternik.explLang.v1",
  "sternik.radio.cert-name.v1", "sternik.radio.guide.v2", "sternik.radio.mode.v1", "sternik.radio.model.v1",
  "sternik.radio.muted.v1", "sternik.radio.onboard.v1", "sternik.radio.progress.v1",
  "sternik.radio.realistic.v1", "sternik.radio.weak.v1",
] as const;
// Outside the course snapshot prefixes, so its initial snapshot cannot claim
// ownership before native storage has acknowledged an actual durable write.
const OWNED_MARKER = "regatta.native-radio-owned.v1";
export type RadioEntries = Record<string, string>;

export function parseRadioEntries(value: unknown): RadioEntries | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries: RadioEntries = {};
  let total = 0;
  for (const [key, item] of Object.entries(value)) {
    if (!(RADIO_STORAGE_KEYS as readonly string[]).includes(key) || typeof item !== "string") return null;
    if (item.length > (key.includes("progress") || key === "sternik.radio.weak.v1" ? 256 : 64) * 1024) return null;
    total += item.length;
    if (total > 512 * 1024) return null;
    entries[key] = item;
  }
  return entries;
}

export async function readRadioEntries(): Promise<RadioEntries | null> {
  return serial(async () => {
    const raw = await AsyncStorage.getItem(RADIO_STORAGE_KEY);
    if (raw === null) return null;
    const entries = parseRadioEntries(JSON.parse(raw));
    if (!entries) throw new Error("invalid-radio-storage");
    return entries;
  });
}

export async function persistRadioEntries(value: unknown): Promise<RadioEntries> {
  const entries = parseRadioEntries(value);
  if (!entries) throw new Error("invalid-radio-storage");
  await serial(() => AsyncStorage.setItem(RADIO_STORAGE_KEY, JSON.stringify(entries)));
  return entries;
}

/** Native snapshots are authoritative after migration. A missing native row
 * after Clear all data must not import a stale WKWebView copy a second time. */
export function radioBootstrap(entries: RadioEntries | null, language: string): string {
  const lang = ["ru", "en", "pl", "es", "fr", "de", "it"].includes(language) ? language : "en";
  return `(function(){window.__REGATTA_NATIVE_APP__=true;window.__REGATTA_APP_LANG__=${JSON.stringify(lang)};
    try{var entries=${JSON.stringify(entries)},keys=${JSON.stringify(RADIO_STORAGE_KEYS)},marker=${JSON.stringify(OWNED_MARKER)};
      if(entries!==null){keys.forEach(function(key){if(Object.prototype.hasOwnProperty.call(entries,key))localStorage.setItem(key,entries[key]);else localStorage.removeItem(key);});}
      else if(localStorage.getItem(marker)==="1"){keys.forEach(function(key){localStorage.removeItem(key);});}
      window.addEventListener("regatta:radio-storage-saved",function(){try{localStorage.setItem(marker,"1");}catch(e){}});
    }catch(e){}
  })();true;`;
}

export function radioStorageEvent(success: boolean): string {
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(success ? "regatta:radio-storage-saved" : "regatta:radio-storage-error")}));true;`;
}
