import AsyncStorage from "@react-native-async-storage/async-storage";
import { BEST_TIMES_STORAGE_KEY, BEST_TIMES_STORE_MAX_CHARS } from "../../../src/lib/best-times";
import { nativeBestFailure, planNativeBestCommand, readNativeBestCommand, type NativeBestCommand,
  type NativeBestReply, type NativeBestReason } from "../../../src/lib/race-best-command";
import { recordNativeDiagnostic } from "../diagnostics/journal";
import { serial } from "./serial";
import { nativeDataEpoch } from "./data-epoch";
import { raceClassId, readRaceContext } from "../../../src/lib/race-context";

export type NativeBestStorageResult = { reply: NativeBestReply; serialized: string | null; storeRevision?: number };
let storeRevision = 0;
function confirmed(reply: NativeBestReply, serialized: string | null): NativeBestStorageResult {
  storeRevision += 1;
  return { reply, serialized, storeRevision };
}

/** Native storage owns the read/compare/write. No WebKit storage event can
 * acknowledge this row; failed reads preserve the original bytes. */
export async function saveNativePersonalBest(raw: unknown, epoch = nativeDataEpoch()): Promise<NativeBestStorageResult> {
  const command = readNativeBestCommand(raw);
  if (!command) throw new Error("invalid-personal-best");
  const failed = (reason: NativeBestReason, action: "read" | "write" = "write"): NativeBestStorageResult => {
    recordNativeDiagnostic({ type: "storage.operation", surface: "race", target: "personal-best", action, outcome: "failed", reason });
    return { reply: nativeBestFailure(command, reason), serialized: null };
  };
  return serial(async () => {
    if (epoch !== nativeDataEpoch()) return failed("cancelled");
    let rawStore: string | null;
    try { rawStore = await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY); }
    catch { return failed("storage-read", "read"); }
    if (epoch !== nativeDataEpoch()) return failed("cancelled");
    if (rawStore !== null && rawStore.length > BEST_TIMES_STORE_MAX_CHARS) return failed("limit", "read");
    let store: unknown;
    try { store = rawStore === null ? {} : JSON.parse(rawStore); }
    catch { return failed("storage-invalid", "read"); }
    const plan = planNativeBestCommand(store, command, Date.now());
    if (plan.kind === "rejected") return failed(plan.reason);
    if (plan.kind === "settled") {
      recordNativeDiagnostic({ type: "storage.operation", surface: "race", target: "personal-best", action: "write",
        outcome: plan.reply.status === "failed" ? "failed" : "noop", reason: plan.reply.status === "failed" ? plan.reply.reason : "unchanged" });
      return plan.reply.status === "failed" ? { reply: plan.reply, serialized: null } : confirmed(plan.reply, rawStore);
    }
    if (epoch !== nativeDataEpoch()) return failed("cancelled");
    try { await AsyncStorage.setItem(BEST_TIMES_STORAGE_KEY, plan.serialized); }
    catch { return failed("storage-write"); }
    // Global clear is queued after an already-issued write and removes it.
    if (epoch !== nativeDataEpoch()) return failed("cancelled");
    recordNativeDiagnostic({ type: "storage.operation", surface: "race", target: "personal-best", action: "write", outcome: "accepted" });
    return confirmed(plan.replyAfterWrite, plan.serialized);
  });
}

export function nativePersonalBestResponse(reply: NativeBestReply): string {
  return `window.dispatchEvent(new CustomEvent("regatta:personal-best-result",{detail:${JSON.stringify(reply)}}));true;`;
}

/** The active native host checks start ownership before requesting storage. */
export function matchesNativeBestStart(command: NativeBestCommand, started: { id: string; mode: string; difficulty: string; windStrength: string; raceContext?: unknown } | undefined): boolean {
  if (!started || started.id !== command.id || started.mode !== command.comparison.mode
    || started.difficulty !== command.comparison.difficulty || started.windStrength !== command.comparison.windStrength) return false;
  // A context-free current live start can own a legacy local PB only. This
  // does not classify a historical snapshot or grant a physical class.
  if (started.raceContext == null) return command.comparison.raceContext.model === "legacy-race-v1";
  const context = readRaceContext(started.raceContext);
  return context.ok && raceClassId(context.context) === raceClassId(command.comparison.raceContext);
}
