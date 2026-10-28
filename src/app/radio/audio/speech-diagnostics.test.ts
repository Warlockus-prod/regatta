import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagnosticJournal, parseDiagnosticBatch } from "@/lib/diagnostics";
import { recordRadioSpeech } from "./speech-diagnostics";
const { record } = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: record }));
beforeEach(() => { record.mockReset(); });

describe("speech diagnostics contain lifecycle facts only", () => {
  it("records accepted request and actual result without a transcript, audio or native error", () => {
    const journal = createDiagnosticJournal({ now: () => 0 }); record.mockImplementation(event => journal.record(event));
    recordRadioSpeech({ action: "request", input: "voice", outcome: "accepted" });
    recordRadioSpeech({ action: "result", input: "voice", outcome: "accepted", status: "recognized", transcript: "PRIVATE WORDS", rawError: "PRIVATE ERROR" } as Parameters<typeof recordRadioSpeech>[0]);
    expect(journal.snapshot().entries).toHaveLength(2);
    expect(JSON.stringify(record.mock.calls)).not.toContain("PRIVATE");
    expect(journal.snapshot().entries[1].event).toEqual({ type: "radio.speech", surface: "radio", action: "result", input: "voice", outcome: "accepted", status: "recognized" });
  });
  it("fails open when logging is unavailable", () => {
    record.mockImplementation(() => { throw Error("unavailable"); });
    expect(() => recordRadioSpeech({ action: "cancel", input: "voice", status: "cancelled", outcome: "noop" })).not.toThrow();
  });
  it.each(["transcript", "audio", "url", "rawError", "text"])("canonical batches reject private %s fields", field => {
    expect(parseDiagnosticBatch({ version: 1, events: [{ type: "radio.speech", surface: "radio", action: "result", input: "voice", outcome: "accepted", [field]: "PRIVATE" }] })).toBeNull();
  });
});
