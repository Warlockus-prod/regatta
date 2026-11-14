// Package 32, stage C: the frame of the real 3D scene at the top of the Learn, Practice and Menu
// tabs (src/lib/product/hub-scenes.ts), for the site and the app.
//   BASE_URL=http://localhost:3000 node scripts/capture-hub-scenes.mjs [--only learn,practice,menu]
// Learn and Practice are the sail trim trainer in a named state (its own deep link), the Menu is
// the race scene with a fleet at the start line (the development stage, src/app/dev/race-stage:
// `npm run dev` only). Writes public/design-v3/hub-<id>.webp (1200x600) and
// mobile/assets/design/hub-<id>.jpg (960x480). Headless on the machine's GPU, like the other
// capture scripts; GL=swiftshader falls back to the software renderer.
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt > 0 ? process.argv[onlyAt + 1].split(",") : null;
const SIZE = { width: 1200, height: 600 };

export const HUB_FRAMES = {
  learn: { trainer: "twa=90&tws=12&camera=whole" },
  practice: { trainer: "twa=60&tws=16&main=14&jib=16&camera=stern" },
  menu: { stage: "boats=404,646,320,5~366,656,318,5~444,640,316,5~426,676,45,4~480,668,322,5&line=340,604,460,604&look=410,640&view=196,15,88" },
};

const browser = await chromium.launch({ args: process.env.GL === "swiftshader"
  ? ["--use-gl=angle", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader"]
  : ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
for (const [id, frame] of Object.entries(HUB_FRAMES)) {
  if (only && !only.includes(id)) continue;
  // The trainer keeps its phone and tablet layout (the boat in a window above the controls) up to
  // this width, so its frame is cut 1000 px wide from a denser picture and scaled to the size.
  const viewport = frame.trainer ? { width: 1000, height: 880 } : SIZE;
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: frame.trainer ? 1.5 : 1 })).newPage();
  await page.addInitScript(() => {
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels" }));
    localStorage.setItem("regatta_theme", "light");
    // A hidden page is not measured by the quality ladder, so the scene keeps the full picture.
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
  });
  await page.goto(frame.trainer ? `${BASE}/simulator-v3?embed=1&lang=en&tack=s&${frame.trainer}` : `${BASE}/dev/race-stage?${frame.stage}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("[data-scene-startup=ready]").first().waitFor({ timeout: 180_000 });
  await page.addStyleTag({ content: `[data-testid=scene-bar],[data-testid=trainer-readouts],[data-testid=trainer-caption],[data-testid=control-dock],[data-testid=trainer-wind-box],[data-testid=race-mark-arrow],nextjs-portal{visibility:hidden!important}` });
  await page.waitForTimeout(6000);
  let clip = { x: 0, y: 0, ...SIZE };
  if (frame.trainer) {
    const win = await page.getByTestId("trainer-scene-window").boundingBox();
    clip = { x: 0, y: Math.max(0, Math.round(win.y + win.height / 2 - 250)), width: 1000, height: 500 };
  }
  const shot = await page.screenshot({ clip });
  await sharp(shot).resize(SIZE.width, SIZE.height).webp({ quality: 80, effort: 6 }).toFile(`public/design-v3/hub-${id}.webp`);
  await sharp(shot).resize(960, 480).jpeg({ quality: 82, mozjpeg: true }).toFile(`mobile/assets/design/hub-${id}.jpg`);
  console.log("hub scene", id);
  await page.context().close();
}
await browser.close();
