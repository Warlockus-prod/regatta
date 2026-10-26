jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({}), useRouter: () => ({ navigate: jest.fn(), replace: jest.fn() }) }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en }) }));
jest.mock("../src/design-system/components", () => ({ Screen: ({ children }: { children: unknown }) => children, Text: () => null, Button: () => null }));
jest.mock("../src/analytics", () => ({ AnalyticsEvent: { RaceStarted: "race_started", RaceFinished: "race_finished" }, useAnalytics: () => ({ capture: jest.fn() }) }));
jest.mock("../src/simulator/SimWebView", () => {
  const React = require("react"); const { View } = require("react-native");
  return { SimWebView: (props: object) => React.createElement(View, { ...props, testID: "pb-race-host" }) };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, renderHook, waitFor } from "@testing-library/react-native";
import Game from "../app/game";
import { BEST_TIMES_STORAGE_KEY } from "../../src/lib/best-times";
import { LEGACY_RACE_CONTEXT } from "../../src/lib/race-context";
import { makeStandardCourse } from "../../src/lib/race-physics";
import { type NativeBestCommand } from "../../src/lib/race-best-command";
import { saveNativePersonalBest } from "../src/persistence/race-personal-best";
import { clearNativeRegattaData } from "../src/persistence/clear-native-data";
import { nativeDataEpoch } from "../src/persistence/data-epoch";
import { ANALYTICS_CONSENT_KEY } from "../src/persistence/analytics-consent";
import { readRaces } from "../src/persistence/race-history";
import { nativeDiagnostics } from "../src/diagnostics/journal";
import { serial } from "../src/persistence/serial";
import { useRaceWebStorage } from "../src/persistence/race-web-storage";

const originalSet = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
const originalGet = (AsyncStorage.getItem as jest.Mock).getMockImplementation()!;
const originalMultiRemove = (AsyncStorage.multiRemove as jest.Mock).getMockImplementation()!;
const originalGetAll = (AsyncStorage.getAllKeys as jest.Mock).getMockImplementation()!;
const command = (): NativeBestCommand => ({ schema: 1, id: "actual-finish-1", requestId: "attempt_1",
  comparison: { raceContext: LEGACY_RACE_CONTEXT, mode: "pro", difficulty: "easy", windStrength: "light" },
  rawFinishTimeSec: 100, penaltySeconds: 5, finishTimeSec: 105, course: makeStandardCourse() });
const start = { type: "race-started", id: "actual-finish-1", mode: "pro", difficulty: "easy", windStrength: "light", missionId: null };
const bestKey = "pro:easy-light";
function replies(inject: jest.Mock) {
  return inject.mock.calls.filter(([script]) => script.includes('"regatta:personal-best-result"')).map(([script]) => JSON.parse(script.match(/\{detail:(.*)\}\)\);true;$/)[1]));
}
function recording() {
  const c = command();
  return { schema: 1, id: c.id, mode: "pro", difficulty: "easy", windStrength: "light", missionId: null,
    finishTimeSec: c.rawFinishTimeSec, penaltySeconds: c.penaltySeconds, position: 1, totalBoats: 3,
    course: { ...c.course, marks: c.course.marks.map(m => ({ ...m, labelEn: m.label, labelPl: m.label })) },
    samples: [{ t: 0, x: 400, y: 990, heading: 45, twa: 45, speed: 4, lap: 0 }, { t: 100, x: 400, y: 1000, heading: 180, twa: 180, speed: 5, lap: 2 }],
    events: [{ type: "start", t: 0 }, { type: "finish", t: 100 }] };
}
beforeEach(async () => {
  (AsyncStorage.setItem as jest.Mock).mockImplementation(originalSet);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(originalGet);
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(originalMultiRemove);
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(originalGetAll);
  await serial(async () => undefined); await nativeDiagnostics.clear(); await AsyncStorage.clear(); jest.clearAllMocks();
});

it("the real host waits for the actual PB write instead of acknowledging the WebKit row", async () => {
  const view = render(<Game />); await waitFor(() => expect(view.getByTestId("pb-race-host")).toBeTruthy());
  const message = view.getByTestId("pb-race-host").props.onOfflineMessage; const inject = jest.fn();
  let release!: () => void; const hold = new Promise<void>(resolve => { release = resolve; });
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key, value) => { if (key === BEST_TIMES_STORAGE_KEY) await hold; return originalSet(key, value); });
  act(() => { message(JSON.stringify(start), inject); message(JSON.stringify({ type: "race-personal-best", command: command() }), inject); });
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(BEST_TIMES_STORAGE_KEY, expect.any(String)));
  expect(replies(inject)).toEqual([]);
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBeNull();
  await act(async () => { release(); await serial(async () => undefined); });
  await waitFor(() => expect(replies(inject)).toHaveLength(1));
  expect(replies(inject)[0]).toMatchObject({ status: "saved", newRecord: true, currentBest: { timeSec: 105 } });
  expect(JSON.parse((await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY))!)[bestKey].nativeReceipt.raceId).toBe(start.id);
  expect(await readRaces()).toEqual([]);
});

