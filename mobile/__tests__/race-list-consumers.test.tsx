jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
const mockUseHistory = jest.fn();
let mockLang = "en";
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush }), useLocalSearchParams: () => ({}) }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: mockLang,
  tp: (ru: string, en: string, pl: string, extras: Record<string, string> = {}) => ({ ru, en, pl, ...extras })[mockLang],
}) }));
jest.mock("../src/design-system/fonts", () => ({ useAppFontsReady: () => false, sourceSansFamily: () => "" }));
jest.mock("../src/design-system/components/Icon", () => ({ Icon: () => null }));
jest.mock("../src/design-system/components", () => ({
  Screen: require("react-native").View,
  Text: require("../src/design-system/components/Text").Text,
  Card: require("../src/design-system/components/Card").Card,
  EmptyState: require("../src/design-system/components/EmptyState").EmptyState,
}));
jest.mock("../src/persistence/race-history", () => ({ useRaceHistory: () => mockUseHistory() }));
jest.mock("../src/api/leaderboard", () => ({ fetchGlobalLeaderboard: jest.fn().mockResolvedValue({ ok: true, data: { rows: [] } }) }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import History from "../app/history";
import Leaderboard from "../app/leaderboard";
import type { RaceRecord } from "../src/persistence/race-history";
import * as presentation from "../src/persistence/race-record-presentation";
import { projectNativeRaceRecords, selectNativeRaceBests } from "../src/leaderboard/race-records";
import { physicalRaceContext, LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES } from "../../src/lib/race-context";
import { makePhysicalRaceCourse } from "../../src/lib/race-courses";
import { makeStandardCourse } from "../../src/lib/race-physics";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";
import { fetchGlobalLeaderboard } from "../src/api/leaderboard";

const old: RaceRecord = { id: "PRIVATE_OLD_ID", courseId: "short", timeSec: 75, score: 90, finishedAt: 1,
  replay: [{ x: 160, y: 300, t: 0 }, { x: 160, y: 60, t: 40 }] };
function registered(id: string, profile: typeof PHYSICAL_RACE_PROFILES[number] | null = "short",
  patch: Partial<NativeRaceSnapshot> = {}): RaceRecord {
  const course = profile ? makePhysicalRaceCourse(profile) : makeStandardCourse();
  const finishTimeSec = patch.finishTimeSec ?? 120;
  const snapshot: NativeRaceSnapshot = { schema: 1, id, mode: "pro", difficulty: "easy", windStrength: "medium", missionId: null,
    raceContext: profile ? physicalRaceContext(profile) : LEGACY_RACE_CONTEXT,
    finishTimeSec, penaltySeconds: 7.25, position: 1, totalBoats: 3,
    course: { ...course, marks: course.marks.map(mark => ({ ...mark, label: "Знак", labelEn: "Mark", labelPl: "Znak" })) },
    samples: [{ t: 0, x: 400, y: 1050, heading: 45, twa: -45, speed: 4, lap: 0 },
      { t: finishTimeSec, x: 400, y: 1000, heading: 180, twa: 180, speed: 4, lap: 2 }],
    events: [{ type: "finish", t: finishTimeSec }], ...patch,
  };
  return { ...old, id, courseId: "short", timeSec: 1, score: 100, webRace: snapshot };
}

beforeEach(() => { jest.clearAllMocks(); mockLang = "en"; });
afterEach(() => { jest.restoreAllMocks(); });

it("keeps historical score PBs separate and chooses registered PBs by actual adjusted time", () => {
  const slow = registered("SLOW", "short", { finishTimeSec: 110, penaltySeconds: 25 });
  const fast = { ...registered("FAST", "short", { penaltySeconds: 0 }), timeSec: 999, score: 1 };
  const oldLow = { ...old, id: "OLD_LOW", timeSec: 1, score: 89 };
  const unknown = { ...old, id: "UNKNOWN_PIXEL", courseId: "PRIVATE_UNKNOWN_COURSE" };
  const future = { ...registered("FUTURE"), webRace: { schema: 2 } } as unknown as RaceRecord;
  const values = [slow, oldLow, fast, old, unknown, future], before = JSON.stringify(values);
  const groups = selectNativeRaceBests(projectNativeRaceRecords(values), "all", "all");
  expect(groups.historical.map(entry => entry.race.id)).toEqual([old.id, unknown.id]);
  expect(groups.classified.map(entry => entry.race.id)).toEqual(["FAST"]);
  expect(groups.unavailable.map(entry => entry.race.id)).toEqual(["FUTURE"]);
  expect(JSON.stringify(values)).toBe(before);
});

it("isolates every physical mode/difficulty/wind/profile group without a shared adjusted-time ranking", () => {
  const rows: RaceRecord[] = [];
  for (const profile of PHYSICAL_RACE_PROFILES) for (const mode of ["simple", "pro"] as const)
    for (const difficulty of ["easy", "medium", "hard"] as const) for (const windStrength of ["light", "medium", "heavy"] as const) {
      rows.push(registered(`${profile}-${mode}-${difficulty}-${windStrength}`, profile, { mode, difficulty, windStrength }));
    }
  rows.push(registered("EXPLICIT_LEGACY", null));
  const projected = projectNativeRaceRecords(rows);
  expect(selectNativeRaceBests(projected, "all", "all").classified).toHaveLength(55);
  for (const profile of PHYSICAL_RACE_PROFILES) {
    const filtered = selectNativeRaceBests(projected, profile, "all");
    expect(filtered.classified).toHaveLength(18);
    expect(filtered.classified.every(entry => entry.projection.kind === "classified" && entry.projection.comparison.raceContext.profile === profile)).toBe(true);
  }
});

it("uses canonical profile for course filters and selects period before choosing a PB", () => {
  const day = 86400000, now = 10 * day;
  const older = { ...registered("OLDER", "long", { finishTimeSec: 100, penaltySeconds: 0 }), finishedAt: now - 2 * day };
  const today = { ...registered("TODAY", "long"), finishedAt: now - 1000 };
  const daily = { ...old, id: "DAILY", courseId: "daily", finishedAt: now };
  const entries = projectNativeRaceRecords([older, today, daily]);
  expect(selectNativeRaceBests(entries, "long", "all", now).classified[0].race.id).toBe("OLDER");
  expect(selectNativeRaceBests(entries, "long", "today", now).classified[0].race.id).toBe("TODAY");
  expect(selectNativeRaceBests(entries, "short", "all", now).classified).toEqual([]);
  expect(selectNativeRaceBests(entries, "medium", "today", now).historical[0].race.id).toBe("DAILY");
});

it("renders real History titles and authoritative times while keeping unknown records and their exit routes", () => {
  const races = [registered("PRIVATE_PHYSICAL_ID", "long"), { ...old, id: "CUSTOM", courseId: "PRIVATE_UNKNOWN_COURSE" },
    { ...registered("FUTURE"), webRace: { schema: 2 } } as unknown as RaceRecord];
  const before = JSON.stringify(races);
  mockUseHistory.mockReturnValue({ races, ready: true, clear: jest.fn() });
  const view = render(<History />);
  expect(view.getByText("Long course")).toBeTruthy();
  expect(view.getByText("Saved race")).toBeTruthy();
  expect(view.queryByText("Short race")).toBeNull();
  expect(view.getByText("Race record unavailable")).toBeTruthy();
  expect(view.getByText("Adjusted time: 2:07.3")).toBeTruthy();
  expect(view.getByText("Sailing time: 2:00.0 · Penalty: 0:07.3")).toBeTruthy();
  expect(view.getByText("Pro · Easy · medium wind")).toBeTruthy();
  fireEvent.press(view.getAllByRole("button", { name: "Watch" })[0]);
  expect(mockPush).toHaveBeenLastCalledWith("/replay/PRIVATE_PHYSICAL_ID");
  fireEvent.press(view.getAllByRole("button", { name: "Coach" })[2]);
  expect(mockPush).toHaveBeenLastCalledWith("/coach?raceId=FUTURE");
  expect(JSON.stringify(view.toJSON())).not.toContain("PRIVATE_UNKNOWN_COURSE");
  expect(JSON.stringify(races)).toBe(before);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it("renders real Leaderboard with historical ranks and unranked independent class PBs", async () => {
  const races = [old, registered("PHYSICAL"), registered("SIMPLE", "short", { mode: "simple" }),
    { ...registered("FUTURE"), webRace: { schema: 2 } } as unknown as RaceRecord];
  mockUseHistory.mockReturnValue({ races, ready: true });
  const view = render(<Leaderboard />);
  expect(view.getByText("#1")).toBeTruthy();
  expect(view.queryByText("#2")).toBeNull();
  expect(view.getByText("Previous results")).toBeTruthy();
  expect(view.getByText("Bests by race conditions")).toBeTruthy();
  expect(view.getAllByText("Adjusted time: 2:07.3")).toHaveLength(2);
  expect(view.getByText("Pro · Easy · medium wind")).toBeTruthy();
  expect(view.getByText("Simple · Easy · medium wind")).toBeTruthy();
  expect(view.getByText("Other saved records")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: /Short course, Pro/ }));
  expect(mockPush).toHaveBeenLastCalledWith("/replay/PHYSICAL");
  fireEvent.press(view.getByRole("button", { name: "Global" }));
  await waitFor(() => expect(fetchGlobalLeaderboard).toHaveBeenCalledWith("medium", "medium"));
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it.each([History, Leaderboard])("projects only once per stable history array in the actual list consumer", Component => {
  const races = [old, registered("SAVED")];
  const project = jest.spyOn(presentation, "projectNativeRaceRecord");
  mockUseHistory.mockReturnValue({ races, ready: true, clear: jest.fn() });
  const view = render(<Component />);
  expect(project).toHaveBeenCalledTimes(2);
  view.rerender(<Component />);
  expect(project).toHaveBeenCalledTimes(2);
  if (Component === Leaderboard) {
    fireEvent.press(view.getByRole("button", { name: "Short" }));
    expect(project).toHaveBeenCalledTimes(2);
  }
  mockUseHistory.mockReturnValue({ races: [...races], ready: true, clear: jest.fn() });
  view.rerender(<Component />);
  expect(project).toHaveBeenCalledTimes(4);
});

it.each([
  ["ru", "Средняя дистанция", "Сохраненная гонка", "Pro · Лёгкий · средний ветер"],
  ["en", "Medium course", "Saved race", "Pro · Easy · medium wind"],
  ["pl", "Średnia trasa", "Zapisany wyścig", "Pro · Łatwy · średni wiatr"],
  ["es", "Recorrido medio", "Regata guardada", "Pro · Fácil · viento medio"],
  ["fr", "Parcours moyen", "Course enregistrée", "Pro · Facile · vent moyen"],
  ["de", "Mittlere Bahn", "Gespeichertes Rennen", "Pro · Leicht · mäßiger Wind"],
  ["it", "Percorso medio", "Regata salvata", "Pro · Facile · vento moderato"],
])("uses selected %s copy for unknown and classified rows without a raw-ID fallback", (lang, title, saved, conditions) => {
  mockLang = lang;
  mockUseHistory.mockReturnValue({ races: [registered("SAVED", "medium"), { ...old, courseId: "PRIVATE_UNKNOWN_COURSE" }], ready: true });
  const view = render(<History />);
  expect(view.getByText(title)).toBeTruthy();
  expect(view.getByText(saved)).toBeTruthy();
  expect(view.getByText(conditions)).toBeTruthy();
  expect(JSON.stringify(view.toJSON())).not.toContain("PRIVATE_UNKNOWN_COURSE");
});
