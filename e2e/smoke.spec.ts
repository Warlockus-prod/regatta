import { test, expect } from '@playwright/test';

// ============================================================================
// Smoke E2E - must pass on every deploy. Keep fast (<60 sec total).
// These run against prod by default (see playwright.config.ts).
// ============================================================================

// Pin language to Russian for deterministic string matches.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try { window.localStorage.setItem('regatta.lang.v1', 'ru'); } catch { /* ignore */ }
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
    for (const href of ['/', '/start', '/simulator', '/game']) {
      await expect(nav.locator(`a[href="${href}"]`).first()).toBeVisible();
    }

    // Clicking English in the dropdown swaps instantly on home
    await page.getByRole('menuitemradio', { name: /English/ }).click();
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible({ timeout: 3_000 });
    // Switch back to RU so subsequent tests keep their seeded language
    await langTrigger.click();
    await page.getByRole('menuitemradio', { name: /Русский/ }).click();
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
});
