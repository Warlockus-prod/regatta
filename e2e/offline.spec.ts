import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { POSITIONS } from '../src/app/radio/pozycja/drillData';
import { DIALOGUES } from '../src/app/radio/rozmowa/dialogues';
import { FREE_SPEECH_COPY } from '../src/data/radio/free-speech-copy';
import { CHANNELS, CH16_INDEX } from '../src/app/radio/symulator/radioModel';

test('free radio PTT shows a provisional draft, preserves release and rejects cancelled or stale results', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const network: string[] = [];
  page.on('request', request => { if (/\/(?:api|radio-locales|radio-audio)\//.test(request.url())) network.push(request.url()); });
  await page.addInitScript(() => {
    type Command = { type: string; action?: string; id?: string; events?: unknown[] };
    const host = window as Window & { __REGATTA_APP_LANG__?: string; __REGATTA_NATIVE_ASR__?: boolean;
      ReactNativeWebView?: { postMessage(value: string): void }; __speechTest?: { commands: Command[]; emit(status: string, extra?: Record<string, unknown>): void } };
    host.__REGATTA_APP_LANG__ = 'en'; host.__REGATTA_NATIVE_ASR__ = true;
    let id = '';
    const commands: Command[] = [];
    const emit = (status: string, extra = {}) => window.dispatchEvent(new CustomEvent('regatta:radio-asr', { detail: { id, status, ...extra } }));
    host.__speechTest = { commands, emit };
    host.ReactNativeWebView = { postMessage(value) {
      const command = JSON.parse(value) as Command; commands.push(command);
      if (command.type !== 'radio-asr') return;
      if (command.action === 'availability') window.dispatchEvent(new CustomEvent('regatta:radio-asr', { detail: { id: command.id, status: 'availability', available: true } }));
      if (command.action === 'start') { id = command.id!; emit('started'); emit('result', { transcript: 'SYNTHETIC RADIO DRAFT', isFinal: false }); }
      // Tests deliver end/error explicitly after the actual release or cancel.
    } };
    localStorage.setItem('sternik.radio.onboard.v1', '1');
  });
  await page.route('**/__radio-speech-bundle', route => route.fulfill({ contentType: 'text/html', body: readFileSync(resolve('mobile/assets/radio-offline.html'), 'utf8') }));
  await page.goto('/__radio-speech-bundle');
  await page.context().setOffline(true);
  const panel = page.getByTestId('free-speech-practice'), ptt = page.getByTestId('ptt');
  await expect(panel).toBeVisible();
  const state = () => page.evaluate(() => (window as Window & { __speechTest?: { commands: { type: string; action?: string; events?: unknown[] }[] } }).__speechTest!.commands);
  await ptt.click();
  expect((await state()).filter(c => c.type === 'radio-asr' && c.action === 'start')).toHaveLength(0);
  const dial = await page.getByTestId('dial-center').boundingBox(); expect(dial).not.toBeNull();
  await page.mouse.move(dial!.x + dial!.width / 2, dial!.y + dial!.height / 2); await page.mouse.down();
  await expect(page.getByTestId('lcd')).toContainText('16'); await page.mouse.up();
  await expect(page.getByTestId('free-speech-status')).toHaveText(FREE_SPEECH_COPY.ready.en);
  const hold = async () => {
    const box = await ptt.boundingBox(); expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down();
    await expect(ptt).toHaveAttribute('aria-pressed', 'true');
  };
  const emit = (status: string, extra: Record<string, unknown> = {}) => page.evaluate(({ status, extra }) => {
    (window as Window & { __speechTest?: { emit(status: string, extra: Record<string, unknown>): void } }).__speechTest!.emit(status, extra);
  }, { status, extra });
  await hold();
  await expect(page.getByTestId('free-speech-preview')).toHaveText('SYNTHETIC RADIO DRAFT');
  await expect(page.getByTestId('free-speech-history')).toContainText('(0/8)');
  await expect(page.getByTestId('free-speech-input')).toBeDisabled();
  await page.mouse.up(); await page.mouse.move(1, 1);
  await expect(page.getByTestId('free-speech-status')).toHaveText(FREE_SPEECH_COPY.working.en);
  await emit('end', { transcript: 'SYNTHETIC FINAL TRANSMISSION' });
  await expect(page.getByTestId('free-speech-preview')).toHaveText('SYNTHETIC FINAL TRANSMISSION');
  await expect(page.getByTestId('free-speech-history')).toContainText('(1/8)');
  await expect(page.getByTestId('free-speech-status')).toHaveText(FREE_SPEECH_COPY.recognized.en);

  await hold(); await ptt.dispatchEvent('pointercancel'); await page.mouse.up();
  await emit('end', { transcript: 'SYNTHETIC CANCELLED WORDS' });
  await expect(page.getByTestId('free-speech-history')).toContainText('(1/8)');
  await expect(page.getByTestId('free-speech-status')).toHaveText(FREE_SPEECH_COPY.cancelled.en);
  await hold(); await page.mouse.up();
  await page.getByTestId('free-speech-clear').click();
  await emit('end', { transcript: 'SYNTHETIC STALE WORDS' });
  await expect(page.getByTestId('free-speech-history')).toContainText('(0/8)');
  await expect(page.getByTestId('free-speech-preview')).toHaveText(FREE_SPEECH_COPY.empty.en);

  await hold(); await page.mouse.up(); await emit('end', { transcript: '' });
  await expect(page.getByTestId('free-speech-status')).toHaveText(FREE_SPEECH_COPY.silent.en);
  await expect(page.getByTestId('free-speech-history')).toContainText('(0/8)');
  await hold(); await emit('error', { code: 'permission-denied' }); await page.mouse.up();
  await expect(page.getByTestId('free-speech-status')).toHaveText(FREE_SPEECH_COPY.denied.en);

  const input = page.getByTestId('free-speech-input');
  await expect(input).toBeEnabled(); await expect(input).toHaveAttribute('maxlength', '1000');
  for (let i = 0; i < 9; i++) { await input.fill(`SYNTHETIC TYPED ${i}`); await page.getByTestId('free-speech-submit').click(); }
  await page.getByTestId('free-speech-history').click();
  await expect(panel.locator('li')).toHaveCount(8); await expect(panel).not.toContainText('SYNTHETIC TYPED 0');
  await expect(panel.locator('li').first()).toContainText('SYNTHETIC TYPED 8');
  await page.getByTestId('free-speech-clear').click();
  await expect(panel.locator('li')).toHaveCount(0);

  // Use real channel buttons to reach DSC-only CH70. No product state injection.
  for (let i = CH16_INDEX; i < CHANNELS.findIndex(channel => channel.num === '70'); i++) await page.getByTestId('key-up').click();
  await expect(page.getByTestId('free-speech-status')).toHaveText(FREE_SPEECH_COPY.txInhibit.en);
  const requests = (await state()).filter(c => c.type === 'radio-asr' && c.action === 'start').length;
  await ptt.click(); expect((await state()).filter(c => c.type === 'radio-asr' && c.action === 'start')).toHaveLength(requests);
  await page.getByTestId('radio-exit-app').click(); // Flush the real diagnostics bridge.
  const privateBytes = JSON.stringify(await page.evaluate(() => ({
    stored: { ...localStorage }, messages: (window as Window & { __speechTest?: { commands: unknown[] } }).__speechTest!.commands,
  })));
  expect(privateBytes).not.toContain('SYNTHETIC');
  const diagnostics = (await state()).flatMap(command => command.type === 'diagnostic-events' ? command.events ?? [] : []) as { type: string; action: string; status?: string }[];
  expect(diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'radio.speech', action: 'result', status: 'recognized' }),
    expect.objectContaining({ type: 'radio.speech', action: 'cancel', status: 'cancelled' }),
    expect.objectContaining({ type: 'radio.speech', action: 'result', status: 'denied' }),
    expect.objectContaining({ type: 'radio.speech', action: 'result', status: 'entered' }),
  ]));
  expect(network).toEqual([]);
});

