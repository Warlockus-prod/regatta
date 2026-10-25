import type { DiagnosticInput } from "@/lib/diagnostics";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { channel, type RadioEvent, type RadioState } from "./radioModel";

type CommandDiagnostic = Extract<DiagnosticInput, { type: "radio.command" }>;
type Recorder = (event: DiagnosticInput) => unknown;
// Only safe primitives participate in classification. Message text, identity,
// position, recordings, typed answers and the air log are never inspected.
const flags = ["power", "screen", "back", "channelIndex", "volume", "squelch", "backlight", "hiPower", "ptt", "scanActive", "dualWatch", "dwOnSixteen", "aquaActive", "keyBeep", "softPage", "menuCursor", "m323CallCursor", "dscSettingsCursor", "idCursor", "idEntryCursor", "positionInputStage", "natureCursor", "composeCursor", "distressActive", "retxCount", "retxPaused", "ackReceived", "odType", "odAddress", "odCategory", "odChannel", "odCursor", "odField", "odFieldCursor", "odAwaitingAck"] as const;

export function radioCommandDiagnostic(before: RadioState, event: RadioEvent, after: RadioState): CommandDiagnostic | null {
  const changed = flags.some(key => before[key] !== after[key]) || before.favoriteChannels.length !== after.favoriteChannels.length || before.individualIds.length !== after.individualIds.length;
  const automatic = event.type === "scan-tick" || event.type === "dw-tick";
  if (automatic && !changed) return null;
  const projected: CommandDiagnostic = {
    type: "radio.command", surface: "radio", action: event.type, outcome: changed ? "accepted" : "noop",
    model: after.model, screenFrom: before.screen, screenTo: after.screen,
    power: after.power, channel: Number(channel(after).num), volume: after.volume, squelch: after.squelch,
  };
  if (event.type === "dial-rotate" || event.type === "soft-page") projected.direction = event.dir;
  if (event.type === "soft") projected.index = event.index;
  if (!before.power && event.type !== "dial-hold") { projected.outcome = "rejected"; projected.reason = "power-off"; }
  else if (event.type === "ptt-down" && channel(before).noVoice) { projected.outcome = "rejected"; projected.reason = "tx-inhibit"; }
  else if (event.type === "dial-rotate" && before.screen === "individual-id-add-mmsi" && before !== after) {
    // Every permitted detent changes a digit; do not read or expose that digit.
    projected.outcome = "accepted";
  } else if (!changed) {
    projected.reason = event.type === "dial-rotate" && ["volume", "squelch", "backlight"].includes(before.screen) ? "limit" : "unchanged";
  }
  return projected;
}

export function recordRadioCommand(before: RadioState, event: RadioEvent, after: RadioState, record: Recorder = recordWebDiagnostic) {
  try { const projected = radioCommandDiagnostic(before, event, after); if (projected) record(projected); } catch { /* diagnostics cannot block an actual command */ }
}
export function recordRadioCommandFailure(before: RadioState, event: RadioEvent, record: Recorder = recordWebDiagnostic) {
  try {
    record({ type: "radio.command", surface: "radio", action: event.type, outcome: "failed", reason: "unknown", model: before.model, screenFrom: before.screen, power: before.power });
  } catch { /* preserve the original command error */ }
}
