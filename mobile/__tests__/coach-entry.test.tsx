jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockRequest = jest.fn();
const mockAnalyse = jest.fn();
const mockFindCourse = jest.fn();
const mockLoadRaceById = jest.fn();
const mockCapture = jest.fn();
let mockHasBack = true;
let mockParams: { raceId?: string } = {};
let mockLang = "en";
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn(), canGoBack: () => mockHasBack }),
}));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({
  lang: mockLang,
  tl: (values: Record<string, string>) => values[mockLang],
  tp: (ru: string, en: string, pl: string, extras: Record<string, string> = {}) => ({ ru, en, pl, ...extras })[mockLang],
}) }));
jest.mock("../src/design-system/fonts", () => ({ useAppFontsReady: () => false, sourceSansFamily: () => "" }));
jest.mock("../src/design-system/components/Icon", () => ({ Icon: () => null }));
jest.mock("../src/design-system/components", () => ({
  Screen: require("react-native").View,
  Card: require("react-native").View,
  Skeleton: require("react-native").View,
  Text: require("../src/design-system/components/Text").Text,
  EmptyState: require("../src/design-system/components/EmptyState").EmptyState,
  Button: require("../src/design-system/components/Button").Button,
}));
jest.mock("../src/persistence/race-history", () => ({
  ...jest.requireActual("../src/persistence/race-history"),
  loadRaceById: (id: string) => mockLoadRaceById(id),
}));
jest.mock("../src/game/course", () => ({
  ...jest.requireActual("../src/game/course"),
  findCourse: (id: string) => mockFindCourse(id),
}));
jest.mock("../src/api/coach", () => ({
  ...jest.requireActual("../src/api/coach"),
  requestCoaching: (payload: unknown) => mockRequest(payload),
}));
jest.mock("../../src/lib/fallback-coach", () => ({
  ...jest.requireActual("../../src/lib/fallback-coach"),
  analyseRaceLocally: (payload: unknown, lang: string) => mockAnalyse(payload, lang),
}));
jest.mock("../src/analytics", () => ({
  AnalyticsEvent: { CoachRequested: "coach_requested" },
  useAnalytics: () => ({ capture: mockCapture }),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { nativeDiagnostics } from "../src/diagnostics/journal";
import { DIAGNOSTIC_STORAGE_KEY } from "../../src/lib/diagnostics";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import Coach from "../app/coach";
import type { RaceRecord } from "../src/persistence/race-history";
import type { CoachResponse } from "../src/api/coach";
import { physicalRaceContext, PHYSICAL_RACE_PROFILES } from "../../src/lib/race-context";
import { makePhysicalRaceCourse } from "../../src/lib/race-courses";
import { makeStandardCourse } from "../../src/lib/race-physics";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

const KEY = "regatta.race-history.v1";
const legacy: RaceRecord = { id: "pixel-48", courseId: "short", timeSec: 75, score: 90, finishedAt: 1,
  replay: [{ x: 160, y: 300, t: 0 }, { x: 160, y: 60, t: 40 }] };
const local = { overall: "Local analysis", score: 85, mistakes: [], strengths: [], nextGoalRu: "Local goal" };
const remote = { overall: "Remote analysis", score: 80, mistakes: [], strengths: [] };

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
  jest.clearAllMocks();
  mockHasBack = true; mockParams = { raceId: legacy.id }; mockLang = "en";
  mockLoadRaceById.mockImplementation(jest.requireActual("../src/persistence/race-history").loadRaceById);
  mockFindCourse.mockImplementation(jest.requireActual("../src/game/course").findCourse);
  mockAnalyse.mockReturnValue(local);
  mockRequest.mockResolvedValue({ ok: true, data: { coaching: remote } });
  await AsyncStorage.clear();
});

it.each([
  ["ru", "Формат гонки пока не поддерживается", "Назад"],
  ["en", "Saved race not supported", "Back"],
  ["pl", "Nieobsługiwany format wyścigu", "Wróć"],
  ["es", "Formato de regata no compatible", "Volver"],
  ["fr", "Format de course non pris en charge", "Retour"],
  ["de", "Rennformat nicht unterstützt", "Zurück"],
  ["it", "Formato della regata non supportato", "Indietro"],
])("blocks unsupported world coaching in %s with the shared48px Back and no pixel geometry or request", async (lang, title, back) => {
  mockLang = lang;
  const race = snapshot("short");
  const bytes = JSON.stringify([{ ...legacy, webRace: { ...race, raceContext: { ...race.raceContext, model: "future-model" } } }]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<Coach />);
  await waitFor(() => expect(view.getByText(title)).toBeTruthy());
  const button = view.getByRole("button", { name: back });
  expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  fireEvent.press(button);
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockFindCourse).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockAnalyse).not.toHaveBeenCalled();
  expect(mockCapture).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it.each([
  ["future schema", { ...snapshot(), schema: 2 }],
  ["future revision", { ...snapshot("short"), raceContext: { ...physicalRaceContext("short"), geometryRevision: 2 } }],
  ["unknown units", { ...snapshot("short"), raceContext: { ...physicalRaceContext("short"), coordinateUnits: "pixels" } }],
])("does not send %s world data to the old pixel coach", async (_name, webRace) => {
  await AsyncStorage.setItem(KEY, JSON.stringify([{ ...legacy, webRace }]));
  const view = render(<Coach />);
  await waitFor(() => expect(view.getByText("Saved race not supported")).toBeTruthy());
  expect(mockFindCourse).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockAnalyse).not.toHaveBeenCalled();
});