for (const lang of ['pl', 'ru', 'en'] as const) test(`free radio typing stays offline and below the pinned faceplate in ${lang}`, async ({ page }) => {
  await page.addInitScript(lang => {
    (window as Window & { __REGATTA_APP_LANG__?: string }).__REGATTA_APP_LANG__ = lang;
    localStorage.setItem('sternik.radio.onboard.v1', '1');
  }, lang);
  await page.route('**/__radio-typing-bundle', route => route.fulfill({ contentType: 'text/html', body: readFileSync(resolve('mobile/assets/radio-offline.html'), 'utf8') }));
  await page.goto('/__radio-typing-bundle');
  await page.context().setOffline(true);
  for (const size of [{ width: 390, height: 740 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(size);
    const panel = page.getByTestId('free-speech-practice'), dock = page.getByTestId('radio-dock'), lcd = page.getByTestId('lcd');
    await expect(panel.getByRole('heading', { name: FREE_SPEECH_COPY.title[lang], exact: true })).toBeVisible();
    await expect(page.getByTestId('free-speech-input')).toHaveAccessibleName(FREE_SPEECH_COPY.typedLabel[lang]);
    const a = await lcd.boundingBox(), b = await dock.boundingBox(); expect(a).not.toBeNull(); expect(b).not.toBeNull();
    expect(a!.y + a!.height <= b!.y + 1 || a!.x + a!.width <= b!.x + 1).toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); expect(overflow).toBeLessThanOrEqual(1);
    await page.getByTestId('free-speech-input').fill('SYNTHETIC OFFLINE TYPING');
    await page.getByTestId('free-speech-submit').click();
    await expect(page.getByTestId('free-speech-preview')).toHaveText('SYNTHETIC OFFLINE TYPING');
    await expect(panel).toContainText(FREE_SPEECH_COPY.entered[lang]);
    const target = await page.getByTestId('free-speech-clear').boundingBox(); expect(target!.height).toBeGreaterThanOrEqual(44);
    await page.getByTestId('free-speech-clear').click();
    await expect(page.getByTestId('free-speech-history')).toContainText('(0/8)');
  }
});

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

test('the installed Ads preview uses real3D controls and local placements without SDK claims', async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 740 });
  const unexpected: string[] = [];
  const origin = new URL(baseURL!).origin;
  page.on('request', request => {
    if (!/^https?:/.test(request.url())) return;
    const url = new URL(request.url());
    if (url.origin !== origin || url.pathname.startsWith('/api/')) unexpected.push(url.origin + url.pathname);
  });
  await page.route('**/__ads-native-bundle**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(resolve('mobile/assets/sailing-offline.html'), 'utf8') }));
  await page.goto('/__ads-native-bundle?screen=ads&lang=en');
  await expect(page.locator('[data-scene-startup="ready"]')).toBeVisible({ timeout: 25_000 });
  const dock = page.getByRole('complementary', { name: 'Ads', exact: true });
  const scene = page.getByRole('region', { name: 'Cameras and test ad placements', exact: true });
  const a = await scene.boundingBox(), b = await dock.boundingBox();
  expect(a).not.toBeNull(); expect(b).not.toBeNull();
  expect(a!.height).toBeGreaterThanOrEqual(220);
  expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + 1);
  const buttons = await dock.getByRole('button').evaluateAll(elements => elements.map(el => {
    const rect = el.getBoundingClientRect(); return { width: rect.width, height: rect.height, overflow: el.scrollWidth - el.clientWidth };
  }));
  expect(buttons.length).toBeGreaterThan(10);
  for (const button of buttons) { expect(button.width).toBeGreaterThanOrEqual(44); expect(button.height).toBeGreaterThanOrEqual(44); expect(button.overflow).toBeLessThanOrEqual(1); }
  await dock.getByRole('button', { name: 'Look left', exact: true }).click();
  await expect(dock.getByRole('list')).toContainText(/orbit\s*·\s*accepted/);
  await dock.getByRole('button', { name: 'From the deck', exact: true }).click();
  await expect(dock.getByRole('button', { name: 'From the deck', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const bow = dock.getByRole('button', { name: 'Bow board', exact: true });
  await bow.click(); await expect(bow).toHaveAttribute('aria-pressed', 'false');
  await expect(dock.getByRole('list')).toContainText(/hide.*bow-board/);
  await bow.click(); await expect(bow).toHaveAttribute('aria-pressed', 'true');
  await dock.getByRole('button', { name: 'Open water', exact: true }).click();
  await expect(dock.getByRole('button', { name: 'Open water', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dock.getByRole('button', { name: 'Clear journal', exact: true }).click();
  await expect(dock.getByRole('list')).toHaveText('No actions yet');
  await expect(dock.getByText('SDK not connected', { exact: true })).toBeVisible();
  expect(unexpected).toEqual([]);
});

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

test('the native radio bundle grades position and conversation text with no network or speech model', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const app = window as Window & { __REGATTA_APP_LANG__?: string; __REGATTA_NATIVE_ASR__?: boolean; __REGATTA_NATIVE_SPEECH__?: boolean; ReactNativeWebView?: { postMessage: (value: string) => void } };
    app.__REGATTA_APP_LANG__ = 'en'; app.__REGATTA_NATIVE_ASR__ = true; app.__REGATTA_NATIVE_SPEECH__ = true;
    app.ReactNativeWebView = { postMessage(value) {
      const message = JSON.parse(value) as { type: string; id: string; action?: string };
      if (message.type === 'radio-asr' && message.action === 'availability') window.dispatchEvent(new CustomEvent('regatta:radio-asr', { detail: { id: message.id, status: 'availability', available: false } }));
      if (message.type === 'radio-speech' && !message.action) window.dispatchEvent(new CustomEvent('regatta:radio-speech', { detail: { id: message.id, status: 'done' } }));
    } };
    localStorage.setItem('sternik.radio.onboard.v1', '1');
  });
  await page.route('**/__radio-native-bundle', route => route.fulfill({ contentType: 'text/html', body: readFileSync(resolve('mobile/assets/radio-offline.html'), 'utf8') }));
  const network: string[] = [];
  page.on('request', request => { if (/\/(?:api|radio-locales|radio-audio)\//.test(request.url())) network.push(request.url()); });
  await page.goto('/__radio-native-bundle');
  await expect(page.getByTestId('free-practice-guide')).toBeVisible();
  await expect(page.getByTestId('lcd')).toBeVisible();
  await page.getByTestId('free-guided-lessons').click();
  await expect(page.getByTestId('course-exit')).toBeVisible();
  await page.getByTestId('course-exit').click();
  await expect(page.getByTestId('free-practice-guide')).toBeVisible();
  await page.getByTestId('free-course').click();
  await page.getByRole('navigation', { name: 'Radio', exact: true }).getByRole('link', { name: 'Theory', exact: true }).click();
  const chapter = page.locator('#theory-chapter');
  await chapter.selectOption('dsc');
  await page.getByRole('button', { name: 'Exam review', exact: true }).click();
  await page.locator('a[href="/radio/test?chapter=dsc"]').click();
  await page.getByTestId('start-training').click();
  await page.locator('button:has(> span.font-bold)').first().click();
  await page.locator('a[href="/radio/teoria#dsc"]').click();
  await expect(chapter).toHaveValue('dsc');
  await chapter.selectOption({ index: 1 });
  const selectedChapter = await chapter.inputValue();
  await page.getByRole('navigation', { name: 'Radio', exact: true }).getByRole('link', { name: 'Practice', exact: true }).click();
  // The native header sends this bounded local Back event.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('regatta:radio-back')));
  await expect(chapter).toHaveValue(selectedChapter);
  await page.getByRole('navigation', { name: 'Radio', exact: true }).getByRole('link', { name: 'Practice', exact: true }).click();
  await page.getByTestId('free-scenarios').click();
  await page.locator('a[href="/radio/pozycja"]').first().click();
  await expect(page.getByTestId('local-voice-ptt')).toBeDisabled();
  await page.getByTestId('local-transcript-input').fill(POSITIONS[0].say);
  await page.getByTestId('local-transcript-check').click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await expect(page.getByText('Checked text', { exact: true })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Practice', exact: true }).click();
  await page.getByTestId('free-scenarios').click();
  await page.locator('a[href="/radio/rozmowa"]').click();
  await page.getByTestId('dialogue-radio-check').click();
  {
    const knob = (await page.getByTestId("dial-center").boundingBox())!;
    await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
    await page.mouse.down();
    try { await expect(page.getByTestId("lcd")).toContainText("16"); } finally { await page.mouse.up(); }
  }
  for (let i = 0; i < 4; i++) await page.getByTestId('key-down').click();
  const dialogue = DIALOGUES.find(dialogue => dialogue.id === 'radio-check')!;
  await page.getByTestId('local-transcript-input').fill(dialogue.turns[0].youSay);
  await page.getByTestId('local-transcript-check').click();
  await expect(page.getByTestId('next-turn')).toBeVisible();
  await expect(page.getByTestId('turn-heard')).toContainText(dialogue.turns[0].youSay);
  expect(network).toEqual([]);
});

test('web position and conversation accept typed practice without starting a microphone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => { throw new Error('Typed practice must not request the microphone'); } });
  });
  const voiceRequests: string[] = [];
  page.on('request', request => { if (/\/api\/radio-(?:voice|transcribe)/.test(request.url())) voiceRequests.push(request.url()); });
  await page.goto('/radio/pozycja?lang=en');
  await expect(page.getByTestId('local-voice-ptt')).toHaveCount(0);
  await page.getByTestId('local-transcript-input').fill(POSITIONS[0].say);
  await page.getByTestId('local-transcript-check').click();
  await expect(page.getByTestId('pos-score')).toHaveText('100%');
  await expect(page.getByText('Checked text', { exact: true })).toBeVisible();
  await page.goto('/radio/rozmowa?lang=en');
  await page.getByTestId('dialogue-radio-check').click();
  const dialogue = DIALOGUES.find(dialogue => dialogue.id === 'radio-check')!;
  await page.getByTestId('local-transcript-input').fill(dialogue.turns[0].youSay);
  await page.getByTestId('local-transcript-check').click();
  await expect(page.getByTestId('dialogue-setup-warning')).toContainText('Switch the radio on');
  await expect(page.getByTestId('next-turn')).toHaveCount(0);
  {
    const knob = (await page.getByTestId("dial-center").boundingBox())!;
    await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
    await page.mouse.down();
    try { await expect(page.getByTestId("lcd")).toContainText("16"); } finally { await page.mouse.up(); }
  }
  await page.getByTestId('local-transcript-check').click();
  await expect(page.getByTestId('dialogue-setup-warning')).toContainText('Select channel 12');
  await expect(page.getByTestId('next-turn')).toHaveCount(0);
  for (let i = 0; i < 4; i++) await page.getByTestId('key-down').click();
  await expect(page.getByTestId('dialogue-setup-warning')).toHaveCount(0);
  await page.getByTestId('local-transcript-input').fill(dialogue.turns[0].youSay);
  await page.getByTestId('local-transcript-check').click();
  await expect(page.getByTestId('next-turn')).toBeVisible();
  expect(voiceRequests).toEqual([]);
});
