import AsyncStorage from "@react-native-async-storage/async-storage";
import { ANALYTICS_CONSENT_KEY } from "./analytics-consent";
import { invalidateNativeDataEpoch } from "./data-epoch";
import { serial } from "./serial";
import { nativeDiagnostics } from "../diagnostics/journal";

/** Invalidate old race commands first, then sweep after already-issued writes.
 * A rejected sweep must remain an error to the caller, not a success alert. */
export async function clearNativeRegattaData(): Promise<void> {
  // Enqueue before publishing the epoch: a mounted hook's new read must be
  // behind this sweep even if its store subscription renders synchronously.
  const sweep = serial(async () => {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(key => typeof key === "string" && key.startsWith("regatta.") && key !== ANALYTICS_CONSENT_KEY);
    if (ours.length) await AsyncStorage.multiRemove(ours);
  });
  nativeDiagnostics.suspendForGlobalClear();
  invalidateNativeDataEpoch();
  await sweep;
  await nativeDiagnostics.flush();
}
