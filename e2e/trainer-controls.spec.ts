import { expect, test, type Page } from "@playwright/test";

// Trainer controls contract (docs/design/trainer-controls-concept.md, owner
// decisions 2026-10-19): on a phone the boat stays on screen whatever the
// learner does in the control dock, and the optional wheels are real,
// keyboard-operable sliders that move the same inputs.

const PHONE = { width: 390, height: 844 };
const ROUTES = [
  { path: "/simulator?embed=1&lang=en", scene: "canvas", firstFrame: false },
  { path: "/simulator-v3?embed=1&lang=en", scene: '[data-testid="trainer-scene"]', firstFrame: true },
  { path: "/simulator2?embed=1&lang=en", scene: "canvas", firstFrame: true },
];

async function primaryCaptions(page: Page, includeLayout = false) {
  return page.getByTestId("wheel-deck").evaluate((deck, includeLayout) => {
    const panel = deck.closest('[role="tabpanel"]')!;
    const bounds = panel.getBoundingClientRect();
    const inside = (r: DOMRect) => r.width > 0 && r.height > 0
      && r.left >= Math.max(0, bounds.left) - 1 && r.top >= Math.max(0, bounds.top) - 1
      && r.right <= Math.min(innerWidth, bounds.right) + 1 && r.bottom <= Math.min(innerHeight, bounds.bottom) + 1;
    const wheels = Array.from(deck.querySelectorAll('[role="slider"]')).map(wheel => {
      const caption = wheel.lastElementChild!;
      const r = caption.getBoundingClientRect();
      return { name: wheel.getAttribute("aria-label"), caption: caption.textContent?.trim(),
        captionBounds: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
        insidePanel: inside(r), wheelInsidePanel: inside(wheel.getBoundingClientRect()) };
    });
    const layout = includeLayout ? (() => {
      const box = (element: Element | null) => {
        if (!element) throw new Error("Trainer geometry is not ready");
        const { x, y, width, height } = element.getBoundingClientRect();
        if (width <= 0 || height <= 0) throw new Error("Trainer geometry has no visible area");
        return { x, y, width, height };
      };
      const readouts = document.querySelector('[data-testid="trainer-readouts"]')!;
      const bounds = readouts.getBoundingClientRect();
      const metrics = readouts.firstElementChild!.getBoundingClientRect();
      return { scene: box(document.querySelector('[data-testid="trainer-scene"]')!),
        dock: box(document.querySelector('[data-testid="control-dock"]')!),
        wheels: Array.from(deck.querySelectorAll('[role="slider"]')).map(wheel => ({ name: wheel.getAttribute("aria-label"), box: box(wheel) })),
        readouts: { scrollTop: readouts.scrollTop, content: readouts.scrollHeight, height: readouts.clientHeight,
          metricsInside: metrics.width > 0 && metrics.height > 0 && metrics.left >= Math.max(0, bounds.left) - 1
            && metrics.top >= Math.max(0, bounds.top) - 1 && metrics.right <= Math.min(innerWidth, bounds.right) + 1
            && metrics.bottom <= Math.min(innerHeight, bounds.bottom) + 1 } };
    })() : null;
    return { scrollTop: panel.scrollTop, count: wheels.length, wheels, layout,
      allVisibleTogether: wheels.length === 3 && wheels.every(wheel => wheel.insidePanel && wheel.wheelInsidePanel) };
  }, includeLayout);
}

async function sceneInView(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height + 1);
  expect(box!.height).toBeGreaterThan(150);
}

