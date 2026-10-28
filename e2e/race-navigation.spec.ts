import { expect, test, type BrowserContext, type Locator, type Page, type TestInfo } from "@playwright/test";
import { buildSync } from "esbuild";
import { makeStandardCourse } from "../src/lib/race-physics";
import { DIFFICULTY_CONFIG } from "../src/app/game/config";

type VisualJournal = {
  status: "valid" | "absent" | "invalid" | "unavailable";
  mapOpened: boolean;
  mapClosed: boolean;
  windValues: string[];
  miniMapValues: boolean[];
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
    const empty = { mapOpened: false, mapClosed: false, windValues: [], miniMapValues: [] };
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
        miniMapValues: [...new Set(events.filter(event => event.type === "control.preferences" && event.preference === "mini-map" && event.outcome === "accepted").map(event => event.value))].sort(),
      };
    } catch { return { status: "unavailable", ...empty }; }
  })()`);
}


// Return only a finite count from the canonical parser, never raw storage.
async function mapOpenCount(page: Page): Promise<number | null> {
  return page.evaluate<number | null>(`(() => {
    ${journalParserSource()}
    try {
      const raw = localStorage.getItem(RaceNavigationJournalParser.DIAGNOSTIC_STORAGE_KEY);
      if (raw === null) return 0;
      const snapshot = RaceNavigationJournalParser.parseDiagnosticPersistence(raw, Date.now());
      if (!snapshot) return null;
      return snapshot.entries.filter(({ event }) => event.surface === "race" && event.type === "control.change"
        && event.control === "race-map" && event.value === true && event.outcome === "accepted").length;
    } catch { return null; }
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

async function primaryWheelGeometry(cockpit: Locator, autopilotName?: string) {
  return cockpit.evaluate((root, autopilotName) => {
    const panel = root.querySelector("aside")?.lastElementChild;
    if (!(panel instanceof HTMLElement)) throw new Error("Primary control panel is not ready");
    const box = (element: Element) => {
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const panelBox = panel.getBoundingClientRect();
    const client = { left: panelBox.left + panel.clientLeft, top: panelBox.top + panel.clientTop,
      right: panelBox.left + panel.clientLeft + panel.clientWidth, bottom: panelBox.top + panel.clientTop + panel.clientHeight };
    const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const contains = (outer: typeof client, inner: ReturnType<typeof box>) => inner.width > 0 && inner.height > 0
      && inner.left >= outer.left - 1 && inner.top >= outer.top - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1;
    const wheels = Array.from(panel.querySelectorAll('[role="slider"]')).map(element => {
      const caption = element.lastElementChild;
      if (!(caption instanceof HTMLElement)) throw new Error("Wheel caption is not ready");
      const wheelBox = box(element), captionBox = box(caption);
      return { name: element.getAttribute("aria-label"), wheel: wheelBox, caption: captionBox,
        captionText: caption.textContent?.trim() ?? "",
        wheelInsidePanel: contains(client, wheelBox), captionInsidePanel: contains(client, captionBox),
        wheelInsideViewport: contains(viewport, wheelBox), captionInsideViewport: contains(viewport, captionBox) };
    });
    let pilot = null;
    if (autopilotName !== undefined) {
      const matches = Array.from(root.querySelectorAll("aside nav button")).filter(element => element.textContent?.trim() === autopilotName);
      if (matches.length !== 1) throw new Error("Heading hold action is not unique");
      const element = matches[0];
      const rect = element.getBoundingClientRect();
      const nav = element.closest("nav");
      const dock = element.closest("aside")!.getBoundingClientRect();
      pilot = { width: rect.width, height: rect.height, actions: nav?.children.length,
        inReservedActions: nav !== null && rect.left >= dock.left - 1 && rect.right <= dock.right + 1,
        insideViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1,
        pressed: element.getAttribute("aria-pressed") };
    }
    return { scrollTop: panel.scrollTop, count: wheels.length, wheels, pilot,
      allVisibleTogether: wheels.length > 0 && wheels.every(wheel => wheel.wheel.width >= 44 && wheel.wheel.height >= 44
        && wheel.captionText.length > 0 && wheel.wheelInsidePanel && wheel.captionInsidePanel
        && wheel.wheelInsideViewport && wheel.captionInsideViewport) };
  }, autopilotName);
}

/** Private CI evidence contains geometry and fixed classifications only. Never
 * collect DOM text, arbitrary attributes, storage, errors or user content. */
async function cockpitProbe(page: Page) {
  return page.evaluate(() => {
    const box = (element: Element | null) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const cockpit = document.querySelector('[data-testid="race-cockpit"]');
    const dock = cockpit?.querySelector("aside") ?? null;
    const panel = dock?.lastElementChild;
    const nav = dock?.querySelector("nav");
    const classify = (element: Element | null) => {
      if (!element) return "none";
      if (element.closest('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')) return "dialog";
      if (element.closest("details")) return "diagnostics";
      if (element.closest('[data-testid="race-3d"]')) return "scene";
      if (nav?.contains(element)) return "actions";
      if (panel?.contains(element)) return "panel";
      if (dock?.contains(element)) return "dock";
      if (element.closest("nav[data-product-navigation]")) return "site-navigation";
      return "other";
    };
    const hit = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const top = document.elementFromPoint(x, y);
      const zIndex = top ? Number.parseInt(getComputedStyle(top).zIndex, 10) : NaN;
      return { centreReceivesPointer: top !== null && element.contains(top), topRegion: classify(top),
        pointerDisabled: getComputedStyle(element).pointerEvents === "none", topZIndex: Number.isFinite(zIndex) ? zIndex : null,
        stack: document.elementsFromPoint(x, y).slice(0, 4).map(classify) };
    };
    const scroll = (element: Element | null | undefined) => element instanceof HTMLElement
      ? { top: element.scrollTop, height: element.scrollHeight, clientHeight: element.clientHeight } : null;
    const summary = panel?.querySelector("details > summary");
    const preview = document.querySelector("svg:has(#cpWater)");
    return { viewport: { width: innerWidth, height: innerHeight }, visibility: document.visibilityState,
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, top: scrollY },
      cockpit: box(cockpit), scene: box(cockpit?.querySelector('[data-testid="race-3d"]') ?? null), dock: box(dock),
      panel: box(panel ?? null), panelScroll: scroll(panel), notice: box(dock?.querySelector('[role="status"]') ?? null),
      noticeScroll: scroll(dock?.querySelector('[role="status"]')), activeRegion: classify(document.activeElement),
      actions: Array.from(nav?.querySelectorAll("button") ?? []).slice(0, 5).map((element, index) => ({
        index, box: box(element), pressed: element.getAttribute("aria-pressed") === "true", ...hit(element),
      })),
      diagnostics: summary ? { box: box(summary), open: summary.closest("details")?.open === true, ...hit(summary) } : null,
      wheels: Array.from(panel?.querySelectorAll('[role="slider"]') ?? []).slice(0, 3).map((element, index) => ({
        index, kind: element.getAttribute("data-testid") === "wheel-helm" ? "helm"
          : element.getAttribute("data-testid") === "wheel-main" ? "main" : element.getAttribute("data-testid") === "wheel-jib" ? "jib" : "other",
        wheel: box(element), caption: box(element.lastElementChild), captionLength: element.lastElementChild?.textContent?.trim().length ?? 0,
      })),
      preview: preview ? { box: box(preview), labels: Array.from(preview.querySelectorAll("text")).slice(0, 5)
        .map(element => ({ box: box(element), length: element.textContent?.trim().length ?? 0 })) } : null,
      startup: Array.from(cockpit?.querySelectorAll("[data-scene-startup]") ?? []).slice(0, 2).map(element =>
        element.getAttribute("data-scene-startup") === "ready" ? "ready" : "loading"),
    };
  });
}

function cockpitEvidence(page: Page, testInfo: TestInfo, name: string) {
  const epoch = Date.now();
  const steps: { name: string; atMs: number; durationMs: number; viewport: ReturnType<Page["viewportSize"]>; status: "running" | "passed" | "failed" }[] = [];
  const snapshots: unknown[] = [];
  let inFlight: Promise<{ status: "captured"; geometry: Awaited<ReturnType<typeof cockpitProbe>> } | { status: "unavailable" }> | undefined;
  const remember = (stage: string, observation: object) => {
    // A small ring keeps the last failure context even after all viewports.
    if (snapshots.length === 24) snapshots.shift();
    snapshots.push({ stage, atMs: Date.now() - epoch, ...observation });
  };
  const observe = async (stage: string) => {
    // A timed-out observation can still be waiting on the renderer. Do not
    // queue another read or present its eventual result as a fresh stage.
    if (inFlight) {
      remember(stage, { status: "probe-skipped-inflight" });
      return;
    }
    const pending = cockpitProbe(page).then(geometry => ({ status: "captured" as const, geometry }))
      .catch(() => ({ status: "unavailable" as const }));
    inFlight = pending;
    void pending.then(() => { if (inFlight === pending) inFlight = undefined; });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const observation = await Promise.race([
      pending,
      new Promise<{ status: "probe-timeout" }>(resolve => { timeout = setTimeout(() => resolve({ status: "probe-timeout" }), 500); }),
    ]);
    if (timeout) clearTimeout(timeout);
    remember(stage, observation);
  };
  return {
    observe,
    async step<T>(name: string, run: () => Promise<T>): Promise<T> {
      const start = Date.now();
      const entry = { name, atMs: start - epoch, durationMs: 0, viewport: page.viewportSize(), status: "running" as "running" | "passed" | "failed" };
      if (steps.length === 192) steps.shift();
      steps.push(entry);
      try { const result = await run(); entry.status = "passed"; return result; }
      catch (error) { entry.status = "failed"; throw error; }
      finally { entry.durationMs = Date.now() - start; }
    },
    async finish() {
      await observe("finally");
      await testInfo.attach(name, { contentType: "application/json", body: JSON.stringify({
        elapsedMs: Date.now() - epoch, status: testInfo.status, steps, snapshots,
      }) });
    },
  };
}

type RaceEntry = { mode?: "simple" | "pro"; embed?: boolean; viewport?: { width: number; height: number } };

async function startRace(page: Page, context: BrowserContext, entry: RaceEntry = {}) {
  const mode = entry.mode ?? "simple";
  const modeLabel = mode === "pro" ? "Pro" : "Обычный";
  // Each journey uses its own real scene, ordinary input and unchanged deadlines.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("regatta.lang.v1", "ru");
      localStorage.setItem("regatta.onboarding.v1", "1");
      localStorage.setItem("regatta.v3.tour.v1", "1");
      localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels", helmReturnToCenter: false }));
    } catch { /* Ordinary browser storage may be unavailable. */ }
  });
  await page.setViewportSize(entry.viewport ?? { width: 390, height: 844 });
  await page.goto(entry.embed === false ? "/game?lang=ru" : "/game?embed=1");
  await expect(page.getByRole("heading", { name: "Гонка", exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /^Первая гонка/ }).click();
  await page.getByRole("radio", { name: modeLabel, exact: true }).click();
  await expect(page.getByRole("radio", { name: modeLabel, exact: true })).toBeChecked();
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
  await expect(cockpit.getByRole("slider")).toHaveCount(mode === "pro" ? 3 : 1); // Simple still owns its auto trim.
  const clock = cockpit.getByText(/^\d+:\d\d\.\d$/);
  await expect(clock).not.toHaveText("0:00.0", { timeout: 15_000 });
  return { scene, cockpit, canvas, startup, compact, direction, windSpeed, helm, clock };
}

