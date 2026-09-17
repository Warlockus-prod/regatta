// Pure bridge contract shared by WebView and React Native. No arbitrary keys,
// script evaluation, URLs or deletion operations are accepted from the page.
export const TRAINER_STORAGE_KEY = "regatta.sailing.trainer-checkpoint.v1";
export const STORAGE_LIMIT = 65_536;
export const STORAGE_CHANNEL = "regatta-sailing-storage";
export interface StorageRequest { channel: typeof STORAGE_CHANNEL; id: string; action: "read" | "write"; raw?: string }
export interface StorageReply { id: string; ok: boolean; raw: string | null }
export function parseStorageRequest(raw: string): StorageRequest | null {
  if (raw.length > STORAGE_LIMIT * 2 + 512) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || v.channel !== STORAGE_CHANNEL || typeof v.id !== "string" || !/^[a-z0-9-]{1,80}$/i.test(v.id)) return null;
    if (v.action === "read") return { channel: STORAGE_CHANNEL, id: v.id, action: "read" };
    if (v.action !== "write" || typeof v.raw !== "string" || v.raw.length > STORAGE_LIMIT) return null;
    const envelope = JSON.parse(v.raw);
    if (!envelope || envelope.version !== 1 || typeof envelope.snapshot !== "string") return null;
    return { channel: STORAGE_CHANNEL, id: v.id, action: "write", raw: v.raw };
  } catch { return null; }
}
