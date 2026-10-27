import { describe, expect, it } from "vitest";
import { readRecognitionEvent, recognitionTransition, releaseRecognition, type RecognitionSession } from "./localRecognitionSession";
const session = (): RecognitionSession => ({ id: "current", text: "", released: false, ended: false, started: false });

describe("on-device recognition lifecycle", () => {
  it("waits for the accumulated end transcript, not Android's first final segment", () => {
    let state = recognitionTransition(session(), { id: "current", status: "started" }).session!;
    const first = recognitionTransition(state, { id: "current", status: "result", transcript: "MAYDAY", isFinal: true });
    expect(first.transcript).toBeUndefined(); state = first.session!;
    state = releaseRecognition(state).session!;
    const last = recognitionTransition(state, { id: "current", status: "end", transcript: "MAYDAY MAYDAY MAYDAY THIS IS WIND DANCER OVER" });
    expect(last.transcript).toBe("MAYDAY MAYDAY MAYDAY THIS IS WIND DANCER OVER"); expect(last.session).toBeNull();
  });
  it("keeps a completed utterance pending until the user releases PTT", () => {
    const ended = recognitionTransition(session(), { id: "current", status: "end", transcript: "RADIO CHECK OVER" });
    expect(ended.transcript).toBeUndefined(); expect(ended.phase).toBe("working");
    const released = releaseRecognition(ended.session!);
    expect(released.transcript).toBe("RADIO CHECK OVER"); expect(released.session).toBeNull();
  });
  it("cancels a recorder that starts after the user's early release", () => {
    const released = releaseRecognition(session()).session!;
    expect(recognitionTransition(released, { id: "current", status: "started" })).toMatchObject({ cancel: true, session: null, phase: "idle" });
  });
  it("ignores results from an old question and never grades cancelled or silent speech", () => {
    const current = session();
    expect(recognitionTransition(current, { id: "previous", status: "end", transcript: "OLD ANSWER" })).toEqual({ session: current });
    expect(recognitionTransition(current, { id: "current", status: "error", code: "cancelled" })).toMatchObject({ session: null, error: false });
    expect(recognitionTransition({ ...current, released: true }, { id: "current", status: "end" }).transcript).toBeUndefined();
  });
  it.each([
    ["cancelled", "cancelled", false], ["no-speech", "silent", false],
    ["model-unavailable", "unavailable", true], ["permission-denied", "denied", true], ["private native error", "error", true],
  ])("classifies %s without grading or retaining native error text", (code, outcome, error) => {
    const next = recognitionTransition(session(), { id: "current", status: "error", code: code as string });
    expect(next).toEqual({ session: null, phase: "idle", outcome, error });
    expect(JSON.stringify(next)).not.toContain("private native error");
  });
  it("reports silence when the actual end clears an earlier draft", () => {
    const state = { ...session(), text: "INTERIM ONLY", released: true };
    expect(recognitionTransition(state, { id: "current", status: "end", transcript: "" }))
      .toEqual({ session: null, phase: "idle", transcript: undefined, outcome: "silent" });
  });
  it("does not reopen a released session on a duplicate start or replace an ended transcript", () => {
    const started = { ...session(), started: true, released: true };
    expect(recognitionTransition(started, { id: "current", status: "started" })).toEqual({ session: started });
    const ended = { ...session(), started: true, ended: true, text: "RADIO CHECK OVER" };
    expect(recognitionTransition(ended, { id: "current", status: "result", transcript: "LATE" })).toEqual({ session: ended });
    expect(releaseRecognition(ended)).toMatchObject({ transcript: "RADIO CHECK OVER", outcome: "recognized", session: null });
  });
  it("reads a closed event with bounded native text while discarding extra raw fields", () => {
    expect(readRecognitionEvent({ id: "current", status: "result", transcript: "RADIO CHECK", raw: "private" }))
      .toEqual({ id: "current", status: "result", transcript: "RADIO CHECK" });
    expect(readRecognitionEvent({ id: "probe", status: "availability", available: false })?.available).toBe(false);
  });
  it.each([
    null, [], { id: "bad/path", status: "end" }, { id: "x", status: "unknown" },
    { id: "x", status: "availability" }, { id: "x", status: "end", transcript: {} },
    { id: "x", status: "result", transcript: "x".repeat(8001) }, { id: "x", status: "error", code: {} },
  ])("ignores malformed or oversized bridge event %#", value => expect(readRecognitionEvent(value)).toBeNull());
});
