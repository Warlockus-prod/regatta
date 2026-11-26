import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// Manoeuvres (/manoeuvres) and the radio phonetic drill (/radio/alfabet).
// Contract: a fresh device sees the exercise list with only the first exercise
// of each track open; the briefing starts a live attempt; a throttle detent
// moves the boat (HUD speed and the scene's speed rise from zero) and holding
// the helm button turns the rudder; no page error and no console error.
// The drill page answers a recognition question and gives feedback.
// ============================================================================

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  return errors;
}

test('Manoeuvres: list, briefing, start, throttle and helm change the HUD', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/manoeuvres?lang=en');

  const first = page.getByTestId('exercise-alongside-onshore');
  await expect(first).toBeEnabled();
  // The second engine exercise opens only after a star on the first.
  await expect(page.getByTestId('exercise-alongside-offshore')).toBeDisabled();

  await first.click();
  const start = page.getByTestId('start');
  await expect(start).toBeVisible();
  await start.click();

  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-status', 'running');
  const speed = page.getByTestId('hud-speed');
  const before = await speed.textContent();
  expect(Number(await scene.getAttribute('data-speed'))).toBeCloseTo(0, 2);

  await page.getByTestId('throttle-1').click();
  await expect(page.getByTestId('throttle-1')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => Number(await scene.getAttribute('data-speed'))).toBeGreaterThan(0.2);
  await expect(speed).not.toHaveText(before ?? '');

  const helm = page.getByTestId('helm-starboard');
  const box = (await helm.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(async () => Number(await scene.getAttribute('data-helm'))).toBeGreaterThan(0.1);
  await page.mouse.up();
  const held = Number(await scene.getAttribute('data-helm'));

  await page.getByTestId('helm-centre').click();
  await expect.poll(async () => Number(await scene.getAttribute('data-helm'))).toBe(0);
  expect(held).toBeGreaterThan(0.1);

  expect(errors).toEqual([]);
});

test('Manoeuvres on a phone: the controls stay reachable without horizontal scroll', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/manoeuvres?lang=ru');
  await page.getByTestId('exercise-alongside-onshore').click();
  await page.getByTestId('start').click();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-status', 'running');
  for (const id of ['helm-port', 'helm-centre', 'helm-starboard', 'throttle-0']) {
    const control = page.getByTestId(id);
    await control.scrollIntoViewIfNeeded();
    const box = (await control.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('Radio phonetic drill: learn table and a recognition answer', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/radio/alfabet?lang=en');
  await expect(page.getByTestId('phonetic-table')).toBeVisible();
  await expect(page.getByTestId('phonetic-A')).toContainText('Alfa');

  await page.getByTestId('tab-recognise').click();
  const option = page.getByTestId('recognise-option').first();
  await expect(option).toBeEnabled();
  await option.click();
  await expect(page.getByTestId('recognise-feedback')).toBeVisible();
  await page.getByTestId('recognise-next').click();
  await expect(page.getByTestId('recognise-option').first()).toBeEnabled();

  expect(errors).toEqual([]);
});