it("reports PB failure independently while history really saves, then retries PB without duplicating history", async () => {
  const view = render(<Game />); await waitFor(() => expect(view.getByTestId("pb-race-host")).toBeTruthy());
  const message = view.getByTestId("pb-race-host").props.onOfflineMessage; const inject = jest.fn(); let fail = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
    if (key === BEST_TIMES_STORAGE_KEY && fail) { fail = false; return Promise.reject(new Error("disk full")); }
    return originalSet(key, value);
  });
  act(() => {
    message(JSON.stringify(start), inject);
    message(JSON.stringify({ type: "race-finished", race: recording() }), inject);
    message(JSON.stringify({ type: "race-personal-best", command: command() }), inject);
  });
  await waitFor(() => expect(replies(inject)).toHaveLength(1));
  expect(inject).toHaveBeenCalledWith(expect.stringContaining('regatta:race-history-saved'));
  expect(replies(inject)[0]).toMatchObject({ status: "failed", reason: "storage-write", newRecord: false });
  expect((await readRaces()).map(r => r.id)).toEqual([start.id]);
  act(() => message(JSON.stringify({ type: "race-personal-best", command: { ...command(), requestId: "attempt_2" } }), inject));
  await waitFor(() => expect(replies(inject)).toHaveLength(2));
  expect(replies(inject)[1]).toMatchObject({ status: "saved", requestId: "attempt_2" });
  expect((await readRaces()).map(r => r.id)).toEqual([start.id]);
});

it("confirms a lost ACK from the same durable receipt without writing again", async () => {
  const first = await saveNativePersonalBest(command());
  const original = await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY);
  const retry = await saveNativePersonalBest({ ...command(), requestId: "attempt_2" });
  expect(retry.reply).toMatchObject({ status: "saved", currentBest: first.reply.currentBest });
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBe(original);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key === BEST_TIMES_STORAGE_KEY)).toHaveLength(1);
});

it("a history write failure does not prevent a separately confirmed PB", async () => {
  const view = render(<Game />); await waitFor(() => expect(view.getByTestId("pb-race-host")).toBeTruthy());
  const message = view.getByTestId("pb-race-host").props.onOfflineMessage; const inject = jest.fn();
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => key === "regatta.race-history.v1"
    ? Promise.reject(new Error("history unavailable")) : originalSet(key, value));
  act(() => {
    message(JSON.stringify(start), inject); message(JSON.stringify({ type: "race-finished", race: recording() }), inject);
    message(JSON.stringify({ type: "race-personal-best", command: command() }), inject);
  });
  await waitFor(() => expect(replies(inject)).toHaveLength(1));
  expect(replies(inject)[0]).toMatchObject({ status: "saved", newRecord: true });
  expect(inject).toHaveBeenCalledWith(expect.stringContaining('regatta:race-history-error'));
  expect(await readRaces()).toEqual([]);
});

it("reordered confirmed-cache callbacks cannot replace a newer durable store", async () => {
  const first = await saveNativePersonalBest(command());
  const second = await saveNativePersonalBest({ ...command(), id: "actual-finish-2", requestId: "second_1", rawFinishTimeSec: 90, finishTimeSec: 95 });
  const view = renderHook(() => useRaceWebStorage()); await waitFor(() => expect(view.result.current.ready).toBe(true));
  act(() => {
    view.result.current.acceptBestStore(second.serialized!, nativeDataEpoch(), second.storeRevision!);
    view.result.current.acceptBestStore(first.serialized!, nativeDataEpoch(), first.storeRevision!);
  });
  expect(JSON.parse(view.result.current.entries[BEST_TIMES_STORAGE_KEY]!)[bestKey].timeSec).toBe(95);
  expect(JSON.parse((await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY))!)[bestKey].timeSec).toBe(95);
});

it.each(["unreadable", '["not a store"]', JSON.stringify({ [bestKey]: { timeSec: "wrong", ts: 1 } })])("preserves a corrupt native store byte-for-byte: %s", async raw => {
  await AsyncStorage.setItem(BEST_TIMES_STORAGE_KEY, raw);
  const result = await saveNativePersonalBest(command());
  expect(result.reply).toMatchObject({ status: "failed", reason: "storage-invalid", newRecord: false });
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBe(raw);
});

it("never replaces a row after a read failure", async () => {
  const old = JSON.stringify({ [bestKey]: { timeSec: 120, ts: 1 }, future: { preserved: true } });
  await AsyncStorage.setItem(BEST_TIMES_STORAGE_KEY, old);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => key === BEST_TIMES_STORAGE_KEY ? Promise.reject(new Error("read denied")) : originalGet(key));
  expect((await saveNativePersonalBest(command())).reply).toMatchObject({ status: "failed", reason: "storage-read", newRecord: false });
  expect(await originalGet(BEST_TIMES_STORAGE_KEY)).toBe(old);
});

