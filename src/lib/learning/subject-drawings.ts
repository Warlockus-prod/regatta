// Package 32: the schematics of the sailing subjects (src/data/sailing-schematics.ts reads them):
// points of sail and turns, wind, trim, the race. Drawn with the lesson scenes' pen (drawing-kit.ts).
import { arrow, circle, fmt, label, palettes, path, sideBoat, topBoat, type GraphicTheme } from './drawing-kit';

// ---------------------------------------------------------------------------
// Package 32: one schematic per point of sail and per turn, for the registry of
// sailing subjects (src/data/sailing-visuals.ts). They are drawn 4:3, like the
// pictures they stand beside, and carry no small text (one large number at
// most), so they still read in a tile a third of a phone's width.
// ---------------------------------------------------------------------------

export const SUBJECT_WIDTH = 800;
export const SUBJECT_HEIGHT = 600;
const subjectSvg = (label: string, bg: string, d: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SUBJECT_WIDTH} ${SUBJECT_HEIGHT}" role="img" aria-label="${label}"><rect width="${SUBJECT_WIDTH}" height="${SUBJECT_HEIGHT}" fill="${bg}"/>${d}</svg>`;

/**
 * A boat on one point of sail, wind from the top: the no-go wedge, the angle
 * off the wind as an arc and a number, the boom eased as that course asks.
 * `angle` is the heading off the wind in degrees (0 head to wind, 180 running).
 */
export function renderPointOfSail(angle: number, boom: number, noGo: number, theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const cx = 400, cy = 335, reach = 235, arc = 130;
  const on = (deg: number, r: number): [number, number] => [fmt(cx + Math.sin((deg * Math.PI) / 180) * r), fmt(cy - Math.cos((deg * Math.PI) / 180) * r)];
  const [lx, ly] = on(-noGo, reach), [rx, ry] = on(noGo, reach), [hx, hy] = on(angle, reach), [ax, ay] = on(angle, arc);
  const d =
    path(`M${cx} ${cy}L${lx} ${ly}A${reach} ${reach} 0 0 1 ${rx} ${ry}Z`, p.faint, 2, '', p.faint) +
    path(`M${cx} ${cy}V${cy - reach}`, p.muted, 3, '9 9') +
    (angle < 3 ? '' : path(`M${cx} ${cy}L${hx} ${hy}`, p.muted, 3, '9 9') + path(`M${cx} ${cy - arc}A${arc} ${arc} 0 ${angle > 180 ? 1 : 0} 1 ${ax} ${ay}`, p.blue, 7)) +
    topBoat(cx, cy, angle, p, 1.2, boom) +
    arrow(110, 70, 110, 200, p.blue, 9) +
    label(678, 112, `${Math.round(angle)}°`, p.ink, 76);
  return subjectSvg(`point of sail, ${Math.round(angle)} degrees off the wind`, p.bg, d);
}

/**
 * A turn in three boats, wind from the top: before, in the middle (through the
 * wind, ringed) and after. A tack passes the bow through the wind, a jibe the stern.
 */
export function renderTurn(kind: 'tacking' | 'jibing', theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const angles = kind === 'tacking' ? [315, 0, 45] : [135, 180, 225];
  const booms = kind === 'tacking' ? [-32, 0, 32] : [70, 0, -70];
  const xs = [150, 400, 650], y = 345;
  const d =
    arrow(400, 40, 400, 150, p.blue, 9) +
    circle(xs[1], y, 122, p.faint) +
    angles.map((a, i) => topBoat(xs[i], y, a, p, 1.05, booms[i])).join('') +
    arrow(232, y, 300, y, p.muted, 6) + arrow(500, y, 568, y, p.muted, 6);
  return subjectSvg(kind === 'tacking' ? 'tack: the bow turns through the wind' : 'jibe: the stern turns through the wind', p.bg, d);
}

// Package 32, third subject: wind and trim. Same rules as above: 4:3, wind from the top (or from
// the left where the boat is seen from astern), the wind arrow always blue, no small text.
const rad = (deg: number) => (deg * Math.PI) / 180;
const faded = (d: string) => `<g opacity=".4">${d}</g>`;

