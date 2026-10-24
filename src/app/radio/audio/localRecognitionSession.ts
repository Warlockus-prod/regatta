export type RecognitionPhase = "idle" | "starting" | "recording" | "working";
export interface RecognitionEvent {
  id: string; status: "availability" | "started" | "result" | "end" | "error";
  available?: boolean; transcript?: string; isFinal?: boolean; code?: string;
}
export interface RecognitionSession { id: string; text: string; released: boolean; ended: boolean; started: boolean }
interface Transition { session: RecognitionSession | null; phase?: RecognitionPhase; transcript?: string; error?: boolean; cancel?: boolean }

/** Android can finalize multiple segments. Only the end event carries the full
 * accumulated transcript. Never assess it while the learner still holds PTT. */
export function recognitionTransition(session: RecognitionSession, event: RecognitionEvent): Transition {
  if (event.id !== session.id) return { session };
  if (event.status === "error") return { session: null, phase: "idle", error: event.code !== "cancelled" };
  if (event.status === "started" && session.released && !session.started) return { session: null, phase: "idle", cancel: true };
  const next = { ...session };
  if (event.status === "started") { next.started = true; return { session: next, phase: "recording" }; }
  if ((event.status === "result" || event.status === "end") && event.transcript) next.text = event.transcript;
  if (event.status === "end") {
    next.ended = true;
    return next.released ? { session: null, phase: "idle", transcript: next.text.trim() || undefined } : { session: next, phase: "working" };
  }
  return { session: next };
}

export function releaseRecognition(session: RecognitionSession): Transition {
  return session.ended ? { session: null, phase: "idle", transcript: session.text.trim() || undefined } : { session: { ...session, released: true }, phase: "working" };
}
