/**
 * The shared pen of the lesson and subject drawings: the two palettes, the SVG primitives and the
 * two boats (from above, from the side). Split out of foundation-drawings.ts (package 32) so the
 * subject drawings (subject-drawings.ts) and the lesson scenes (foundation-drawings.ts) are two
 * modules: a page that shows a subject's picture alone no longer carries every drawing, and the
 * pages that draw subjects share one copy of them. The geometry is unchanged.
 */
export type GraphicTheme = 'paper' | 'instrument';

export interface Palette {
  bg: string;
  ink: string;
  muted: string;
  faint: string;
  cloth: string;
  hull: string;
  blue: string;
  teal: string;
  sand: string;
}

export const palettes: Record<GraphicTheme, Palette> = {
  paper: { bg: '#fffefa', ink: '#123247', muted: '#607583', faint: '#dce2e3', cloth: '#eee8dc', hull: '#e0e9ec', blue: '#006ea6', teal: '#006d70', sand: '#8a6100' },
  instrument: { bg: '#0a1628', ink: '#e8f4f8', muted: '#a4bac8', faint: '#30485c', cloth: '#263b49', hull: '#193347', blue: '#74d8f4', teal: '#86d4c4', sand: '#f1c477' },
};

export const fmt = (n: number) => Math.round(n * 100) / 100;

export const path = (d: string, c: string, w = 3, dash = '', fill = 'none') =>
  `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

export const circle = (x: number, y: number, r: number, fill: string, stroke = 'none', w = 2) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;

export const label = (x: number, y: number, s: string | number, c: string, size = 26) =>
  `<text x="${x}" y="${y}" text-anchor="middle" fill="${c}" font-family="system-ui,sans-serif" font-size="${size}" font-weight="600">${s}</text>`;

/** Numbered marker; the number matches the legend under the drawing. */
export const dot = (x: number, y: number, n: number, p: Palette, on = true) =>
  circle(x, y, 19, p.bg, on ? p.blue : p.muted, 3) + label(x, y + 7, n, on ? p.blue : p.muted, 22);

export function arrow(x: number, y: number, X: number, Y: number, c: string, w = 4, dash = '') {
  if (Math.hypot(X - x, Y - y) < 0.1) return circle(x, y, 4, c);
  const a = Math.atan2(Y - y, X - x);
  const r = 13;
  return (
    path(`M${x} ${y}L${X} ${Y}`, c, w, dash) +
    path(`M${fmt(X - r * Math.cos(a - 0.5))} ${fmt(Y - r * Math.sin(a - 0.5))}L${X} ${Y}L${fmt(X - r * Math.cos(a + 0.5))} ${fmt(Y - r * Math.sin(a + 0.5))}`, c, w)
  );
}

/**
 * Boat seen from above, bow up at angle 0. `boom` is the boom angle in degrees
 * off the aft centreline: positive to starboard (right), negative to port.
 */
export function topBoat(x: number, y: number, angle: number, p: Palette, scale = 1, boom: number | null = 24) {
  return (
    `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">` +
    path('M0-90C-42-53-47 14-30 73Q0 88 30 73C47 14 42-53 0-90Z', p.ink, 2, '', p.hull) +
    path('M0-67C-27-37-30 10-23 55H23C30 10 27-37 0-67Z', p.muted, 1.5) +
    path('M-15 24V57H15V24Z', p.muted, 2, '', p.bg) +
    path('M0-33V8', p.muted, 2) +
    (boom === null
      ? ''
      : path(`M0 0L${fmt(Math.sin((boom * Math.PI) / 180) * 62)} ${fmt(Math.cos((boom * Math.PI) / 180) * 62)}`, p.ink, 5) + circle(0, 0, 5, p.blue)) +
    '</g>'
  );
}

/** Yacht seen from the side, bow to the right, stern to the left. */
export function sideBoat(p: Palette, { reef = 0, rise = 0 }: { reef?: number; rise?: number } = {}) {
  const by = 340 - rise;
  return (
    path('M91 410Q392 425 811 391L768 435Q416 484 143 448Z', p.muted, 2, '', p.hull) +
    path('M108 428Q428 457 794 409', p.ink, 3) +
    path('M343 408 366 379 477 367 590 399', p.muted, 2, '', p.cloth) +
    path('M378 384 430 378 430 392 370 397ZM443 377 477 378 514 394 443 391Z', p.ink, 1, '', p.ink) +
    path('M530 70V400', p.ink, 6) +
    path(`M530 ${90 + reef}Q431 ${190 + reef * 0.4} ${252 + reef * 0.65} ${by}Q395 ${345 - rise * 0.5} 525 337Z`, p.muted, 2, '', p.cloth) +
    path(`M530 340L237 ${by}`, p.ink, 7) +
    path('M92 408 530 70 800 390', p.faint, 2) +
    path('M106 406V382M167 410V385M235 412V387M667 404V380M745 398V374M108 383Q440 401 794 368', p.muted, 1.5) +
    [200, 255, 310]
      .filter((y) => y < by - 10 && y > 90 + reef)
      .map((y) => path(`M${fmt(530 - (y - 90) * 0.6)} ${y}H525`, p.faint, 1.5))
      .join('') +
    path('M254 447h34m28 0h34m28-1h34m28-2h34', p.muted, 4)
  );
}