async function startSimpleRace(page: Page, context: BrowserContext) {
  return startRace(page, context);
}

test("corner map and wind stay visible through dock tabs and five viewport sizes", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const { scene, cockpit } = await startSimpleRace(page, context);
  const mini = cockpit.getByTestId("race-mini-map-button");
  const wind = cockpit.getByTestId("race-corner-wind");
  const samples = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 390, height: 720 },
    { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await expect(mini).toBeVisible();
    await expect(wind.getByTestId("race-wind-compass")).toBeVisible();
    const geometry = await scene.evaluate(element => {
      const box = (e: Element) => { const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
      const map = element.querySelector('[data-testid="race-mini-map-button"]')!;
      const wind = element.querySelector('[data-testid="race-corner-wind"]')!;
      return { scene: box(element), map: box(map), wind: box(wind) };
    });
    for (const instrument of [geometry.map, geometry.wind]) {
      expect(instrument.left).toBeGreaterThanOrEqual(geometry.scene.left - 1);
      expect(instrument.top).toBeGreaterThanOrEqual(geometry.scene.top - 1);
      expect(instrument.right).toBeLessThanOrEqual(geometry.scene.right + 1);
      expect(instrument.bottom).toBeLessThanOrEqual(geometry.scene.bottom + 1);
    }
    expect(geometry.map.width).toBeGreaterThanOrEqual(44);
    expect(geometry.map.height).toBeGreaterThanOrEqual(44);
    expect(geometry.map.width).toBeLessThanOrEqual(geometry.scene.width * .32 + 1);
    expect(geometry.map.height).toBeLessThanOrEqual(geometry.scene.height * .4 + 1);
    expect(geometry.map.left - geometry.wind.right).toBeGreaterThanOrEqual(geometry.scene.width * .2);
    samples.push({ viewport, ...geometry });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mini.click();
  await expect(cockpit.getByTestId("race-overview-map")).toBeVisible();
  await expect(mini).toBeVisible();
  await cockpit.getByRole("button", { name: "Паруса", exact: true }).click();
  await expect(mini).toBeVisible();
  await expect(wind).toBeVisible();
  await cockpit.getByRole("button", { name: "Руль", exact: true }).click();
  await expect(mini).toBeVisible();
  await testInfo.attach("corner-instrument-layout", { contentType: "application/json", body: JSON.stringify(samples) });
});

