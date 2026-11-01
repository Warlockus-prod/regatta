import { describe, expect, it } from "vitest";
import {
  createDiagnosticJournal, DIAGNOSTIC_BATCH_MAX_BYTES, DIAGNOSTIC_ENTRY_MAX_BYTES,
  DIAGNOSTIC_MAX_BYTES, DIAGNOSTIC_TTL_MS, EMPTY_DIAGNOSTIC_SNAPSHOT,
  parseDiagnosticBatch, parseDiagnosticPersistence, RADIO_DIAGNOSTIC_ACTIONS,
  serializeDiagnosticBatch, serializeDiagnosticPersistence,
  type DiagnosticInput, type DiagnosticSnapshot,
} from "./diagnostics";
import type { RadioEvent } from "@/app/radio/symulator/radioModel";

const command: DiagnosticInput = { type: "radio.command", surface: "radio", outcome: "accepted", action: "dial-push" };
const nav: DiagnosticInput = { type: "navigation", surface: "app", outcome: "accepted", action: "confirmed", from: "menu", to: "radio" };
const change = (value: number, previous?: number): DiagnosticInput => ({ type: "control.change", surface: "trainer", outcome: "accepted", control: "mainsheet", value, ...(previous === undefined ? {} : { previous }) });
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
function rig(capacity?: number) {
  let time = 1000;
  const journal = createDiagnosticJournal({ now: () => time, capacity });
  return { journal, advance: (ms: number) => { time += ms; }, set: (ms: number) => { time = ms; } };
}

