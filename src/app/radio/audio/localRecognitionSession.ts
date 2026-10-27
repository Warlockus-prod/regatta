export type RecognitionPhase = "idle" | "starting" | "recording" | "working";
export interface RecognitionEvent {
  id: string; status: "availability" | "started" | "result" | "end" | "error";
  available?: boolean; transcript?: string; isFinal?: boolean; code?: string;
}
export interface RecognitionSession { id: string; text: string; released: boolean; ended: boolean; started: boolean }
export type RecognitionOutcome = "recognized" | "silent" | "cancelled" | "unavailable" | "denied" | "error";
interface Transition { session: RecognitionSession | null; phase?: RecognitionPhase; transcript?: string; error?: boolean; cancel?: boolean; outcome?: RecognitionOutcome }

/** The installed bridge has a closed, bounded event shape. Ignore malformed
 * or stale events without retaining raw native errors or other fields. */
export function readRecognitionEvent(value: unknown): RecognitionEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(v.id)
    || !["availability", "started", "result", "end", "error"].includes(v.status as string)
    || v.status === "availability" && typeof v.available !== "boolean"
    || v.available !== undefined && typeof v.available !== "boolean"
    || v.isFinal !== undefined && typeof v.isFinal !== "boolean"
    || v.transcript !== undefined && (typeof v.transcript !== "string" || v.transcript.length > 8000)
    || v.code !== undefined && (typeof v.code !== "string" || v.code.length > 100)) return null;
  return { id: v.id, status: v.status as RecognitionEvent["status"],
    ...(v.available !== undefined ? { available: v.available as boolean } : {}),
    ...(v.isFinal !== undefined ? { isFinal: v.isFinal as boolean } : {}),
    ...(v.transcript !== undefined ? { transcript: v.transcript as string } : {}),
    ...(v.code !== undefined ? { code: v.code as string } : {}) };
}

function completed(session: RecognitionSession): Transition {
  const transcript = session.text.trim();
  return { session: null, phase: "idle", transcript: transcript || undefined, outcome: transcript ? "recognized" : "silent" };
}

/** Android can finalize multiple segments. Only the end event carries the full
 * accumulated transcript. Never assess it while the learner still holds PTT. */
export function recognitionTransition(session: RecognitionSession, event: RecognitionEvent): Transition {
  if (event.id !== session.id) return { session };
  if (event.status === "error") return { session: null, phase: "idle", error: event.code !== "cancelled" && event.code !== "no-speech",
    outcome: event.code === "cancelled" ? "cancelled" : event.code === "no-speech" ? "silent" : event.code === "model-unavailable" ? "unavailable" : event.code === "permission-denied" ? "denied" : "error" };
  if (session.ended || event.status === "started" && session.started) return { session };
  if (event.status === "started" && session.released && !session.started) return { session: null, phase: "idle", cancel: true, outcome: "cancelled" };
  const next = { ...session };
  if (event.status === "started") { next.started = true; return { session: next, phase: "recording" }; }
  if ((event.status === "result" || event.status === "end") && typeof event.transcript === "string") next.text = event.transcript;
  if (event.status === "end") {
    next.ended = true;
    return next.released ? completed(next) : { session: next, phase: "working" };
  }
  return { session: next };
}

export function releaseRecognition(session: RecognitionSession): Transition {
  return session.ended ? completed(session) : { session: { ...session, released: true }, phase: "working" };
}
