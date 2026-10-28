import type { DiagnosticInput } from "@/lib/diagnostics";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";

type SpeechEvent = Extract<DiagnosticInput, { type: "radio.speech" }>;
export function recordRadioSpeech(event: Omit<SpeechEvent, "type" | "surface">): void {
  const { action, input, outcome, status, available, reason, source } = event;
  try { recordWebDiagnostic({ type: "radio.speech", surface: "radio", action, input, outcome,
    ...(status === undefined ? {} : { status }), ...(available === undefined ? {} : { available }),
    ...(reason === undefined ? {} : { reason }), ...(source === undefined ? {} : { source }) }); }
  catch { /* A journal failure cannot own the microphone or private session. */ }
}
