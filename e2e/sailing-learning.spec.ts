import { test, expect } from "@playwright/test";
import { learningCopy } from "../src/data/sailing-lab/learning-path";
import { lineActions, lineCopy } from "../src/data/sailing-lab/line-bench-copy";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    if (!localStorage.getItem("regatta.lang.v1")) localStorage.setItem("regatta.lang.v1", "en");
    localStorage.setItem("regatta.onboarding.v1", "1");
  });
});

for (const width of [320, 390, 1280]) {
  test(`lesson steps, terms and honest theory progress at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/learn/sails/rig-basics");
    const steps = page.getByRole("navigation", { name: "Lesson steps" });
    await expect(steps.getByRole("button", { name: "1 Understand" })).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("button", { name: "Save theory check" })).toHaveCount(0);
    await page.getByText("Terms in this lesson", { exact: false }).click();
    await expect(page.locator("dt").filter({ hasText: /^Halyard$/ })).toBeVisible();
    await steps.getByRole("button", { name: "2 Check" }).click();
    await expect(page.getByRole("heading", { name: "Check", exact: true })).toBeFocused();
    const save = page.getByRole("button", { name: "Save theory check" });
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Main halyard", exact: true }).click();
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Mainsheet", exact: true }).click();
    await expect(save).toBeEnabled();
    // Revisiting the explanation keeps the answer but cannot save it implicitly.
    await steps.getByRole("button", { name: "1 Understand" }).click();
    await steps.getByRole("button", { name: "2 Check" }).click();
    await expect(save).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem("regatta.sailing.theory.v1"))).toBeNull();
    await save.click();
    await expect(page.getByText("✓ Theory checked", { exact: true })).toBeVisible();
    await steps.getByRole("button", { name: "3 On the boat" }).click();
    await expect(page.getByText("Observation, not a skill assessment")).toBeVisible();
    await expect(page.getByRole("link", { name: "3D Boat" })).toHaveAttribute("href", "/simulator2");
    await page.getByRole("link", { name: "Next lesson" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Which wind the sail feels");
    await steps.getByRole("button", { name: "2 Check" }).click();
    await expect(page.getByRole("button", { name: "Save theory check" })).toBeDisabled();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("regatta.sailing.theory.v1")!).checked)).toEqual(["rig-basics"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("all seven locales have usable lesson step navigation on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/learn/sails/vang");
  for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
    await page.evaluate(value => localStorage.setItem("regatta.lang.v1", value), lang);
    await page.reload();
    const steps = page.getByRole("navigation", { name: learningCopy.steps[lang] });
    await expect(steps.getByRole("button")).toHaveCount(3);
    await steps.getByRole("button", { name: `2 ${learningCopy.check[lang]}`, exact: true }).click();
    await expect(page.getByRole("heading", { name: learningCopy.check[lang], exact: true })).toBeFocused();
    for (const button of await steps.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("storage failure keeps the theory check retryable", async ({ page }) => {
  await page.goto("/learn/sails/rig-basics");
  await page.getByRole("button", { name: "2 Check" }).click();
  await page.getByRole("button", { name: "Mainsheet", exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function(key, value) {
      if (key === "regatta.sailing.theory.v1" && fail) { fail = false; throw new Error("Test storage full"); }
      return original.call(this, key, value);
    };
  });
  const save = page.getByRole("button", { name: "Save theory check" });
  await save.click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not save" })).toBeVisible();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("✓ Theory checked", { exact: true })).toBeVisible();
});

test("mobile rig workspace keeps the boat state across camera and panel changes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 680 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/simulator-v3?study=shape&embed=1");
  await expect(page.getByText("Observe: mainsail shape")).toBeVisible();
  await expect(page.getByRole("button", { name: "FREE SAIL", exact: true })).toHaveCount(0);
  const scene = page.getByTestId("trainer-scene");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveAttribute("aria-pressed", "true");
  const tick = await scene.getAttribute("data-session-tick");
  await page.getByRole("button", { name: "Top", exact: true }).click();
  await expect(scene).toHaveAttribute("data-session-tick", tick!);
  await page.getByRole("button", { name: "Rear", exact: true }).click();
  await expect(scene).toHaveAttribute("data-session-tick", tick!);
  const length = page.getByRole("slider", { name: /Paid-out working length/ });
  await length.focus();
  await length.press("ArrowRight");
  const changed = await length.inputValue();
  await page.getByText("Conditions: wind and course", { exact: true }).click();
  await expect(page.getByRole("slider", { name: /Angle TWA/ })).toBeVisible();
  await page.getByText("Conditions: wind and course", { exact: true }).click();
  await expect(length).toHaveValue(changed);
  await page.getByRole("button", { name: "Session", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save checkpoint", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save checkpoint", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Checkpoint saved");
  await page.getByRole("button", { name: "Restore checkpoint", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Restored and paused");
  await expect(length).toHaveValue(changed);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("independent depth task grades settled geometry, not a click or a theory answer", async ({ page }) => {
  test.setTimeout(100_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/sails/outhaul");
  await page.getByRole("button", { name: "3 On the boat" }).click();
  await page.getByRole("link", { name: "Flatten the foot, keep the twist" }).click();
  await expect(page).toHaveURL(/assessment=depth/);
  const panel = page.getByRole("region", { name: "Independent check", exact: true });
  const check = panel.getByRole("button", { name: "Check result", exact: true });
  await expect(check).toBeVisible({ timeout: 45_000 });
  await check.click();
  await expect(panel.getByRole("status")).toContainText("Goal not met");
  await page.getByRole("button", { name: "Session", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save checkpoint", exact: true })).toBeDisabled();
  await page.getByTestId("shape-trim-controls").locator("summary").click();
  const outhaul = page.getByRole("slider", { name: /Outhaul: hauled/ });
  await outhaul.focus();
  await outhaul.press("Home");
  await expect(outhaul).toHaveValue("0");
  await expect(panel).toContainText("3.0/3 s", { timeout: 45_000 });
  await check.click();
  await expect(panel.getByText("Why did the shape change?", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "The camera changed the sail shape", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("Not quite");
  await panel.getByRole("button", { name: "Outhaul changes lower depth, not twist directly", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("Task completed in the learning model");
  expect(await page.evaluate(() => localStorage.getItem("regatta.sailing.theory.v1"))).toBeNull();
});

test("equipment bench handles unsafe exploration and a full offline procedure in all locales", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/learn/sails/winch-clutch");
  for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
    await page.evaluate(value => localStorage.setItem("regatta.lang.v1", value), lang);
    await page.reload();
    await page.getByRole("button", { name: `3 ${learningCopy.try[lang]}`, exact: true }).click();
    await context.setOffline(true);
    await page.getByText(lineCopy.controls[lang], { exact: true }).click();
    await page.getByRole("button", { name: lineActions.open[lang], exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: lineCopy.blocked[lang] })).toBeVisible();
    await expect(page.getByText(`${lineCopy.heldBy[lang]}: ${lineCopy.clutch[lang]}`, { exact: true })).toBeVisible();
    await page.getByText(lineCopy.controls[lang], { exact: true }).click();
    for (let step = 0; step < 11; step++) {
      await page.getByTestId("bench-next").click();
    }
    await expect(page.getByRole("status").filter({ hasText: lineCopy.complete[lang] })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("regatta.sailing.theory.v1"))).toBeNull();
    await page.getByRole("button", { name: lineCopy.reset[lang], exact: true }).click();
    await expect(page.getByTestId("bench-next")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await context.setOffline(false);
  }
  expect(errors).toEqual([]);
});
