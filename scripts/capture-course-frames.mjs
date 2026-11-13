// Package 32: frames of the real 3D scene for the points of sail and the two turns.
//   BASE_URL=http://localhost:3000 node scripts/capture-course-frames.mjs <out dir>
// Opens the sail trim trainer on each course (its own deep link: ?twa=&tack=&tws=), hides the
// controls, waits for the scene and saves an 800x600 frame centred on the boat's window.
// scripts/build-course-visuals.mjs turns the frames into the shipped pictures.
// The scene is drawn by the browser's GPU: run it on a machine with one for a clean picture
// (a software renderer works, more slowly).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const out = process.argv[2];
if (!out) { console.error("usage: node scripts/capture-course-frames.mjs <out dir>"); process.exit(2); }
mkdirSync(out, { recursive: true });

/** The true wind angle each subject is shown at; the trainer trims the sails for it itself. */
export const COURSE_FRAMES = {
  "in-irons": 6, "close-hauled": 45, "beam-reach": 90, "broad-reach": 135, running: 172,
  // The turns are caught at their middle: head to wind, and stern through the wind.
  tacking: 14, jibing: 180,
};
const FRAME = { width: 800, height: 600 };
// Tall enough that the boat's window (the screen minus the bar above and the wheels below) is the
// frame's height: the trainer fits the boat to that window, so the whole boat is in the frame.
const VIEWPORT = { width: 1000, height: 880 };

const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader"] });
for (const [id, twa] of Object.entries(COURSE_FRAMES)) {
  const page = await (await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => {
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels" }));
    localStorage.setItem("regatta_theme", "light");
    // A hidden page is not measured by the quality ladder, so a slow renderer keeps the full picture.
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
  });
  await page.goto(`${BASE}/simulator-v3?embed=1&lang=en&twa=${twa}&tack=s&tws=12`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("[data-scene-startup=ready]").first().waitFor({ timeout: 120_000 });
  await page.addStyleTag({ content: `[data-testid=scene-bar],[data-testid=trainer-readouts],[data-testid=trainer-caption],[data-testid=control-dock],[data-testid=trainer-wind-box],nextjs-portal{visibility:hidden!important}` });
  await page.waitForTimeout(6000);
  const win = await page.getByTestId("trainer-scene-window").boundingBox();
  const cx = win.x + win.width / 2, cy = win.y + win.height / 2;
  await page.screenshot({ path: join(out, `${id}.png`), clip: { x: Math.round(cx - FRAME.width / 2), y: Math.max(0, Math.round(cy - FRAME.height / 2)), ...FRAME } });
  console.log(id, twa, JSON.stringify(await page.evaluate(() => ({ twa: document.querySelector("[data-testid=race-true-wind-angle]")?.textContent ?? null, heading: document.querySelector("[data-testid=trainer-scene]")?.getAttribute("data-session-heading") }))));
  await page.context().close();
}
await browser.close();
