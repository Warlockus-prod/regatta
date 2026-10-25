import { test, expect } from '@playwright/test';
import { copy as productCopy } from '../src/lib/product/copy';
import { menuDestinationCount } from '../src/lib/product/menu';

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
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await page.getByRole("navigation", { name: "Основные разделы" }).getByRole("link", { name: "Меню", exact: true }).click();
      await expect(page).toHaveURL(/\/menu$/);
      await expect(page.locator("main a")).toHaveCount(menuDestinationCount("web"));
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
      await page.getByRole("button", { name: productCopy.clear[lang], exact: true }).click();
      await expect(page.locator("main a")).toHaveCount(menuDestinationCount("web"));
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
    await expect(page.locator("main a")).toHaveCount(1);
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

  test("/game uses one 3D cockpit with real Pro controls and reserved settings", async ({ page }) => {
    // Trace 40213873678: real wheel input and pause consumed 58.8s before settings.
    // Keep the complete real 3D clock, mode, controls and pause/resume contract.
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/game?embed=1");
    await expect(page.getByRole("heading", { name: "Гонка", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("radio", { name: "Pro", exact: true }).click();
    await expect(page.getByRole("radio", { name: /2D/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Начать первую гонку/i }).click();
    await page.getByRole("button", { name: /Готов - старт/ }).click();
    await expect(page.getByTestId("race-3d")).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('[data-scene="next"] canvas')).toBeVisible({ timeout: 25_000 });
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
    const clock = page.getByText(/^\d+:\d\d\.\d$/);
    await expect(clock).not.toHaveText("0:00.0", { timeout: 15_000 });
    await page.getByRole("button", { name: "Пауза", exact: true }).click();
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
    await page.getByRole("radio", { name: "Обычный", exact: true }).click();
    await page.getByRole("button", { name: /Начать первую гонку/i }).click();
    await page.getByRole("button", { name: /Готов - старт/ }).click();
    await expect(helm).toBeVisible();
    await expect(page.getByRole("slider", { name: "Гика-шкот", exact: true })).toHaveCount(0);
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
    page.on('pageerror', (e) => errors.push(e.message));

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

  test('embed mode hides global chrome but keeps the course subnav (mobile course contract)', async ({ page }) => {
    // The iOS app ships SRC in seven languages and sternik in Polish as embeds of
    // /radio and /sternik at ?embed=1 (mobile/src/course/SectionWebView.tsx).
    // The embed strips the global site chrome (sticky nav, footer nav, feedback
    // widget) and pins the dark theme, while keeping the in-section subnav so
    // the learner can move around the course. A web change that breaks this
    // silently breaks an App Store feature - so guard it in CI.
    for (const { path, subnav } of [
      { path: '/radio', subnav: 'Рация' },
      { path: '/sternik', subnav: 'Sternik' },
    ]) {
      // Sanity / positive control: without embed the global sticky nav renders.
      await page.goto(path);
      await expect(page.locator('nav[data-product-navigation]')).toHaveCount(1);

      // With embed the global chrome is gone, the section subnav stays, theme is dark.
      await page.goto(`${path}?embed=1`);
      await expect(page.getByRole('navigation', { name: subnav })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('nav[data-product-navigation]')).toHaveCount(0);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
        .toBe('dark');
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
