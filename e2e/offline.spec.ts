import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// ============================================================================
// Offline course (public/sw.js). The service worker used to precache the 14
// course documents but not their scripts: offline, /sternik/test rendered and
// "Szybkie 20" did nothing, the simulator lost its CSS, /radio/teoria fell to
// the error screen, and /offline said "You are back online". This visits /radio
// once online, waits for the precache, cuts the network and uses the course.
//
// Needs a production build (the worker does not register in dev) on a secure
// origin (https, or http://localhost):
//   npm run build && npx next start -p 3000 &
//   BASE_URL=http://localhost:3000 npx playwright test e2e/offline.spec.ts
//
// Playwright only sees and blocks a service worker's own network requests with
// this flag; it must be set before the browser starts, so it is set here at
// load time of the spec (the worker process launches the browser later).
// ============================================================================

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

test.use({ locale: 'pl-PL' });

async function seedPolish(context: BrowserContext, baseURL: string) {
  const { hostname } = new URL(baseURL);
  await context.addCookies([{ name: 'regatta_lang', value: 'pl', domain: hostname, path: '/' }]);
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('regatta.lang.v1', 'pl');
      window.localStorage.setItem('regatta.onboarding.v1', '1');
      window.localStorage.setItem('sternik.radio.onboard.v1', '1');   // simulator first-run tour
    } catch { /* ignore */ }
  });
}

/** Resolves once the worker has written its "course precached" marker. */
async function waitForPrecache(page: Page) {
  await expect.poll(async () => page.evaluate(async () => {
    if (!('caches' in window)) return 'no-cache-api';
    for (const name of await caches.keys()) {
      if (!name.startsWith('regatta-meta-')) continue;
      const hit = await (await caches.open(name)).match('/__precached');
      if (hit) return await hit.text();
    }
    return null;
  }), { timeout: 90_000, intervals: [500, 1000, 2000] }).toBe('pl');
}

test.describe('Offline course', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'service-worker network events are Chromium-only');

  test('after one online visit to /radio, the course works with no network', async ({ context, page, baseURL }) => {
    test.setTimeout(180_000);
    await seedPolish(context, baseURL!);

    await page.goto('/radio');
    await expect(page.locator('h1').first()).toBeVisible();
    await waitForPrecache(page);

    // Every script and stylesheet the stored trainer document names is in Cache
    // Storage. Checked directly, because Next prefetches linked routes and a
    // test that only clicks around could pass on prefetched chunks alone.
    const missing = await page.evaluate(async () => {
      const keys = await caches.keys();
      const htmlCache = await caches.open(keys.find((k) => k.startsWith('regatta-html-'))!);
      const doc = await htmlCache.match('/sternik/test?__lang=pl');
      if (!doc) return ['<document not cached>'];
      const html = await doc.text();
      const refs = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
      const out: string[] = [];
      for (const r of refs) if (!(await caches.match(r))) out.push(r);
      return out;
    });
    expect(missing).toEqual([]);

    await context.setOffline(true);
    // Really offline, for the worker too: an asset it never cached cannot load.
    expect(await page.evaluate(() => fetch('/_next/static/chunks/__offline-probe.js').then((r) => r.status, () => 'failed'))).toBe('failed');

    // 1. The trainer: the document comes from the worker and the quiz starts.
    const trainer = await page.goto('/sternik/test');
    expect(trainer?.fromServiceWorker()).toBe(true);
    await page.getByRole('button', { name: /Szybkie 20/ }).click();
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    await expect(page.getByText(/^1 \/ 20$/)).toBeVisible();

    // 2. The simulator responds to a control (its chunks and CSS are there).
    await page.goto('/radio/symulator');
    await page.getByTestId('start-fire-mayday').click();
    await expect(page.getByTestId('exit-scenario')).toBeVisible();

    // 3. Theory, including the chapter check, a chunk loaded only on import():
    //    it renders (not the "did not load" note), and no error screen.
    await page.goto('/radio/teoria');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sprawdź zrozumienie' })).toBeVisible();
    await expect(page.getByText('Coś poszło nie tak')).toHaveCount(0);

    await context.setOffline(false);
  });
});
