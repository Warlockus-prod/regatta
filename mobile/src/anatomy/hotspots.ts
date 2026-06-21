/**
 * Hotspot positions for the 17 anatomy parts, expressed in the same
 * 1000x500 viewbox as `yacht-svg.ts`. The screen layer scales these
 * 1:1 with the rendered SVG, so a hotspot at (420, 90) lands on top
 * of the (420, 90) point in the yacht drawing.
 *
 * Coordinates were tuned by eye against the path strings in `yacht-svg.ts`.
 * If you reshape the boat, retune the affected hotspots here. Order of
 * the keys matters for the bottom-sheet swipe navigation: the screen
 * derives "next" / "previous" from the order the parts appear in the
 * `anatomyParts` data array, NOT from this map.
 *
 * Every anatomy id from `mobile/src/data/anatomy.json` MUST have a
 * matching entry. A type-level check in the screen guards against drift.
 */

export type HotspotPoint = { x: number; y: number };

export const HOTSPOTS: Record<string, HotspotPoint> = {
  bow:        { x: 195, y: 252 },
  stern:      { x: 820, y: 258 },
  mast:       { x: 420, y: 130 },
  boom:       { x: 510, y: 240 },
  mainsail:   { x: 480, y: 175 },
  jib:        { x: 320, y: 200 },
  shrouds:    { x: 380, y: 178 },
  forestay:   { x: 305, y: 145 },
  mainsheet:  { x: 660, y: 240 },
  'jib-sheet':{ x: 540, y: 244 },
  winch:      { x: 580, y: 232 },
  cleat:      { x: 760, y: 240 },
  rudder:     { x: 818, y: 405 },
  keel:       { x: 488, y: 415 },
  fender:     { x: 615, y: 290 },
  wheel:      { x: 716, y: 232 },
  cockpit:    { x: 700, y: 230 },
};