describe("diagnostic journal", () => {
  it("keeps a stable immutable snapshot and copies rather than freezes the caller's command", () => {
    const { journal, advance } = rig();
    expect(journal.snapshot()).toBe(EMPTY_DIAGNOSTIC_SNAPSHOT);
    const input = { ...command };
    journal.record(input);
    const snapshot = journal.snapshot();
    expect(journal.snapshot()).toBe(snapshot);
    expect(snapshot.entries[0]).toMatchObject({ seq: 1, session: 1, elapsedMs: 0, lastElapsedMs: 0, count: 1, event: command });
    input.outcome = "noop";
    expect(snapshot.entries[0].event.outcome).toBe("accepted");
    expect([snapshot, snapshot.entries, snapshot.entries[0], snapshot.entries[0].event].every(Object.isFrozen)).toBe(true);
    advance(100);
    journal.record(nav);
    expect(snapshot.entries).toHaveLength(1);
    expect(journal.snapshot()).not.toBe(snapshot);
  });

  it("isolates failed subscribers, supports unsubscribe and clear without resetting the session sequence", () => {
    const { journal } = rig();
    let calls = 0;
    journal.subscribe(() => { throw new Error("panel failure"); });
    const unsubscribe = journal.subscribe(() => { calls++; });
    expect(() => journal.record(command)).not.toThrow();
    expect(calls).toBe(1);
    unsubscribe();
    journal.clear();
    const empty = journal.snapshot();
    journal.clear();
    expect(journal.snapshot()).toBe(empty);
    expect(calls).toBe(1);
    expect(journal.record(nav)?.seq).toBe(2);
  });

  it("coalesces adjacent sheet samples while retaining the initial and final values and full input count", () => {
    const { journal, advance } = rig();
    journal.record(change(.4, .3));
    advance(100); journal.record(change(.5, .4));
    advance(250); journal.record(change(.7, .5));
    expect(journal.snapshot().entries).toHaveLength(1);
    expect(journal.snapshot().entries[0]).toMatchObject({ seq: 1, elapsedMs: 0, lastElapsedMs: 350, count: 3, event: { previous: .3, value: .7 } });
    advance(251); journal.record(change(.8, .7));
    journal.record(nav); journal.record(change(.9, .8));
    expect(journal.snapshot().entries.map(e => e.count)).toEqual([3, 1, 1, 1]);
    expect(journal.snapshot().entries.map(e => e.seq)).toEqual([1, 2, 3, 4]);
  });

  it("keeps reverse rotations, failures, changed outcome and bounded step sums distinct", () => {
    const { journal } = rig();
    const rotate = (steps: number): DiagnosticInput => ({ type: "radio.gesture", surface: "radio", outcome: "accepted", action: "rotate", control: "dial", steps });
    journal.record(rotate(600)); journal.record(rotate(400)); journal.record(rotate(1)); journal.record(rotate(-1));
    expect(journal.snapshot().entries.map(e => [e.count, e.event.type === "radio.gesture" && e.event.steps])).toEqual([[2, 1000], [1, 1], [1, -1]]);
    journal.record({ ...change(.4), outcome: "failed", reason: "disabled" });
    journal.record({ ...change(.5), outcome: "failed", reason: "disabled" });
    journal.record({ ...change(.5), outcome: "noop", reason: "limit" });
    journal.record(change(.6));
    expect(journal.snapshot().entries).toHaveLength(7);
    expect(journal.snapshot().entries.slice(-4).every(e => e.count === 1)).toBe(true);
  });

  it("counts coalesced input eviction, clamps capacity and caps both rows and encoded bytes", () => {
    const small = rig(2);
    small.journal.record(change(.2)); small.journal.record(change(.3)); small.journal.record(nav); small.journal.record(command);
    expect(small.journal.snapshot()).toMatchObject({ dropped: 2, entries: [{ event: nav }, { event: command }] });
    const rich: DiagnosticInput = { ...command, action: "dial-rotate", model: "M323", source: "pointer", reason: "unchanged", screenFrom: "individual-id-add-mmsi", screenTo: "individual-id-add-name", direction: 1, index: 3, volume: 20, squelch: 10, channel: 88, power: true };
    const full = rig(Infinity);
    for (let i = 0; i < 600; i++) { full.advance(300); full.journal.record(rich); }
    const snapshot = full.journal.snapshot();
    expect(snapshot.entries.length).toBeGreaterThan(0);
    expect(snapshot.entries.length).toBeLessThanOrEqual(200);
    expect(snapshot.entries.length + snapshot.dropped).toBe(600);
    expect(snapshot.entries.every(e => bytes(e) <= DIAGNOSTIC_ENTRY_MAX_BYTES)).toBe(true);
    expect(bytes(snapshot)).toBeLessThan(DIAGNOSTIC_MAX_BYTES);
    const encoded = serializeDiagnosticPersistence(snapshot, 1_000_000);
    expect(encoded).not.toBeNull();
    expect(new TextEncoder().encode(encoded!).length).toBeLessThanOrEqual(DIAGNOSTIC_MAX_BYTES);
    expect(parseDiagnosticPersistence(encoded, 1_000_001)?.entries).toEqual(snapshot.entries);
    const minimum = rig(0);
    minimum.journal.record(command); minimum.journal.record(nav);
    expect(minimum.journal.snapshot()).toMatchObject({ dropped: 1, entries: [{ event: nav }] });
  });

  it("uses only monotonic relative injected time despite backwards, nonfinite or failed clocks", () => {
    let value = 10_000, throws = false;
    const journal = createDiagnosticJournal({ now: () => { if (throws) throw new Error("clock"); return value; } });
    journal.record(command);
    value += 175; journal.record(command);
    value -= 500; journal.record(command);
    value = NaN; journal.record(command);
    throws = true; journal.record(command);
    expect(journal.snapshot().entries.map(e => e.elapsedMs)).toEqual([0, 175, 175, 175, 175]);
    expect(JSON.stringify(journal.snapshot())).not.toContain("10000");
    throws = false; value = Number.MAX_SAFE_INTEGER; journal.record(command);
    expect(journal.snapshot().entries.at(-1)?.elapsedMs).toBe(DIAGNOSTIC_TTL_MS);
    const cold = createDiagnosticJournal({ now: () => NaN });
    expect(cold.record(command)?.elapsedMs).toBe(0);
  });

  it("restores immutable previous history once, assigning a new session to early current events", () => {
    const old = rig(); old.journal.record(command); old.advance(900); old.journal.record(nav);
    const current = rig(); current.advance(40); current.journal.record(change(.3));
    expect(current.journal.restore(JSON.stringify(old.journal.snapshot()))).toBe(true);
    expect(current.journal.snapshot()).toMatchObject({ session: 2, entries: [{ seq: 1, session: 1, elapsedMs: 0 }, { seq: 2, session: 1, elapsedMs: 900 }, { seq: 3, session: 2, elapsedMs: 40 }] });
    expect(current.journal.restore(old.journal.snapshot())).toBe(false);
    current.advance(300);
    expect(current.journal.record(nav)).toMatchObject({ seq: 4, session: 2, elapsedMs: 340 });
    const fresh = rig();
    expect(fresh.journal.restore(current.journal.snapshot())).toBe(true);
    expect(fresh.journal.record(command)).toMatchObject({ seq: 5, session: 3, elapsedMs: 0 });
    expect(old.journal.snapshot().entries).toHaveLength(2);
  });

  it("rejects malformed restore atomically including sequence overflow and nonmonotonic history", () => {
    const { journal } = rig(); journal.record(command);
    const snapshot = journal.snapshot();
    const entry = snapshot.entries[0];
    const invalid: unknown[] = [null, "{", { ...snapshot, extra: "sentinel" }, { ...snapshot, version: 2 },
      { ...snapshot, entries: [entry, entry] }, { ...snapshot, session: 0 },
      { ...snapshot, entries: [{ ...entry, count: 0 }] }, { ...snapshot, entries: [{ ...entry, elapsedMs: 10, lastElapsedMs: 0 }] },
      { ...snapshot, entries: [{ ...entry, lastElapsedMs: 10 }, { ...entry, seq: 2, elapsedMs: 9, lastElapsedMs: 12 }] },
      { ...snapshot, entries: [{ ...entry, seq: Number.MAX_SAFE_INTEGER - 1 }] },
      { ...snapshot, entries: [{ ...entry, event: { ...command, url: "https://private.invalid" } }] },
      { ...snapshot, entries: Array(201).fill(entry) },
    ];
    for (const value of invalid) {
      expect(journal.restore(value)).toBe(false);
      expect(journal.snapshot()).toBe(snapshot);
    }
    expect(journal.record(nav)?.seq).toBe(2);
  });
});

