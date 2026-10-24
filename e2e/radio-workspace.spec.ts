import { expect, test, type Page } from "@playwright/test";

// Radio work screen contract (owner, 2026-10-24): the radio stays on screen
// and usable whatever the learner scrolls in the task panel, on a phone, in
// the app embed and on a desktop; the radio section has four tabs.

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const SHORT_SCREENS = [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 667, height: 375 }];

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

for (const viewport of [PHONE, DESKTOP, ...SHORT_SCREENS]) {
  for (const screen of SCREENS) {
    test(`the radio stays on screen while the panel scrolls: ${screen.name}, ${viewport.width}px`, async ({ page }) => {
      await skipTour(page);
      await page.setViewportSize(viewport);
      await page.goto(screen.path);
      await screen.open(page);
      await expect(page.getByTestId("radio-dock")).toBeVisible();
      await radioWholeInView(page, viewport);
      const dock = await page.getByTestId("radio-dock").boundingBox();
      expect(dock!.height).toBeGreaterThanOrEqual(90);
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

test("the whole radio course follows the site language and preserves the Polish exam wording", async ({ page }) => {
  await skipTour(page);
  await page.setViewportSize(PHONE);
  await page.goto("/radio/symulator?lang=de");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ICOM");
  await page.getByTestId("start-radio-check").click();
  // German instruction, and the run happens somewhere: one of the four venues
  await expect(page.getByTestId("current-todo")).toContainText("Funkgerät");
  await page.getByRole("tab", { name: "Situation", exact: true }).click();
  await expect(page.getByTestId("variant-area")).toContainText(/Danziger Bucht|Solent|Palma|Bodrum/);
  await page.goto("/radio/teoria?lang=de");
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Zrozum radio morskie");
  await page.goto("/radio/test?lang=de");
  await page.getByTestId("start-training").click();
  await expect(page.locator('[data-radio-verbatim="true"]')).toBeAttached();
  await expect(page.locator('[data-radio-verbatim="true"]')).not.toBeVisible();
});

for (const viewport of SHORT_SCREENS) {
  test(`opening MENU preserves the LCD and task budget at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await skipTour(page);
    await page.setViewportSize(viewport);
    await page.goto("/radio/symulator?lang=pl&embed=1");
    await page.getByTestId("start-free-practice").click();
    const before = await page.getByTestId("lcd").boundingBox();
    await page.getByTestId("dial-center").dispatchEvent("pointerdown", { pointerId: 1 });
    await page.waitForTimeout(1150);
    await page.getByTestId("dial-center").dispatchEvent("pointerup", { pointerId: 1 });
    await page.getByTestId("key-menu").click();
    const after = await page.getByTestId("lcd").boundingBox();
    expect(after!.height).toBe(before!.height);
    await radioWholeInView(page, viewport);
    await expect(page.getByTestId("free-practice-guide")).toBeInViewport();
    expect((await page.getByTestId("radio-dock").boundingBox())!.height).toBeGreaterThanOrEqual(90);
  });
}

test("free practice uses the real controls and does not invent completed scenarios", async ({ page }) => {
  await skipTour(page);
  await page.goto("/radio/symulator?lang=pl");
  const before = await page.evaluate(() => localStorage.getItem("sternik.radio.progress.v1"));
  await page.getByTestId("start-free-practice").click();
  await page.getByRole("button", { name: "Wyjaśnij pokrętło i przyciski" }).click();
  await expect(page.getByRole("tab", { name: "Pomoc", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("inspect-panel")).toBeVisible();
  await page.getByTestId("exit-scenario").click();
  expect(await page.evaluate(() => localStorage.getItem("sternik.radio.progress.v1"))).toBe(before);
});
