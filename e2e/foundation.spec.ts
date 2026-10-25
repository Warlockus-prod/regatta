import { expect, test } from "@playwright/test";
import { bootcampLessons } from "../src/data/bootcamp";
import { getQuizForLesson } from "../src/data/bootcamp-quiz";

const legacy = JSON.stringify({ v: 1, data: { completed: bootcampLessons.map(lesson => lesson.id), current: "wind-direction", startedAt: 123, updatedAt: 456 } });
const questions = getQuizForLesson("wind-direction");
test.beforeEach(async ({ context }) => {
  await context.addInitScript(({ old }) => {
    localStorage.setItem("regatta.lang.v1", "ru");
    localStorage.setItem("regatta.v3.tour.v1", "1");
    if (!localStorage.getItem("foundation-fixture")) {
      localStorage.setItem("regatta.bootcamp", old);
      localStorage.setItem("foundation-fixture", "1");
    }
  }, { old: legacy });
});

test("legacy visits remain ungraded, original checks and draft resume survive reload, and practice returns to the same lesson", async ({ page }) => {
  await page.goto("/start?lesson=wind-direction&step=check");
  await expect(page.getByText("Просмотрено: 8/8", { exact: true })).toBeVisible();
  await expect(page.getByText("Пройдено проверок: 0/8", { exact: true })).toBeVisible();
  const first = questions[0].options.find(option => option.correct)!;
  await page.locator(`input[name="${questions[0].id}"][value="${first.id}"]`).check();
  await page.reload();
  await expect(page.locator(`input[name="${questions[0].id}"][value="${first.id}"]`)).toBeChecked();
  await expect(page.getByRole("button", { name: "Проверить ответы", exact: true })).toBeDisabled();
  for (const question of questions.slice(1)) await page.locator(`input[name="${question.id}"][value="${question.options.find(option => option.correct)!.id}"]`).check();
  await page.getByRole("button", { name: "Проверить ответы", exact: true }).click();
  await expect(page.getByText("Пройдено проверок: 1/8", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Пройдено проверок: 1/8", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("regatta.bootcamp"))).toBe(legacy);
  await page.getByRole("button", { name: "3. Практика", exact: true }).click();
  await page.getByRole("link", { name: "Открыть раздел для практики", exact: false }).click();
  await expect(page).toHaveURL(/\/courses\?fromLesson=wind-direction#wind$/);
  const footer = page.getByRole("region", { name: "Вернуться к уроку", exact: true });
  await expect(footer).toBeVisible();
  await footer.getByRole("link", { name: "Вернуться к уроку", exact: true }).click();
  await expect(page).toHaveURL(/\/start\?lesson=wind-direction&step=practice$/);
  await expect(page.getByText("Раздел практики открывался, результат не оценивался.", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.locator('main a[href="/start?lesson=points-of-sail"]')).toBeVisible();
});

test("failed durable check write keeps the counter unchanged and retries without losing the answers", async ({ page }) => {
  await page.goto("/start?lesson=wind-direction&step=check");
  for (const question of questions) await page.locator(`input[name="${question.id}"][value="${question.options.find(option => option.correct)!.id}"]`).check();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { foundationFail: true });
    Storage.prototype.setItem = function(key, value) {
      if (key === "regatta.foundation.web.v1" && (window as unknown as { foundationFail: boolean }).foundationFail) throw new DOMException("Quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Проверить ответы", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Не удалось сохранить");
  await expect(page.getByText("Пройдено проверок: 0/8", { exact: true })).toBeVisible();
  await page.evaluate(() => Object.assign(window, { foundationFail: false }));
  await page.getByRole("button", { name: "Повторить сохранение", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Пройдено проверок: 1/8", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Пройдено проверок: 1/8", { exact: true })).toBeVisible();
});


test("immersive Basics, Trainer and Race preserve a visible course return outside the scene", async ({ page }) => {
  for (const id of ["points-of-sail", "how-sail-works", "mini-race"]) {
    await page.goto(`/start?lesson=${id}&step=practice`);
    await page.getByRole("link", { name: "Открыть раздел для практики", exact: false }).click();
    await expect(page).toHaveURL(new RegExp(`fromLesson=${id}`));
    const link = page.getByTestId("foundation-return");
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(link).toHaveAttribute("href", `/start?lesson=${id}&step=practice`);
    if (id !== "mini-race") {
      // It is a sibling of the workspace, never an absolute overlay on canvas.
      expect(await link.evaluate(element => !element.closest('[data-testid="race-3d"], [data-testid="trainer-workspace"]'))).toBe(true);
    }
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/start\\?lesson=${id}&step=practice$`));
    await expect(page.getByText("Пройдено проверок: 0/8", { exact: true })).toBeVisible();
  }
});
