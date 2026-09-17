import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseStorageRequest, STORAGE_CHANNEL, STORAGE_LIMIT, TRAINER_STORAGE_KEY, type StorageReply } from "../../../src/features/sailing-lab/runtime/storage-protocol";

export async function handleCheckpointMessage(message: string, reply: (script: string) => void): Promise<boolean> {
  const request = parseStorageRequest(message);
  if (!request) return false;
  let result: StorageReply = { id: request.id, ok: false, raw: null };
  try {
    if (request.action === "write") await AsyncStorage.setItem(TRAINER_STORAGE_KEY, request.raw!);
    const raw = request.action === "read" ? await AsyncStorage.getItem(TRAINER_STORAGE_KEY) : null;
    if (raw !== null && raw.length > STORAGE_LIMIT) throw new Error("Checkpoint too large");
    result = { id: request.id, ok: true, raw };
  } catch { /* Keep the previous save; the page reports failure and offers retry. */ }
  reply(`window.dispatchEvent(new CustomEvent(${JSON.stringify(STORAGE_CHANNEL)}, { detail: ${JSON.stringify(result)} })); true;`);
  return true;
}
