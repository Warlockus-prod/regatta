import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HUB_SCENES, HUB_SCENE_SIZE } from "./hub-scenes";
import { SCENE_STILL_WEB } from "./home-entry";

const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
/** Width and height of a lossy WebP (VP8 frame header). */
function webpSize(file: string) {
  const bytes = readFileSync(file);
  expect(bytes.toString("ascii", 0, 4) + bytes.toString("ascii", 8, 16), file).toBe("RIFFWEBPVP8 ");
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}
/** Width and height from a JPEG's frame header (SOF0-SOF2). */
function jpegSize(file: string) {
  const bytes = readFileSync(file);
  for (let i = 2; i < bytes.length - 8;) {
    const marker = bytes[i + 1], length = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
    i += 2 + length;
  }
  throw new Error(`no frame header in ${file}`);
}

// Package 32, stage C. Contract: every tab opens with a frame of the 3D scene. Race has its own;
// Learn, Practice and the Menu have one each, the same frame on the site and in the app, named in
// all seven languages, and both hubs draw it.
describe("hub scenes: a frame of the 3D scene on every tab", () => {
  it("ships one frame per tab for the site and for the app, in the declared 2:1 size", () => {
    expect(Object.keys(HUB_SCENES)).toEqual(["learn", "practice", "library"]);
    for (const [id, scene] of Object.entries(HUB_SCENES)) {
      expect(webpSize(`public${scene.web}`), id).toEqual(HUB_SCENE_SIZE);
      const app = `mobile/assets/design/hub-${id === "library" ? "menu" : id}.jpg`;
      expect(existsSync(app), app).toBe(true);
      const size = jpegSize(app);
      expect(size.width / size.height, app).toBe(HUB_SCENE_SIZE.width / HUB_SCENE_SIZE.height);
      for (const lang of LANGS) expect(scene.alt[lang].length, `${id} ${lang}`).toBeGreaterThan(10);
    }
    // Three different frames, none of them the Race tab's.
    expect(new Set([...Object.values(HUB_SCENES).map(scene => scene.web), SCENE_STILL_WEB]).size).toBe(4);
  });

  it("is drawn by the hubs of the site and of the app", () => {
    const hub = readFileSync("src/components/product/ProductHub.tsx", "utf8");
    expect(hub).toContain('section === "race" ? <RacePlay lang={lang} /> : <HubScene id={section} lang={lang} />');
    expect(readFileSync("src/components/product/ProductMenu.tsx", "utf8")).toContain('<HubScene id="library" lang={lang} />');
    const native = readFileSync("mobile/src/navigation/ProductHub.tsx", "utf8");
    expect(native).toContain('section !== "race" && !query.trim() && <View style={styles.hubScene} testID="hub-scene">');
    for (const file of ["hub-learn.jpg", "hub-practice.jpg", "hub-menu.jpg"]) expect(native, file).toContain(`require("../../assets/design/${file}")`);
  });
});