/** The true wind as a field of arrows over a boat on a beam reach; a gust or a lull is a patch of it. */
export function renderWindField(kind: 'steady' | 'gust' | 'lull', theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const xs = [130, 265, 400, 535, 670];
  const patch = (i: number) => kind !== 'steady' && i > 0 && i < 4;
  const d =
    (kind === 'gust'
      ? path('M400 232m-215 0a215 56 0 1 0 430 0a215 56 0 1 0 -430 0', p.faint, 2, '', p.faint) +
        [250, 330, 410, 490].map((x, i) => path(`M${x} ${226 + (i % 2) * 14}q14-10 28 0t28 0`, p.muted, 3)).join('')
      : kind === 'lull'
        ? path('M400 232m-215 0a215 56 0 1 0 430 0a215 56 0 1 0 -430 0', p.muted, 3, '10 10')
        : '') +
    xs.map((x, i) => (patch(i)
      ? kind === 'gust' ? arrow(x, 36, x, 178, p.blue, 12) : arrow(x, 60, x, 112, p.blue, 4)
      : arrow(x, 44, x, 146, p.blue, 7))).join('') +
    topBoat(400, 425, 90, p, 1.5, 48);
  return subjectSvg(kind === 'gust' ? 'a gust: a patch of stronger wind' : kind === 'lull' ? 'a lull: a patch of lighter wind' : 'true wind: the same over the whole water', p.bg, d);
}

/**
 * Apparent wind as a triangle over a moving boat: the true wind (blue, from the top), the wind
 * the boat makes by moving (dashed, against its heading) and their sum, the wind felt on board.
 */
export function renderApparentWind(theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const d =
    topBoat(350, 440, 90, p, 1.5, 30) +
    arrow(540, 440, 660, 440, p.muted, 6) +
    arrow(590, 130, 400, 130, p.muted, 6, '12 10') +
    arrow(400, 130, 400, 350, p.blue, 9) +
    arrow(590, 130, 408, 344, p.teal, 12);
  return subjectSvg('apparent wind: true wind plus the wind of the boat\'s own motion', p.bg, d);
}

/** The windward or the leeward side of a boat: the half of the water the wind comes from, or goes to. */
export function renderSide(side: 'windward' | 'leeward', theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const y = 345, top = side === 'windward';
  const d =
    `<rect x="60" y="${top ? y - 190 : y}" width="680" height="190" rx="18" fill="${p.faint}"/>` +
    path(`M60 ${y}H740`, p.muted, 3, '9 9') +
    topBoat(400, y, 90, p, 1.3, 48) +
    arrow(150, 28, 150, 138, p.blue, 9) + arrow(650, 28, 650, 138, p.blue, 9);
  return subjectSvg(top ? 'windward: the side the wind comes from' : 'leeward: the side away from the wind', p.bg, d);
}

/** A wind shift: the old direction dashed, the new one solid, the turn between them marked. */
export function renderWindShift(theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const tipX = 400, tipY = 230, len = 185, shift = 28;
  const from = (deg: number): [number, number] => [fmt(tipX + Math.sin(rad(deg)) * len), fmt(tipY - Math.cos(rad(deg)) * len)];
  const [ox, oy] = from(0), [nx, ny] = from(shift);
  const d =
    arrow(ox, oy, tipX, tipY, p.muted, 7, '12 10') +
    arrow(nx, ny, tipX, tipY, p.blue, 10) +
    path(`M${ox} ${oy - 22}A${len + 22} ${len + 22} 0 0 1 ${fmt(nx + Math.sin(rad(shift)) * 22)} ${fmt(ny - Math.cos(rad(shift)) * 22)}`, p.sand, 6) +
    topBoat(400, 425, 45, p, 1.45, 22);
  return subjectSvg('wind shift: the wind turns to a new direction', p.bg, d);
}

/** Sail trim: the boom between sheeted too hard and eased too far, with the working angle solid. */
export function renderTrim(theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const end = (boom: number, r: number): [number, number] => [fmt(Math.sin(rad(boom)) * r), fmt(Math.cos(rad(boom)) * r)];
  const [ix, iy] = end(12, 62), [ex, ey] = end(84, 62), [ax, ay] = end(12, 80), [bx, by] = end(84, 80);
  // An arrowhead at the arc's end for boom angle `boom`, pointing on along the arc (dir 1: easing, -1: sheeting in).
  const head = (boom: number, dir: 1 | -1) => {
    const [x, y] = end(boom, 80), back = rad(boom - dir * 9);
    const wing = (r: number) => `${fmt(Math.sin(back) * r)} ${fmt(Math.cos(back) * r)}`;
    return path(`M${wing(72)}L${x} ${y}L${wing(88)}`, p.blue, 4);
  };
  const d =
    arrow(110, 70, 110, 200, p.blue, 9) +
    topBoat(400, 320, 90, p, 2.1, 48) +
    '<g transform="translate(400 320) rotate(90) scale(2.1)">' +
    path(`M0 0L${ix} ${iy}`, p.muted, 3, '5 5') + path(`M0 0L${ex} ${ey}`, p.muted, 3, '5 5') +
    path(`M${ax} ${ay}A80 80 0 0 0 ${bx} ${by}`, p.blue, 4) +
    head(12, -1) + head(84, 1) +
    '</g>';
  return subjectSvg('sail trim: the sheet sets the angle of the sail to the wind', p.bg, d);
}

