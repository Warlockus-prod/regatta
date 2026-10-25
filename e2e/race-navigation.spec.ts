import { expect, test, type Page } from "@playwright/test";
import { buildSync } from "esbuild";
import { makeStandardCourse } from "../src/lib/race-physics";
import { DIFFICULTY_CONFIG } from "../src/app/game/config";

type VisualJournal = {
  status: "valid" | "absent" | "invalid" | "unavailable";
  mapOpened: boolean;
  mapClosed: boolean;
  windValues: string[];
};

let parserSource: string | undefined;
function journalParserSource() {
  // Match SITE observability: raw storage is validated inside the browser and
  // never returned to the test process or included in a retry trace.
  return parserSource ??= buildSync({
    stdin: { contents: 'export { parseDiagnosticPersistence, DIAGNOSTIC_STORAGE_KEY } from "./src/lib/diagnostics";', resolveDir: process.cwd(), loader: "ts" },
    bundle: true, write: false, platform: "browser", format: "iife", globalName: "RaceNavigationJournalParser",
    target: "es2020", minify: true, tsconfigRaw: "{}",
  }).outputFiles[0].text;
}

async function visualJournal(page: Page): Promise<VisualJournal> {
  return page.evaluate<VisualJournal>(`(() => {
    ${journalParserSource()}
    const empty = { mapOpened: false, mapClosed: false, windValues: [] };
    try {
      const raw = localStorage.getItem(RaceNavigationJournalParser.DIAGNOSTIC_STORAGE_KEY);
      if (raw === null) return { status: "absent", ...empty };
      const snapshot = RaceNavigationJournalParser.parseDiagnosticPersistence(raw, Date.now());
      if (!snapshot) return { status: "invalid", ...empty };
      const events = snapshot.entries.map(entry => entry.event).filter(event => event.surface === "race");
      return {
        status: "valid",
        mapOpened: events.some(event => event.type === "control.change" && event.control === "race-map" && event.value === true && event.outcome === "accepted"),
        mapClosed: events.some(event => event.type === "control.change" && event.control === "race-map" && event.value === false && event.outcome === "accepted"),
        windValues: [...new Set(events.filter(event => event.type === "control.preferences" && event.preference === "wind-display" && (event.outcome === "accepted" || event.outcome === "noop")).map(event => event.value))].sort(),
      };
    } catch { return { status: "unavailable", ...empty }; }
  })()`);
}