for (const route of ROUTES) {
  test(`the boat stays on screen while the dock scrolls: ${route.path}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(PHONE);
    await page.goto(route.path);
    const deadline = Date.now() + 25_000;
    const remaining = () => Math.max(1, deadline - Date.now());
    await expect(page.getByTestId("control-dock")).toBeVisible({ timeout: remaining() });
    await expect(page.locator(route.scene).first()).toBeVisible({ timeout: remaining() });
    if (route.firstFrame) {
      await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });
    }
    await page.getByRole("tab", { name: "More", exact: true }).click();
    await page.getByRole("tabpanel").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await page.mouse.wheel(0, 2000);
    await sceneInView(page, route.scene);
    const doc = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(doc).toBeLessThanOrEqual(1);
  });
}

test("wheel mode: the helm and both sheets are keyboard sliders on the Trainer", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.addInitScript(() => {
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels" }));
  });
  await page.goto("/simulator-v3?embed=1&lang=en");
  const helm = page.getByRole("slider", { name: "Helm", exact: true });
  await expect(helm).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("slider", { name: "Mainsheet", exact: true })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Jib sheet", exact: true })).toBeVisible();
  const before = Number(await helm.getAttribute("aria-valuenow"));
  await helm.press("ArrowLeft");
  // One step is 5 degrees of course; on starboard tack bow to port bears away.
  await expect(helm).not.toHaveAttribute("aria-valuenow", String(before));
  const main = page.getByRole("slider", { name: "Mainsheet", exact: true });
  const eased = Number(await main.getAttribute("aria-valuenow"));
  await main.press("ArrowDown");
  await expect(main).toHaveAttribute("aria-valuenow", String(Math.round(eased - 5)));
});

// Owner rule 2026-10-21: on a phone nothing is drawn over the boat. Status and
// buttons sit above the scene, readouts under it, and the views drawer slides
// out from the side only when asked for, then slides back after a choice.
for (const route of [
  { path: "/simulator-v3?embed=1&lang=en", scene: '[data-testid="trainer-scene"]', choice: "Rear" },
  { path: "/simulator2?embed=1&lang=en", scene: "canvas", choice: "Deck" },
]) {
  test(`nothing covers the boat, views slide out on demand: ${route.path}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(PHONE);
    await page.goto(route.path);
    const scene = page.locator(route.scene).first();
    const deadline = Date.now() + 25_000;
    const remaining = () => Math.max(1, deadline - Date.now());
    await expect(scene).toBeVisible({ timeout: remaining() });
    await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });
    const s = (await scene.boundingBox())!;
    const bar = (await page.getByTestId("scene-bar").boundingBox())!;
    const readouts = (await page.getByTestId("trainer-readouts").boundingBox())!;
    expect(bar.y + bar.height).toBeLessThanOrEqual(s.y + 1);
    expect(readouts.y).toBeGreaterThanOrEqual(s.y + s.height - 1);
    const drawer = page.getByTestId("scene-drawer").first();
    await expect(drawer).toBeHidden();
    await page.getByTestId("scene-view-button").click();
    await expect(drawer).toBeVisible();
    await page.getByRole("button", { name: route.choice, exact: true }).click();
    await expect(drawer).toBeHidden();
  });
}

test("wheel mode: wheels and Diagnostics occupy the dock without an empty band", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.addInitScript(() => {
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels" }));
  });
  await page.goto("/simulator-v3?embed=1&lang=en");
  const deadline = Date.now() + 20_000;
  const remaining = () => Math.max(1, deadline - Date.now());
  await expect(page.getByRole("slider", { name: "Helm", exact: true })).toBeVisible({ timeout: remaining() });
  await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });
  const dockElement = page.getByTestId("control-dock");
  const summary = dockElement.locator("details > summary");
  await expect(summary).toHaveCount(1);
  await expect(summary).toHaveText("Diagnostics");
  await expect(summary).toBeVisible();
  const utility = dockElement.locator("details").filter({ has: page.locator("summary", { hasText: /^Diagnostics$/ }) });
  const dock = (await dockElement.boundingBox())!;
  const deck = (await page.getByTestId("wheel-deck").boundingBox())!;
  const hint = page.getByTestId("wheel-hint");
  const hintBox = await hint.count() ? await hint.boundingBox() : null;
  const utilityBox = (await utility.boundingBox())!;
  const target = (await summary.boundingBox())!;
  const scene = (await page.getByTestId("trainer-scene").boundingBox())!;
  // Diagnostics is occupied content, not the empty band this contract rejects.
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(utilityBox.y).toBeGreaterThanOrEqual(deck.y + deck.height);
  // The full, localized help note is occupied secondary content after the
  // wheels. Measure empty space after it instead of misclassifying its text.
  if (hintBox) {
    await expect(hint).toHaveText(/\S/);
    expect(hintBox.y).toBeGreaterThanOrEqual(deck.y + deck.height);
    expect(hintBox.y - (deck.y + deck.height)).toBeLessThan(24);
  }
  const occupiedEnd = hintBox ? hintBox.y + hintBox.height : deck.y + deck.height;
  expect(utilityBox.y).toBeGreaterThanOrEqual(occupiedEnd);
  expect(utilityBox.y - occupiedEnd).toBeLessThan(24);
  expect(dock.y + dock.height - (utilityBox.y + utilityBox.height)).toBeLessThan(24);
  expect(dock.y).toBeGreaterThanOrEqual(scene.y + scene.height - 1);
  expect(utilityBox.y + utilityBox.height).toBeLessThanOrEqual(PHONE.height);
  expect(deck.y + deck.height).toBeLessThanOrEqual(PHONE.height);
});