/** One edge or line of the mainsail on the yacht seen from the side: the halyard, the luff or the leech. */
export function renderSailEdge(kind: 'halyard' | 'luff' | 'leech', theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const mark = kind === 'luff'
    ? path('M530 92V336', p.blue, 11)
    : kind === 'leech'
      ? path('M530 90Q431 190 252 340', p.blue, 11)
      : arrow(546, 396, 546, 84, p.blue, 7) + circle(530, 90, 12, p.blue);
  const d = `<g transform="translate(0 46) scale(.889)">${sideBoat(p)}${mark}</g>`;
  return subjectSvg(kind === 'halyard' ? 'halyard: the line that hoists the sail' : kind === 'luff' ? 'luff: the forward edge of the sail' : 'leech: the aft edge of the sail', p.bg, d);
}

/** Heel: the yacht seen from astern, leaning away from the wind, with the angle off the vertical. */
export function renderHeel(heel: number, theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const cx = 400, wl = 420, r = 250;
  const [mx, my] = [fmt(cx + Math.sin(rad(heel)) * r), fmt(wl - Math.cos(rad(heel)) * r)];
  const d =
    arrow(60, 150, 200, 150, p.blue, 9) +
    path(`M${cx} ${wl}V${wl - 340}`, p.muted, 3, '9 9') +
    `<g transform="translate(${cx} ${wl}) rotate(${heel})">` +
    path('M-9 40L-13 150H13L9 40Z', p.ink, 2, '', p.muted) +
    path('M-100 -42Q-96 30 0 46Q96 30 100 -42Z', p.ink, 3, '', p.hull) +
    path('M-100 -42H100', p.ink, 3) +
    path('M0 -330Q62 -190 44 -62L0 -62Z', p.muted, 2, '', p.cloth) +
    path('M0 -42V-340', p.ink, 6) +
    '</g>' +
    path(`M120 ${wl}q20-12 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0`, p.blue, 3) +
    path(`M${cx} ${wl - r}A${r} ${r} 0 0 1 ${mx} ${my}`, p.blue, 7) +
    label(660, 112, `${Math.round(heel)}°`, p.ink, 76);
  return subjectSvg(`heel: the yacht leans ${Math.round(heel)} degrees away from the wind`, p.bg, d);
}

/** A change of course on the same tack: luffing turns the bow towards the wind, bearing away turns it from the wind. */
export function renderCourseChange(kind: 'luff' | 'bear', theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const [a0, a1, b0, b1] = kind === 'luff' ? [90, 48, 48, 24] : [60, 125, 30, 68];
  const d =
    arrow(110, 70, 110, 200, p.blue, 9) +
    faded(topBoat(235, 380, a0, p, 1.4, b0)) +
    arrow(372, 378, 432, 378, p.muted, 6) +
    topBoat(580, 380, a1, p, 1.4, b1);
  return subjectSvg(kind === 'luff' ? 'luffing: the bow turns towards the wind' : 'bearing away: the bow turns away from the wind', p.bg, d);
}

/** The slot: the gap between the jib and the mainsail, with the air that flows through it. */
export function renderSlot(theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const cx = 400, cy = 320, k = 2.1;
  // A point of the boat's own drawing (x to starboard, y aft) on the page, bow to the right.
  const at = (x: number, y: number) => `${fmt(cx - k * y)} ${fmt(cy + k * x)}`;
  const d =
    arrow(110, 70, 110, 200, p.blue, 9) +
    topBoat(cx, cy, 90, p, k, 30) +
    path(`M${at(0, -86)}Q${at(22, -50)} ${at(24, 4)}`, p.ink, 9) +
    path(`M${at(-24, -66)}Q${at(8, -30)} ${at(13, -4)}Q${at(16, 12)} ${at(26, 26)}`, p.blue, 8) +
    arrow(...(at(26, 26).split(' ').map(Number) as [number, number]), ...(at(42, 46).split(' ').map(Number) as [number, number]), p.blue, 8);
  return subjectSvg('the slot: air flows between the jib and the mainsail', p.bg, d);
}

