import { describe, expect, it } from "vitest";
import { recognitionTransition, releaseRecognition, type RecognitionSession } from "./localRecognitionSession";
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
});