describe("diagnostic strict transport and privacy", () => {
  it("accepts only the four wind styles and boolean map targets in both current and previous fields", () => {
    for (const value of ["off", "compass", "arrows", "both"]) {
      const event = { type: "control.preferences", surface: "multiplayer", outcome: "accepted", preference: "wind-display", value, previous: "compass" };
      expect(parseDiagnosticBatch({ version: 1, events: [event] })?.events).toEqual([event]);
    }
    for (const value of [true, false]) {
      const event = { type: "control.change", surface: "race", outcome: "accepted", control: "race-map", value, previous: !value };
      expect(parseDiagnosticBatch({ version: 1, events: [event] })?.events).toEqual([event]);
      const preference = { type: "control.preferences", surface: "race", outcome: "accepted", preference: "mini-map", value, previous: !value };
      expect(parseDiagnosticBatch({ version: 1, events: [preference] })?.events).toEqual([preference]);
    }
    for (const name of ["coach-strip", "first-race-hints", "soft-light", "sail-flow"]) {
      const preference = { type: "control.preferences", surface: "race", outcome: "accepted", preference: name, value: false, previous: true };
      expect(parseDiagnosticBatch({ version: 1, events: [preference] })?.events).toEqual([preference]);
      expect(parseDiagnosticBatch({ version: 1, events: [{ ...preference, value: "on" }] })).toBeNull();
    }
    for (const extra of [{ value: "PRIVATE" }, { previous: 1 }, { position: { x: 1, y: 2 } }]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ type: "control.preferences", surface: "race", outcome: "accepted", preference: "mini-map", value: true, previous: false, ...extra }] })).toBeNull();
    }
    for (const extra of [{ value: "PRIVATE" }, { previous: "PRIVATE" }, { value: true }, { text: "PRIVATE" }]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ type: "control.preferences", surface: "race", outcome: "accepted", preference: "wind-display", value: "both", previous: "off", ...extra }] })).toBeNull();
    }
    for (const extra of [{ value: "open" }, { previous: 1 }, { position: { x: 1, y: 2 } }]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ type: "control.change", surface: "race", outcome: "accepted", control: "race-map", value: true, previous: false, ...extra }] })).toBeNull();
    }
  });

  it("accepts the actual full RadioEvent action vocabulary without carrying its payload", () => {
    const coverage: Exclude<RadioEvent["type"], typeof RADIO_DIAGNOSTIC_ACTIONS[number]> extends never ? true : never = true;
    const actions: readonly RadioEvent["type"][] = RADIO_DIAGNOSTIC_ACTIONS;
    expect(coverage).toBe(true);
    expect(actions).toHaveLength(27);
    for (const action of RADIO_DIAGNOSTIC_ACTIONS) expect(parseDiagnosticBatch({ version: 1, events: [{ ...command, action }] })).not.toBeNull();
  });

  it("round-trips a real safe batch and refuses metadata, unknown properties and sensitive sentinels", () => {
    const inputs: DiagnosticInput[] = [command, { type: "radio.startup", surface: "radio", outcome: "failed", action: "error", reason: "webview-load", supportCode: "SRC-W02", wkDomain: "WKErrorDomain", wkCode: 102 }, nav, change(.4),
      { type: "race.save", surface: "race", outcome: "accepted", action: "ack", target: "local" },
      { type: "race.save", surface: "race", outcome: "failed", action: "error", target: "personal-best", reason: "storage-write" },
      { type: "trainer.checkpoint", surface: "trainer", outcome: "failed", action: "error", reason: "storage-write" }];
    const serialized = serializeDiagnosticBatch(inputs);
    expect(parseDiagnosticBatch(serialized)?.events).toEqual(inputs);
    expect(Object.isFrozen(parseDiagnosticBatch(serialized)?.events)).toBe(true);
    for (const field of ["message", "text", "transcript", "mmsi", "name", "latitude", "longitude", "position", "storage", "url", "stack", "timestamp", "seq"]) {
      const raw = { version: 1, events: [{ ...command, [field]: "PRIVATE_SENTINEL_123" }] };
      expect(parseDiagnosticBatch(raw)).toBeNull();
    }
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...command, reason: "PRIVATE_SENTINEL_123" }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...command, action: undefined }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...nav, to: "/private-path" }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...inputs[1], wkDomain: "PRIVATE_SENTINEL_123" }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...change(.4), value: "PRIVATE_SENTINEL_123" }] })).toBeNull();
    const journal = rig().journal;
    const hostile = { ...command, text: "PRIVATE_SENTINEL_123" };
    expect(journal.record(hostile as DiagnosticInput)).toBeNull();
    expect(JSON.stringify(journal.snapshot())).not.toContain("PRIVATE_SENTINEL_123");
    expect(journal.snapshot().dropped).toBe(1);
  });

  it("validates dependent bool, numeric and enum fields rather than just their object shape", () => {
    const valid: DiagnosticInput[] = [change(0), change(1), { type: "control.change", surface: "trainer", outcome: "accepted", control: "main-working-length", value: 6.4 },
      { type: "control.preferences", surface: "race", outcome: "accepted", preference: "sensitivity", value: .5 },
      { type: "control.change", surface: "race", outcome: "accepted", control: "jib-open", value: false }];
    expect(parseDiagnosticBatch({ version: 1, events: valid })?.events).toEqual(valid);
    const invalid = [change(-.01), change(1.01), change(NaN), { ...valid[2], value: 6.3 }, { ...valid[3], value: 1.5 }, { ...valid[4], value: 0 },
      { ...command, channel: 89 }, { ...command, volume: 20.1 }, { ...command, screenTo: "raw-user-screen" },
      { ...command, action: "__proto__" }, { type: "__proto__", surface: "radio", outcome: "accepted" }];
    for (const event of invalid) expect(parseDiagnosticBatch({ version: 1, events: [event] })).toBeNull();
    const getter = Object.defineProperty({}, "type", { enumerable: true, get() { throw new Error("hostile"); } });
    expect(parseDiagnosticBatch({ version: 1, events: [getter] })).toBeNull();
  });

  it("accepts only finite illustration events and rejects asset URLs, text and unknown lesson IDs", () => {
    const event = { type: "learning.visual", surface: "learn", outcome: "failed", action: "image-error", lesson: "how-sail-works", mode: "picture", frame: "luffing", reason: "asset-load" };
    expect(parseDiagnosticBatch({ version: 1, events: [event] })?.events).toEqual([event]);
    for (const extra of [{ uri: "private-file" }, { text: "private-answer" }, { lesson: "private-lesson" }, { frame: "unknown" }, { mode: "3d" }]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ ...event, ...extra }] })).toBeNull();
    }
  });

  it("supports bounded learning and storage operations without recording answer or storage contents", () => {
    const events: DiagnosticInput[] = [
      { type: "navigation", surface: "diagnostics", outcome: "accepted", action: "confirmed", from: "settings", to: "diagnostics" },
      { type: "learning.command", surface: "learn", outcome: "accepted", action: "answer", course: "foundation", step: 5 },
      { type: "storage.operation", surface: "app", outcome: "failed", action: "write", target: "progress", reason: "storage-unavailable" },
      { type: "storage.operation", surface: "race", outcome: "failed", action: "write", target: "personal-best", reason: "storage-write" },
      { type: "storage.operation", surface: "race", outcome: "rejected", action: "write", target: "ghost", reason: "invalid-message" },
      { type: "storage.operation", surface: "app", outcome: "accepted", action: "clear", target: "history", source: "native" },
      { type: "learning.visual", surface: "learn", outcome: "accepted", action: "mode", lesson: "how-sail-works", mode: "picture", frame: "filled" },
    ];
    expect(parseDiagnosticBatch(serializeDiagnosticBatch(events))?.events).toEqual(events);
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...events[1], step: 1.2 }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...events[1], answer: 2 }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...events[2], key: "private-progress" }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ ...events[2], target: "PRIVATE_SENTINEL" }] })).toBeNull();
    for (const payload of [{ value: "private-progress" }, { raceId: "private-race" }, { timeSec: 123 }]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ ...events[3], ...payload }] })).toBeNull();
      expect(parseDiagnosticBatch({ version: 1, events: [{ ...events[4], ...payload }] })).toBeNull();
    }
  });

  it("enforces transport version, event and UTF8 byte caps without truncating a partial batch", () => {
    expect(parseDiagnosticBatch({ version: 1, events: Array(16).fill(command) })?.events).toHaveLength(16);
    expect(parseDiagnosticBatch({ version: 1, events: Array(17).fill(command) })).toBeNull();
    expect(serializeDiagnosticBatch(Array(17).fill(command))).toBeNull();
    expect(parseDiagnosticBatch({ version: 2, events: [command] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [command], display: "sentinel" })).toBeNull();
    expect(parseDiagnosticBatch(JSON.stringify({ version: 1, events: [], extra: "ą".repeat(DIAGNOSTIC_BATCH_MAX_BYTES / 2) }))).toBeNull();
    expect(parseDiagnosticBatch("[invalid")).toBeNull();
  });

  it("keeps wall time only in a bounded 48-hour envelope, with strict expiry and future rejection", () => {
    const { journal } = rig(); journal.record(command);
    const now = 1_000_000_000;
    const text = serializeDiagnosticPersistence(journal.snapshot(), now)!;
    expect(JSON.parse(text)).toMatchObject({ version: 1, savedAtMs: now });
    expect(JSON.stringify(journal.snapshot())).not.toContain(String(now));
    expect(parseDiagnosticPersistence(text, now + DIAGNOSTIC_TTL_MS - 1)?.entries).toEqual(journal.snapshot().entries);
    expect(parseDiagnosticPersistence(text, now + DIAGNOSTIC_TTL_MS)).toBeNull();
    expect(parseDiagnosticPersistence(text, now - 1)).toBeNull();
    expect(parseDiagnosticPersistence(text, NaN)).toBeNull();
    expect(parseDiagnosticPersistence({ ...JSON.parse(text), extra: true }, now)).toBeNull();
    expect(parseDiagnosticPersistence("x".repeat(DIAGNOSTIC_MAX_BYTES + 1), now)).toBeNull();
    expect(serializeDiagnosticPersistence(journal.snapshot(), Infinity)).toBeNull();
    expect(serializeDiagnosticPersistence({ ...journal.snapshot(), entries: [{ ...journal.snapshot().entries[0], event: { ...command, text: "sentinel" } }] } as unknown as DiagnosticSnapshot, now)).toBeNull();
  });

  it("accepts the render events only in their bounded, allow-listed shape and keeps them distinct rows", () => {
    const lost: DiagnosticInput = { type: "scene.gpu", surface: "race", outcome: "failed", reason: "scene-load", source: "system", action: "lost", backend: "webgpu" };
    const perf: DiagnosticInput = { type: "race.perf", surface: "race", outcome: "accepted", source: "system", action: "final", backend: "webgl2",
      fpsAvg: 58.4, fpsP5: 41, dpr: 1.5, drawCalls: 140, seconds: 312.5, triangles: 420_000, firstFrameMs: 2400 };
    expect(parseDiagnosticBatch({ version: 1, events: [lost, perf] })?.events).toEqual([lost, perf]);
    const invalid: unknown[] = [{ ...lost, backend: "metal" }, { ...lost, action: "restored" }, { ...lost, message: "driver detail" }, { ...lost, attempt: -1 },
      { ...perf, fpsP5: 41.5 }, { ...perf, fpsAvg: 241 }, { ...perf, dpr: 0 }, { ...perf, drawCalls: 100_001 }, { ...perf, triangles: 1.5 },
      { ...perf, seconds: -1 }, { ...perf, firstFrameMs: 600_001 }, { ...perf, gpu: "Apple M2" }, Object.fromEntries(Object.entries(perf).filter(([key]) => key !== "fpsP5"))];
    for (const event of invalid) expect(parseDiagnosticBatch({ version: 1, events: [event] })).toBeNull();
    const { journal, advance } = rig();
    journal.record(perf); advance(10); journal.record(perf); journal.record(lost); journal.record(lost);
    expect(journal.snapshot().entries.map(e => e.count)).toEqual([1, 1, 1, 1]);
  });
});