function seconds(text: string | null): number {
  const match = text?.trim().match(/^(\d+):(\d{2})\.(\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) + Number(match[3]) / 10 : NaN;
}

test("Simple 3D keeps live wind, the course map and wind choices in the reserved cockpit", async ({ page, context }, testInfo) => {
  // One complete real 3D startup, running map and four settings transitions.
  // The shared scene deadline stays 25s; existing test budgets are unchanged.
  test.setTimeout(120_000);
  await context.addInitScript(() => {
    try {
      localStorage.setItem("regatta.lang.v1", "ru");
      localStorage.setItem("regatta.onboarding.v1", "1");
      localStorage.setItem("regatta.v3.tour.v1", "1");
      localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels", helmReturnToCenter: false }));
    } catch { /* Ordinary browser storage may be unavailable. */ }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/game?embed=1");
  await expect(page.getByRole("heading", { name: "Гонка", exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /^Первая гонка/ }).click();
  await page.getByRole("radio", { name: "Обычный", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Обычный", exact: true })).toBeChecked();
  await page.getByRole("button", { name: /Начать первую гонку/i }).click();
  await expect(page.getByText("Лёгкий · средний ветер", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Готов - старт/ }).click();

  const scene = page.getByTestId("race-3d");
  const cockpit = page.getByTestId("race-cockpit");
  const canvas = scene.locator('[data-scene="next"] canvas');
  const startup = scene.locator("[data-scene-startup]");
  const deadline = Date.now() + 25_000;
  const remaining = () => Math.max(1, deadline - Date.now());
  await expect(scene).toBeVisible({ timeout: remaining() });
  await expect(canvas).toBeVisible({ timeout: remaining() });
  await expect(startup).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });

  const compact = cockpit.locator('[data-testid="race-wind-instrument"][data-compact]');
  await expect(compact).toHaveCount(1);
  await expect(compact.getByTestId("race-wind-compass")).toBeVisible();
  const direction = compact.getByTestId("race-true-wind-direction");
  const windSpeed = compact.getByTestId("race-true-wind-speed");
  await expect(direction).toHaveText(/^\d{1,3}°$/);
  await expect(windSpeed).toHaveText(/^\d+\.\d уз$/);
  const bearing = Number.parseFloat((await direction.textContent())!);
  const knots = Number.parseFloat((await windSpeed.textContent())!);
  expect(Number.isFinite(bearing)).toBe(true);
  expect(bearing).toBeGreaterThanOrEqual(0); expect(bearing).toBeLessThanOrEqual(360);
  expect(Number.isFinite(knots)).toBe(true); expect(knots).toBeGreaterThan(0);

  const helm = cockpit.getByRole("slider", { name: "Руль", exact: true });
  await expect(helm).toBeVisible();
  await expect(cockpit.getByRole("slider")).toHaveCount(1); // Simple still owns its auto trim.
  const clock = cockpit.getByText(/^\d+:\d\d\.\d$/);
  await expect(clock).not.toHaveText("0:00.0", { timeout: 15_000 });
  const beforeScene = await scene.boundingBox();
  expect(beforeScene).not.toBeNull();

  await cockpit.getByRole("button", { name: "Карта трассы", exact: true }).click();
  const map = cockpit.getByTestId("race-overview-map");
  await expect(map.getByRole("img", { name: "Карта трассы", exact: true })).toBeVisible();
  const course = makeStandardCourse();
  await expect(map.locator("[data-map-mark]")).toHaveCount(course.marks.length);
  for (const type of ["start", "windward", "finish"]) {
    await expect(map.locator(`[data-map-mark="${type}"]`)).toHaveCount(course.marks.filter(mark => mark.type === type).length);
  }
  await expect(map.locator("[data-map-line]")).toHaveCount(1);
  await expect(map.locator('[data-map-line="start-finish"] title')).toHaveText("Старт / Финиш");
  await expect(map.locator('[data-map-boat="player"]')).toHaveCount(1);
  await expect(map.locator('[data-map-boat="rival"]')).toHaveCount(DIFFICULTY_CONFIG.easy.opponents);
  const dock = cockpit.locator("aside");
  await dock.getByRole("heading", { name: "Флот", exact: true }).scrollIntoViewIfNeeded();
  await expect(dock.getByRole("heading", { name: "Флот", exact: true })).toBeVisible();
  const fleet = dock.getByRole("list");
  await expect(fleet.getByRole("listitem")).toHaveCount(DIFFICULTY_CONFIG.easy.opponents + 1);
  await fleet.scrollIntoViewIfNeeded();
  await expect(fleet.getByText("Ты", { exact: true })).toBeVisible();
  const mapScene = await scene.boundingBox();
  const dockBox = await dock.boundingBox();
  expect(mapScene).not.toBeNull(); expect(dockBox).not.toBeNull();
  expect(mapScene!.height).toBeGreaterThanOrEqual(100);
  expect(dockBox!.y).toBeGreaterThanOrEqual(mapScene!.y + mapScene!.height - 1);
  expect(mapScene!.height).toBeCloseTo(beforeScene!.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(async () => (await visualJournal(page)).mapOpened).toBe(true);
  const mapClock = seconds(await clock.textContent());
  expect(Number.isFinite(mapClock)).toBe(true);
  // After confirming its real journal entry, keep Map open while a full second
  // advances. This proves it does not pause the race, without a fixed sleep.
  await expect.poll(async () => seconds(await clock.textContent()), { timeout: 15_000 }).toBeGreaterThan(mapClock + 1);
  await expect(startup).toHaveAttribute("data-scene-startup", "ready");

  await cockpit.getByRole("button", { name: "Настройки", exact: true }).click();
  const windChoices = cockpit.getByRole("radiogroup", { name: "Отображение ветра", exact: true });
  await expect(windChoices.getByRole("radio")).toHaveCount(4);
  for (const [name, compassVisible] of [["Компас", true], ["Стрелки ветра", false], ["Оба вида", true], ["Без подсказки", false]] as const) {
    const choice = windChoices.getByRole("radio", { name, exact: true });
    await choice.click();
    await expect(choice).toBeChecked();
    await expect(windChoices.getByRole("radio", { checked: true })).toHaveCount(1);
    await expect(compact.getByTestId("race-wind-compass")).toHaveCount(compassVisible ? 1 : 0);
    if (compassVisible) await expect(compact.getByTestId("race-wind-compass")).toBeVisible();
    // The real scene remains submitted in arrows/off as well; actual 3D arrow
    // geometry/flow direction is covered by shared unit and native visual QA.
    await expect(canvas).toBeVisible();
    await expect(startup).toHaveAttribute("data-scene-startup", "ready");
    await expect(direction).toHaveText(/^\d{1,3}°$/);
    await expect(windSpeed).toHaveText(/^\d+\.\d уз$/);
  }
  await windChoices.getByRole("radio", { name: "Компас", exact: true }).click();
  await expect(compact.getByTestId("race-wind-compass")).toBeVisible();
  await cockpit.getByRole("button", { name: "Руль", exact: true }).click();
  await expect(helm).toBeVisible();
  await expect(cockpit.getByRole("slider")).toHaveCount(1);
  const original = await helm.getAttribute("aria-valuenow");
  await helm.press("ArrowRight");
  await expect(helm).not.toHaveAttribute("aria-valuenow", original ?? "");
  await helm.press("ArrowLeft");
  await expect(startup).toHaveAttribute("data-scene-startup", "ready");

  await expect.poll(() => visualJournal(page)).toEqual({ status: "valid", mapOpened: true, mapClosed: true, windValues: ["arrows", "both", "compass", "off"] });
  await testInfo.attach("race-navigation-journal", { body: Buffer.from(JSON.stringify(await visualJournal(page))), contentType: "application/json" });
});