// Package 32, fourth subject: right of way, the start, the marks and tactics. Same rules as above:
// 4:3, wind from the top, the wind arrow blue, no small text. One colour code in every drawing:
// teal is the boat that holds its course (or the course to sail), sand the boat that keeps clear
// (or the thing to look at: a mark, the line, the gain).
export type RaceDrawing =
  | 'port-vs-starboard' | 'windward-leeward' | 'overtaking' | 'mark-room' | 'crossing' | 'start-line' | 'collision-avoid' | 'penalty'
  | 'upwind' | 'downwind' | 'mark-rounding' | 'layline' | 'overlap' | 'vmg' | 'vmc';

/** A curved arrow: from (x, y) to (X, Y), bent towards (cx, cy). */
function bend(x: number, y: number, cx: number, cy: number, X: number, Y: number, c: string, w = 6, dash = '') {
  const a = Math.atan2(Y - cy, X - cx), r = 15;
  return path(`M${x} ${y}Q${cx} ${cy} ${X} ${Y}`, c, w, dash) +
    path(`M${fmt(X - r * Math.cos(a - 0.5))} ${fmt(Y - r * Math.sin(a - 0.5))}L${X} ${Y}L${fmt(X - r * Math.cos(a + 0.5))} ${fmt(Y - r * Math.sin(a + 0.5))}`, c, w);
}

const RACE_LABELS: Record<RaceDrawing, string> = {
  'port-vs-starboard': 'opposite tacks: the port-tack boat passes astern of the starboard-tack boat',
  'windward-leeward': 'same tack, overlapped: the windward boat luffs clear of the leeward boat',
  overtaking: 'the boat coming from astern passes clear of the boat ahead',
  'mark-room': 'at the mark the outside boat gives the inside boat room inside the zone',
  crossing: 'two boats on crossing courses: who keeps clear?',
  'start-line': 'the start line between the pin and the committee boat, boats approaching',
  'collision-avoid': 'a collision ahead: both boats turn into the wind and slow down',
  penalty: 'a penalty turn: one full circle, a tack and a gybe',
  upwind: 'beating: a zigzag of close-hauled legs to the windward mark',
  downwind: 'running: broad-reach legs and a gybe down to the leeward mark',
  'mark-rounding': 'rounding a mark: wide on the way in, close on the way out',
  layline: 'the laylines: the two close-hauled courses that fetch the mark',
  overlap: 'an overlap: the boat astern has her bow past the line across the stern of the boat ahead',
  vmg: 'velocity made good: the part of the boat speed that goes to windward',
  vmc: 'velocity made on course: the part of the boat speed that goes towards the mark',
};

