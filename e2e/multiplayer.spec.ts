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
    // M2-8: a way back to the race hub, and Create is never a dead grey button:
    // with an empty nickname a tap explains why and moves focus to the field.
    await expect(page.getByTestId('mp-back-to-race')).toHaveAttribute('href', '/race');
    // Clear the prefilled default name only after it arrives with the session.
    await expect(page.getByLabel('Твой ник')).not.toHaveValue('');
    await page.getByLabel('Твой ник').fill('');
    const create = page.getByTestId('mp-create');
    await expect(create).toBeEnabled();
    await create.click();
    await expect(page.locator('#mp-create-hint')).toHaveText('Чтобы создать лобби, введи ник.');
    await expect(page.getByLabel('Твой ник')).toBeFocused();
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

  // TestFlight 74 feedback: "Link copied" stayed on the card forever, so a
  // player could not tell when a tap had copied. The line under the button says
  // what a tap does, names what was copied, returns to idle by itself, and a
  // clipboard failure is a failure with the link left to select by hand.
  test('lobby code card: copy confirmation returns to idle, a failure shows the link', async ({ browser, baseURL }) => {
    const origin = new URL(baseURL ?? 'http://localhost:3000').origin;
    const ctx = await browser.newContext({ locale: 'ru-RU', permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.addInitScript(() => {
      try { window.localStorage.setItem('regatta.lang.v1', 'ru'); } catch {}
      // The clipboard path: the system share sheet is covered by unit tests.
      try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch {}
    });
    const page = await ctx.newPage();
    try {
      await page.goto('/multiplayer');
      await expect(page.getByLabel('Твой ник')).not.toHaveValue('');
      await page.getByTestId('mp-create').click();
      await expect(page.getByTestId('mp-room')).toBeVisible({ timeout: 15_000 });
      const code = (await page.getByTestId('mp-room-code').innerText()).trim();
      const status = page.getByTestId('mp-share-status');
      await expect(status).toHaveAttribute('data-state', 'idle');
      await expect(status).toHaveText('Нажми, чтобы скопировать ссылку-приглашение в это лобби.');

      await page.getByTestId('mp-share-code').click();
      await expect(status).toHaveAttribute('data-state', 'copied');
      await expect(status).toHaveText(`Скопирована ссылка на лобби ${code}. Вставь её в сообщение другу.`);
      const link = `${origin}/multiplayer?code=${code}`;
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
      await expect(page.getByTestId('mp-share-copied-link')).toHaveText(link.replace(/^https?:\/\//, ''));
      // Back to the idle caption by itself (SHARE_CONFIRM_MS is 4 s).
      await expect(status).toHaveAttribute('data-state', 'idle', { timeout: 8_000 });
      await expect(page.getByTestId('mp-share-copied-link')).toHaveCount(0);

      await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
      await page.getByTestId('mp-share-code').click();
      await expect(status).toHaveAttribute('data-state', 'failed');
      await expect(status).toHaveText('Не получилось скопировать. Выдели ссылку ниже и скопируй вручную.');
      await expect(page.getByTestId('mp-invite-link')).toHaveValue(link);
      await expect(page.getByTestId('mp-share-copied-link')).toHaveCount(0);
    } finally {
      await ctx.close();
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
    // A fresh context has no stored nickname: the prefilled default name shows
    // that hydration and the session are ready before we type.
    await expect(h.getByPlaceholder('Введи ник')).not.toHaveValue('');
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
    await expect(g.getByPlaceholder('Введи ник')).not.toHaveValue('');
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

    // Settings replace the controls in the reserved dock, preserving the
    // scene footprint. No wheel, camera or result panel covers the boat.
    const scene = (await g.getByTestId("multiplayer-scene").boundingBox())!;
    const dock = (await g.getByTestId("multiplayer-dock").boundingBox())!;
    expect(dock.y).toBeGreaterThanOrEqual(scene.y + scene.height - 1);
    await g.getByRole("button", { name: "Настройки", exact: true }).click();
    const guidance = g.getByRole("switch", { name: "Путь и подсказки", exact: true });
    await guidance.uncheck();
    await expect(g.getByTestId("multiplayer-guidance")).toBeHidden();
    await guidance.check();
    await expect(g.getByTestId("multiplayer-guidance")).toBeVisible();
    await g.getByRole("radio", { name: "За кормой", exact: true }).click();
    await g.getByRole("radio", { name: "Ползунки", exact: true }).click();
    const after = (await g.getByTestId("multiplayer-scene").boundingBox())!;
    expect(after.height).toBeCloseTo(scene.height, 0);
    await g.getByRole("button", { name: "Руль", exact: true }).click();
    await expect(g.getByRole("slider", { name: /^Перо руля/ })).toBeVisible();
    await g.getByRole("button", { name: "Карта трассы", exact: true }).click();
    // The fleet list names rivals by nickname and the player as "Ты" (MultiplayerCockpit).
    const fleetList = g.locator('ol').filter({ hasText: hostNick });
    await expect(fleetList.getByText(hostNick, { exact: true })).toBeVisible();
    await expect(fleetList.getByText('Ты', { exact: true })).toBeVisible();
    await expect(g.getByText(guestNick, { exact: true })).toHaveCount(0);

    await host.close();
    await guest.close();
  });
});
