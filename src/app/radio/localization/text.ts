import type { Lang } from "@/lib/languages";
import { protectRadioTerms, restoreRadioTerms } from "./protocolTerms";
export type RadioCatalog = Readonly<Record<string, string>>;
export type RadioAliases = Readonly<Record<string, string>>;
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const templates = new WeakMap<RadioAliases, {id:string;pattern:RegExp}[]>();
function templateEntries(aliases: RadioAliases) {
 let entries=templates.get(aliases);
 if(!entries){entries=Object.entries(aliases).filter(([key])=>/\{\d+\}/.test(key)).map(([key,id])=>({id,pattern:new RegExp("^"+key.split(/\{\d+\}/).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("(.+?)")+"$")}));templates.set(aliases,entries);}
 return entries;
}
/** Only explicit text reads use this adapter. IDs, reducer data, spoken radio
 * messages, input values and saved progress are never rewritten. */
export function radioText<T>(value: T, catalog: RadioCatalog, aliases: RadioAliases): T {
 if (typeof value !== "string") return value;
 const key = normalize(value);
 const id = aliases[key];
 let result = id ? catalog[id] : undefined;
 if (!result && key.length) {
  for (const item of templateEntries(aliases)) {
   const match = item.pattern.exec(key);
   if (match && catalog[item.id]) { result = catalog[item.id].replace(/\{(\d+)\}/g, (whole, index: string) => match[Number(index)+1] ?? whole); break; }
  }
 }
 if (result === undefined) return value;
 result = restoreRadioTerms(result, protectRadioTerms(value).values);
 const leading = /^\s+/.exec(value)?.[0] ?? "";
 const trailing = /\s+$/.exec(value)?.[0] ?? "";
 return `${leading}${result}${trailing}` as T;
}
const catalogCache = new Map<Lang, Promise<RadioCatalog>>();
let aliasCache: Promise<RadioAliases> | null = null;
async function resource<T>(file:string):Promise<T>{const response=await fetch(`/radio-locales/${file}.json`);if(!response.ok)throw new Error("Radio language unavailable");return response.json() as Promise<T>;}
export function loadRadioCatalog(lang: Lang): Promise<RadioCatalog> {
 let pending=catalogCache.get(lang);if(!pending){pending=resource<RadioCatalog>(lang).catch(error=>{catalogCache.delete(lang);throw error;});catalogCache.set(lang,pending);}return pending;
}
export function loadRadioAliases(): Promise<RadioAliases> {
 if(!aliasCache)aliasCache=resource<RadioAliases>("aliases").catch(error=>{aliasCache=null;throw error;});return aliasCache;
}