// Contract (TestFlight journal): when the journal is full it gives up the
// continuous helm and sheet samples before the rows that explain a race, so a
// 5-10 minute race keeps its start, every perf sample, its summary and finish.
describe("diagnostic eviction keeps what explains a race", () => {
  const lifecycle = (action: Extract<DiagnosticInput, { type: "race.lifecycle" }>["action"]): DiagnosticInput => ({ type: "race.lifecycle", surface: "race", outcome: "accepted", action, mode: "pro" });
  const perf = (seconds: number): DiagnosticInput => ({ type: "race.perf", surface: "race", outcome: "accepted", source: "system", action: "sample", backend: "webgl2", fpsAvg: 58.5, fpsP5: 41, dpr: 2, drawCalls: 120, seconds });
  const result: DiagnosticInput = { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "result", mode: "pro", difficulty: "hard", wind: "heavy",
    setupSource: "restart", race: "mission", briefingShown: false, finished: true, place: 3, total: 6, botsFinished: 5, raceSeconds: 598.4, penaltySeconds: 20,
    finishHoldShown: true, soundOn: true, orientation: "landscape" };
  const debrief: DiagnosticInput = { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "debrief", tacks: 14, gybes: 3, noGoEntries: 4,
    missedMarkNotices: 1, contacts: 2, startJostleEvents: 1, judgeIncidents: 3, coachScore: 64, mainMistake: "no-go" };
  const helm = (i: number): DiagnosticInput => ({ type: "control.change", surface: "race", outcome: "accepted", control: i % 2 ? "rudder" : "mainsheet", value: i % 2 ? .3 : .6 });

  it("keeps start, every perf sample, the summary and the finish of a synthetic 10-minute race", () => {
    const { journal, advance } = rig();
    for (const action of ["briefing", "init", "scene-ready", "countdown", "start"] as const) journal.record(lifecycle(action));
    let controls = 0;
    // 10 minutes of helm and sheet input every 300 ms (never coalesced: two controls alternate), a perf sample a minute.
    for (let ms = 0; ms < 600_000; ms += 300) {
      advance(300); journal.record(helm(controls++));
      if (ms % 60_000 === 0 && ms > 0) journal.record(perf(ms / 1000));
    }
    journal.record(lifecycle("finish")); journal.record(lifecycle("finish-hold"));
    journal.record(result); journal.record(debrief);
    journal.record(perf(600)); journal.record(lifecycle("results"));
    const { entries, dropped } = journal.snapshot();
    expect(entries.length).toBe(200);
    expect(entries.reduce((sum, e) => sum + e.count, 0) + dropped).toBe(controls + 5 + 9 + 6);
    const kept = entries.map(e => e.event);
    for (const action of ["briefing", "init", "scene-ready", "countdown", "start", "finish", "finish-hold", "results"]) expect(kept.some(e => e.type === "race.lifecycle" && e.action === action), action).toBe(true);
    expect(kept.filter(e => e.type === "race.perf")).toHaveLength(10);
    expect(kept.filter(e => e.type === "race.summary").map(e => e.action)).toEqual(["result", "debrief"]);
    expect(kept.filter(e => e.type === "control.change").length).toBe(200 - 5 - 3 - 10 - 2);
    // The newest controls survive, still in order; the sequence stays increasing for persistence.
    expect(entries.map(e => e.seq)).toEqual([...entries.map(e => e.seq)].sort((a, b) => a - b));
    expect(parseDiagnosticPersistence(serializeDiagnosticPersistence(journal.snapshot(), 1_000), 1_001)?.entries).toEqual(entries);
  });

  it("drops ordinary commands before lifecycle and failures, and never the row just recorded", () => {
    const small = rig(3);
    small.journal.record(lifecycle("start")); small.journal.record(nav); small.journal.record({ ...command, outcome: "failed", reason: "disabled" });
    small.journal.record(command);
    expect(small.journal.snapshot()).toMatchObject({ dropped: 1, entries: [{ event: { action: "start" } }, { event: { outcome: "failed" } }, { event: command }] });
    const full = rig(2);
    full.journal.record(lifecycle("start")); full.journal.record(lifecycle("finish")); full.journal.record(helm(0));
    expect(full.journal.snapshot().entries.map(e => e.event.type)).toEqual(["race.lifecycle", "control.change"]);
    // Continuous helm input goes before an older ordinary command.
    const mixed = rig(3);
    mixed.journal.record(nav); mixed.journal.record(helm(0)); mixed.journal.record(lifecycle("start")); mixed.journal.record(helm(1));
    expect(mixed.journal.snapshot().entries.map(e => e.event)).toEqual([nav, lifecycle("start"), helm(1)]);
  });
});

