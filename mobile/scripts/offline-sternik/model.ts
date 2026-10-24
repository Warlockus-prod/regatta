export const STERNIK_STORAGE_KEYS = ["sternik.progress.v1", "sternik.explLang.v1", "sternik.examBase.v1", "sternik.explHint.v1", "sternik.radio.weak.v1"] as const;
export const STERNIK_STORAGE_LIMITS = { progress: 256 * 1024, value: 64 * 1024, total: 384 * 1024, message: 512 * 1024 } as const;
export const STERNIK_ROUTES = ["/sternik", "/sternik/teoria", "/sternik/test", "/sternik/egzamin", "/sternik/ustny"] as const;
export interface SternikRoute { path: string; search: string; hash: string }

export function sternikRoute(href: string): SternikRoute | null {
  try {
    const url = new URL(href, "https://offline.sternik.local");
    if (!["https://offline.sternik.local", "https://weektoregatta.com"].includes(url.origin) || !STERNIK_ROUTES.includes(url.pathname as typeof STERNIK_ROUTES[number])) return null;
    return { path: url.pathname, search: url.search, hash: url.hash };
  } catch { return null; }
}

/** One bounded snapshot. Never truncate a learner's JSON or accept other app keys. */
export function sternikEntries(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries: Record<string, string> = {};
  const encoder = new TextEncoder();
  for (const [key, value] of Object.entries(raw)) {
    if (!STERNIK_STORAGE_KEYS.includes(key as typeof STERNIK_STORAGE_KEYS[number]) || typeof value !== "string") return null;
    const bound = key === "sternik.progress.v1" ? STERNIK_STORAGE_LIMITS.progress : STERNIK_STORAGE_LIMITS.value;
    if (encoder.encode(value).length > bound) return null;
    entries[key] = key === "sternik.explLang.v1" ? "pl" : value;
  }
  return encoder.encode(JSON.stringify(entries)).length <= STERNIK_STORAGE_LIMITS.total ? entries : null;
}

export function examDirtyMessage(raw: string): boolean | null {
  try { const message = JSON.parse(raw); return message?.type === "exam-dirty" && typeof message.dirty === "boolean" ? message.dirty : null; }
  catch { return null; }
}
