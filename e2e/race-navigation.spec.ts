import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { buildSync } from "esbuild";
import { makeStandardCourse } from "../src/lib/race-physics";
import { DIFFICULTY_CONFIG } from "../src/app/game/config";

type VisualJournal = {
  status: "valid" | "absent" | "invalid" | "unavailable";
  mapOpened: boolean;
  mapClosed: boolean;
  windValues: string[];
};

test("saved Pro briefing keeps its mode and wind after current preferences change", async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("regatta.lang.v1", "ru");
    localStorage.setItem("regatta.onboarding.v1", "1");
    localStorage.setItem("regatta.v3.tour.v1", "1");
    localStorage.setItem("regatta.race.mode.v1", "simple");
    localStorage.setItem("regatta.race-resume.v1", JSON.stringify({ v: 1, ts: Date.now(), phase: "racing",
      difficulty: "easy", windStrength: "light", missionId: null, mode: "pro", raceContext: null }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/game?embed=1&mode=simple");
  await expect(page.getByRole("heading", { name: "Гонка", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Повторить гонку с прежними настройками?", { exact: true })).toBeVisible();
  for (const name of ["Продолжить", "Закрыть"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByRole("button", { name: /Готов - старт/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Pro", exact: true })).toBeChecked();
  await expect(page.getByText("Лёгкий · слабый ветер", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("regatta.race-resume.v1") ?? "null");
    return saved ? { mode: saved.mode, wind: saved.windStrength, phase: saved.phase, nullContext: saved.raceContext === null } : null;
  })).toEqual({ mode: "pro", wind: "light", phase: "briefing", nullContext: true });
});

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

async function mapGeometry(map: Locator) {
  return map.evaluate(figure => {
    // The map wrapper belongs to the existing scrollable cockpit panel. Read
    // its actual client area, excluding borders and any scrollbar; never scroll
    // the map into view to conceal a clipped start/finish line or caption.
    const panel = figure.parentElement?.parentElement;
    const svg = figure.querySelector("svg");
    const caption = figure.querySelector("figcaption");
    if (!(panel instanceof HTMLElement) || !(svg instanceof SVGSVGElement) || !(caption instanceof HTMLElement)) throw new Error("Map panel geometry is not ready");
    const box = (element: Element) => {
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const panelBox = panel.getBoundingClientRect();
    const client = { left: panelBox.left + panel.clientLeft, top: panelBox.top + panel.clientTop,
      right: panelBox.left + panel.clientLeft + panel.clientWidth, bottom: panelBox.top + panel.clientTop + panel.clientHeight };
    const svgBox = box(svg), captionBox = box(caption);
    const contains = (outer: typeof client, inner: typeof svgBox) => inner.width > 0 && inner.height > 0 &&
      inner.left >= outer.left - 1 && inner.top >= outer.top - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1;
    const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    return { client, svg: svgBox, caption: captionBox, scrollTop: panel.scrollTop,
      svgInsidePanel: contains(client, svgBox), captionInsidePanel: contains(client, captionBox),
      svgInsideViewport: contains(viewport, svgBox), captionInsideViewport: contains(viewport, captionBox) };
  });
}

async function startSimpleRace(page: Page, context: BrowserContext) {
  // Each journey uses its own real scene, ordinary input and unchanged deadlines.
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
  return { scene, cockpit, canvas, startup, compact, direction, windSpeed, helm, clock };
}

test("Simple 3D keeps the complete live course and fleet in a running reserved Map", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const { scene, cockpit, helm, clock, startup } = await startSimpleRace(page, context);
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
  for (const [label, viewport] of [
    ["portrait", { width: 390, height: 844 }],
    ["short", { width: 320, height: 568 }],
    ["native-available", { width: 390, height: 720 }],
    ["landscape", { width: 844, height: 390 }],
    ["restored", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    await expect(cockpit.getByRole("button", { name: "Карта трассы", exact: true })).toHaveAttribute("aria-pressed", "true");
    // Check full containment before Fleet causes any intentional panel scroll.
    // Intersection alone passes when the SVG's start/finish is below the fold.
    let validatedGeometry: Awaited<ReturnType<typeof mapGeometry>> | undefined;
    await expect.poll(async () => {
      validatedGeometry = await mapGeometry(map);
      return validatedGeometry;
    }).toMatchObject({
      svgInsidePanel: true, captionInsidePanel: true, svgInsideViewport: true, captionInsideViewport: true,
    });
    if (!validatedGeometry) throw new Error("Validated Map geometry is unavailable");
    await testInfo.attach(`race-map-geometry-${label}-${viewport.width}x${viewport.height}`, {
      body: Buffer.from(JSON.stringify(validatedGeometry)), contentType: "application/json",
    });
  }
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

  await cockpit.getByRole("button", { name: "Руль", exact: true }).click();
  await expect(helm).toBeVisible();
  await expect(cockpit.getByRole("slider")).toHaveCount(1);
  await expect.poll(() => visualJournal(page)).toEqual({ status: "valid", mapOpened: true, mapClosed: true, windValues: [] });
  await testInfo.attach("race-map-journal", { body: Buffer.from(JSON.stringify(await visualJournal(page))), contentType: "application/json" });
});

test("Simple 3D keeps all wind choices and Helm input in the reserved cockpit", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const { cockpit, canvas, startup, compact, direction, windSpeed, helm, clock } = await startSimpleRace(page, context);
  // Exercise the ordinary Map-to-Settings transition in this fresh journey too.
  await cockpit.getByRole("button", { name: "Карта трассы", exact: true }).click();
  await expect(cockpit.getByTestId("race-overview-map").getByRole("img", { name: "Карта трассы", exact: true })).toBeVisible();
  await expect.poll(async () => (await visualJournal(page)).mapOpened).toBe(true);
  const mapClock = seconds(await clock.textContent());
  expect(Number.isFinite(mapClock)).toBe(true);
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
