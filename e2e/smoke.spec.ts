import { test, expect, type Page } from '@playwright/test';
import { copy as productCopy } from '../src/lib/product/copy';
import { menuDestinationCount } from '../src/lib/product/menu';
import { diagnosticTitle } from '../src/lib/diagnostic-title';
import { buildSync } from "esbuild";
import type { DiagnosticSnapshot } from "../src/lib/diagnostics";

// ============================================================================
// Smoke E2E - must pass on every deploy. Keep fast (<60 sec total).
// The target is BASE_URL (see playwright.config.ts): localhost before the
// deploy, prod after it.
// ============================================================================

const PROD_HOST = 'weektoregatta.com';
const isProd = (baseURL: string | undefined) => {
  try {
    return new URL(baseURL ?? '').hostname.endsWith(PROD_HOST);
  } catch {
    return false;
  }
};

async function expectDiagnosticUtility(page: Page, lang: keyof typeof diagnosticTitle) {
  const utility = page.locator('main a[href="/diagnostics"]');
  const title = diagnosticTitle[lang];
  expect(title).toBeTruthy();
  await expect(utility).toHaveCount(1);
  await expect(utility).toBeVisible();
  await expect(utility).toHaveAccessibleName(title!);
  await expect(utility).toHaveAttribute("href", "/diagnostics");
  const box = await utility.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
}

type ProObservation = {
  stage: "before-initial-clock" | "finally";
  captured: boolean;
  observedAtMs: number;
  performanceMs?: number;
  sceneStartup?: ("loading" | "ready" | "unknown")[];
  clock?: string | null;
  visibility?: "visible" | "hidden" | "unknown";
  diagnostics?: { status: "not-read" | "absent" | "valid" | "invalid" | "unavailable"; present?: boolean; snapshot?: DiagnosticSnapshot };
};

let proParserSource: string | undefined;
function proJournalParserSource() {
  // Validate inside the browser: raw invalid storage must not enter a retry trace.
  // The fixed pure module is scoped inside evaluate, without installing globals.
  return proParserSource ??= buildSync({
    stdin: { contents: 'export { parseDiagnosticPersistence, DIAGNOSTIC_STORAGE_KEY } from "./src/lib/diagnostics";', resolveDir: process.cwd(), loader: "ts" },
    bundle: true, write: false, platform: "browser", format: "iife", globalName: "ProJournalParser",
    target: "es2020", minify: true, tsconfigRaw: "{}",
  }).outputFiles[0].text;
}

function boundedProError(text: string) {
  let result = "", bytes = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character, "utf8");
    if (bytes + size > 4 * 1024) break;
    result += character; bytes += size;
  }
  return result;
}

async function observeProPage(page: Page, stage: ProObservation["stage"]): Promise<ProObservation> {
  try {
    return await page.evaluate<ProObservation>(`(() => {
      ${proJournalParserSource()}
      const now = Date.now();
      const sceneStartup = Array.from(document.querySelectorAll('[data-testid="race-3d"] [data-scene-startup]')).slice(0, 4).map(node => {
        const value = node.getAttribute("data-scene-startup");
        return value === "ready" || value === "loading" ? value : "unknown";
      });
      const clock = Array.from(document.querySelectorAll('[data-testid="race-cockpit"] strong')).slice(0, 16)
        .map(node => node.firstChild?.textContent?.trim() ?? "").find(value => /^[0-9]{1,6}:[0-9]{2}[.][0-9]$/.test(value)) ?? null;
      let diagnostics = { status: "not-read" };
      if (${stage === "finally"}) {
        try {
          const raw = localStorage.getItem(ProJournalParser.DIAGNOSTIC_STORAGE_KEY);
          const snapshot = raw === null ? null : ProJournalParser.parseDiagnosticPersistence(raw, now);
          diagnostics = raw === null ? { status: "absent", present: false }
            : snapshot ? { status: "valid", present: true, snapshot } : { status: "invalid", present: true };
        } catch { diagnostics = { status: "unavailable" }; }
      }
      return { stage: ${JSON.stringify(stage)}, captured: true, observedAtMs: now, performanceMs: Math.round(performance.now()),
        sceneStartup, clock, visibility: document.visibilityState === "visible" || document.visibilityState === "hidden" ? document.visibilityState : "unknown", diagnostics };
    })()`);
  } catch {
    return { stage, captured: false, observedAtMs: Date.now() };
  }
}