it("an optional diagnostic recorder failure cannot turn a durable PB into an error", async () => {
  const recorder = jest.spyOn(nativeDiagnostics, "record").mockImplementation(() => { throw Error("diagnostics unavailable"); });
  try {
    expect((await saveNativePersonalBest(command())).reply).toMatchObject({ status: "saved", newRecord: true });
    expect(JSON.parse((await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY))!)[bestKey].timeSec).toBe(105);
  } finally { recorder.mockRestore(); }
});

it("does not let an optimistic storage message bypass native PB ownership", async () => {
  const view = render(<Game />); await waitFor(() => expect(view.getByTestId("pb-race-host")).toBeTruthy());
  const message = view.getByTestId("pb-race-host").props.onOfflineMessage; const inject = jest.fn();
  act(() => message(JSON.stringify({ type: "race-storage", entries: { [BEST_TIMES_STORAGE_KEY]: JSON.stringify({ [bestKey]: { timeSec: 1, ts: 1 } }) } }), inject));
  await act(async () => { await serial(async () => undefined); });
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBeNull(); expect(inject).not.toHaveBeenCalled();
  act(() => message(JSON.stringify({ type: "race-personal-best", command: command() }), inject));
  await waitFor(() => expect(replies(inject)).toHaveLength(1));
  expect(replies(inject)[0]).toMatchObject({ status: "failed", reason: "invalid-input" });
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBeNull();
});

it("does not inject a reply into a disposed host, and a cold host hydrates the actual stored row", async () => {
  const view = render(<Game />); await waitFor(() => expect(view.getByTestId("pb-race-host")).toBeTruthy());
  const message = view.getByTestId("pb-race-host").props.onOfflineMessage; const inject = jest.fn();
  let release!: () => void; const hold = new Promise<void>(resolve => { release = resolve; });
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key, value) => { if (key === BEST_TIMES_STORAGE_KEY) await hold; return originalSet(key, value); });
  act(() => { message(JSON.stringify(start), inject); message(JSON.stringify({ type: "race-personal-best", command: command() }), inject); });
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(BEST_TIMES_STORAGE_KEY, expect.any(String)));
  view.unmount(); release(); await serial(async () => undefined);
  expect(inject).not.toHaveBeenCalled();
  const next = render(<Game />); await waitFor(() => expect(next.getByTestId("pb-race-host")).toBeTruthy());
  expect(JSON.parse(next.getByTestId("pb-race-host").props.localStorage[BEST_TIMES_STORAGE_KEY])[bestKey].timeSec).toBe(105);
});

it("global clear waits for an issued write, cancels its reply and prevents old commands from restoring the row", async () => {
  await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, '{"enabled":false}'); await AsyncStorage.setItem("other.app", "keep");
  const epoch = nativeDataEpoch(); let release!: () => void; const hold = new Promise<void>(resolve => { release = resolve; });
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key, value) => { if (key === BEST_TIMES_STORAGE_KEY) await hold; return originalSet(key, value); });
  const pending = saveNativePersonalBest(command(), epoch);
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(BEST_TIMES_STORAGE_KEY, expect.any(String)));
  const clear = clearNativeRegattaData(); release();
  expect((await pending).reply).toMatchObject({ status: "failed", reason: "cancelled", newRecord: false }); await clear;
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBeNull();
  expect((await saveNativePersonalBest(command(), epoch)).reply).toMatchObject({ status: "failed", reason: "cancelled" });
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('{"enabled":false}'); expect(await AsyncStorage.getItem("other.app")).toBe("keep");
});

it("a failed global sweep rejects instead of declaring success or deleting unread data", async () => {
  await AsyncStorage.setItem(BEST_TIMES_STORAGE_KEY, "preserve");
  (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error("read failure"));
  await expect(clearNativeRegattaData()).rejects.toThrow("read failure");
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBe("preserve");
});

it("a mounted race rehydrates after the clear sweep and rejects its previous document's command", async () => {
  await saveNativePersonalBest(command());
  const view = render(<Game />); await waitFor(() => expect(view.getByTestId("pb-race-host")).toBeTruthy());
  const previousMessage = view.getByTestId("pb-race-host").props.onOfflineMessage;
  expect(view.getByTestId("pb-race-host").props.localStorage[BEST_TIMES_STORAGE_KEY]).not.toBeNull();
  await act(async () => { await clearNativeRegattaData(); });
  await waitFor(() => expect(view.getByTestId("pb-race-host").props.localStorage[BEST_TIMES_STORAGE_KEY]).toBeNull());
  const inject = jest.fn();
  act(() => { previousMessage(JSON.stringify(start), inject); previousMessage(JSON.stringify({ type: "race-personal-best", command: command() }), inject); });
  await act(async () => { await serial(async () => undefined); });
  expect(await AsyncStorage.getItem(BEST_TIMES_STORAGE_KEY)).toBeNull(); expect(inject).not.toHaveBeenCalled();
});
