import { expect, test, type Page } from "@playwright/test";

// Radio work screen contract (owner, 2026-10-24): the radio stays on screen
// and usable whatever the learner scrolls in the task panel, on a phone, in
// the app embed and on a desktop; the radio section has four tabs.

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

async function skipTour(page: Page) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("sternik.radio.onboard.v1", "1"); } catch { /* ignore */ }
  });
}

async function radioWholeInView(page: Page, viewport: { height: number }) {
  for (const id of ["lcd", "ptt", "distress-cover", "dial-center"]) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.y, id).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, id).toBeLessThanOrEqual(viewport.height + 1);
  }
}

async function scrollEverything(page: Page) {
  await page.getByTestId("radio-dock").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await page.mouse.wheel(0, 2500);
}

const SCREENS = [
  {
    name: "simulator scenario",
    path: "/radio/symulator?lang=pl",
    open: async (page: Page) => page.getByTestId("start-fire-mayday").click(),
  },
  {
    name: "controls lessons",
    path: "/radio/obsluga?lang=pl&kurs=1",
    open: async () => {},
  },
];

for (const viewport of [PHONE, DESKTOP]) {
  for (const screen of SCREENS) {
    test(`the radio stays on screen while the panel scrolls: ${screen.name}, ${viewport.width}px`, async ({ page }) => {
      await skipTour(page);
      await page.setViewportSize(viewport);
      await page.goto(screen.path);
      await screen.open(page);
      await expect(page.getByTestId("radio-dock")).toBeVisible();
      await radioWholeInView(page, viewport);
      await scrollEverything(page);
      await radioWholeInView(page, viewport);
      // the page behind the work screen does not scroll either
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
  }
}

test("the radio is operable from the pinned panel: power on, the task advances", async ({ page }) => {
  await skipTour(page);
  await page.setViewportSize(PHONE);
  await page.goto("/radio/symulator?lang=pl&embed=1");
  await page.getByTestId("start-fire-mayday").click();
  await scrollEverything(page);
  const dial = await page.getByTestId("dial-center").boundingBox();
  await page.mouse.move(dial!.x + dial!.width / 2, dial!.y + dial!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1150);
  await page.mouse.up();
  // the first step (power on) is done and the panel is back at its top
  await expect(page.getByTestId("task-card")).toContainText("2/5");
  await expect(page.getByTestId("task-card")).toBeInViewport();
  await radioWholeInView(page, PHONE);
});

test("the radio section has four tabs and the practice pages live in the Practice list", async ({ page }) => {
  await skipTour(page);
  await page.setViewportSize(PHONE);
  await page.goto("/radio/symulator?lang=pl");
  const tabs = page.getByRole("navigation", { name: "Radio" }).getByRole("link");
  await expect(tabs).toHaveCount(4);
  for (const label of ["Kurs", "Teoria", "Trening", "Egzamin"]) {
    await expect(tabs.filter({ hasText: label })).toBeInViewport();
  }
  await expect(page.getByTestId("practice-controls")).toHaveAttribute("href", /\/radio\/obsluga\?kurs=1/);
  await expect(page.locator('a[href="/radio/rozmowa"]')).toBeVisible();
  await expect(page.locator('a[href="/radio/pozycja"]')).toBeVisible();
  await expect(page.locator('a[href="/radio/zadania"]')).toBeVisible();
  // one Learn / Exam switch, not two buttons per scenario
  await expect(page.locator('[data-testid^="start-egzamin-"]')).toHaveCount(0);
  await page.getByTestId("mode-egzamin").click();
  await page.getByTestId("start-radio-check").click();
  await expect(page.getByTestId("task-card")).toContainText("Tryb egzaminu");
});