test("corner mini-map visibility survives a new document and records actual changes", async ({ page, context }) => {
  test.setTimeout(120_000);
  const { cockpit } = await startSimpleRace(page, context);
  const mini = cockpit.getByTestId("race-mini-map-button");
  const wind = cockpit.getByTestId("race-corner-wind");
  await cockpit.getByRole("button", { name: "Настройки", exact: true }).click();
  await cockpit.getByRole("switch", { name: "Мини-карта в углу", exact: true }).uncheck();
  await expect(mini).toHaveCount(0);
  await expect(wind).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("regatta.race.assists.v1") ?? "{}").miniMap)).toBe(false);
  await expect.poll(async () => (await visualJournal(page)).miniMapValues).toEqual([false]);

  // An actual new document must still hide it, rather than resetting the choice.
  const reopened = await startSimpleRace(page, context);
  await expect(reopened.cockpit.getByTestId("race-mini-map-button")).toHaveCount(0);
  await expect(reopened.cockpit.getByTestId("race-corner-wind")).toBeVisible();
  await reopened.cockpit.getByRole("button", { name: "Настройки", exact: true }).click();
  await reopened.cockpit.getByRole("switch", { name: "Мини-карта в углу", exact: true }).check();
  await expect(reopened.cockpit.getByTestId("race-mini-map-button")).toBeVisible();
  await reopened.cockpit.getByRole("button", { name: "Руль", exact: true }).click();
  await expect(reopened.helm).toBeVisible();
  await expect.poll(async () => (await visualJournal(page)).miniMapValues).toEqual([false, true]);
});

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
  await expect.poll(() => visualJournal(page)).toEqual({ status: "valid", mapOpened: true, mapClosed: true, windValues: [], miniMapValues: [] });
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
  for (const [name, compassVisible] of [["Прибор ветра", true], ["Стрелки ветра", false], ["Оба вида", true], ["Без подсказки", false]] as const) {
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
  await windChoices.getByRole("radio", { name: "Прибор ветра", exact: true }).click();
  await expect(compact.getByTestId("race-wind-compass")).toBeVisible();
  await cockpit.getByRole("button", { name: "Руль", exact: true }).click();
  await expect(helm).toBeVisible();
  await expect(cockpit.getByRole("slider")).toHaveCount(1);
  const original = await helm.getAttribute("aria-valuenow");
  await helm.press("ArrowRight");
  await expect(helm).not.toHaveAttribute("aria-valuenow", original ?? "");
  await helm.press("ArrowLeft");
  await expect(startup).toHaveAttribute("data-scene-startup", "ready");

  // Turn through the actual helm, then compare the bow-up dial with the
  // independently visible boat heading and retained absolute TWD. Wind shifts
  // remain real; we do not freeze them or substitute a synthetic boat pose.
  const windFrame = () => cockpit.evaluate(root => {
    const instrument = root.querySelector('[data-testid="race-wind-instrument"][data-compact]')!;
    const numeric = (testId: string) => Number.parseFloat(instrument.querySelector(`[data-testid="${testId}"]`)?.textContent ?? "");
    const course = root.querySelector('[data-testid="race-route-heading"] > span > span')?.textContent?.match(/(\d+)°/);
    const arrow = instrument.querySelector('[data-testid="race-relative-wind-arrow"]')?.getAttribute("transform")?.match(/^rotate\(([-\d.]+) 50 50\)$/);
    return { heading: Number(course?.[1]), absolute: numeric("race-true-wind-direction"), twa: numeric("race-true-wind-angle"),
      relative: Number(arrow?.[1]), absoluteLabelled: instrument.querySelector('[data-testid="race-true-wind-direction"]')?.parentElement?.textContent?.includes("TWD") === true };
  });
  const delta = (from: number, to: number) => ((to - from + 540) % 360) - 180;
  const beforeWind = await windFrame();
  expect([beforeWind.heading, beforeWind.absolute, beforeWind.twa, beforeWind.relative].every(Number.isFinite)).toBe(true);
  expect(beforeWind.absoluteLabelled).toBe(true);
  await helm.press("End");
  await expect(helm).toHaveAttribute("aria-valuenow", "35");
  await expect.poll(async () => Math.abs(delta(beforeWind.heading, (await windFrame()).heading))).toBeGreaterThanOrEqual(20);
  const afterWind = await windFrame();
  expect(afterWind.absoluteLabelled).toBe(true);
  expect(afterWind.absolute).toBeGreaterThanOrEqual(0);
  expect(afterWind.absolute).toBeLessThanOrEqual(360);
  expect(Math.abs(delta(beforeWind.relative, afterWind.relative))).toBeGreaterThan(5);
  expect(Math.abs(delta(beforeWind.absolute, afterWind.absolute))).toBeLessThan(Math.abs(delta(beforeWind.heading, afterWind.heading)));
  expect(Math.abs(delta(afterWind.relative, delta(afterWind.heading, afterWind.absolute)))).toBeLessThanOrEqual(1.1);
  expect(afterWind.twa).toBe(Math.round(Math.abs(afterWind.relative)));
  await expect(startup).toHaveAttribute("data-scene-startup", "ready");
  await testInfo.attach("race-wind-bow-relative", { body: Buffer.from(JSON.stringify({ before: beforeWind, after: afterWind })), contentType: "application/json" });

  await expect.poll(() => visualJournal(page)).toEqual({ status: "valid", mapOpened: true, mapClosed: true, windValues: ["arrows", "both", "compass", "off"], miniMapValues: [] });
  await testInfo.attach("race-navigation-journal", { body: Buffer.from(JSON.stringify(await visualJournal(page))), contentType: "application/json" });
});