// Reproduce the owner's compact web audit, rather than checking only an
// embedded tall phone. Auxiliary navigation must not consume another row
// above the scene; every destination remains in the reserved More panel.
test("compact web Trainer gives the scene room and keeps utilities in More", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 569, height: 750 });
  await page.addInitScript(() => {
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels" }));
    localStorage.setItem("regatta_theme", "light");
  });
  await page.goto("/simulator-v3?lang=en");
  const deadline = Date.now() + 25_000;
  const remaining = () => Math.max(1, deadline - Date.now());
  await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });
  const scene = page.getByTestId("trainer-scene");
  const initialLayout = await scene.evaluate(element => {
    const box = (target: Element | null) => {
      if (!target) throw new Error("Initial Trainer geometry is not ready");
      const { x, y, width, height } = target.getBoundingClientRect();
      if (width <= 0 || height <= 0) throw new Error("Initial Trainer geometry has no visible area");
      return { x, y, width, height };
    };
    return { scene: box(element), bar: box(document.querySelector('[data-testid="scene-bar"]')!) };
  });
  const initial = initialLayout.scene;
  // The audited runtime provided only160px at these exact dimensions.
  expect(initial.height).toBeGreaterThanOrEqual(240);
  // A visible wheel alone does not prove its name, value and steering meaning
  // fit. Inspect the whole set before focus or scroll can conceal clipping.
  await expect.poll(() => primaryCaptions(page)).toMatchObject({ scrollTop: 0, count: 3, allVisibleTogether: true });
  const bar = initialLayout.bar;
  expect(bar.y + bar.height).toBeLessThanOrEqual(initial.y + 1);
  await expect(page.getByRole("button", { name: "Show tour", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
  // Keep the same actual scene through rotation. The short web landscape
  // previously left only122px for controls and cut every lower caption.
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready");
  let validatedLandscape: Awaited<ReturnType<typeof primaryCaptions>> | undefined;
  await expect.poll(async () => {
    validatedLandscape = await primaryCaptions(page, true);
    return validatedLandscape;
  }).toMatchObject({ scrollTop: 0, count: 3, allVisibleTogether: true, layout: { readouts: { scrollTop: 0 } } });
  if (!validatedLandscape?.layout) throw new Error("Validated landscape geometry is unavailable");
  const landscapeLayout = validatedLandscape.layout;
  const landscape = landscapeLayout.scene;
  const sideDock = landscapeLayout.dock;
  expect(landscape.height).toBeGreaterThanOrEqual(150);
  expect(landscape.y).toBeGreaterThanOrEqual(0);
  expect(landscape.y + landscape.height).toBeLessThanOrEqual(390);
  expect(sideDock.x).toBeGreaterThanOrEqual(landscape.x + landscape.width - 1);
  for (const name of ["Helm", "Mainsheet", "Jib sheet"]) {
    const wheel = page.getByRole("slider", { name, exact: true });
    await expect(wheel).toHaveAccessibleName(name);
    const box = landscapeLayout.wheels.find(wheel => wheel.name === name)?.box;
    if (!box) throw new Error("Named wheel geometry is unavailable");
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const readouts = page.getByTestId("trainer-readouts");
  const readings = landscapeLayout.readouts;
  expect(readings.scrollTop).toBe(0);
  expect(readings.metricsInside).toBe(true);
  if (readings.content > readings.height + 1) {
    await readouts.focus();
    await expect(readouts).toBeFocused();
    await readouts.press("End");
    await expect.poll(() => readouts.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await readouts.press("Home");
    await expect.poll(() => readouts.evaluate(element => element.scrollTop)).toBe(0);
  }
  const helm = page.getByRole("slider", { name: "Helm", exact: true });
  const before = await helm.getAttribute("aria-valuenow");
  await helm.press("ArrowLeft");
  await expect(helm).not.toHaveAttribute("aria-valuenow", before ?? "");
  await expect.poll(() => primaryCaptions(page)).toMatchObject({ scrollTop: 0, count: 3, allVisibleTogether: true });
  await page.setViewportSize({ width: 569, height: 750 });
  await expect.poll(() => primaryCaptions(page)).toMatchObject({ scrollTop: 0, count: 3, allVisibleTogether: true });
  await page.getByRole("tab", { name: "More", exact: true }).click();
  const panel = page.getByRole("tabpanel");
  const lessons = panel.getByRole("link", { name: "Lessons", exact: true });
  await lessons.scrollIntoViewIfNeeded();
  await expect(lessons).toBeVisible();
  await expect(panel.getByRole("button", { name: "Share", exact: true })).toBeVisible();
  const moreLayout = await lessons.evaluate(element => {
    const box = (target: Element | null) => {
      if (!target) throw new Error("More panel geometry is not ready");
      const { x, y, width, height } = target.getBoundingClientRect();
      if (width <= 0 || height <= 0) throw new Error("More panel geometry has no visible area");
      return { x, y, width, height };
    };
    return { link: box(element), scene: box(document.querySelector('[data-testid="trainer-scene"]')!),
      dock: box(document.querySelector('[data-testid="control-dock"]')!) };
  });
  const linkBox = moreLayout.link;
  expect(linkBox.height).toBeGreaterThanOrEqual(44);
  const after = moreLayout.scene;
  expect(after.height).toBeGreaterThanOrEqual(240);
  const dock = moreLayout.dock;
  expect(dock.y).toBeGreaterThanOrEqual(after.y + after.height - 1);
});

test("short portrait Trainer keeps wheel controls and Diagnostics reachable below the boat", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels" }));
  });
  await page.goto("/simulator-v3?embed=1&lang=en");
  const deadline = Date.now() + 25_000;
  const remaining = () => Math.max(1, deadline - Date.now());
  await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });
  const scene = (await page.getByTestId("trainer-scene").boundingBox())!;
  expect(scene.height).toBeGreaterThanOrEqual(150);
  const dock = (await page.getByTestId("control-dock").boundingBox())!;
  expect(dock.y).toBeGreaterThanOrEqual(scene.y + scene.height - 1);
  await expect.poll(() => primaryCaptions(page)).toMatchObject({ scrollTop: 0, count: 3, allVisibleTogether: true });
  for (const name of ["Helm", "Mainsheet", "Jib sheet"]) {
    const wheel = page.getByRole("slider", { name, exact: true });
    await wheel.scrollIntoViewIfNeeded();
    const box = (await wheel.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y).toBeGreaterThanOrEqual(scene.y + scene.height - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(568);
  }
  const diagnostics = page.getByTestId("control-dock").locator("details > summary");
  await diagnostics.scrollIntoViewIfNeeded();
  await expect(diagnostics).toHaveText("Diagnostics");
  const target = (await diagnostics.boundingBox())!;
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.y).toBeGreaterThanOrEqual(scene.y + scene.height - 1);
  expect(target.y + target.height).toBeLessThanOrEqual(568);
  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(1);
});