describe("race.summary and the M1 lifecycle actions", () => {
  const result = { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "result", mode: "simple", difficulty: "medium", wind: "medium",
    setupSource: "lobby", race: "free", briefingShown: true, finished: true, place: 2, total: 6, botsFinished: 5, raceSeconds: 301.2, penaltySeconds: 0,
    finishHoldShown: true, soundOn: false, orientation: "portrait" } as const;
  const debrief = { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "debrief", tacks: 9, gybes: 2, noGoEntries: 1,
    missedMarkNotices: 0, contacts: 1, startJostleEvents: 2, judgeIncidents: 0, coachScore: 78, mainMistake: "none" } as const;

  it("accepts both rows at their widest values inside one batch and the per-row byte budget", () => {
    const widest = [{ ...result, setupSource: "restart", race: "mission", briefingShown: false, place: 64, total: 64, botsFinished: 63, raceSeconds: 7199.9, penaltySeconds: 7199.9, finishHoldShown: false, orientation: "landscape" },
      { ...debrief, tacks: 10_000, gybes: 10_000, noGoEntries: 10_000, missedMarkNotices: 10_000, contacts: 10_000, startJostleEvents: 10_000, judgeIncidents: 10_000, coachScore: 100, mainMistake: "close-hauled" }];
    const batch = parseDiagnosticBatch({ version: 1, events: [...widest, ...Array.from({ length: 14 }, () => widest[0])] });
    expect(batch?.events).toHaveLength(16);
    expect(serializeDiagnosticBatch(batch!.events)).not.toBeNull();
    const journal = rig().journal;
    for (const row of widest) expect(journal.record(row as DiagnosticInput)).not.toBeNull();
    expect(journal.snapshot().entries.every(e => bytes(e) <= DIAGNOSTIC_ENTRY_MAX_BYTES)).toBe(true);
  });

  it("refuses free text, unknown enums, out-of-range numbers and fields of the other row", () => {
    expect(parseDiagnosticBatch({ version: 1, events: [result, debrief] })?.events).toEqual([result, debrief]);
    const bad: unknown[] = [
      { ...result, nickname: "Ala" }, { ...result, mainMistake: "none" }, { ...debrief, place: 1 }, { ...result, setupSource: "share" },
      { ...result, race: "online" }, { ...result, place: 7 }, { ...result, botsFinished: 6 }, { ...result, total: 65, place: 1 },
      { ...result, raceSeconds: 7201 }, { ...result, raceSeconds: NaN }, { ...debrief, tacks: 1.5 }, { ...debrief, tacks: -1 },
      { ...debrief, coachScore: 101 }, { ...debrief, mainMistake: "pinching" }, { ...debrief, note: "PRIVATE" },
      Object.fromEntries(Object.entries(result).filter(([key]) => key !== "finished")),
      Object.fromEntries(Object.entries(debrief).filter(([key]) => key !== "mainMistake")),
      { ...result, action: "both" },
    ];
    for (const event of bad) expect(parseDiagnosticBatch({ version: 1, events: [event] }), JSON.stringify(event)).toBeNull();
    // The trial does not measure missed marks or contacts: those fields are optional.
    const { missedMarkNotices: _m, contacts: _c, ...trial } = debrief;
    expect(parseDiagnosticBatch({ version: 1, events: [trial] })).not.toBeNull();
  });

  it("knows restart with its setup source, results, the finish hold and the exit question", () => {
    for (const action of ["restart", "results", "finish-hold", "exit-ask", "exit-stay"]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ type: "race.lifecycle", surface: "race", outcome: "accepted", action, setupSource: "again", phase: "finished" }] }), action).not.toBeNull();
    }
    expect(parseDiagnosticBatch({ version: 1, events: [{ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "restart", setupSource: "button" }] })).toBeNull();
    expect(parseDiagnosticBatch({ version: 1, events: [{ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "restarted" }] })).toBeNull();
  });
});
