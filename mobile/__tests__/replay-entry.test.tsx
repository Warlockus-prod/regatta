jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockUseHistory = jest.fn();
const mockLoadRaceById = jest.fn();
let mockHasBack = true;
let mockParams: { id?: string } = {};
let mockLang = "en";
jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Redirect: (props: object) => React.createElement(View, { ...props, testID: "shared-replay-redirect" }),
    Stack: { Screen: () => null },
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockHasBack }),
  };
});
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({
  lang: mockLang,
  tl: (values: Record<string, string>) => values[mockLang],
  tp: (ru: string, en: string, pl: string, extras: Record<string, string> = {}) => ({ ru, en, pl, ...extras })[mockLang],
}) }));
jest.mock("../src/design-system/fonts", () => ({ useAppFontsReady: () => false, sourceSansFamily: () => "" }));
jest.mock("../src/design-system/components/Icon", () => ({ Icon: () => null }));
jest.mock("../src/design-system/components", () => ({
  Screen: require("react-native").View,
  Text: require("../src/design-system/components/Text").Text,
  EmptyState: require("../src/design-system/components/EmptyState").EmptyState,
  SkiaYacht: () => null,
}));
jest.mock("../src/persistence/race-history", () => ({
  ...jest.requireActual("../src/persistence/race-history"),
  loadRaceById: (id: string) => mockLoadRaceById(id),
  useRaceHistory: () => mockUseHistory(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { nativeDiagnostics } from "../src/diagnostics/journal";
import { DIAGNOSTIC_STORAGE_KEY } from "../../src/lib/diagnostics";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import ReplayRoute from "../app/replay/[id]";
import type { RaceRecord } from "../src/persistence/race-history";
import { classifyNativeReplayEntry } from "../src/replay/entry";
import { physicalRaceContext, PHYSICAL_RACE_PROFILES } from "../../src/lib/race-context";
import { makePhysicalRaceCourse } from "../../src/lib/race-courses";
import { makeStandardCourse } from "../../src/lib/race-physics";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

const KEY = "regatta.race-history.v1";
const legacy = { id: "pixel-48", courseId: "short", timeSec: 75, score: 90, finishedAt: 1,
  replay: [{ x: 160, y: 300, t: 0 }, { x: 160, y: 60, t: 40 }] };

function snapshot(profile?: typeof PHYSICAL_RACE_PROFILES[number]): NativeRaceSnapshot {
  const course = profile ? makePhysicalRaceCourse(profile) : makeStandardCourse();
  return { schema: 1, id: "world-61", mode: "pro", difficulty: "easy", windStrength: "medium", missionId: null,
    ...(profile ? { raceContext: physicalRaceContext(profile) } : {}),
    finishTimeSec: 120, position: 1, totalBoats: 3,
    course: { ...course, marks: course.marks.map(mark => ({ ...mark, label: "Знак", labelEn: "Mark", labelPl: "Znak" })) },
    samples: [{ t: 0, x: 400, y: 1050, heading: 45, twa: -45, speed: 4, lap: 0 },
      { t: 120, x: 400, y: 1000, heading: 180, twa: 180, speed: 4, lap: 2 }],
    events: [{ type: "finish", t: 120 }],
  };
}

beforeEach(async () => {
  await nativeDiagnostics.clear();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockHasBack = true; mockParams = { id: legacy.id }; mockLang = "en";
  mockUseHistory.mockReturnValue({ ready: false, getRaceById: () => null });
  mockLoadRaceById.mockImplementation(jest.requireActual("../src/persistence/race-history").loadRaceById);
  await AsyncStorage.clear();
});

it("selects the pixel viewer only when webRace is absent and leaves historical coordinates untouched", () => {
  const bytes = JSON.stringify(legacy);
  expect(classifyNativeReplayEntry(legacy)).toEqual({ kind: "legacy-pixel" });
  expect(classifyNativeReplayEntry({ ...legacy, webRace: undefined })).toEqual({ kind: "legacy-pixel" });
  expect(classifyNativeReplayEntry({ ...legacy, webRace: null })).toEqual({ kind: "unavailable", reason: "corrupt" });
  expect(classifyNativeReplayEntry(null)).toEqual({ kind: "missing" });
  expect(JSON.stringify(legacy)).toBe(bytes);
});

it("keeps schema1 world replays without metadata in the shared viewer", () => {
  const record = { ...legacy, webRace: snapshot() }, bytes = JSON.stringify(record);
  expect(classifyNativeReplayEntry(record)).toEqual({ kind: "shared" });
  expect(JSON.stringify(record)).toBe(bytes);
});

it.each(PHYSICAL_RACE_PROFILES)("accepts canonical %s physical geometry without changing the record", profile => {
  const record = { ...legacy, webRace: snapshot(profile) }, bytes = JSON.stringify(record);
  expect(classifyNativeReplayEntry(record)).toEqual({ kind: "shared" });
  expect(JSON.stringify(record)).toBe(bytes);
});

it.each([{ version: 2 }, { model: "future-cruiser" }, { geometryRevision: 2 }, { coordinateUnits: "pixels" }, { metresPerUnit: 1 }])(
  "never falls back to pixel coordinates for explicit future metadata %j", change => {
    const race = snapshot("short");
    const record = { ...legacy, webRace: { ...race, raceContext: { ...race.raceContext, ...change } } };
    const bytes = JSON.stringify(record);
    expect(classifyNativeReplayEntry(record)).toEqual({ kind: "unavailable", reason: "unsupported" });
    expect(JSON.stringify(record)).toBe(bytes);
  },
);

it("rejects mismatched physical profile, mark positions, radius and finish geometry rather than rendering pixels", () => {
  const race = snapshot("short");
  const wrong = [
    { ...race, raceContext: physicalRaceContext("long") },
    { ...race, course: { ...race.course, marks: race.course.marks.map((mark, i) => i ? mark : { ...mark, pos: { ...mark.pos, y: mark.pos.y + 1 } }) } },
    { ...race, course: { ...race.course, marks: race.course.marks.map((mark, i) => i ? mark : { ...mark, radius: mark.radius + .1 }) } },
    { ...race, course: { ...race.course, finishLine: { a: race.course.finishLine.b, b: race.course.finishLine.a } } },
  ];
  for (const webRace of wrong) {
    const record = { ...legacy, webRace }, bytes = JSON.stringify(record);
    expect(classifyNativeReplayEntry(record)).toEqual({ kind: "unavailable", reason: "corrupt" });
    expect(JSON.stringify(record)).toBe(bytes);
  }
});

it("distinguishes unknown web schema from malformed payloads without removing the saved fallback track", () => {
  expect(classifyNativeReplayEntry({ ...legacy, webRace: { ...snapshot(), schema: 2 } })).toEqual({ kind: "unavailable", reason: "unsupported" });
  for (const webRace of [false, [], {}, { ...snapshot(), samples: [] }, { ...snapshot(), raceContext: {} }]) {
    expect(classifyNativeReplayEntry({ ...legacy, webRace })).toEqual({ kind: "unavailable", reason: "corrupt" });
  }
});

it.each([
  ["physical-cruiser-v1:long:r1", "Could not read saved race"],
  ["physical-cruiser-v2:short:r1", "Saved race not supported"],
])("rejects wrapper %s at the actual Replay route and preserves history", async (courseId, title) => {
  const record = { ...legacy, courseId, webRace: snapshot("short") }, bytes = JSON.stringify([record]);
  expect(classifyNativeReplayEntry({ webRace: record.webRace })).toEqual({ kind: "shared" });
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<ReplayRoute />);
  await waitFor(() => expect(view.getByText(title)).toBeTruthy());
  expect(view.getByRole("button", { name: "Back" })).toBeTruthy();
  expect(view.queryByTestId("shared-replay-redirect")).toBeNull();
  expect(mockUseHistory).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it.each(PHYSICAL_RACE_PROFILES)("redirects a saved known %s world replay to the existing shared route", async profile => {
  const record = { ...legacy, webRace: snapshot(profile) }, bytes = JSON.stringify([record]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<ReplayRoute />);
  const redirect = await waitFor(() => view.getByTestId("shared-replay-redirect"));
  expect(redirect.props.href).toEqual({ pathname: "/game", params: { replayId: legacy.id } });
  expect(mockUseHistory).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it("continues to mount the historical pixel viewer for a record without webRace", async () => {
  const bytes = JSON.stringify([legacy]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<ReplayRoute />);
  await waitFor(() => expect(mockUseHistory).toHaveBeenCalled());
  expect(view.queryByTestId("shared-replay-redirect")).toBeNull();
  expect(view.queryByText("Saved race not supported")).toBeNull();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it.each([
  ["ru", "Формат гонки пока не поддерживается", "Назад"],
  ["en", "Saved race not supported", "Back"],
  ["pl", "Nieobsługiwany format wyścigu", "Wróć"],
  ["es", "Formato de regata no compatible", "Volver"],
  ["fr", "Format de course non pris en charge", "Retour"],
  ["de", "Rennformat nicht unterstützt", "Zurück"],
  ["it", "Formato della regata non supportato", "Indietro"],
])("renders an unsupported notice in %s with a real48px Back and no history writes", async (lang, title, back) => {
  mockLang = lang;
  const race = snapshot("short");
  const record = { ...legacy, webRace: { ...race, raceContext: { ...race.raceContext, model: "future-model" } } };
  const bytes = JSON.stringify([record]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<ReplayRoute />);
  await waitFor(() => expect(view.getByText(title)).toBeTruthy());
  const button = view.getByRole("button", { name: back });
  expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  fireEvent.press(button);
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockUseHistory).not.toHaveBeenCalled();
  expect(view.queryByTestId("shared-replay-redirect")).toBeNull();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it("shows corrupt data without a pixel fallback and returns a direct-link user to history", async () => {
  mockHasBack = false;
  const bytes = JSON.stringify([{ ...legacy, webRace: { ...snapshot("short"), samples: [] } }]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<ReplayRoute />);
  await waitFor(() => expect(view.getByText("Could not read saved race")).toBeTruthy());
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockReplace).toHaveBeenCalledWith("/history");
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockUseHistory).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it("does not let a late previous-id read replace the current unsupported notice", async () => {
  let resolveOld!: (value: RaceRecord | null) => void;
  const old = new Promise<RaceRecord | null>(resolve => { resolveOld = resolve; });
  mockLoadRaceById.mockImplementation(id => id === "old" ? old : Promise.resolve({ ...legacy, webRace: { ...snapshot(), schema: 2 } } as unknown as RaceRecord));
  mockParams = { id: "old" };
  const view = render(<ReplayRoute />);
  mockParams = { id: "future" }; view.rerender(<ReplayRoute />);
  await waitFor(() => expect(view.getByText("Saved race not supported")).toBeTruthy());
  await act(async () => { resolveOld({ ...legacy, webRace: snapshot() }); });
  expect(view.getByText("Saved race not supported")).toBeTruthy();
  expect(view.queryByTestId("shared-replay-redirect")).toBeNull();
  expect(mockUseHistory).not.toHaveBeenCalled();
});

it("handles a rejected entry read with a safe notice and usable exit", async () => {
  mockLoadRaceById.mockRejectedValue(new Error("PRIVATE disk path"));
  const view = render(<ReplayRoute />);
  await waitFor(() => expect(view.getByText("Could not read saved race")).toBeTruthy());
  expect(view.queryByText(/PRIVATE/)).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockUseHistory).not.toHaveBeenCalled();
});

it("does not keep a previous unsupported notice when the replay id is removed", async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify([{ ...legacy, webRace: { ...snapshot(), schema: 2 } }]));
  const view = render(<ReplayRoute />);
  await waitFor(() => expect(view.getByText("Saved race not supported")).toBeTruthy());
  mockParams = {}; view.rerender(<ReplayRoute />);
  expect(view.queryByText("Saved race not supported")).toBeNull();
  expect(view.getByText("Race not found")).toBeTruthy();
  expect(view.queryByTestId("shared-replay-redirect")).toBeNull();
});