// TestFlight 74 feedback (2026-11-01): the race wind card sits over the
// Trainer scene in 3D and on the top view, reads the live boat, and stays out
// of the side and rear drawings, which keep their own header in that corner.
test("the race wind card sits over the 3D and top views and follows the boat", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize(PHONE);
  const deadline = Date.now() + 25_000;
  const remaining = () => Math.max(1, deadline - Date.now());
  const scene = page.getByTestId("trainer-scene");
  const card = scene.getByTestId("trainer-wind-box");
  const chooseView = async (name: string) => {
    await page.getByTestId("scene-view-button").click();
    await page.getByTestId("scene-drawer").first().getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId("scene-drawer").first()).toBeHidden();
  };
  const cardInsideScene = async () => {
    const s = (await scene.boundingBox())!;
    const c = (await card.boundingBox())!;
    expect(c.x).toBeGreaterThanOrEqual(s.x - 1);
    expect(c.y).toBeGreaterThanOrEqual(s.y - 1);
    expect(c.x + c.width).toBeLessThanOrEqual(s.x + s.width / 2 + 1);
    expect(c.y + c.height).toBeLessThanOrEqual(s.y + s.height + 1);
  };

  await page.goto("/simulator-v3?embed=1&lang=en&twa=120&tack=s&tws=10");
  await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });
  await expect(card).toBeVisible({ timeout: remaining() });
  await expect(card.getByTestId("race-wind-compass")).toBeVisible();
  await expect(card.getByTestId("race-true-wind-angle")).toHaveText("120°");
  await expect(card.getByTestId("race-true-wind-side")).toHaveAttribute("data-side", "starboard");
  await expect(card.getByTestId("race-true-wind-speed")).toHaveText(/^10\.\d kn$/);
  await cardInsideScene();

  await page.goto("/simulator-v3?embed=1&lang=en&twa=60&tack=p&tws=16");
  await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: remaining() });
  await expect(card.getByTestId("race-true-wind-angle")).toHaveText("60°", { timeout: remaining() });
  await expect(card.getByTestId("race-true-wind-side")).toHaveAttribute("data-side", "port");
  await expect(card.getByTestId("race-true-wind-speed")).toHaveText(/^1[56]\.\d kn$/);
  await expect(card.getByTestId("trainer-boat-speed")).toHaveText(/^\d+\.\d kn$/);

  await chooseView("Top");
  await expect(card).toBeVisible();
  await expect(card.getByTestId("race-wind-compass")).toHaveCount(0);
  await expect(card.getByTestId("trainer-wind-heading")).toContainText("TWA");
  await expect(card.getByTestId("race-true-wind-angle")).toHaveText("60°");
  await cardInsideScene();

  for (const name of ["Rear", "Side"]) {
    await chooseView(name);
    await expect(scene.getByTestId("trainer-wind-box")).toHaveCount(0);
  }
});