/** One race subject as a drawing: a rule of right of way, the start, a mark, a tactic. */
export function renderRace(kind: RaceDrawing, theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const wind = (x = 110) => arrow(x, 60, x, 190, p.blue, 9);
  const buoy = (x: number, y: number) => circle(x, y, 20, p.sand, p.ink, 3);
  const dashes = '14 12';
  let d = '';
  if (kind === 'port-vs-starboard') {
    d = wind() + arrow(495, 280, 385, 170, p.teal, 6) + bend(290, 370, 430, 350, 680, 470, p.sand) +
      topBoat(545, 330, 315, p, 0.62, -30) + topBoat(240, 420, 45, p, 0.62, 30);
  } else if (kind === 'windward-leeward') {
    d = wind() + arrow(250, 380, 160, 290, p.teal, 6) + bend(350, 300, 310, 255, 340, 130, p.sand) +
      topBoat(300, 430, 315, p, 0.62, -30) + topBoat(400, 350, 315, p, 0.62, -30);
  } else if (kind === 'overtaking') {
    d = wind() + arrow(590, 280, 720, 280, p.teal, 6) + bend(290, 305, 430, 440, 690, 400, p.sand) +
      topBoat(520, 280, 90, p, 0.62, 50) + topBoat(220, 300, 90, p, 0.62, 50);
  } else if (kind === 'mark-room') {
    d = wind(700) + path('M250 80A150 150 0 1 1 249 80', p.muted, 4, '10 10') + buoy(250, 230) +
      bend(423, 323, 300, 110, 140, 190, p.teal) + bend(503, 243, 370, 40, 120, 110, p.sand) +
      topBoat(470, 370, 315, p, 0.62, -30) + topBoat(550, 290, 315, p, 0.62, -30);
  } else if (kind === 'crossing') {
    d = wind() + path('M276 330H436', p.muted, 4, '10 10') + path('M501 203L462 310', p.muted, 4, '10 10') +
      topBoat(210, 330, 90, p, 0.62, 50) + topBoat(520, 150, 200, p, 0.62, -65) + label(585, 370, '?', p.ink, 110);
  } else if (kind === 'start-line') {
    d = arrow(400, 40, 400, 170, p.blue, 9) + path('M152 250H634', p.sand, 6, dashes) + buoy(130, 250) +
      path('M640 230h56q16 20 0 40h-56Z', p.ink, 3, '', p.hull) + path('M668 250V196', p.ink, 4) + path('M668 196h30v18h-30Z', p.sand, 2, '', p.sand) +
      topBoat(250, 450, 40, p, 0.56, 28) + topBoat(400, 410, 320, p, 0.56, -28) + topBoat(545, 450, 325, p, 0.56, -28);
  } else if (kind === 'collision-avoid') {
    d = wind() + path('M372 242L428 298M428 242L372 298', p.sand, 9) +
      bend(292, 378, 332, 330, 335, 190, p.sand) + bend(508, 378, 468, 330, 465, 190, p.sand) +
      topBoat(250, 420, 45, p, 0.62, 30) + topBoat(550, 420, 315, p, 0.62, -30);
  } else if (kind === 'penalty') {
    d = wind() + path('M420 170A150 150 0 1 1 419 170', p.sand, 6, dashes) + arrow(470, 173, 500, 180, p.sand, 6) +
      faded(topBoat(570, 320, 180, p, 0.5, 0) + topBoat(420, 470, 270, p, 0.5, -60) + topBoat(270, 320, 0, p, 0.5, 0)) +
      topBoat(420, 170, 90, p, 0.5, 50) + label(420, 348, '360°', p.ink, 78);
  } else if (kind === 'upwind') {
    d = wind() + path('M250 545L470 325L330 185', p.teal, 6, dashes) + arrow(330, 185, 386, 129, p.teal, 6, dashes) + buoy(400, 105) +
      topBoat(360, 435, 45, p, 0.62, 30);
  } else if (kind === 'downwind') {
    d = wind() + path('M240 90L532 382', p.teal, 6, dashes) + arrow(532, 382, 428, 486, p.teal, 6, dashes) + buoy(410, 510) +
      topBoat(350, 200, 135, p, 0.62, 70);
  } else if (kind === 'mark-rounding') {
    d = wind() + path('M650 520C570 330 520 170 400 170C340 170 330 230 330 300', p.teal, 6, dashes) + arrow(330, 300, 322, 530, p.teal, 6, dashes) + buoy(380, 250) +
      topBoat(583, 361, 335, p, 0.58, -25);
  } else if (kind === 'layline') {
    d = wind() + path('M400 110L130 380M400 110L670 380', p.muted, 4, '10 10') + buoy(400, 110) +
      arrow(545, 255, 432, 142, p.teal, 6) + topBoat(590, 300, 315, p, 0.62, -30);
  } else if (kind === 'overlap') {
    d = wind() + path('M414 110V510', p.sand, 6, dashes) + topBoat(470, 220, 90, p, 0.62, 50) + topBoat(400, 390, 90, p, 0.62, 50);
  } else if (kind === 'vmg') {
    d = wind() + path('M530 230H370', p.muted, 4, '10 10') + arrow(370, 390, 530, 230, p.teal, 7) + arrow(370, 390, 370, 230, p.sand, 9) +
      topBoat(330, 430, 45, p, 0.62, 30);
  } else {
    d = wind() + path('M394 247L455 140', p.muted, 4, '10 10') + path('M489 302L394 247', p.muted, 4, '10 10') + buoy(463, 126) +
      arrow(298, 412, 489, 302, p.teal, 7) + arrow(298, 412, 394, 247, p.sand, 9) + topBoat(250, 440, 60, p, 0.62, 38);
  }
  return subjectSvg(RACE_LABELS[kind], p.bg, d);
}
