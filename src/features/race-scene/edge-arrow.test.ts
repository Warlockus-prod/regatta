import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { makeStandardCourse } from "@/lib/race-physics";
import { racePose, toWorld, type Race3DBoat, type RaceCamera } from "@/features/race-3d/pose";
import { raceCameraPose } from "./orbit-camera";
import { applyEdgeArrow, EDGE_ARROW_RADIUS, edgeArrow, edgeArrowInsets, type EdgeArrow, type EdgeArrowStyle, type ScreenInsets } from "./edge-arrow";

// M2-2 contract: the next mark is either in the clear part of the picture or
// shown by a 44 px arrow inside it that points towards the mark. The M2
// done-criterion: after a 90 degree turn this holds in every camera preset
// on an upright (390x844) and a landscape (844x390) phone.
const insets = (w: number, h: number) => edgeArrowInsets(w, h, { top: 0, right: 0, bottom: 0, left: 0 });
const out = (): EdgeArrow => ({ visible: false, x: 0, y: 0, angle: 0 });
const inBand = (a: EdgeArrow, w: number, h: number, i: ScreenInsets) =>
  a.x - EDGE_ARROW_RADIUS >= i.left - 1e-6 && a.x + EDGE_ARROW_RADIUS <= w - i.right + 1e-6
  && a.y - EDGE_ARROW_RADIUS >= i.top - 1e-6 && a.y + EDGE_ARROW_RADIUS <= h - i.bottom + 1e-6;

describe("screen-edge arrow math", () => {
  const w = 390, h = 844, i = insets(w, h);

  it("keeps the HUD bands clear on both phone orientations", () => {
    expect(i.top).toBeGreaterThanOrEqual(60);
    expect(i.bottom).toBeGreaterThanOrEqual(48);
    const land = insets(844, 390);
    // A landscape phone still has a band of at least two arrow discs.
    expect(390 - land.top - land.bottom).toBeGreaterThanOrEqual(EDGE_ARROW_RADIUS * 4);
  });

  it("hides when the mark is in the clear part of the picture", () => {
    expect(edgeArrow(0, 0, 0.5, w, h, i, out()).visible).toBe(false);
    expect(edgeArrow(0.8, -0.5, 0.9, w, h, i, out()).visible).toBe(false);
  });

  it.each([
    ["right", 3, 0, 90], ["left", -3, 0, -90], ["up", 0, 3, 0], ["down", 0, -3, 180],
  ] as const)("points %s at a mark off that edge, inside the clear band", (_, x, y, angle) => {
    const a = edgeArrow(x, y, 0.5, w, h, i, out());
    expect(a.visible).toBe(true);
    expect(inBand(a, w, h, i)).toBe(true);
    expect(Math.abs((((a.angle - angle) % 360) + 540) % 360 - 180)).toBeLessThan(1e-6);
  });

  it("shows a mark under the top HUD instead of hiding it there", () => {
    const y = 1 - (2 * (i.top / 2)) / h; // half way up the top inset
    const a = edgeArrow(0, y, 0.5, w, h, i, out());
    expect(a.visible).toBe(true);
    expect(Math.abs(a.angle)).toBeLessThan(1e-6);
  });

  it("mirrors a mark behind the camera so the arrow shows the way to turn", () => {
    // Behind and to the left of the camera projects to the right: the arrow points left.
    const a = edgeArrow(0.3, 0.1, 1.2, w, h, i, out());
    expect(a.visible).toBe(true);
    expect(a.angle).toBeLessThan(0);
    expect(inBand(a, w, h, i)).toBe(true);
    // Straight behind: down, past the stern.
    expect(edgeArrow(0, 0, 1.5, w, h, i, out()).angle).toBeCloseTo(180, 6);
  });

  it("ignores broken input and writes into the caller's object", () => {
    const target = out();
    expect(edgeArrow(Number.NaN, 0, 0.5, w, h, i, target)).toBe(target);
    expect(target.visible).toBe(false);
  });
});

