import { expect, test } from "@playwright/test";
import { bootcampLessons } from "../src/data/bootcamp";
import { getQuizForLesson } from "../src/data/bootcamp-quiz";
import { sailShapeContent } from "../src/data/sail-shape";
import { parseDiagnosticPersistence } from "../src/lib/diagnostics";

const legacy = JSON.stringify({ v: 1, data: { completed: bootcampLessons.map(lesson => lesson.id), current: "wind-direction", startedAt: 123, updatedAt: 456 } });
const questions = getQuizForLesson("wind-direction");
test.beforeEach(async ({ context }) => {
  await context.addInitScript(({ old }) => {
    if (!localStorage.getItem("foundation-fixture")) {
      localStorage.setItem("regatta.lang.v1", "ru");
      localStorage.setItem("regatta.v3.tour.v1", "1");
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
  await page.getByRole("link", { name: "Ветер на 3D-лодке", exact: false }).click();
  await expect(page).toHaveURL(/\/simulator-v3\?fromLesson=wind-direction$/);
  // Return without waiting for startup; ready-scene acceptance has its own30s case.
  const courseAngle = page.getByRole("slider", { name: /Угол TWA/ });
  await expect(courseAngle).toHaveAttribute("min", "0");
  await courseAngle.press("Home");
  await expect(courseAngle).toHaveValue("0");
  const courseReturn = page.getByTestId("foundation-return");
  await expect(courseReturn).toBeVisible();
  await courseReturn.click();
  await expect(page).toHaveURL(/\/start\?lesson=wind-direction&step=practice$/);
  await expect(page.getByText("Раздел практики открывался, результат не оценивался.", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.locator('main a[href="/start?lesson=points-of-sail"]')).toBeVisible();
});

test("first wind practice renders the whole yacht and returns after a real first frame without grading", async ({ page }) => {
  await page.goto("/start?lesson=wind-direction&step=practice");
  await page.getByRole("link", { name: "Ветер на 3D-лодке", exact: false }).click();
  await expect(page).toHaveURL(/\/simulator-v3\?fromLesson=wind-direction$/);
  await expect(page.locator("[data-scene-startup]")).toHaveAttribute("data-scene-startup", "ready", { timeout: 25000 });
  await expect(page.getByTestId("boat-view-presets").getByRole("button", { name: "Вся яхта", exact: true })).toHaveAttribute("aria-pressed", "true");
  const courseReturn = page.getByTestId("foundation-return");
  await expect(courseReturn).toBeVisible();
  await courseReturn.click();
  await expect(page).toHaveURL(/\/start\?lesson=wind-direction&step=practice$/);
  await expect(page.getByText("Раздел практики открывался, результат не оценивался.", { exact: true })).toBeVisible();
  await expect(page.getByText("Пройдено проверок: 0/8", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Не удалось сохранить");
  await expect(page.getByText("Пройдено проверок: 0/8", { exact: true })).toBeVisible();
  await page.evaluate(() => Object.assign(window, { foundationFail: false }));
  await page.getByRole("button", { name: "Повторить сохранение", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
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
    // DOM geometry can report 43.999992px for a 44px target. Keep millipixel precision.
    expect(Number((await link.boundingBox())!.height.toFixed(3))).toBeGreaterThanOrEqual(44);
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


for (const lang of ["pl", "ru", "en"] as const) {
  test(`illustration and force diagram retain their meaning on a narrow ${lang} screen without grading`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/start?lesson=how-sail-works");
    await page.getByRole("button", { name: "Choose language", exact: true }).click();
    await page.getByRole("menuitemradio", { name: new RegExp({ pl: "Polski", ru: "Русский", en: "English" }[lang]) }).click();
    const role = { pl: "Rola kila", ru: "Роль киля", en: "Keel's role" }[lang];
    const diagramState = page.getByRole("button", { name: role, exact: true });
    await diagramState.click();
    await expect(diagramState).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: sailShapeContent.picture[lang], exact: true }).click();
    const image = page.getByRole("img", { name: sailShapeContent.frames[0].description[lang], exact: true });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const bounds = await image.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(-1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
    for (const label of [sailShapeContent.scheme[lang], sailShapeContent.picture[lang], ...sailShapeContent.frames.map(frame => frame.label[lang])]) {
      const control = page.getByRole("button", { name: label, exact: true });
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(43.999);
      expect(await control.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    }
    await page.getByRole("button", { name: sailShapeContent.frames[1].label[lang], exact: true }).click();
    await expect(page.getByRole("img", { name: sailShapeContent.frames[1].description[lang], exact: true })).toBeVisible();
    await expect.poll(() => page.getByRole("img", { name: sailShapeContent.frames[1].description[lang], exact: true }).evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(page.getByText(sailShapeContent.frames[1].note[lang], { exact: true })).toBeVisible();
    await page.getByRole("img", { name: sailShapeContent.frames[1].description[lang], exact: true }).scrollIntoViewIfNeeded();
    await testInfo.attach(`learning-picture-${lang}`, { body: await page.screenshot(), contentType: "image/png" });
    await page.getByRole("button", { name: sailShapeContent.scheme[lang], exact: true }).click();
    await expect(diagramState).toHaveAttribute("aria-pressed", "true");
    const raw = await page.evaluate(() => localStorage.getItem("regatta.foundation.web.v1"));
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).checks["how-sail-works"]).toBeUndefined();
    await page.reload();
    await expect(diagramState).toHaveAttribute("aria-pressed", "true");
    const diagnostics = await page.evaluate(() => localStorage.getItem("regatta.diagnostics.v1"));
    const saved = parseDiagnosticPersistence(diagnostics, Date.now());
    expect(saved?.entries.some(entry => entry.event.type === "learning.visual" && entry.event.action === "mode")).toBe(true);
  });
}

test("an unavailable illustration preserves the force diagram and a real retry can recover", async ({ page, context }) => {
  let failedRequests = 0;
  // The production service worker owns its network fetch. Fault that request,
  // retaining the real worker and every fallback/retry assertion.
  await context.route("**/learning/mainsail-filled.jpg", route => { failedRequests += 1; return route.abort(); });
  await page.goto("/start?lesson=how-sail-works");
  await page.getByRole("button", { name: "Две составляющие", exact: true }).click();
  await page.getByRole("button", { name: "Рисунок", exact: true }).click();
  await expect(page.getByText(sailShapeContent.unavailable.ru, { exact: true })).toBeVisible();
  expect(failedRequests).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Схема", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Две составляющие", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: /Как работает парус: Две составляющие/ })).toBeVisible();
  await context.unroute("**/learning/mainsail-filled.jpg");
  await page.getByRole("button", { name: "Рисунок", exact: true }).click();
  const image = page.getByRole("img", { name: sailShapeContent.frames[0].description.ru, exact: true });
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(page.getByText(sailShapeContent.unavailable.ru, { exact: true })).toHaveCount(0);
  await expect.poll(async () => {
    const raw = await page.evaluate(() => localStorage.getItem("regatta.diagnostics.v1"));
    return parseDiagnosticPersistence(raw, Date.now())?.entries.filter(entry => entry.event.type === "learning.visual" && entry.event.action === "image-error").length ?? 0;
  }).toBe(1);
});
