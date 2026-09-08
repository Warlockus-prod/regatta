import { test, expect } from '@playwright/test';

// ============================================================================
// Smoke E2E - must pass on every deploy. Keep fast (<60 sec total).
// These run against prod by default (see playwright.config.ts).
// ============================================================================

// Pin language to Russian for deterministic string matches, and mark the
// first-visit onboarding tour as seen. The tour (OnboardingTour.tsx, a
// full-screen z-[100] overlay) pops up ~600 ms after load on a fresh context
// and otherwise intercepts clicks (e.g. the language toggle), which made the
// home-page test flaky. Seeding its localStorage flag keeps it from appearing.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('regatta.lang.v1', 'ru');
      window.localStorage.setItem('regatta.onboarding.v1', '1');
      window.localStorage.setItem('regatta.v3.tour.v1', '1');
    } catch { /* ignore */ }
  });
});

test.describe('Smoke: critical user flows', () => {
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
    for (const href of ['/', '/learn', '/practice', '/race', '/library']) {
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
    await expect(page).toHaveURL(/\/courses#wind$/);
    await expect(page.getByRole("region", { name: "Навигация по курсу" })).toBeVisible();
  });

  test("library search reaches the radio course and keeps its section selected", async ({ page }) => {
    await page.goto("/library");
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
    await expect(page.getByRole('button', { name: /Учусь гоняю/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Свободная гонка/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^🎯.*Миссия/ }).first()).toBeVisible();

    // Default CTA fires briefing
    await page.getByRole('button', { name: /Начать.*Учусь гоняю/i }).click();
    await expect(page.getByRole('heading', { name: 'Брифинг' })).toBeVisible({ timeout: 5_000 });
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

  test('save nickname via /api/player end-to-end', async ({ request }) => {
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
    await expect(page.getByTestId('trainer-scene').locator('svg').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('nav[data-product-navigation]')).toHaveCount(0);
    await expect(page.locator('a[href="/simulator"]')).toHaveCount(0);
    await expect(page.locator('a[href="/simulator2"]')).toHaveCount(0);
  });

  test('embed mode hides global chrome but keeps the course subnav (mobile course contract)', async ({ page }) => {
    // The iOS app ships the Polish licence courses as WebView embeds of
    // /radio and /sternik at ?embed=1 (mobile/src/course/SectionWebView.tsx).
    // The embed strips the global site chrome (sticky nav, footer nav, feedback
    // widget) and pins the dark theme, while keeping the in-section subnav so
    // the learner can move around the course. A web change that breaks this
    // silently breaks an App Store feature - so guard it in CI.
    for (const { path, subnav } of [
      { path: '/radio', subnav: 'Radio' },
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/simulator2?embed=1&lang=en");
  const main = page.getByRole("slider", { name: "Mainsheet (boom)", exact: true });
  await expect(main).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Site brand" })).toHaveCount(0);
  const before = Number(await main.inputValue());
  await main.press("ArrowRight");
  await expect(main).toHaveValue((before + 0.01).toFixed(2));
  await page.getByText("Wind and fine tuning", { exact: true }).click();
  await expect(page.getByRole("slider", { name: "Helm", exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Deck", exact: true }).click();
  await expect(page.getByRole("button", { name: "Deck", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Whole yacht", exact: true })).toHaveAttribute("aria-pressed", "true");
  const canvas = await page.locator("canvas").first().boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas!.height).toBeGreaterThan(200);
  expect(canvas!.y + canvas!.height).toBeLessThan(844);
});
