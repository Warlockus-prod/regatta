import { expect, test, type Page } from "@playwright/test";

// Radio work screen contract (owner, 2026-10-24): the radio stays on screen
// and usable whatever the learner scrolls in the task panel, on a phone, in
// the app embed and on a desktop; the radio section has four tabs.

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const SHORT_SCREENS = [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 667, height: 375 }];
const STATUS_SCREENS = [
  SHORT_SCREENS[0], SHORT_SCREENS[1], PHONE,
  { width: 400, height: 844 }, { width: 402, height: 874 }, { width: 430, height: 932 },
  SHORT_SCREENS[2],
];
const COURSE_STATUS = [
  { lang: "ru", waiting: "Жду действие", complete: "Выполнено", back: "Назад" },
  { lang: "en", waiting: "Waiting for action", complete: "Complete", back: "Back" },
  { lang: "pl", waiting: "Czekam na działanie", complete: "Wykonano", back: "Wstecz" },
  { lang: "es", waiting: "Esperando una acción", complete: "Completado", back: "Atrás" },
  { lang: "fr", waiting: "En attente d'une action", complete: "Terminé", back: "Retour" },
  { lang: "de", waiting: "Warte auf eine Aktion", complete: "Erledigt", back: "Zurück" },
  { lang: "it", waiting: "In attesa di un'azione", complete: "Completato", back: "Indietro" },
];

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

async function radioHeaderFits(page: Page, viewport: { width: number; height: number }) {
  await expect(page.getByTestId("radio-exit-app")).toBeVisible();
  const geometry = await page.getByTestId("radio-workspace-bar").evaluate((bar) => {
    const status = bar.querySelector<HTMLElement>('[data-testid="radio-workspace-status"]')!;
    const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
    const text = document.createRange();
    text.selectNodeContents(status);
    return {
      bar: rect(bar.getBoundingClientRect()),
      status: rect(status.getBoundingClientRect()),
      text: Array.from(text.getClientRects()).filter(r => r.width > 0).map(rect),
      buttons: Array.from(bar.querySelectorAll("button")).map(button => rect(button.getBoundingClientRect())),
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry.buttons).toHaveLength(4); // Back, Inspect, Sound, app Exit.
  expect(geometry.text.length).toBeGreaterThan(0);
  expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
  for (const button of geometry.buttons) {
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(button.left).toBeGreaterThanOrEqual(0);
    expect(button.right).toBeLessThanOrEqual(viewport.width);
  }
  for (const text of geometry.text) {
    expect(text.left).toBeGreaterThanOrEqual(geometry.bar.left - 1);
    expect(text.right).toBeLessThanOrEqual(geometry.bar.right + 1);
    expect(text.top).toBeGreaterThanOrEqual(geometry.bar.top - 1);
    expect(text.bottom).toBeLessThanOrEqual(geometry.bar.bottom + 1);
    for (const button of geometry.buttons) {
      const overlaps = text.left < button.right && text.right > button.left && text.top < button.bottom && text.bottom > button.top;
      expect(overlaps, "the complete status text must not run behind a toolbar button").toBe(false);
    }
  }
  if (viewport.width < 640) {
    expect(geometry.status.top).toBeGreaterThanOrEqual(Math.max(...geometry.buttons.map(button => button.bottom)));
  }
  await radioWholeInView(page, viewport);
  expect((await page.getByTestId("radio-dock").boundingBox())!.height).toBeGreaterThanOrEqual(90);
}

for (const { lang, waiting, complete, back } of COURSE_STATUS) {
  test(`native header layout keeps waiting, complete and free status readable in ${lang}`, async ({ page }) => {
    // Seven sizes and three actual UI states share one course run per locale.
    test.setTimeout(60_000);
    await skipTour(page);
    // Layout-only host stub: ?embed=1 alone does not render the native Exit.
    // It neither supplies native persistence nor claims native navigation QA.
    await page.addInitScript(() => {
      const host = window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void }; __radioLayoutMessages?: string[] };
      host.__radioLayoutMessages = [];
      host.ReactNativeWebView = { postMessage: message => host.__radioLayoutMessages!.push(message) };
    });
    await page.setViewportSize(STATUS_SCREENS[0]);
    await page.goto(`/radio/symulator?lang=${lang}&practice=free&embed=1`);
    await page.getByTestId("free-guided-lessons").click();
    const status = page.getByTestId("radio-workspace-status");
    await expect(status).toContainText(waiting);
    await expect(page.getByTestId("course-exit")).toHaveAccessibleName(back);
    await expect(page.getByTestId("course-exit")).toHaveAttribute("title", back);
    for (const viewport of STATUS_SCREENS) {
      await page.setViewportSize(viewport);
      await radioHeaderFits(page, viewport);
    }
    // Complete the real first lesson, rather than injecting a completion flag.
    const dial = await page.getByTestId("dial-center").boundingBox();
    await page.mouse.move(dial!.x + dial!.width / 2, dial!.y + dial!.height / 2);
    await page.mouse.down();
    try {
      await expect(status).toContainText(complete);
    } finally {
      await page.mouse.up();
    }
    await expect(page.getByTestId("course-next")).toBeEnabled();
    for (const viewport of STATUS_SCREENS) {
      await page.setViewportSize(viewport);
      await radioHeaderFits(page, viewport);
    }
    await page.getByTestId("course-exit").click();
    await expect(page).toHaveURL(/\/radio\/symulator\?.*practice=free/);
    await expect(page.getByTestId("free-practice-guide")).toBeVisible();
    for (const viewport of STATUS_SCREENS) {
      await page.setViewportSize(viewport);
      await radioHeaderFits(page, viewport);
    }
    await page.getByTestId("radio-exit-app").click();
    expect(await page.evaluate(() => (window as Window & { __radioLayoutMessages?: string[] }).__radioLayoutMessages?.some(message => JSON.parse(message).type === "radio-exit"))).toBe(true);
  });
}

test("the inline controls lesson returns to its visible guide without navigating away", async ({ page }) => {
  await skipTour(page);
  await page.goto("/radio/obsluga?lang=en&embed=1");
  await page.getByTestId("course-open").click();
  await expect(page.getByTestId("course-exit")).toHaveAccessibleName("Back to the guide");
  const guideHref = page.url();
  await page.getByTestId("course-exit").click();
  await expect(page.getByTestId("course-workspace")).toHaveCount(0);
  await expect(page).toHaveURL(guideHref);
  await expect(page.getByTestId("course-open")).toBeVisible();
});

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

test("direct radio practice, the scenario list and guided lessons retain their own navigation state", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/radio/symulator?practice=free&lang=en");
  await expect(page.getByTestId("free-practice-guide")).toBeVisible();
  await expect(page.getByTestId("lcd")).toBeVisible();
  await page.getByTestId("free-scenarios").click();
  await expect(page.getByTestId("start-fire-mayday")).toBeVisible();
  await expect(page.getByTestId("radio-dock")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Radio" }).getByRole("link", { name: "Practice", exact: true }).click();
  await expect(page.getByTestId("free-practice-guide")).toBeVisible();
  await page.getByTestId("free-guided-lessons").click();
  await expect(page.getByTestId("course-exit")).toBeVisible();
  await page.getByTestId("course-exit").click();
  await expect(page.getByTestId("free-practice-guide")).toBeVisible();
});

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
  await page.getByRole("button", { name: "Wyjaśnij działanie pokrętła i przycisków", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Pomoc", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("inspect-panel")).toBeVisible();
  await page.getByTestId("exit-scenario").click();
  expect(await page.evaluate(() => localStorage.getItem("sternik.radio.progress.v1"))).toBe(before);
});
