import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Static checks of the tactical overlay wiring (M2-2, M2-3): the scene draws
// it with the active race model, the frame loops allocate nothing and only
// move what was built once per model, and nothing is painted in action cyan.
const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
const scene = source("./RaceScene.tsx");
const overlay = source("./TacticalOverlay.tsx");

/** The callback text of every useFrame(...) call, matched by parentheses. */
function frameBodies(text: string): string[] {
  const bodies: string[] = [];
  let from = 0;
  for (;;) {
    const start = text.indexOf("useFrame(", from);
    if (start < 0) return bodies;
    let depth = 0, i = start + "useFrame".length;
    for (; i < text.length; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")" && --depth === 0) break;
    }
    bodies.push(text.slice(start, i + 1));
    from = i;
  }
}

describe("tactical overlay wiring", () => {
  it("is drawn inside the race scene with the model of the race being sailed", () => {
    expect(scene).toMatch(/const tactics = useMemo\(\(\) => raceTacticsModel\(raceProfile\), \[raceProfile\]\)/);
    expect(scene).toMatch(/<TacticalOverlay [^>]*model=\{tactics\}[^>]*arrowRef=\{arrowRef\}[^>]*hintRef=\{hintRef\}/);
    expect(scene).toMatch(/<WaterGuidance [^>]*model=\{tactics\}/);
    // The DOM cues sit over the canvas, not inside the WebGPU tree.
    expect(scene.indexOf("<TacticalScreenLayer")).toBeGreaterThan(scene.indexOf("</Canvas>"));
    expect(scene.indexOf("<TacticalOverlay")).toBeLessThan(scene.indexOf("</Canvas>"));
  });

  it("draws the wedge, the zone ring, the boundary and the screen cues", () => {
    for (const part of ["<NoGoWedge", "<MarkZone", "<CourseBoundary", "<ScreenCues"]) expect(overlay).toContain(part);
    expect(overlay).toContain("noGoRing(model)");
    expect(overlay).toContain("zoneMark(");
    expect(overlay).toContain("model.water");
    expect(overlay).toContain("boundaryProximity(");
    expect(overlay).toContain("edgeArrow(");
    // The arrow reaches the DOM through the tested writer, which places it on the first show.
    expect(overlay).toMatch(/applyEdgeArrow\(arrowEl, [^)]*s\.arrow, s\.style\)/);
    expect(overlay).toMatch(/style: \{ shown: false, x: NaN, y: NaN, angle: NaN \}/);
    expect(overlay).toContain("else s.arrow.visible = false;");
  });

  it("allocates nothing per frame and builds geometry once per model", () => {
    const bodies = [...frameBodies(overlay), ...frameBodies(scene.slice(scene.indexOf("function WaterGuidance"), scene.indexOf("function Player")))];
    expect(bodies.length).toBeGreaterThanOrEqual(5);
    for (const body of bodies) {
      expect(body).not.toMatch(/\bnew [A-Z]|toWorld\(|\.map\(|\.filter\(|\bfor \(const [^;]+ of \[|nextTarget\(/);
    }
    expect(overlay.match(/useMemo\(\(\) => \{/g)?.length).toBe(3);
    expect(overlay.match(/\}, \[model\]\);/g)?.length).toBe(3);
    expect(overlay.match(/\.dispose\(\)/g)?.length).toBeGreaterThanOrEqual(10);
  });

  it("keeps cyan for actions: tactical colours are danger, white and yellow", () => {
    for (const text of [overlay, scene]) expect(text).not.toMatch(/#00d4ff|#76c9e9|accent-cyan|0, ?212, ?255/i);
  });

  it("gives the edge arrow a 44 px target and the hint all seven languages", () => {
    expect(overlay).toContain("width: EDGE_ARROW_RADIUS * 2, height: EDGE_ARROW_RADIUS * 2");
    const hint = overlay.slice(overlay.indexOf("const boundary = tl({"), overlay.indexOf("});", overlay.indexOf("const boundary = tl({")));
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"]) expect(hint).toMatch(new RegExp(`\\b${lang}: "`));
    expect(hint).not.toMatch(new RegExp("[\\u2013\\u2014\\u2026\\u201c\\u201d]"));
  });
});
