// Package 32: frames of the real 3D scene for the sailing subjects (points of sail, turns, wind,
// trim) and for the lessons and trainer exercises that show one.
//   BASE_URL=http://localhost:3000 node scripts/capture-subject-frames.mjs <out dir> [--only id,id]
// Opens the sail trim trainer in the state each picture shows (its own deep link:
// ?twa=&tws=&main=&jib=&reef=&camera=), hides the controls, waits for the scene and saves an
// 800x600 frame centred on the boat's window. scripts/build-subject-visuals.mjs turns the frames
// into the shipped pictures; it refuses a registry id without a picture.
// The scene is drawn by the browser's GPU (headless, ANGLE Metal on a Mac). Without one, pass
// GL=swiftshader: the software renderer works, more slowly and with harsher glitter on the water.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const out = process.argv[2];
if (!out) { console.error("usage: node scripts/capture-subject-frames.mjs <out dir> [--only id,id]"); process.exit(2); }
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt > 0 ? process.argv[onlyAt + 1].split(",") : null;
mkdirSync(out, { recursive: true });

/**
 * What each picture shows, as the trainer's link parameters. Without main= and jib= the trainer
 * trims the sails for the course itself. A pair [before, after] makes a picture of two halves
 * (a change of course cannot be shown in one frame).
 */
export const SUBJECT_FRAMES = {
  // Points of sail and turns (the turns are caught at their middle: head to wind, stern through the wind).
  "in-irons": "twa=6", "close-hauled": "twa=45", "beam-reach": "twa=90", "broad-reach": "twa=135", running: "twa=172",
  tacking: "twa=14", jibing: "twa=180",
  // Wind.
  "true-wind": "twa=90&camera=whole",
  "apparent-wind": "twa=60&tws=14&camera=sails",
  windward: "twa=60&tws=16&camera=whole",
  leeward: "twa=60&tws=16&camera=deck",
  gust: "twa=50&tws=24&camera=whole",
  lull: "twa=50&tws=5&camera=whole",
  "wind-shift": ["twa=45", "twa=28&main=18&jib=20"],
  // Trim.
  trim: ["twa=90&main=8&jib=10", "twa=90"],
  halyard: "twa=90&tws=8&camera=sails",
  "luff-sail": "twa=45&tws=10&camera=sails",
  leech: "twa=100&tws=10&camera=stern",
  heeling: "twa=60&tws=16&main=14&jib=16&camera=stern",
  slot: "twa=50&tws=12&camera=stern",
  luffing: ["twa=90", "twa=48"],
  "bearing-away": ["twa=60", "twa=125"],
  // Lessons of "Working with sails" that have no subject or yacht part of their own
  // (SAIL_LESSON_PICTURES in src/data/sailing-visuals.ts).
  "lesson-sheet-control": ["twa=90&main=80&jib=55", "twa=90"],
  "lesson-vang": "twa=120&tws=14&camera=deck",
  "lesson-outhaul": "twa=45&tws=8&camera=deck",
  "lesson-telltales": "twa=45&tws=12&camera=jib",
  "lesson-reef": "twa=50&tws=22&reef=2&camera=sails",
};
const FRAME = { width: 800, height: 600 };
// Tall enough that the boat's window (the screen minus the bar above and the wheels below) is the
// frame's height: the trainer fits the boat to that window, so the whole boat is in the frame.
const VIEWPORT = { width: 1000, height: 880 };

// Headless on the machine's GPU (ANGLE Metal on a Mac); GL=swiftshader falls back to the software renderer.
const browser = await chromium.launch({ args: process.env.GL === "swiftshader"
  ? ["--use-gl=angle", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader"]
  : ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
async function capture(file, query) {
  const page = await (await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => {
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels" }));
    localStorage.setItem("regatta_theme", "light");
    // A hidden page is not measured by the quality ladder, so a slow renderer keeps the full picture.
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
  });
  const link = new URLSearchParams(query);
  if (!link.has("tws")) link.set("tws", "12");
  await page.goto(`${BASE}/simulator-v3?embed=1&lang=en&tack=s&${link}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("[data-scene-startup=ready]").first().waitFor({ timeout: 120_000 });
  await page.addStyleTag({ content: `[data-testid=scene-bar],[data-testid=trainer-readouts],[data-testid=trainer-caption],[data-testid=control-dock],[data-testid=trainer-wind-box],nextjs-portal{visibility:hidden!important}` });
  await page.waitForTimeout(6000);
  const win = await page.getByTestId("trainer-scene-window").boundingBox();
  const cx = win.x + win.width / 2, cy = win.y + win.height / 2;
  await page.screenshot({ path: join(out, file), clip: { x: Math.round(cx - FRAME.width / 2), y: Math.max(0, Math.round(cy - FRAME.height / 2)), ...FRAME } });
  console.log(file, query, JSON.stringify((await page.getByTestId("trainer-readouts").first().textContent().catch(() => "")) ?? ""));
  await page.context().close();
}
for (const [id, spec] of Object.entries(SUBJECT_FRAMES)) {
  if (only && !only.includes(id)) continue;
  if (typeof spec === "string") await capture(`${id}.png`, spec);
  else { await capture(`${id}.a.png`, spec[0]); await capture(`${id}.b.png`, spec[1]); }
}
await browser.close();
