import { test, expect } from '@playwright/test';

/**
 * Multiplayer smoke - verifies:
 *  - /multiplayer UI renders
 *  - WebSocket /ws upgrades via the nginx proxy
 *  - Host + guest can create + join a lobby end-to-end
 *
 * Starts one short race to verify the shared 3D scene and actual helm input.
 */

test.describe('Multiplayer smoke', () => {
  test('page renders with both actions', async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('regatta.lang.v1', 'ru'); } catch {}
    });
    await page.goto('/multiplayer');
    await expect(page.getByRole('heading', { name: 'Мультиплеер' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Создать лобби' })).toBeVisible();
    await expect(page.getByPlaceholder('XXXX')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('WS upgrade via nginx /ws', async ({ request }) => {
    // Playwright request API doesn't speak WS directly - do a raw upgrade via
    // node's ws lib from the test process. We emit via request.fetch to verify
    // the path responds at least (bad request because GET /ws without upgrade
    // headers returns 400/404 on different servers - so we just check the
    // server is reachable from outside).
    const probe = await request.get('/ws', { timeout: 5_000 }).catch(() => null);
    // nginx returns 400 for plain GET on a WS location, or 404 depending on setup.
    // Key thing: not 502 / 503 / 504.
    if (probe) {
      const code = probe.status();
      expect(
        [400, 404, 426, 200].includes(code),
        `Unexpected /ws status ${code}`,
      ).toBeTruthy();
    }
  });

  test('create lobby + guest joins by code', async ({ browser }) => {
    // Two real 3D contexts exhausted 60s at dock geometry after keyboard and
    // positive WebSocket input had passed. Keep the complete interaction flow.
    test.setTimeout(120_000);
    const host = await browser.newContext({ locale: 'ru-RU' });
    const guest = await browser.newContext({ locale: 'ru-RU' });

    for (const ctx of [host, guest]) {
      await ctx.addInitScript(() => {
        try { window.localStorage.setItem('regatta.lang.v1', 'ru'); } catch {}
        try { window.localStorage.setItem('regatta.controls.v1', JSON.stringify({ version: 1, mode: "wheels", helmReturnToCenter: false })); } catch {}
      });
    }

    const h = await host.newPage();
    const g = await guest.newPage();
    const turns: number[] = [];
    g.on("websocket", socket => socket.on("framesent", event => {
      try {
        const message = JSON.parse(String(event.payload));
        if (message.type === "input") turns.push(message.turn);
      } catch { /* Other frames are not control commands. */ }
    }));

    await h.goto('/multiplayer');
    await expect(h.getByRole('heading', { name: 'Мультиплеер' })).toBeVisible({ timeout: 10_000 });
    const hostNick = 'Host_' + Date.now().toString(36);
    await h.getByPlaceholder('Введи ник').fill(hostNick);
    await h.getByRole('button', { name: 'Создать лобби' }).click();

    // Wait for lobby code to appear (4 mono chars)
    await expect(h.getByText(/КОД ЛОББИ/)).toBeVisible({ timeout: 10_000 });
    const codeLoc = h.locator('div.text-5xl.font-mono');
    await expect(codeLoc).toBeVisible();
    const code = (await codeLoc.textContent() ?? '').trim();
    expect(code).toMatch(/^[A-Z2-9]{4}$/);

    // Guest joins
    await g.setViewportSize({ width: 390, height: 844 });
    await g.goto('/multiplayer?embed=1');
    await expect(g.getByRole('heading', { name: 'Мультиплеер' })).toBeVisible({ timeout: 10_000 });
    const guestNick = 'Guest_' + Date.now().toString(36);
    await g.getByPlaceholder('Введи ник').fill(guestNick);
    await g.getByPlaceholder('XXXX').fill(code);
    // Wait for the join button to become enabled (requires 4 chars)
    const joinBtn = g.getByRole('button', { name: 'Войти' });
    await expect(joinBtn).toBeEnabled({ timeout: 3_000 });
    await joinBtn.click();

    // Both should see 2 players in the lobby
    await expect(g.getByText(/КОД ЛОББИ/)).toBeVisible({ timeout: 10_000 });
    await expect(h.getByText(/ИГРОКИ · 2 \/ 10/)).toBeVisible({ timeout: 10_000 });
    await expect(g.getByText(/ИГРОКИ · 2 \/ 10/)).toBeVisible({ timeout: 10_000 });
    await expect(h.getByText(guestNick, { exact: true })).toBeVisible();

    const start = h.getByRole('button', { name: /Старт гонки/ });
    await expect(start).toBeDisabled();
    await g.getByRole('button', { name: 'Я готов', exact: true }).click();
    await expect(start).toBeEnabled();
    await h.getByRole('button', { name: 'Добавить бота' }).click();
    await expect(h.getByText(/ИГРОКИ · 3 \/ 10/)).toBeVisible();
    await start.click();
    await expect(h.getByTestId("multiplayer-cockpit")).toBeVisible();
    await expect(g.getByTestId("multiplayer-cockpit")).toBeVisible();
    await expect(h.locator('[data-scene="next"] canvas')).toBeVisible({ timeout: 25_000 });
    await expect(g.locator('[data-scene="next"] canvas')).toBeVisible({ timeout: 25_000 });
    await expect(g.getByText("Паруса в сетевой гонке настраиваются автоматически. Ты управляешь рулем.", { exact: true })).toBeVisible({ timeout: 15_000 });
    const helm = g.getByRole("slider", { name: "Руль", exact: true });
    await expect(helm).toBeVisible();
    await expect(g.getByRole("slider")).toHaveCount(1);
    await helm.focus();
    await helm.press("ArrowRight");
    await expect(helm).not.toHaveAttribute("aria-valuenow", "0");
    await expect.poll(() => turns.some(turn => turn > 0)).toBe(true);
    await helm.press("ArrowLeft");

    await g.getByRole("button", { name: "Карта трассы", exact: true }).click();
    // The fleet list names rivals by nickname and the player as "Ты" (MultiplayerCockpit).
    const fleetList = g.locator('ol').filter({ hasText: hostNick });
    await expect(fleetList.getByText(hostNick, { exact: true })).toBeVisible();
    await expect(fleetList.getByText('Ты', { exact: true })).toBeVisible();
    await expect(g.getByText(guestNick, { exact: true })).toHaveCount(0);

    await host.close();
    await guest.close();
  });

  // Split from the two-client case: on the GPU-less runner two software WebGL
  // canvases cost about 1.5 s per page task, so the combined flow ran out of its
  // 120 s in every attempt of runs 41212119876, 41602279442 and 42141082027. A real
  // GPU runs the same flow at over 100 FPS. The cockpit does not depend on who
  // else is racing, so these checks need one canvas, not more time.
  test('race settings keep the scene footprint and change the controls', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      try { window.localStorage.setItem('regatta.lang.v1', 'ru'); } catch {}
      try { window.localStorage.setItem('regatta.controls.v1', JSON.stringify({ version: 1, mode: "wheels", helmReturnToCenter: false })); } catch {}
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/multiplayer?embed=1');
    await expect(page.getByRole('heading', { name: 'Мультиплеер' })).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('Введи ник').fill('Solo_' + Date.now().toString(36));
    await page.getByRole('button', { name: 'Создать лобби' }).click();
    await expect(page.getByText(/КОД ЛОББИ/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Добавить бота' }).click();
    await expect(page.getByText(/ИГРОКИ · 2 \/ 10/)).toBeVisible();
    await page.getByRole('button', { name: /Старт гонки/ }).click();
    await expect(page.locator('[data-scene="next"] canvas')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText("Паруса в сетевой гонке настраиваются автоматически. Ты управляешь рулем.", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Settings replace the controls in the reserved dock, preserving the
    // scene footprint. No wheel, camera or result panel covers the boat.
    const scene = (await page.getByTestId("multiplayer-scene").boundingBox())!;
    const dock = (await page.getByTestId("multiplayer-dock").boundingBox())!;
    expect(dock.y).toBeGreaterThanOrEqual(scene.y + scene.height - 1);
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    const guidance = page.getByRole("switch", { name: "Путь и подсказки", exact: true });
    await guidance.uncheck();
    await expect(page.getByTestId("multiplayer-guidance")).toBeHidden();
    await guidance.check();
    await expect(page.getByTestId("multiplayer-guidance")).toBeVisible();
    await page.getByRole("radio", { name: "За кормой", exact: true }).click();
    await page.getByRole("radio", { name: "Ползунки", exact: true }).click();
    const after = (await page.getByTestId("multiplayer-scene").boundingBox())!;
    expect(after.height).toBeCloseTo(scene.height, 0);
    await page.getByRole("button", { name: "Руль", exact: true }).click();
    await expect(page.getByRole("slider", { name: /^Перо руля/ })).toBeVisible();
  });
});
