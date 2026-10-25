import { expect, test } from "@playwright/test";

const finish = 89 + 1 / 30;
const trim = { mainSheet: .3, jibSheet: .4, reef: .2, jibFurl: 1, mainHoisted: false };
const sample = { x: 500, y: 1250, heading: 45, twa: 45, speed: 5, lap: 0 };
const data = { code: "ABC234", ts: Date.UTC(2026, 9, 24), nickname: "Replay Sailor", difficulty: "easy", windStrength: "light",
  finishTimeSec: finish, mode: "pro", penaltySeconds: 5, views: 1,
  samples: [{ ...sample, t: 0 }, { ...sample, t: 88.5, x: 510, y: 1240, windDir: 358, trim }, { ...sample, t: finish, x: 500, y: 1251, lap: 2, windDir: 2, trim }], events: [],
  course: { marks: [{ pos: { x: 500, y: 180 }, type: "windward", radius: 14, label: "Windward", labelEn: "Windward", labelPl: "Windward" }],
    startLine: { a: { x: 400, y: 1250 }, b: { x: 600, y: 1250 } }, finishLine: { a: { x: 400, y: 1250 }, b: { x: 600, y: 1250 } } } };

test("shared world-space replay uses the same 3D scene and exact recording timeline", async ({ page }) => {
  // The real first frame, recorded endpoint, rate and camera value passed;
  // the storage check began at58.890s, exhausting the former60s total budget.
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("regatta.lang.v1", "ru"));
  await page.route("**/api/replay/ABC234", route => route.fulfill({ json: data }));
  await page.goto("/r/ABC234");
  const replay = page.getByTestId("race-replay-3d");
  await expect(page.getByTestId("shared-replay-3d")).toBeVisible();
  await expect(replay.locator("canvas")).toBeVisible({ timeout: 45_000 });
  await expect(replay.locator('[data-scene-startup="ready"]')).toBeVisible({ timeout: 45_000 });
  const timeline = replay.getByRole("slider");
  await expect(timeline).toHaveAttribute("min", "0");
  await expect(timeline).toHaveAttribute("max", String(finish));
  await timeline.focus();
  await timeline.press("End");
  await expect(replay.locator("output")).toHaveText("1:29");
  await expect(page.getByText(/Результат 1:34\.0/)).toBeVisible();
  await page.getByRole("button", { name: "2×", exact: true }).click();
  await expect(page.getByRole("button", { name: "2×", exact: true })).toHaveAttribute("aria-pressed", "true");
  const camera = replay.getByRole("combobox", { name: "Камера", exact: true });
  await camera.selectOption("high");
  await expect(camera).toHaveValue("high");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("regatta.race.camera.v1"))).toBe("high");
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = await replay.locator("canvas").boundingBox();
  const controls = await timeline.boundingBox();
  expect(canvas && controls && canvas.y + canvas.height <= controls.y + 1).toBeTruthy();
});

test("old shared replays without rig or course metadata remain readable", async ({ page }) => {
  const legacy = { ...data, mode: undefined, penaltySeconds: undefined, course: null,
    samples: data.samples.map(s => ({ t: s.t, x: s.x, y: s.y, heading: s.heading, twa: s.twa, speed: s.speed, lap: s.lap })) };
  await page.route("**/api/replay/ABC234", route => route.fulfill({ json: legacy }));
  await page.goto("/r/ABC234");
  await expect(page.getByTestId("race-replay-3d").locator("canvas")).toBeVisible({ timeout: 45_000 });
});