// Pin language to Russian for deterministic string matches, and mark the
// Trainer's first-run tour (simulator-v3 TourOverlay) as seen so it cannot
// cover the controls the simulator test clicks.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('regatta.lang.v1', 'ru');
      window.localStorage.setItem('regatta.v3.tour.v1', '1');
    } catch { /* ignore */ }
  });
});

test.describe('Smoke: critical user flows', () => {
  test("Menu is reachable from the header, searchable and readable on narrow screens in all locales", async ({ page }) => {
    test.setTimeout(60_000);
    const catalogLinks = page.locator('main a:not([href="/diagnostics"])');
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await page.getByRole("navigation", { name: "Основные разделы" }).getByRole("link", { name: "Меню", exact: true }).click();
      await expect(page).toHaveURL(/\/menu$/);
      await expect(catalogLinks).toHaveCount(menuDestinationCount("web"));
      await expectDiagnosticUtility(page, "ru");
      const menuLink = page.locator('nav a[href="/menu"]');
      await expect(menuLink).toHaveAttribute("aria-current", "page");
      const box = await menuLink.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 320, height: 740 });
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
      await page.getByRole("button", { name: "Choose language" }).click();
      const labels = { ru: "Русский", en: "English", pl: "Polski", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano" };
      await page.getByRole("menuitemradio", { name: new RegExp(labels[lang]) }).click();
      await expect(page.getByRole("heading", { name: productCopy.menu[lang], exact: true })).toBeVisible();
      const input = page.getByRole("searchbox", { name: productCopy.search[lang] });
      await input.fill("no-matching-section");
      await expect(page.getByRole("status")).toHaveText(productCopy.empty[lang]);
      await expect(catalogLinks).toHaveCount(0);
      await expectDiagnosticUtility(page, lang);
      await page.getByRole("button", { name: productCopy.clear[lang], exact: true }).click();
      await expect(catalogLinks).toHaveCount(menuDestinationCount("web"));
      await expectDiagnosticUtility(page, lang);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    // Theme remains accessible in Menu even when the narrow header hides its shortcut.
    const theme = page.locator("main").getByRole("button", { name: /Tema:/ });
    await theme.click();
    await expect(theme).toHaveAccessibleName("Tema: chiaro");
    await theme.click();
    await expect(theme).toHaveAccessibleName("Tema: scuro");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
  test('home page renders with nav + language toggle', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Regatta/i);

    // Language toggle is now a dropdown. Opening it reveals the 3 enabled
    // languages as role="menuitemradio" entries with native names.
    const langTrigger = page.getByRole('button', { name: 'Choose language' });
    await expect(langTrigger).toBeVisible();
    await langTrigger.click();
    await expect(page.getByRole('menuitemradio', { name: /Русский/ })).toBeVisible();
    await expect(page.getByRole('menuitemradio', { name: /English/ })).toBeVisible();
    await expect(page.getByRole('menuitemradio', { name: /Polski/ })).toBeVisible();

    // Primary nav - at least 4 nav entries should be wired to known routes
    const nav = page.locator('nav').first();
    for (const href of ['/', '/learn', '/practice', '/race', '/menu']) {
      await expect(nav.locator(`a[href="${href}"]`).first()).toBeVisible();
    }

    // Clicking English in the dropdown swaps instantly on home
    await page.getByRole('menuitemradio', { name: /English/ }).click();
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible({ timeout: 3_000 });
    // Switch back to RU so subsequent tests keep their seeded language
    await langTrigger.click();
    await page.getByRole('menuitemradio', { name: /Русский/ }).click();
  });

  test("home starts a lesson with working course navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Начать первый урок", exact: true }).click();
    await expect(page).toHaveURL(/\/start\?lesson=wind-direction$/);
    await expect(page.getByRole("heading", { name: "Ветер и направление", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "2. Проверить себя", exact: true }).click();
    await expect(page.getByRole("button", { name: "Проверить ответы", exact: true })).toBeDisabled();
    await expect(page.getByText("Пройдено проверок: 0/8", { exact: true })).toBeVisible();
  });

  test("legacy library leads to Menu and search reaches the radio course", async ({ page }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/\/menu$/);
    const search = page.getByRole("searchbox", { name: "Поиск по разделам" });
    await search.fill("радио");
    await expect(page.locator('main a:not([href="/diagnostics"])')).toHaveCount(1);
    await expectDiagnosticUtility(page, "ru");
    await page.getByRole("link", { name: /Радиосвязь SRC/ }).click();
    await expect(page).toHaveURL(/\/radio$/);
    await expect(page.locator('nav a[href="/learn"]')).toHaveAttribute("aria-current", "page");
  });

  test('/game opens 3-preset menu and reaches briefing', async ({ page }) => {
    await page.goto('/game');
    // Dynamic chunk may need a beat to load
    await expect(page.getByRole('heading', { name: 'Гонка' })).toBeVisible({ timeout: 15_000 });

    // All three preset cards as distinct buttons
    await expect(page.getByRole('button', { name: /^Первая гонка/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Свободная гонка/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Миссия/ }).first()).toBeVisible();

    // Default CTA fires briefing
    await page.getByRole('button', { name: /Начать первую гонку/i }).click();
    await expect(page.getByRole('heading', { name: 'Брифинг' })).toBeVisible({ timeout: 5_000 });
  });

  test("/game uses one 3D cockpit with real Pro controls and reserved settings", async ({ page }, testInfo) => {
    // Trace 40213873678: real wheel input and pause consumed 58.8s before settings.
    // Keep the complete real 3D clock, mode, controls and pause/resume contract.
    test.setTimeout(120_000);
    const observations: ProObservation[] = [];
    const pageErrors: { observedAtMs: number; stack: string }[] = [];
    const onPageError = (error: Error) => {
      if (pageErrors.length < 10) pageErrors.push({ observedAtMs: Date.now(), stack: boundedProError(error.stack ?? error.message) });
    };
    page.on("pageerror", onPageError);
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/game?embed=1");
      await expect(page.getByRole("heading", { name: "Гонка", exact: true })).toBeVisible({ timeout: 15_000 });
      await page.getByRole("radio", { name: "Pro", exact: true }).click();
      await expect(page.getByRole("radio", { name: /2D/ })).toHaveCount(0);
      await page.getByRole("button", { name: /Начать первую гонку/i }).click();
      await page.getByRole("button", { name: /Готов - старт/ }).click();
      await expect(page.getByTestId("race-3d")).toBeVisible({ timeout: 25_000 });
      // Run 40235863701 began the clock check while the real scene was loading.
      // Canvas visibility and the first rendered frame share the existing 25s.
      const startupDeadline = Date.now() + 25_000;
      await expect(page.locator('[data-scene="next"] canvas')).toBeVisible({ timeout: 25_000 });
      await expect(page.getByTestId("race-3d").locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", {
        timeout: Math.max(1, startupDeadline - Date.now()),
      });
      const helm = page.getByRole("slider", { name: "Руль", exact: true });
      const main = page.getByRole("slider", { name: "Гика-шкот", exact: true });
      const jib = page.getByRole("slider", { name: "Стаксель-шкот", exact: true });
      await expect(helm).toBeVisible(); await expect(main).toBeVisible(); await expect(jib).toBeVisible();
      const original = await main.getAttribute("aria-valuenow");
      await main.press("ArrowDown");
      await expect(main).not.toHaveAttribute("aria-valuenow", original ?? "");
      await helm.press("ArrowRight");
      await expect(helm).not.toHaveAttribute("aria-valuenow", "0");
      await helm.press("ArrowLeft");
      // Let the countdown finish; the clock must advance before and after a pause.
      observations.push(await observeProPage(page, "before-initial-clock"));
      const clock = page.getByText(/^\d+:\d\d\.\d$/);
      await expect(clock).not.toHaveText("0:00.0", { timeout: 15_000 });
      await page.getByRole("button", { name: "Меню", exact: true }).click();
      const paused = await clock.textContent();
      const scene = (await page.getByTestId("race-3d").boundingBox())!;
      await page.getByRole("button", { name: "Настройки", exact: true }).click();
      const dock = (await page.locator("aside").boundingBox())!;
      expect(dock.y >= scene.y + scene.height - 1 || dock.x >= scene.x + scene.width - 1).toBe(true);
      await page.getByRole("switch", { name: "Подсказки трима Pro", exact: true }).uncheck();
      await page.getByRole("switch", { name: "Путь и подсказки", exact: true }).uncheck();
      await page.getByRole("radio", { name: "За кормой", exact: true }).click();
      await expect(clock).toHaveText(paused ?? "");
      await expect(page.getByTestId("race-3d")).toHaveCount(1);
      // Another tab may change preferences for the next race, never this race's classification.
      const other = await page.context().newPage();
      await other.goto("/game?embed=1");
      await other.getByRole("radio", { name: "Обычный", exact: true }).click();
      await other.close();
      await expect(page.getByTestId("race-cockpit").locator("header")).toContainText("PRO");
      // Keyboard sheets work in slider mode and after opening another utility tab.
      await page.getByRole("radio", { name: "Ползунки", exact: true }).click();
      await page.getByRole("radio", { name: "Курс", exact: true }).click();
      await page.getByRole("button", { name: "Руль", exact: true }).click();
      await expect(page.getByRole("slider", { name: "Курс", exact: true })).toBeVisible();
      const mainSlider = page.getByRole("slider", { name: /Гика-шкот/ });
      const beforeKey = await mainSlider.inputValue();
      await page.keyboard.press("q");
      await expect(mainSlider).not.toHaveValue(beforeKey);
      await page.getByRole("button", { name: "Настройки", exact: true }).click();
      await page.getByRole("radio", { name: "Штурвалы", exact: true }).click();
      await page.getByRole("radio", { name: "Перо руля", exact: true }).click();
      await page.getByRole("button", { name: "Продолжить", exact: true }).click();
      await expect(clock).not.toHaveText(paused ?? "", { timeout: 10_000 });
      // A mode cannot change after starting and recategorize an auto-trim record.
      await expect(page.getByRole("radio", { name: "Обычный", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Меню", exact: true }).click();
      await page.getByRole("button", { name: "Выйти", exact: true }).click();
      await page.getByRole("button", { name: "Выйти", exact: true }).click();
      await page.getByRole("radio", { name: "Обычный", exact: true }).click();
      await page.getByRole("button", { name: /Начать первую гонку/i }).click();
      // The classic course was briefed on the first start: the second goes straight to the countdown.
      await expect(page.getByRole("heading", { name: "Брифинг", exact: true })).toHaveCount(0);
      await expect(helm).toBeVisible();
      await expect(page.getByRole("slider", { name: "Гика-шкот", exact: true })).toHaveCount(0);
    } finally {
      observations.push(await observeProPage(page, "finally"));
      page.off("pageerror", onPageError);
      await testInfo.attach("pro-observability", {
        body: Buffer.from(JSON.stringify({ schema: 1, retry: testInfo.retry, observations, pageErrors })),
        contentType: "application/json",
      });
    }
  });

  test('/leaderboard API + page load', async ({ page, request }) => {
    const apiRes = await request.get('/api/leaderboard?difficulty=medium&wind=medium');
    expect(apiRes.ok()).toBeTruthy();
    const body = await apiRes.json();
    expect(body).toHaveProperty('rows');
    expect(Array.isArray(body.rows)).toBe(true);

    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { name: /(Таблица|Leaderboard|Ranking)/ })).toBeVisible();
  });

  test('save nickname via /api/player end-to-end', async ({ request, baseURL }) => {
    // Writes a players row. The pre-deploy run on localhost covers it; on prod
    // it only filled the table with E2E_Tester_* players.
    test.skip(isProd(baseURL), 'writes a player row; covered by the pre-deploy localhost run');
    await request.get('/');

    const before = await request.get('/api/player');
    expect(before.ok()).toBeTruthy();
    const beforeBody = await before.json();
    expect(beforeBody).toHaveProperty('sid');
    expect(typeof beforeBody.sid).toBe('string');

    const nick = 'E2E_Tester_' + Date.now().toString(36);
    const put = await request.post('/api/player', { data: { nickname: nick } });
    expect(put.ok()).toBeTruthy();
    const putBody = await put.json();
    expect(putBody.nickname).toBe(nick);

    const after = await request.get('/api/player');
    const afterBody = await after.json();
    expect(afterBody.nickname).toBe(nick);
  });

  test('AI chat endpoint responds to a sailing question', async ({ request }) => {
    await request.get('/');

    const res = await request.post('/api/ai-chat', {
      data: {
        messages: [{ role: 'user', content: 'Что такое бейдевинд в одном предложении?' }],
        lang: 'ru',
      },
      timeout: 25_000,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('reply');
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(20);
    // Project rule: no em-dash or en-dash in responses
    expect(body.reply).not.toContain('\u2014');
    expect(body.reply).not.toContain('\u2013');
  });

  test('/simulator + /anatomy + /courses render without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    for (const path of ['/simulator', '/anatomy', '/courses']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => { /* ok */ });
    }
    expect(errors, 'page threw JS error: ' + errors.join(' | ')).toEqual([]);
  });

  test('simulators: Trainer (/simulator-v3) and 3D boat (/simulator2) render without JS errors', async ({ page }) => {
    // Guards the two-tier simulator model (docs/design/SIMULATORS.md): both
    // routes are embedded by the iOS app, so a broken render here means a
    // broken App Store feature, not just a web page.
    const errors: string[] = [];
    // Keep the first failure's real stack in the private synthetic CI report.
    page.on('pageerror', (e) => errors.push(e.stack ?? e.message));

    await page.goto('/simulator-v3');
    await expect(page.locator('canvas, svg').first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Сзади", exact: true }).click();
    await expect(page.getByRole("img", { name: "Вид с кормы", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Сбоку", exact: true }).click();
    await expect(page.getByRole("img", { name: "Вид сбоку", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "R2", exact: true }).click();
    await expect(page.getByText(/Грот:.*R2/)).toBeVisible();

    await page.goto('/simulator2');
    // The 3D scene mounts client-side only; wait for its canvas.
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });

    expect(errors, 'page threw JS error: ' + errors.join(' | ')).toEqual([]);
  });

  test('embed mode hides the sim switcher (iOS WebView contract)', async ({ page }) => {
    // Trace 40213873678 reached the third scene's real first frame at 35.8s.
    test.setTimeout(120_000);
    // Since app 1.5.0 b30 ALL THREE simulator tiers are embedded by the iOS app
    // (mobile/app/simulator-v1|simulator-v3|simulator2 -> SimWebView), so the
    // chromeless contract - no global nav, no cross-sim switcher links - must
    // hold on every tier, not just /simulator2.
    await page.goto('/simulator2?embed=1');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
    // No cross-sim links may render inside the chromeless app embed.
    await expect(page.locator('a[href="/simulator-v3"]')).toHaveCount(0);
    await expect(page.locator('a[href="/simulator"]')).toHaveCount(0);

    await page.goto('/simulator?embed=1');
    await expect(page.locator('svg, canvas').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('nav[data-product-navigation]')).toHaveCount(0);
    await expect(page.locator('a[href="/simulator-v3"]')).toHaveCount(0);
    await expect(page.locator('a[href="/simulator2"]')).toHaveCount(0);

    await page.goto('/simulator-v3?embed=1');
    await expect(page.getByTestId('trainer-scene').locator('canvas').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('trainer-scene').locator('[data-scene-startup]')).toHaveAttribute('data-scene-startup', 'ready', { timeout: 45_000 });
    await expect(page.locator('nav[data-product-navigation]')).toHaveCount(0);
    await expect(page.locator('a[href="/simulator"]')).toHaveCount(0);
    await expect(page.locator('a[href="/simulator2"]')).toHaveCount(0);
  });

  test('embed mode hides global chrome but keeps the course subnav and inherited appearance', async ({ page }) => {
    // Light is an explicit user preference even on a dark OS. A bare embed
    // must preserve it; the native host can supply a resolved override without
    // replacing that preference or reloading the current course document.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => localStorage.setItem('regatta_theme', 'light'));
    const courses = [
      { path: '/radio', subnav: 'Рация' },
      { path: '/sternik', subnav: 'Sternik' },
    ];
    const expectAppearance = async (theme: 'light' | 'dark') => {
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const metas = page.locator('meta[name="theme-color"]');
      const color = theme === 'light' ? '#f7f5f0' : '#0a1628';
      await expect(metas.first()).toHaveAttribute('content', color);
      await expect.poll(() => metas.evaluateAll(nodes => nodes.every(node =>
        node.getAttribute('content') === (document.documentElement.dataset.theme === 'light' ? '#f7f5f0' : '#0a1628')
        && !node.hasAttribute('media')))).toBe(true);
      expect(await page.evaluate(() => localStorage.getItem('regatta_theme'))).toBe('light');
    };
    for (const { path, subnav } of courses) {
      await page.goto(path);
      await expect(page.locator('nav[data-product-navigation]')).toHaveCount(1);
      await expectAppearance('light');

      await page.goto(`${path}?embed=1`);
      await expect(page.getByRole('navigation', { name: subnav })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('nav[data-product-navigation]')).toHaveCount(0);
      await expectAppearance('light');
    }
    await page.addInitScript(() => {
      (window as Window & { __REGATTA_EMBED_THEME__?: unknown }).__REGATTA_EMBED_THEME__ = 'dark';
    });
    for (const { path, subnav } of courses) {
      await page.goto(`${path}?embed=1`);
      await expect(page.getByRole('navigation', { name: subnav })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('nav[data-product-navigation]')).toHaveCount(0);
      await expectAppearance('dark');
      const origin = await page.evaluate(() => performance.timeOrigin);
      await page.evaluate(() => {
        (window as Window & { __REGATTA_EMBED_THEME__?: unknown }).__REGATTA_EMBED_THEME__ = 'light';
        window.dispatchEvent(new Event('regatta-theme-change'));
      });
      await expectAppearance('light');
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
      await expect(page.getByRole('navigation', { name: subnav })).toBeVisible();
    }
  });
});

test("3D embed keeps slider keys local and essential controls inside the viewport", async ({ page }) => {
  // Trace 40213873678 passed keys/cameras and reached final geometry at 60.2s.
  // Budget only this software-rendered flow; preserve every interaction/assertion.
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "sliders" })));
  await page.goto("/simulator2?embed=1&lang=en");
  const main = page.getByRole("slider", { name: "Mainsheet", exact: true });
  await expect(main).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Site brand" })).toHaveCount(0);
  const before = Number(await main.inputValue());
  await main.press("ArrowRight");
  await expect(main).toHaveValue((before + 0.01).toFixed(2));
  // Phones get the shared control dock: the helm slider lives in the Helm tab.
  await page.getByRole("tab", { name: "Helm", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Helm", exact: true })).toHaveValue("0");
  // Cameras slide out from the side on demand; nothing is drawn over the boat.
  const views = page.getByTestId("scene-view-button");
  await views.click();
  await page.getByRole("button", { name: "Deck", exact: true }).click();
  await expect(views).toHaveAttribute("aria-expanded", "false");
  await expect(views).toHaveAccessibleName("View: Deck");
  await views.click();
  await page.getByRole("button", { name: "↺ Reset camera", exact: true }).click();
  await expect(views).toHaveAccessibleName("View: Whole yacht");
  const canvas = await page.locator("canvas").first().boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas!.height).toBeGreaterThan(200);
  expect(canvas!.y + canvas!.height).toBeLessThan(844);
});

