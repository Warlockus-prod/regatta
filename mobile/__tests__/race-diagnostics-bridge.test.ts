jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DIAGNOSTIC_STORAGE_KEY, parseDiagnosticPersistence, serializeDiagnosticBatch, type DiagnosticInput } from "../../src/lib/diagnostics";
import { createNativeDiagnosticService, handleNativeDiagnosticMessage, nativeDiagnostics } from "../src/diagnostics/journal";
import { diagnosticSupportExport } from "../src/diagnostics/export";

// Contract (owner TestFlight journal): the race's new diagnostic rows (the
// race.summary pair and the M1 race.lifecycle actions) cross the WebView
// bridge, the native journal, its AsyncStorage persistence and Copy journal
// unchanged, and a long race of helm input cannot push them out.
const summary: DiagnosticInput[] = [
  { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "result", mode: "pro", difficulty: "medium", wind: "light",
    setupSource: "hub", race: "daily", briefingShown: false, finished: true, place: 2, total: 6, botsFinished: 5, raceSeconds: 412.3, penaltySeconds: 10,
    finishHoldShown: true, soundOn: true, orientation: "landscape" },
  { type: "race.summary", surface: "race", outcome: "accepted", source: "system", action: "debrief", tacks: 11, gybes: 2, noGoEntries: 3,
    missedMarkNotices: 1, contacts: 2, startJostleEvents: 1, judgeIncidents: 2, coachScore: 70, mainMistake: "close-hauled" },
];
const lifecycle: DiagnosticInput[] = [
  { type: "race.lifecycle", surface: "race", outcome: "accepted", action: "pause", source: "keyboard", phase: "racing" },
  { type: "race.lifecycle", surface: "race", outcome: "accepted", action: "exit-ask", phase: "racing" },
  { type: "race.lifecycle", surface: "race", outcome: "noop", action: "exit-stay", phase: "racing" },
  { type: "race.lifecycle", surface: "race", outcome: "accepted", action: "finish-hold", mode: "pro" },
  { type: "race.lifecycle", surface: "race", outcome: "accepted", action: "results", mode: "pro" },
  { type: "race.lifecycle", surface: "race", outcome: "accepted", action: "restart", setupSource: "again", phase: "finished", mode: "pro" },
];
/** The exact message the web bridge (src/lib/diagnostics-bridge.ts) posts. */
const message = (events: DiagnosticInput[]) => JSON.stringify({ type: "diagnostic-events", ...JSON.parse(serializeDiagnosticBatch(events)!) });
const settle = async () => { for (let turn = 0; turn < 12; turn++) await Promise.resolve(); };

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-31T12:00:00Z"));
  await nativeDiagnostics.clear();
  await AsyncStorage.clear();
});
afterEach(async () => {
  await nativeDiagnostics.initialize();
  await nativeDiagnostics.clear();
  jest.useRealTimers();
});

it("accepts the race summary and the M1 lifecycle rows from the race WebView unchanged", () => {
  expect(handleNativeDiagnosticMessage(message([...lifecycle, ...summary]), "race")).toBe(true);
  expect(nativeDiagnostics.snapshot().entries.map(entry => entry.event)).toEqual([...lifecycle, ...summary]);
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "embedded.lifecycle")).toBe(false);
});

it("persists them to AsyncStorage, restores them after a relaunch and copies them in the support export", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); },
    removeItem: async (key: string) => { values.delete(key); } };
  const first = createNativeDiagnosticService(storage, () => 0);
  await first.initialize();
  for (const event of [...lifecycle, ...summary]) first.record(event);
  await first.flush(); await settle();
  expect(parseDiagnosticPersistence(values.get(DIAGNOSTIC_STORAGE_KEY), Date.now())?.entries.map(entry => entry.event)).toEqual([...lifecycle, ...summary]);
  const relaunched = createNativeDiagnosticService(storage, () => 0);
  await relaunched.initialize();
  const restored = relaunched.snapshot();
  expect(restored.entries.map(entry => entry.event)).toEqual([...lifecycle, ...summary]);
  const exported = JSON.parse(diagnosticSupportExport(restored, { version: "1.7.0", build: "74", platform: "ios" }));
  expect(exported.journal.entries.filter((entry: { event: DiagnosticInput }) => entry.event.type === "race.summary").map((entry: { event: DiagnosticInput }) => entry.event)).toEqual(summary);
});

it("keeps the race's start, perf, summary and finish when ten minutes of helm input fill the native journal", () => {
  let time = 0;
  const service = createNativeDiagnosticService({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, () => time);
  service.record({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "start", mode: "simple" });
  for (let ms = 300; ms <= 600_000; ms += 300) {
    time = ms;
    service.record({ type: "control.change", surface: "race", outcome: "accepted", control: ms % 600 ? "rudder" : "jibsheet", value: .5 });
    if (ms % 60_000 === 0) service.record({ type: "race.perf", surface: "race", outcome: "accepted", source: "system", action: "sample", backend: "webgl2", fpsAvg: 50, fpsP5: 30, dpr: 2, drawCalls: 90, seconds: ms / 1000 });
  }
  service.record({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "finish", mode: "simple" });
  for (const event of summary) service.record(event);
  const kept = service.snapshot().entries.map(entry => entry.event);
  expect(kept).toHaveLength(200);
  expect(kept.filter(event => event.type === "race.lifecycle").map(event => event.action)).toEqual(["start", "finish"]);
  expect(kept.filter(event => event.type === "race.perf")).toHaveLength(10);
  expect(kept.filter(event => event.type === "race.summary")).toEqual(summary);
  expect(service.snapshot().dropped).toBeGreaterThan(1500);
});
