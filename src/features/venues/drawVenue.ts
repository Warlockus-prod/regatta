// Top-down venue scenery for the website races (canvas 2D): the shore and the
// islands around the race area, drawn under the course and the boats. The
// shapes come from src/data/venues/geometry.ts and never reach into the race
// area, so no boat ever sails over land.

import type { Language } from "@/lib/product/catalog";
import type { LandMass, Venue } from "@/data/venues/venues";
import { labelAnchor, landPolygon, reliefPolygons, type Pt } from "@/data/venues/geometry";

type ToScreen = (p: Pt) => Pt;

function tracePath(ctx: CanvasRenderingContext2D, poly: Pt[], toScreen: ToScreen) {
  ctx.beginPath();
  poly.forEach((p, i) => {
    const s = toScreen(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.closePath();
}

const LEVEL_COLOR: Record<number, keyof Venue["palette"]> = { 1: "mid", 2: "high", 3: "peak" };

// Shapes depend only on the venue data: compute them once per land mass.
const shapes = new WeakMap<LandMass, { poly: Pt[]; rings: { level: number; poly: Pt[] }[]; anchor: Pt }>();
function shapeOf(land: LandMass) {
  let s = shapes.get(land);
  if (!s) {
    const poly = landPolygon(land);
    s = { poly, rings: reliefPolygons(land), anchor: labelAnchor(land, poly) };
    shapes.set(land, s);
  }
  return s;
}

/**
 * Draw the venue: shallows halo, land, contour bands, a sand waterline and
 * the names. `scale` is screen pixels per race unit.
 */
export function drawVenue(ctx: CanvasRenderingContext2D, venue: Venue, toScreen: ToScreen, scale: number, lang: Language) {
  if (!venue.lands.length) return;
  ctx.save();
  ctx.lineJoin = "round";
  for (const land of venue.lands) {
    const { poly, rings } = shapeOf(land);
    // Shallow water: a pale halo around the land.
    tracePath(ctx, poly, toScreen);
    ctx.strokeStyle = "rgba(120, 200, 215, 0.16)";
    ctx.lineWidth = Math.max(6, 22 * scale);
    ctx.stroke();
    // Land.
    ctx.fillStyle = venue.palette.low;
    ctx.fill();
    for (const ring of rings) {
      tracePath(ctx, ring.poly, toScreen);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = venue.palette[LEVEL_COLOR[ring.level] ?? "high"];
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Waterline: a thin beach.
    tracePath(ctx, poly, toScreen);
    ctx.strokeStyle = venue.palette.sand;
    ctx.lineWidth = Math.max(1.5, 4 * scale);
    ctx.stroke();
  }
  // Names on top of every land, so a neighbour never hides one.
  ctx.font = `600 ${Math.max(10, Math.round(13 * Math.min(1.4, scale * 1.6)))}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const land of venue.lands) {
    if (!land.name) continue;
    const at = toScreen(shapeOf(land).anchor);
    const text = land.name[lang].toUpperCase();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(5, 20, 37, 0.55)";
    ctx.strokeText(text, at.x, at.y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.fillText(text, at.x, at.y);
  }
  ctx.restore();
}