for (const mode of ["simple", "pro"] as const) {
  test(`${mode} cockpit gives the boat room and keeps actual inputs and utilities reachable`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    const evidence = cockpitEvidence(page, testInfo, `race-${mode}-journey-timing`);
    const samples: unknown[] = [];
    const sample = async (entry: Awaited<ReturnType<typeof startRace>>, label: string, minimumSceneHeight: number) => {
      const step = <T,>(name: string, run: () => Promise<T>) => evidence.step(`${label}:${name}`, run);
      const { cockpit, scene, helm, startup } = entry;
      await evidence.observe(`${label}:begin`);
      await step("scene-ready", () => expect(startup).toHaveAttribute("data-scene-startup", "ready"));
      const mini = cockpit.getByTestId("race-mini-map-button");
      const wind = cockpit.getByTestId("race-corner-wind");
      await expect(mini).toBeVisible();
      await expect(wind).toBeVisible();
      // These measurements share one unchanged DOM state. Keep input and
      // visibility assertions outside the read-only geometry snapshot.
      const layout = await cockpit.evaluate(root => {
        const box = (selector: string) => {
          const element = root.querySelector(selector);
          if (!element) throw new Error("Cockpit geometry is not ready");
          const { x, y, width, height } = element.getBoundingClientRect();
          if (width <= 0 || height <= 0) throw new Error("Cockpit geometry has no visible area");
          return { x, y, width, height };
        };
        return { water: box('[data-testid="race-3d"]'), dock: box("aside"),
          instruments: [box('[data-testid="race-mini-map-button"]'), box('[data-testid="race-corner-wind"]')] };
      });
      const water = layout.water;
      expect(water.height).toBeGreaterThanOrEqual(minimumSceneHeight);
      const dock = cockpit.locator("aside");
      const dockBox = layout.dock;
      const viewport = page.viewportSize()!;
      if (viewport.width < viewport.height) {
        expect(dockBox.y).toBeGreaterThanOrEqual(water.y + water.height - 1);
      } else {
        expect(dockBox.x).toBeGreaterThanOrEqual(water.x + water.width - 1);
      }
      expect(dockBox.y + dockBox.height).toBeLessThanOrEqual(viewport.height + 1);
      for (const box of layout.instruments) {
        expect(box.x).toBeGreaterThanOrEqual(water.x - 1);
        expect(box.y).toBeGreaterThanOrEqual(water.y - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(water.x + water.width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(water.y + water.height + 1);
      }
      const notice = dock.getByRole("status");
      await step("notice-focus", () => notice.focus());
      await expect(notice).toBeFocused();
      const advice = await notice.evaluate(element => ({ height: element.clientHeight, contentHeight: element.scrollHeight, text: element.textContent }));
      expect(advice.text?.trim().length).toBeGreaterThan(0);
      if (advice.contentHeight > advice.height + 1) {
        await step("notice-scroll", () => notice.press("End"));
        await expect.poll(() => notice.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      }
      await step("helm-open", () => cockpit.getByRole("button", { name: "Руль", exact: true }).click());
      const names = mode === "pro" ? ["Руль", "Гика-шкот", "Стаксель-шкот"] : ["Руль"];
      await expect(cockpit.getByRole("slider")).toHaveCount(names.length);
      // A sailor must see the entire primary set at once. Inspect the actual
      // wheel and its separate caption box before focus can scroll a control
      // into view; individually scrolling to each wheel hid this regression.
      await evidence.observe(`${label}:before-primary-check`);
      let validatedPrimary: Awaited<ReturnType<typeof primaryWheelGeometry>> | undefined;
      await step("primary-visible", () => expect.poll(async () => {
        validatedPrimary = await primaryWheelGeometry(cockpit, "Держать курс");
        return validatedPrimary;
      }).toMatchObject({
        scrollTop: 0, count: names.length, allVisibleTogether: true,
      }));
      if (!validatedPrimary) throw new Error("Validated primary geometry is unavailable");
      const primary = validatedPrimary;
      const autopilot = cockpit.getByRole("button", { name: "Держать курс", exact: true });
      const pilot = primary.pilot;
      if (!pilot) throw new Error("Heading hold geometry is unavailable");
      expect(pilot).toMatchObject({ actions: 5, inReservedActions: true, insideViewport: true });
      expect(pilot.width).toBeGreaterThanOrEqual(44);
      expect(pilot.height).toBeGreaterThanOrEqual(44);
      const heldHeading = pilot.pressed;
      expect(["true", "false"]).toContain(heldHeading);
      await step("heading-hold-on", () => autopilot.click());
      await expect(autopilot).toHaveAttribute("aria-pressed", heldHeading === "true" ? "false" : "true");
      await step("heading-hold-restore", () => autopilot.click());
      await expect(autopilot).toHaveAttribute("aria-pressed", heldHeading!);
      const inputs = [];
      for (const [index, name] of names.entries()) {
        const input = cockpit.getByRole("slider", { name, exact: true });
        // Read a fresh baseline for this wheel after all preceding actions.
        const baseline = await input.evaluate(element => {
          const { x, y, width, height } = element.getBoundingClientRect();
          if (width <= 0 || height <= 0) throw new Error("Wheel geometry has no visible area");
          return { box: { x, y, width, height }, value: element.getAttribute("aria-valuenow") };
        });
        const box = baseline.box;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        const before = baseline.value;
        await step(`wheel-${index}-input`, () => input.press(name === "Руль" ? "ArrowRight" : "ArrowDown"));
        await expect(input).not.toHaveAttribute("aria-valuenow", before ?? "");
        const visible = await input.evaluate(element => {
          const input = element.getBoundingClientRect();
          const panel = element.closest("aside")!.lastElementChild!.getBoundingClientRect();
          return { width: Math.min(input.right, panel.right) - Math.max(input.left, panel.left),
            height: Math.min(input.bottom, panel.bottom) - Math.max(input.top, panel.top) };
        });
        expect(visible.width).toBeGreaterThanOrEqual(44);
        expect(visible.height).toBeGreaterThanOrEqual(44);
        await step(`wheel-${index}-visible`, () => expect.poll(() => primaryWheelGeometry(cockpit)).toMatchObject({
          scrollTop: 0, count: names.length, allVisibleTogether: true,
        }));
        inputs.push({ name, box, visible });
      }
      const previousOpens = await mapOpenCount(page);
      expect(previousOpens).not.toBeNull();
      await step("map-open", () => cockpit.getByRole("button", { name: "Карта трассы", exact: true }).click());
      const overview = cockpit.getByTestId("race-overview-map");
      await step("map-visible", () => expect.poll(() => mapGeometry(overview)).toMatchObject({
        svgInsidePanel: true, captionInsidePanel: true, svgInsideViewport: true, captionInsideViewport: true,
      }));
      await expect.poll(() => mapOpenCount(page)).toBe(previousOpens! + 1);
      // Fleet intentionally scrolls this very same Map panel. Tapping its
      // persistent corner shortcut again must restore the complete overview,
      // without pretending that an already-open Map was opened a second time.
      await step("map-fleet-scroll", () => dock.getByRole("heading", { name: "Флот", exact: true }).scrollIntoViewIfNeeded());
      await overview.evaluate(figure => {
        const panel = figure.parentElement!.parentElement!;
        panel.scrollTop = panel.scrollHeight;
      });
      await expect.poll(async () => (await mapGeometry(overview)).scrollTop).toBeGreaterThan(0);
      await step("map-retap", () => mini.click());
      await step("map-restored", () => expect.poll(() => mapGeometry(overview)).toMatchObject({
        scrollTop: 0, svgInsidePanel: true, captionInsidePanel: true, svgInsideViewport: true, captionInsideViewport: true,
      }));
      expect(await mapOpenCount(page)).toBe(previousOpens! + 1);
      await step("settings-open", () => cockpit.getByRole("button", { name: "Настройки", exact: true }).click());
      const diagnostics = dock.locator("details > summary");
      await step("diagnostics-reveal", () => diagnostics.scrollIntoViewIfNeeded());
      await expect(diagnostics).toHaveText("Диагностика");
      const utility = (await diagnostics.boundingBox())!;
      expect(utility.width).toBeGreaterThanOrEqual(44);
      expect(utility.height).toBeGreaterThanOrEqual(44);
      expect(utility.y + utility.height).toBeLessThanOrEqual(viewport.height + 1);
      await step("diagnostics-open", () => diagnostics.click());
      await step("diagnostics-open-confirmed", () => expect(diagnostics.locator("..")).toHaveAttribute("open", ""));
      await evidence.observe(`${label}:before-diagnostics-close`);
      await step("diagnostics-close", () => diagnostics.click());
      await evidence.observe(`${label}:before-helm-return`);
      await step("helm-return", () => cockpit.getByRole("button", { name: "Руль", exact: true }).click());
      await step("helm-restored", () => expect(helm).toBeVisible());
      const restored = await scene.evaluate(element => {
        const { width, height } = element.getBoundingClientRect();
        if (width <= 0 || height <= 0) throw new Error("Restored scene has no visible area");
        return { height, documentFits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1 };
      });
      expect(restored.height).toBeCloseTo(water.height, 0);
      expect(restored.documentFits).toBe(true);
      samples.push({ label, viewport, scene: water, dock: dockBox, notice: advice, primary, autopilot: pilot, inputs, diagnostics: utility });
    };

    try {
      // The owner's actual web audit gave this canvas only196px, below a350px dock.
      const web = await evidence.step("web:start", () => startRace(page, context, { mode, embed: false, viewport: { width: 569, height: 750 } }));
      await evidence.step("web:viewport-journey", () => sample(web, "web", 240));
      const embedded = await evidence.step("embedded:start", () => startRace(page, context, { mode }));
      for (const [label, viewport, minimum] of [
        ["portrait", { width: 390, height: 844 }, 300],
        ["short", { width: 320, height: 568 }, 160],
        ["landscape", { width: 844, height: 390 }, 180],
      ] as const) {
        await evidence.step(`${label}:resize`, () => page.setViewportSize(viewport));
        await evidence.step(`${label}:viewport-journey`, () => sample(embedded, label, minimum));
      }
      await evidence.step("menu-return", () => embedded.cockpit.getByRole("button", { name: "Меню", exact: true }).click());
      const menu = page.getByRole("heading", { name: "Гонка", exact: true });
      await expect(menu).toBeFocused();
      expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    } finally {
      await testInfo.attach(`race-${mode}-scene-controls`, { contentType: "application/json", body: JSON.stringify(samples) });
      await evidence.finish();
    }
  });
}

// This bounded matrix checks long-label geometry, not the whole translation.
// Entry expressions follow the actual localized GameMenu/GameClient actions.
const localizedProEntries = [
  { lang: "en", first: /^First race/, start: /^Start your first race →$/, ready: /^Ready - starting in/,
    actions: ["Helm", "Sails", "Course map", "Settings", "Hold heading"], wheels: ["Helm", "Mainsheet", "Jib sheet"] },
  { lang: "pl", first: /^Pierwszy wyścig/, start: /^Zacznij pierwszy wyścig →$/, ready: /^Gotowy - start za/,
    actions: ["Ster", "Żagle", "Mapa trasy", "Ustawienia", "Trzymaj kurs"], wheels: ["Ster", "Szot grota", "Szot foka"] },
  { lang: "es", first: /^Primera regata/, start: /^Empezar la primera regata →$/, ready: /^Listo - salida en/,
    actions: ["Timón", "Velas", "Mapa del recorrido", "Ajustes", "Mantener rumbo"], wheels: ["Timón", "Escota de mayor", "Escota de foque"] },
  { lang: "fr", first: /^Première course/, start: /^Lancer la première course →$/, ready: /^Prêt - départ dans/,
    actions: ["Barre", "Voiles", "Carte du parcours", "Réglages", "Garder le cap"], wheels: ["Barre", "Écoute de grand-voile", "Écoute de foc"] },
  { lang: "de", first: /^Erstes Rennen\./, start: /^Erstes Rennen starten →$/, ready: /^Bereit - Start in/,
    actions: ["Steuer", "Segel", "Kurskarte", "Einstellungen", "Kurs halten"], wheels: ["Steuer", "Großschot", "Fockschot"] },
  { lang: "it", first: /^Prima regata/, start: /^Inizia la prima regata →$/, ready: /^Pronto - partenza tra/,
    actions: ["Timone", "Vele", "Mappa del percorso", "Impostazioni", "Mantieni rotta"], wheels: ["Timone", "Scotta della randa", "Scotta del fiocco"] },
] as const;

for (const localized of localizedProEntries) {
  test(`${localized.lang} short Pro cockpit keeps localized primary controls visible together`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    const evidence = cockpitEvidence(page, testInfo, `race-${localized.lang}-short-timing`);
    try {
      await evidence.step("storage-init", () => context.addInitScript(() => {
        localStorage.setItem("regatta.onboarding.v1", "1");
        localStorage.setItem("regatta.v3.tour.v1", "1");
        localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels", helmReturnToCenter: false }));
      }));
      await evidence.step("short:resize", () => page.setViewportSize({ width: 320, height: 568 }));
      await evidence.step("menu-load", () => page.goto(`/game?embed=1&lang=${localized.lang}`));
      await evidence.step("menu-ready", () => expect(page.getByRole("heading", { level: 1 })).toHaveText(/\S/, { timeout: 15_000 }));
      await evidence.step("preset-select", () => page.getByRole("button", { name: localized.first }).click());
      const pro = page.getByRole("radio", { name: "Pro", exact: true });
      await evidence.step("pro-select", () => pro.click());
      await expect(pro).toBeChecked();
      await evidence.step("briefing-open", () => page.getByRole("button", { name: localized.start }).click());
      await expect(page.getByRole("radio", { name: "Pro", exact: true })).toBeChecked();
      const preview = page.locator("svg:has(#cpWater)");
      await expect(preview.locator("text")).toHaveCount(5);
      const previewGeometry = () => preview.evaluate(svg => {
        const box = (element: Element) => {
          const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        };
        const bounds = box(svg);
        const labels = Array.from(svg.querySelectorAll("text")).map(text => {
          const rect = box(text);
          return { text: text.textContent?.trim() ?? "", ...rect,
            insideSvg: rect.width > 0 && rect.height > 0 && rect.left >= bounds.left - 1 && rect.top >= bounds.top - 1
              && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1 };
        });
        // The briefing itself scrolls. Each complete label must fit its SVG
        // regardless of where that SVG currently sits relative to the viewport.
        return { bounds, labels, allInsideSvg: bounds.width > 0 && bounds.height > 0
          && labels.length === 5 && labels.every(label => label.text.length > 0 && label.insideSvg) };
      });
      await evidence.observe("briefing:before-chart-check");
      await evidence.step("briefing-chart-visible", () => expect.poll(async () => (await previewGeometry()).allInsideSvg).toBe(true));
      const briefingPreview = await previewGeometry();
      await evidence.step("race-start", () => page.getByRole("button", { name: localized.ready }).click());

      const scene = page.getByTestId("race-3d");
      const cockpit = page.getByTestId("race-cockpit");
      const deadline = Date.now() + 25_000;
      const remaining = () => Math.max(1, deadline - Date.now());
      await evidence.step("scene-visible", () => expect(scene).toBeVisible({ timeout: remaining() }));
      await evidence.step("canvas-visible", () => expect(scene.locator('[data-scene="next"] canvas')).toBeVisible({ timeout: remaining() }));
      await evidence.step("first-frame", () => expect(scene.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() }));
      const clock = cockpit.getByText(/^\d+:\d\d\.\d$/);
      const before = seconds(await clock.textContent());
      expect(Number.isFinite(before)).toBe(true);
      await evidence.step("clock-advances", () => expect.poll(async () => seconds(await clock.textContent()), { timeout: 15_000 }).toBeGreaterThan(before));

      // Read every wheel/caption at once before keyboard or pointer focus can
      // expand a wheel or make the panel scroll to conceal a clipped caption.
      await evidence.observe("short:before-primary-check");
      await evidence.step("primary-visible", () => expect.poll(() => primaryWheelGeometry(cockpit)).toMatchObject({ scrollTop: 0, count: 3, allVisibleTogether: true }));
      const primary = await primaryWheelGeometry(cockpit);
      for (const name of localized.wheels) {
        await expect(cockpit.getByRole("slider", { name, exact: true })).toHaveAccessibleName(name);
        expect(primary.wheels.find(wheel => wheel.name === name)?.captionText).toContain(name);
      }
      const reserved = cockpit.locator("aside > nav");
      await expect(reserved.getByRole("button")).toHaveCount(5);
      const actions = [];
      for (const name of localized.actions) {
        const action = reserved.getByRole("button", { name, exact: true });
        await expect(action).toHaveAccessibleName(name);
        const geometry = await action.evaluate(element => {
          const box = element.getBoundingClientRect();
          const dock = element.closest("aside")!.getBoundingClientRect();
          return { width: box.width, height: box.height,
            insideDock: box.left >= dock.left - 1 && box.top >= dock.top - 1 && box.right <= dock.right + 1 && box.bottom <= dock.bottom + 1,
            insideViewport: box.left >= 0 && box.top >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1 };
        });
        expect(geometry.width).toBeGreaterThanOrEqual(44);
        expect(geometry.height).toBeGreaterThanOrEqual(44);
        expect(geometry).toMatchObject({ insideDock: true, insideViewport: true });
        actions.push({ name, ...geometry });
      }
      const water = (await scene.boundingBox())!;
      expect(water.height).toBeGreaterThanOrEqual(160);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await testInfo.attach(`race-${localized.lang}-short-primary`, { contentType: "application/json", body: JSON.stringify({ lang: localized.lang, viewport: page.viewportSize(), briefingPreview, scene: water, primary, actions }) });
    } finally {
      await evidence.finish();
    }
  });
}
