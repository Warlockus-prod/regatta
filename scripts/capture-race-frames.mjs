// Package 32: frames of the real race scene for the race subjects (right of way, the start, the
// marks, tactics): two or three boats, a mark or the start line, placed where the rule needs them.
//   BASE_URL=http://localhost:3000 node scripts/capture-race-frames.mjs <out dir> [--only id,id]
// Opens the development stage (src/app/dev/race-stage: the race scene with boats placed by the
// link; `npm run dev` only, a production build answers 404), waits for the scene and saves an
// 800x600 frame.
// scripts/build-subject-visuals.mjs turns the frames into the shipped pictures.
// The browser runs headless on the machine's GPU (ANGLE Metal on a Mac); without one, pass
// GL=swiftshader for the software renderer (slower, harsher glitter on the water).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const out = process.argv[2];
if (!out) { console.error("usage: node scripts/capture-race-frames.mjs <out dir> [--only id,id]"); process.exit(2); }
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt > 0 ? process.argv[onlyAt + 1].split(",") : null;
mkdirSync(out, { recursive: true });

/**
 * What each picture shows, as the stage's link (race units of 0.6 m, x east, y south, wind from
 * the north; the first boat is the player's, drawn in full detail). view=from,pitch,range is the
 * camera: by default it stands south of the boats and looks north, so the wind blows down the
 * picture as it does in the schematic beside it.
 */
export const RACE_FRAMES = {
  // Right of way. The first boat is the one nearest the camera: the scene hides a rival that
  // stands between the camera and the player's boat.
  "port-vs-starboard": "boats=384,622,45,6~436,618,315,6&view=180,26,46",
  "windward-leeward": "boats=404,624,315,6~420,600,315,6&view=180,28,48",
  overtaking: "boats=392,608,90,7~432,600,90,5&view=180,28,46",
  "mark-room": "boats=446,584,315,5~425,592,315,5&mark=400,560&look=424,578&view=180,30,52",
  crossing: "boats=384,612,90,6~428,574,200,6&view=180,38,60",
  "start-line": "boats=404,640,320,5~368,652,318,5~442,636,316,5~424,672,45,4&line=340,600,460,600&look=400,628&view=180,34,82",
  "collision-avoid": "boats=392,614,45,6~424,612,315,6&view=180,24,38",
  penalty: "boats=400,612,8,2~432,596,315,6&view=180,28,46",
  // Tactics and the course.
  upwind: "boats=384,624,45,6~430,580,315,6&mark=404,520&look=404,584&view=180,30,76",
  downwind: "boats=396,560,172,6~426,546,188,6&line=352,592,452,592&look=404,568&view=180,34,54",
  "mark-rounding": "boats=396,584,262,5~432,628,315,6&mark=400,600&look=414,608&view=180,32,58",
  layline: "boats=470,590,315,6&mark=400,520&look=440,572&view=180,36,82",
  overlap: "boats=402,612,90,6~421,600,90,6&view=180,58,40",
  vmg: "boats=388,622,45,6&mark=408,540&look=398,590&view=180,30,64",
  vmc: "boats=380,620,60,7&mark=450,572&look=412,598&view=180,30,66",
};
const FRAME = { width: 800, height: 600 };

const software = process.env.GL === "swiftshader";
const browser = await chromium.launch({ args: software
  ? ["--use-gl=angle", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader"]
  : ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
async function capture(id, stage) {
  const page = await (await browser.newContext({ viewport: FRAME, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => {
    localStorage.setItem("regatta_theme", "light");
    // A hidden page is not measured by the quality ladder, so the scene keeps the full picture.
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
  });
  await page.goto(`${BASE}/dev/race-stage?${stage}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("[data-scene-startup=ready]").first().waitFor({ timeout: 180_000 });
  await page.addStyleTag({ content: `nextjs-portal,[data-testid=race-mark-arrow]{visibility:hidden!important}` });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: join(out, `${id}.png`) });
  console.log(id, stage);
  await page.context().close();
}
const extra = process.env.FRAMES ? JSON.parse(process.env.FRAMES) : null;
for (const [id, spec] of Object.entries(extra ?? RACE_FRAMES)) {
  if (only && !only.includes(id)) continue;
  await capture(id, spec);
}
await browser.close();