it.each([
  ["null", null], ["primitive", false], ["malformed", {}],
  ["mismatched physical geometry", { ...snapshot("short"), raceContext: physicalRaceContext("long") }],
])("shows corrupt %s data and a history fallback without manufacturing pixel coordinates", async (_name, webRace) => {
  mockHasBack = false;
  const bytes = JSON.stringify([{ ...legacy, webRace }]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<Coach />);
  await waitFor(() => expect(view.getByText("Could not read saved race")).toBeTruthy());
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockReplace).toHaveBeenCalledWith("/history");
  expect(mockFindCourse).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockAnalyse).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it.each([undefined, ...PHYSICAL_RACE_PROFILES])("keeps known world %s coaching local and uses its saved geometry", async profile => {
  const race = snapshot(profile), bytes = JSON.stringify([{ ...legacy, webRace: race }]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<Coach />);
  await waitFor(() => expect(view.getByText("Local analysis")).toBeTruthy());
  expect(mockAnalyse).toHaveBeenCalledWith(expect.objectContaining({
    courseInfo: { windDirection: 0, windwardMark: race.course.marks[0].pos, startY: race.course.startLine.a.y },
    finishTime: race.finishTimeSec, samples: race.samples, events: race.events,
  }), "en");
  expect(mockFindCourse).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it("preserves remote coaching for historical pixel records with no webRace", async () => {
  const bytes = JSON.stringify([legacy]);
  await AsyncStorage.setItem(KEY, bytes); (AsyncStorage.setItem as jest.Mock).mockClear();
  const view = render(<Coach />);
  await waitFor(() => expect(view.getByText("Remote analysis")).toBeTruthy());
  expect(mockFindCourse).toHaveBeenCalledWith("short");
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
    finishTime: 75, position: 1, totalBoats: 1, lang: "en",
    samples: legacy.replay.map(point => ({ ...point, heading: 0, twa: 0, speed: 0, lap: 0 })),
  }));
  expect(mockAnalyse).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key !== DIAGNOSTIC_STORAGE_KEY)).toEqual([]);
});

it("does not let an old legacy network response replace a newer unsupported world notice", async () => {
  let finish!: (value: { ok: boolean; data: CoachResponse }) => void;
  mockRequest.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await AsyncStorage.setItem(KEY, JSON.stringify([legacy, { ...legacy, id: "future", webRace: { ...snapshot(), schema: 2 } }]));
  const view = render(<Coach />);
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  mockParams = { raceId: "future" }; view.rerender(<Coach />);
  await waitFor(() => expect(view.getByText("Saved race not supported")).toBeTruthy());
  await act(async () => { finish({ ok: true, data: { coaching: remote } }); });
  expect(view.getByText("Saved race not supported")).toBeTruthy();
  expect(view.queryByText("Remote analysis")).toBeNull();
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(mockFindCourse).toHaveBeenCalledTimes(1);
});

it("ignores a late previous-id world read after a future record has been classified", async () => {
  let finish!: (value: RaceRecord | null) => void;
  const pending = new Promise<RaceRecord | null>(resolve => { finish = resolve; });
  mockLoadRaceById.mockImplementation(id => id === legacy.id ? pending : Promise.resolve({ ...legacy, webRace: { ...snapshot(), schema: 2 } }));
  const view = render(<Coach />);
  mockParams = { raceId: "future" }; view.rerender(<Coach />);
  await waitFor(() => expect(view.getByText("Saved race not supported")).toBeTruthy());
  await act(async () => { finish({ ...legacy, webRace: snapshot() }); });
  expect(view.getByText("Saved race not supported")).toBeTruthy();
  expect(mockFindCourse).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockAnalyse).not.toHaveBeenCalled();
});

it("makes a read failure safely escapable without a fallback request", async () => {
  mockLoadRaceById.mockRejectedValue(new Error("PRIVATE storage path"));
  const view = render(<Coach />);
  await waitFor(() => expect(view.getByText("Could not read saved race")).toBeTruthy());
  expect(view.queryByText(/PRIVATE/)).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockFindCourse).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
});