describe("writing the arrow into the DOM", () => {
  const el = () => ({ style: { display: "none", transform: "" } });
  const fresh = (): EdgeArrowStyle => ({ shown: false, x: Number.NaN, y: Number.NaN, angle: Number.NaN });

  it("places and turns the arrow on its very first show", () => {
    const disc = el(), glyph = el(), shown = fresh();
    applyEdgeArrow(disc, glyph, { visible: true, x: 100, y: 200, angle: -90 }, shown);
    expect(disc.style.display).toBe("flex");
    expect(disc.style.transform).toBe(`translate(${(100 - EDGE_ARROW_RADIUS).toFixed(1)}px, ${(200 - EDGE_ARROW_RADIUS).toFixed(1)}px)`);
    expect(glyph.style.transform).toBe("rotate(-90.0deg)");
  });

  it("follows the mark, skips sub-pixel moves and hides again", () => {
    const disc = el(), glyph = el(), shown = fresh();
    applyEdgeArrow(disc, glyph, { visible: true, x: 100, y: 200, angle: 10 }, shown);
    disc.style.transform = glyph.style.transform = "untouched";
    applyEdgeArrow(disc, glyph, { visible: true, x: 100.2, y: 200.2, angle: 10.2 }, shown);
    expect(disc.style.transform).toBe("untouched");
    expect(glyph.style.transform).toBe("untouched");
    applyEdgeArrow(disc, glyph, { visible: true, x: 140, y: 200, angle: 45 }, shown);
    expect(disc.style.transform).toBe(`translate(${(140 - EDGE_ARROW_RADIUS).toFixed(1)}px, ${(200 - EDGE_ARROW_RADIUS).toFixed(1)}px)`);
    expect(glyph.style.transform).toBe("rotate(45.0deg)");
    applyEdgeArrow(disc, glyph, { visible: false, x: 0, y: 0, angle: 0 }, shown);
    expect(disc.style.display).toBe("none");
  });
});

describe("M2 done-criterion: the next mark after a 90 degree turn", () => {
  const course = makeStandardCourse();
  const mark = course.marks[0].pos;
  const presets: RaceCamera[] = ["orbit", "stern", "high"];
  const viewports = [[390, 844], [844, 390]] as const;
  // The player off the start line, before and after turning 90 degrees each way.
  const boats = [0, 90, 270, 45, 135].map((heading): Race3DBoat => ({
    id: "p", color: "#fff", pos: { x: 360, y: 980 }, heading, speed: 5, lapDone: 0, isPlayer: true,
  }));

  it.each(presets.flatMap(p => viewports.map(([w, h]) => [p, w, h] as const)))("%s camera at %sx%s", (preset, w, h) => {
    const i = insets(w, h);
    for (const fitted of boats) for (const now of boats) {
      // The camera is fitted for one heading (a preset or a refit) and the boat then turns.
      const pose = raceCameraPose(preset, racePose(fitted, 0), w / h, { player: toWorld(fitted.pos), target: toWorld(mark), windFrom: 0 });
      const camera = new PerspectiveCamera(pose.fov, w / h, 0.5, 4200);
      camera.position.copy(pose.position);
      camera.lookAt(pose.target);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      const m = toWorld(mark), p = toWorld(now.pos);
      const v = new Vector3(m.x - p.x, 4, m.z - p.z).project(camera);
      const a = edgeArrow(v.x, v.y, v.z, w, h, i, out());
      const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
      const clear = v.z <= 1 && sx >= i.left && sx <= w - i.right && sy >= i.top && sy <= h - i.bottom;
      expect(a.visible).toBe(!clear);
      if (a.visible) expect(inBand(a, w, h, i)).toBe(true);
    }
  });

  it.each(viewports)("points left to a mark abeam to port from the stern camera at %sx%s", (w, h) => {
    // Heading east with the windward mark due north: the mark is off the left edge.
    const boat = boats[1];
    const pose = raceCameraPose("stern", racePose(boat, 0), w / h, { player: toWorld(boat.pos), target: toWorld(mark), windFrom: 0 });
    const camera = new PerspectiveCamera(pose.fov, w / h, 0.5, 4200);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.updateMatrixWorld();
    const m = toWorld(mark), p = toWorld(boat.pos);
    const v = new Vector3(m.x - p.x, 4, m.z - p.z).project(camera);
    const a = edgeArrow(v.x, v.y, v.z, w, h, insets(w, h), out());
    expect(a.visible).toBe(true);
    expect(a.x).toBeLessThan(w / 2);
    expect(a.angle).toBeLessThan(-45);
    expect(a.angle).toBeGreaterThan(-135);
  });
});
