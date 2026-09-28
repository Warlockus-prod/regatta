/**
 * The two pilot drawings are a port of the Codex kit (src/lessons/graphics/
 * drawings.ts). The port must reproduce the kit's exports exactly, and the one
 * deliberate change (the wind-direction boom goes to leeward) must hold.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderScene, windDirectionBoom, type SceneId, type SceneState, type GraphicTheme } from '../src/lessons/graphics/drawings';
import { closeupFrame, containRect, pointInRect } from '../src/lessons/graphics/layout';

const fixture = (id: SceneId, state: SceneState, theme: GraphicTheme) =>
  readFileSync(join(__dirname, 'fixtures', 'codex-graphics', `${id}-${state + 1}-${theme}.svg`), 'utf8').trim();

const states: SceneState[] = [0, 1, 2];
const themes: GraphicTheme[] = ['paper', 'instrument'];

describe('Codex drawings port', () => {
  it.each(themes)('rig-basics matches the kit export in every state (%s)', (theme) => {
    for (const s of states) expect(renderScene('rig-basics', s, theme)).toBe(fixture('rig-basics', s, theme));
  });

  it.each(themes)('wind-direction matches the kit export with the kit boom (%s)', (theme) => {
    for (const s of states) expect(renderScene('wind-direction', s, theme, { boom: 24 })).toBe(fixture('wind-direction', s, theme));
  });

  // The kit's boom is 24 degrees to starboard in every state. With the wind
  // from starboard (state 2) that is the windward side, which no sailor would
  // draw. The lesson uses the per-state boom; only the boom path differs.
  it('the wind-direction boom sits on the centreline head to wind and to leeward otherwise', () => {
    expect(windDirectionBoom[0]).toBe(0);
    // Wind from starboard (the arrow comes from the right): boom to port.
    expect(windDirectionBoom[1]).toBeLessThan(0);
    // Wind from astern: eased almost square, same side (starboard tack kept).
    expect(windDirectionBoom[2]).toBeLessThan(windDirectionBoom[1]);
    const boomEnd = (svg: string) => {
      const m = /<path d="M0 0L(-?[\d.]+) (-?[\d.]+)"/.exec(svg);
      return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
    };
    expect(boomEnd(renderScene('wind-direction', 0, 'paper'))!.x).toBe(0);
    expect(boomEnd(renderScene('wind-direction', 1, 'paper'))!.x).toBeLessThan(0);
    expect(boomEnd(renderScene('wind-direction', 2, 'paper'))!.x).toBeLessThan(0);
    for (const s of states) {
      const ours = renderScene('wind-direction', s, 'paper').replace(/<path d="M0 0L[^"]+"/, '<path d="BOOM"');
      const kit = fixture('wind-direction', s, 'paper').replace(/<path d="M0 0L[^"]+"/, '<path d="BOOM"');
      expect(ours).toBe(kit);
    }
  });

  it('draws only strokes, numbers and shapes: no words to translate, no remote references', () => {
    for (const id of ['rig-basics', 'wind-direction'] as SceneId[]) {
      for (const s of states) {
        const svg = renderScene(id, s, 'paper');
        const texts = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
        expect(texts.every((t) => /^\d+$/.test(t!))).toBe(true);
        expect(svg).not.toMatch(/href|url\(|https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
      }
    }
  });
});

describe('annotated photo geometry', () => {
  it('a full-width box of the image aspect has no letterbox', () => {
    expect(containRect(335, 335, 1200, 1200)).toEqual({ x: 0, y: 0, width: 335, height: 335 });
  });

  it('a portrait image in a wide box is letterboxed left and right; points follow the image, not the box', () => {
    // yacht-anatomy is 675 x 1200; box 335 x 300.
    const rect = containRect(335, 300, 675, 1200);
    expect(rect.height).toBeCloseTo(300);
    expect(rect.width).toBeCloseTo(168.75);
    expect(rect.x).toBeCloseTo((335 - 168.75) / 2);
    expect(rect.y).toBe(0);
    // The mast point (51.1 %, 36.2 %) is on the image, not at 51.1 % of the box.
    const p = pointInRect(rect, 51.1, 36.2);
    expect(p.x).toBeCloseTo(rect.x + 168.75 * 0.511);
    expect(p.x).not.toBeCloseTo(335 * 0.511);
    expect(p.y).toBeCloseTo(300 * 0.362);
  });

  it('a landscape image in a tall box is letterboxed on top and bottom', () => {
    // weather-water is 1200 x 900; box 300 x 400.
    const rect = containRect(300, 400, 1200, 900);
    expect(rect).toEqual({ x: 0, y: (400 - 225) / 2, width: 300, height: 225 });
    expect(pointInRect(rect, 0, 0)).toEqual({ x: 0, y: 87.5 });
    expect(pointInRect(rect, 100, 100)).toEqual({ x: 300, y: 312.5 });
  });

  it('the closeup centres the point and never shows past the image edge', () => {
    const mid = closeupFrame(300, 200, 1200, 1200, 50, 50, 2.5);
    expect(mid.markerX).toBeCloseTo(150);
    expect(mid.markerY).toBeCloseTo(100);
    // The mast point sits near the left edge: the image stays flush, the marker moves left.
    const edge = closeupFrame(300, 200, 1200, 1200, 15.2, 30, 2.5);
    expect(edge.offsetX).toBe(0);
    expect(edge.markerX).toBeCloseTo(750 * 0.152);
    for (const f of [mid, edge]) {
      expect(f.offsetX + f.imageWidth).toBeGreaterThanOrEqual(300);
      expect(f.offsetY + f.imageHeight).toBeGreaterThanOrEqual(200);
      expect(f.markerX).toBeGreaterThanOrEqual(0);
      expect(f.markerX).toBeLessThanOrEqual(300);
    }
  });
});