// A software WebGL runner spends several seconds waiting for stable animation
// frames per click. Keep this independent of the camera/keyboard workflow.
test("3D wind instrument stays visible when animated airflow is hidden", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 680 });
  await page.goto("/simulator2?embed=1&lang=en");
  await page.getByTestId("scene-view-button").click();
  const airflow = page.getByRole("button", { name: "Airflow", exact: true });
  await expect(airflow).toHaveAttribute("aria-pressed", "true");
  await airflow.click();
  await expect(airflow).toHaveAttribute("aria-pressed", "false");
  // Hiding the scene arrows must not hide the permanent wind instrument.
  await expect(page.getByRole("img", { name: "relative to bow", exact: true })).toBeVisible();
  await airflow.click();
  await expect(airflow).toHaveAttribute("aria-pressed", "true");
});

async function expectBriefingStart(page: import('@playwright/test').Page) {
  const title = page.getByRole('heading', { name: 'Брифинг', exact: true });
  const back = page.getByRole('button', { name: '← Назад к выбору', exact: true });
  const start = page.getByRole('button', { name: /Готов - старт/ });
  await expect(title).toBeVisible();
  await expect.poll(async () => {
    const heading = await title.boundingBox();
    const exit = await back.boundingBox();
    const ready = await start.boundingBox();
    const navigation = page.locator('nav[data-product-navigation]');
    const nav = await navigation.count() ? await navigation.boundingBox() : null;
    const viewport = page.viewportSize()!;
    return Boolean(heading && exit && ready && heading.y >= (nav ? nav.y + nav.height : 0) - 1
      && exit.y >= (nav ? nav.y + nav.height : 0) - 1 && exit.height >= 44 && exit.width >= 44
      && ready.y + ready.height <= viewport.height + 1);
  }).toBe(true);
  const preview = page.locator('[data-race-phase="briefing"] svg').first();
  const labelsFit = await preview.evaluate(svg => {
    const frame = svg.getBoundingClientRect();
    const labels = Array.from(svg.querySelectorAll('text'));
    return labels.length === 5 && labels.every(label => {
      const r = label.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left >= frame.left - 1 && r.top >= frame.top - 1
        && r.right <= frame.right + 1 && r.bottom <= frame.bottom + 1;
    });
  });
  expect(labelsFit).toBe(true);
  await expect(title).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  return { title, back };
}

