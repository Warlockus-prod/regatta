import { test, expect, type BrowserContext } from '@playwright/test';

// ============================================================================
// Keyboard focus and language markup in the Polish-only exam trainers.
//
// - After "Dalej" the old question unmounted and focus fell to <body>: the next
//   question was 23 Tab presses away (28 on /radio/test). The new question's
//   heading now takes focus.
// - The sternik and radio courses are Polish whatever the site language, so on
//   the English site their content must sit inside lang="pl" (WCAG 3.1.2), or a
//   screen reader reads Polish with an English voice.
// ============================================================================

async function seed(context: BrowserContext, baseURL: string, lang: 'pl' | 'en') {
  const { hostname } = new URL(baseURL);
  await context.addCookies([{ name: 'regatta_lang', value: lang, domain: hostname, path: '/' }]);
  await context.addInitScript((l) => {
    try {
      window.localStorage.setItem('regatta.lang.v1', l);
      window.localStorage.setItem('regatta.onboarding.v1', '1');
    } catch { /* ignore */ }
  }, lang);
}

const focused = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el ? { tag: el.tagName, text: (el.textContent ?? '').trim() } : null;
  });

test.describe('Quiz focus follows the question', () => {
  test('sternik trainer: after "Dalej" the next question heading has focus', async ({ context, page, baseURL }) => {
    await seed(context, baseURL!, 'pl');
    await page.goto('/sternik/test');
    await page.getByRole('button', { name: /Szybkie 20/ }).click();

    const first = page.getByRole('heading', { level: 2 }).first();
    await expect(first).toBeVisible();
    const firstText = (await first.textContent())?.trim();

    await page.locator('button:has(> span:text-is("A"))').first().click();
    await page.getByRole('button', { name: /Dalej/ }).click();

    await expect(page.getByText(/^2 \/ 20$/)).toBeVisible();
    const f = await focused(page);
    expect(f?.tag).toBe('H2');
    expect(f?.text).not.toBe(firstText);
    expect(f?.text).toBe((await page.getByRole('heading', { level: 2 }).first().textContent())?.trim());
  });

  test('radio trainer: after "Dalej" the next question heading has focus', async ({ context, page, baseURL }) => {
    await seed(context, baseURL!, 'pl');
    await page.goto('/radio/test');
    await page.getByTestId('start-training').click();
    await page.locator('#radio-src-trainer button:has(> span:text-is("A"))').first().click();
    await page.getByTestId('next-question').click();

    const f = await focused(page);
    expect(f?.tag).toBe('H2');
    expect(f?.text?.length).toBeGreaterThan(5);
  });
});

test.describe('Polish course content is marked lang="pl"', () => {
  test('on the English site, /sternik/test content is inside [lang="pl"]', async ({ context, page, baseURL }) => {
    await seed(context, baseURL!, 'en');
    await page.goto('/sternik/test');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('[lang="pl"] h1').first()).toBeVisible();

    await page.getByRole('button', { name: /Szybkie 20/ }).click();
    const question = page.getByRole('heading', { level: 2 }).first();
    await expect(question).toBeVisible();
    expect(await question.evaluate((el) => el.closest('[lang]')?.getAttribute('lang'))).toBe('pl');
  });
});
