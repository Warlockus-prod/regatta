import { expect, test, type Page } from "@playwright/test";

// Trainer controls contract (docs/design/trainer-controls-concept.md, owner
// decisions 2026-10-19): on a phone the boat stays on screen whatever the
// learner does in the control dock, and the optional wheels are real,
// keyboard-operable sliders that move the same inputs.

const PHONE = { width: 390, height: 844 };
const ROUTES = [
  { path: "/simulator?embed=1&lang=en", scene: "canvas" },
  { path: "/simulator-v3?embed=1&lang=en", scene: '[data-testid="trainer-scene"]' },
  { path: "/simulator2?embed=1&lang=en", scene: "canvas" },
];

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
    await expect(page.getByTestId("control-dock")).toBeVisible({ timeout: 25_000 });
    await expect(page.locator(route.scene).first()).toBeVisible({ timeout: 25_000 });
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
  await helm.focus();
  await helm.press("ArrowLeft");
  // One step is 5 degrees of course; on starboard tack bow to port bears away.
  await expect(helm).not.toHaveAttribute("aria-valuenow", String(before));
  const main = page.getByRole("slider", { name: "Mainsheet", exact: true });
  const eased = Number(await main.getAttribute("aria-valuenow"));
  await main.focus();
  await main.press("ArrowDown");
  await expect(main).toHaveAttribute("aria-valuenow", String(Math.round(eased - 5)));
});