async function expectReadableRaceLabel(label: import('@playwright/test').Locator) {
  const ratio = await label.evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      // These labels have opaque fills. Reject unsupported alpha/layers rather
      // than treating a transparent background as a meaningful black surface.
      const channels = color.startsWith('rgb') ? color.match(/[\d.]+/g)?.map(Number) : null;
      if (!channels || channels.length < 3 || (channels[3] ?? 1) !== 1) throw new Error('Expected an opaque RGB race label');
      const rgb = channels.slice(0, 3).map(value => {
        const v = value / 255;
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
      });
      return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
    };
    const a = luminance(style.color), b = luminance(style.backgroundColor);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

test('race briefing keeps Back and heading below site navigation after a scrolled entry', async ({ page }) => {
  await page.setViewportSize({ width: 569, height: 750 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/game');
  await expect(page.getByRole('heading', { name: 'Гонка', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('nav[data-product-navigation]')).toHaveCount(1);
  await page.getByRole('radio', { name: 'Pro', exact: true }).check();
  await expectReadableRaceLabel(page.getByRole('button', { name: /Начать первую гонку/ }));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.getByRole('button', { name: /Начать первую гонку/ }).click();
  const { title, back } = await expectBriefingStart(page);
  await expectReadableRaceLabel(page.getByText('Лёгкий · средний ветер', { exact: true }));
  // The heading is a programmatic landmark. Back is the preceding keyboard action.
  await title.press('Shift+Tab');
  await expect(back).toBeFocused();
  await back.press('Enter');
  await expect(page.getByRole('heading', { name: 'Гонка', exact: true })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Pro', exact: true })).toBeChecked();
  await page.getByRole('button', { name: /Начать первую гонку/ }).click();
  await expectBriefingStart(page);
});

test('short embedded race resumes its actual saved Pro setup at the start of the briefing', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/game?embed=1');
  await expect(page.getByRole('heading', { name: 'Гонка', exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('radio', { name: 'Pro', exact: true }).check();
  await page.getByRole('button', { name: /Начать первую гонку/ }).click();
  await expectBriefingStart(page);
  await page.reload();
  const resume = page.getByRole('button', { name: 'Продолжить', exact: true });
  await expect(resume).toBeVisible();
  await page.locator('[data-race-phase="menu"]').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await resume.click();
  const { back } = await expectBriefingStart(page);
  await expect(page.getByTestId('briefing-mode')).toHaveText('Pro');
  await back.click();
  await expect(page.getByRole('heading', { name: 'Гонка', exact: true })).toBeFocused();
  expect(await page.locator('[data-race-phase="menu"]').evaluate(element => element.scrollTop)).toBe(0);
  await expect(page.locator('nav[data-product-navigation]')).toHaveCount(0);
});
