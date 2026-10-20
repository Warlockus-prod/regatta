import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseStorageRequest, STORAGE_CHANNEL, STORAGE_LIMIT, TRAINER_STORAGE_KEY, type StorageReply } from "../../../src/features/sailing-lab/runtime/storage-protocol";
import { PRACTICE_RESULTS_KEY, mergePracticeResults, readPracticeResults } from "../../../src/features/sailing-lab/lessons/practice-results";

let writes: Promise<void> = Promise.resolve();

export async function handleCheckpointMessage(message: string, reply: (script: string) => void): Promise<boolean> {
  const request = parseStorageRequest(message);
  if (!request) return false;
  let result: StorageReply = { id: request.id, ok: false, raw: null };
  try {
    const key = request.store === "practice" ? PRACTICE_RESULTS_KEY : TRAINER_STORAGE_KEY;
    if (request.action === "write") {
      const write = writes.then(async () => {
        const value = request.store === "practice" ? JSON.stringify(mergePracticeResults(readPracticeResults(await AsyncStorage.getItem(key)), readPracticeResults(request.raw!))) : request.raw!;
        await AsyncStorage.setItem(key, value);
      });
      writes = write.catch(() => {});
      await write;
    }
    await writes;
    const raw = request.action === "read" ? await AsyncStorage.getItem(key) : null;
    if (raw !== null && raw.length > STORAGE_LIMIT) throw new Error("Checkpoint too large");
    result = { id: request.id, ok: true, raw };
  } catch { /* Keep the previous save; the page reports failure and offers retry. */ }
  reply(`window.dispatchEvent(new CustomEvent(${JSON.stringify(STORAGE_CHANNEL)}, { detail: ${JSON.stringify(result)} })); true;`);
  return true;
}
