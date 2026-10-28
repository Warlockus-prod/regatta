import { createDiagnosticJournal } from "../../src/lib/diagnostics";
import { diagnosticSupportExport } from "../src/diagnostics/export";

it("exports canonical history with build context without changing storage or its session", () => {
  const journal = createDiagnosticJournal({ now: () => 0 });
  journal.record({ type: "radio.speech", surface: "radio", input: "voice", action: "result", outcome: "failed", status: "denied", reason: "permission" });
  const before = journal.snapshot();
  const value = JSON.parse(diagnosticSupportExport(before, { version: "1.7.0", build: "69", platform: "ios" }));
  expect(value).toEqual({ format: "regatta-diagnostics", formatVersion: 1, app: { version: "1.7.0", build: "69", platform: "ios" }, journal: before });
  expect(journal.snapshot()).toBe(before);
});

it("does not copy arbitrary context or private event fields", () => {
  const journal = createDiagnosticJournal({ now: () => 0 });
  const text = diagnosticSupportExport(journal.snapshot(), { version: "PRIVATE", build: "PRIVATE", platform: "PRIVATE" });
  expect(text).not.toContain("PRIVATE");
  const invalid = { ...journal.snapshot(), entries: [{ seq: 1, session: 1, elapsedMs: 0, lastElapsedMs: 0, count: 1,
    event: { type: "radio.speech", surface: "radio", input: "voice", action: "result", outcome: "accepted", transcript: "PRIVATE" } }] };
  expect(() => diagnosticSupportExport(invalid as never, { version: "1.7.0", build: "69", platform: "ios" })).toThrow("Invalid diagnostic snapshot");
});

it("keeps export finite after a long test and includes the dropped-event counter", () => {
  let time = 0; const journal = createDiagnosticJournal({ now: () => time++ });
  for (let i = 0; i < 1000; i++) journal.record({ type: "radio.command", surface: "radio", action: "ent", outcome: "accepted" });
  const text = diagnosticSupportExport(journal.snapshot(), { version: "1.7.0", build: "69", platform: "ios" });
  const value = JSON.parse(text);
  expect(value.journal.entries).toHaveLength(200); expect(value.journal.dropped).toBe(800);
  expect(Buffer.byteLength(text, "utf8")).toBeLessThan(64 * 1024 + 512);
});
