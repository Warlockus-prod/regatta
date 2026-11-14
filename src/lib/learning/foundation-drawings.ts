/**
 * Lesson drawings from the Codex graphics kit (design/codex-visual-kit-2026-09-28,
 * graphics/drawings.js), ported for the eight foundation lessons and the rig pilot. The geometry and
 * the SVG text are the kit's, so `__tests__/lesson-graphics.test.ts` can compare
 * the output byte for byte with the kit's exports (fixtures in
 * `__tests__/fixtures/codex-graphics`). No DOM code from the kit's gallery.
 *
 * Reviewed corrections: turning sequences centre the boom at the crossing;
 * points-of-sail ease it to leeward as the course opens. In the first pilot, the kit draws the boom of the
 * wind-direction boat 24 degrees to starboard in all three states, so with the
 * wind from starboard it sits on the windward side. The lesson passes the boom
 * angle per state instead (`windDirectionBoom`): centreline head to wind, to
 * port (leeward) with the wind from starboard and from astern. With `boom: 24`
 * the output is the kit's export again.
 *
 * Numbers, symbols and strokes only: titles, legends and explanations stay in
 * localized components (src/lessons/graphics/scenes.ts).
 */

export type GraphicTheme = 'paper' | 'instrument';
export type SceneId = 'wind-direction' | 'rig-basics' | 'points-of-sail' | 'how-sail-works' | 'tacking' | 'jibing' | 'vmg-beating' | 'simple-rules' | 'mini-race';
export type SceneState = 0 | 1 | 2;

interface Palette {
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

const palettes: Record<GraphicTheme, Palette> = {
  paper: { bg: '#fffefa', ink: '#123247', muted: '#607583', faint: '#dce2e3', cloth: '#eee8dc', hull: '#e0e9ec', blue: '#006ea6', teal: '#006d70', sand: '#8a6100' },
  instrument: { bg: '#0a1628', ink: '#e8f4f8', muted: '#a4bac8', faint: '#30485c', cloth: '#263b49', hull: '#193347', blue: '#74d8f4', teal: '#86d4c4', sand: '#f1c477' },
};

/** Drawing size of every scene (the kit's viewBox). */
export const SCENE_WIDTH = 900;
export const SCENE_HEIGHT = 560;

const fmt = (n: number) => Math.round(n * 100) / 100;

const path = (d: string, c: string, w = 3, dash = '', fill = 'none') =>
  `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

const circle = (x: number, y: number, r: number, fill: string, stroke = 'none', w = 2) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;

const label = (x: number, y: number, s: string | number, c: string, size = 26) =>
  `<text x="${x}" y="${y}" text-anchor="middle" fill="${c}" font-family="system-ui,sans-serif" font-size="${size}" font-weight="600">${s}</text>`;

/** Numbered marker; the number matches the legend under the drawing. */
const dot = (x: number, y: number, n: number, p: Palette, on = true) =>
  circle(x, y, 19, p.bg, on ? p.blue : p.muted, 3) + label(x, y + 7, n, on ? p.blue : p.muted, 22);

function arrow(x: number, y: number, X: number, Y: number, c: string, w = 4, dash = '') {
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
function topBoat(x: number, y: number, angle: number, p: Palette, scale = 1, boom: number | null = 24) {
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
function sideBoat(p: Palette, { reef = 0, rise = 0 }: { reef?: number; rise?: number } = {}) {
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

/**
 * Boom angle of the wind-direction boat per state: head to wind the sail flaps
 * on the centreline; with the wind from starboard the boom swings to port, the
 * leeward side; running before the wind it is eased almost square, still to port
 * (the boat stays on starboard tack).
 */
export const windDirectionBoom: Record<SceneState, number> = { 0: 0, 1: -45, 2: -80 };

export interface RenderOptions {
  /** Boom angle of the wind-direction boat; `24` reproduces the kit export. */
  boom?: number;
}

export interface AngleTaskScene {
  /** Heading off the wind in degrees: 0 head to wind, positive clockwise. */
  angle: number;
  boom: number;
  /** The mark to reach, or null when the task is finished. */
  target: number | null;
  /** Half-angle of the no-go wedge, from the shared constant. */
  noGo: number;
  /** Shown number, 0 to 180. */
  shownAngle: number;
  windLabel: string;
}

/** One boat, one handle: the mini task of a lesson, wind always from the top. */
export function renderAngleTask(scene: AngleTaskScene, theme: GraphicTheme = 'paper'): string {
  const p = palettes[theme];
  const cx = 450, cy = 290, reach = 205;
  const onCircle = (deg: number, r: number): [number, number] => [
    fmt(cx + Math.sin((deg * Math.PI) / 180) * r),
    fmt(cy - Math.cos((deg * Math.PI) / 180) * r),
  ];
  const [lx, ly] = onCircle(-scene.noGo, reach);
  const [rx, ry] = onCircle(scene.noGo, reach);
  const [hx, hy] = onCircle(scene.angle, reach);
  const d =
    path(`M${cx} ${cy}L${lx} ${ly}A${reach} ${reach} 0 0 1 ${rx} ${ry}Z`, p.faint, 2, '', p.faint) +
    path(`M${cx} ${cy}L${hx} ${hy}`, p.muted, 2, '7 7') +
    (scene.target === null ? '' : (() => {
      const [tx, ty] = onCircle(scene.target, reach);
      return circle(tx, ty, 17, p.bg, p.blue, 5);
    })()) +
    topBoat(cx, cy, scene.angle, p, 1.2, scene.boom) +
    arrow(135, 120, 135, 225, p.blue, 6) +
    label(135, 100, scene.windLabel, p.blue, 28) +
    label(765, 120, `${scene.shownAngle}°`, p.ink, 56);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}"><rect width="${SCENE_WIDTH}" height="${SCENE_HEIGHT}" fill="${p.bg}"/>${d}</svg>`;
}

export function renderScene(id: SceneId, state: SceneState, theme: GraphicTheme = 'paper', options: RenderOptions = {}): string {
  const p = palettes[theme];
  const active = (i: number) => (i === state ? p.blue : p.muted);
  let d = '';
  if (id === 'rig-basics') {
    d =
      sideBoat(p) +
      path('M522 91V78Q534 56 543 80V372L565 392', active(0), state === 0 ? 6 : 3, '6 5') +
      path('M312 346V404', active(1), state === 1 ? 6 : 3) +
      path('M528 390 417 344', active(2), state === 2 ? 6 : 3) +
      dot(570, 162, 1, p, state === 0) +
      dot(278, 375, 2, p, state === 1) +
      dot(466, 394, 3, p, state === 2);
  } else if (id === 'wind-direction') {
    const boom = options.boom ?? windDirectionBoom[state];
    d = topBoat(450, 290, 0, p, 1.25, boom) + dot(420, 140, 1, p);
    const points: [number, number, number, number][] = [
      [450, 67, 450, 162],
      [727, 290, 620, 290],
      [450, 487, 450, 417],
    ];
    const v = points[state]!;
    d +=
      arrow(v[0], v[1], v[2], v[3], p.blue, 6) +
      dot(v[0] + (state === 1 ? 0 : 54), v[1] + (state === 1 ? -49 : 0), 2, p) +
      dot(v[2] + (state === 1 ? 0 : 55), v[3] + (state === 1 ? 48 : 0), 3, p);
  } else if(id==="points-of-sail"){
  const angle=[45,90,135][state],a=angle*Math.PI/180,cx=446,cy=306;d=path(`M${cx} ${cy}V73M${cx} ${cy}L${fmt(cx+Math.sin(a)*201)} ${fmt(cy-Math.cos(a)*201)}`,p.muted,2,"7 7")+path(`M446 186A120 120 0 0 1 ${fmt(cx+Math.sin(a)*120)} ${fmt(cy-Math.cos(a)*120)}`,p.blue,4)+topBoat(cx,cy,angle,p,.8,[22,48,75][state])+arrow(145,120,145,215,p.blue,5)+dot(194,115,1,p)+dot(fmt(cx+Math.sin(a)*94),fmt(cy-Math.cos(a)*94),2,p)+dot(656,180,3,p)+label(675,236,`${angle}°`,p.blue,38);
  } else if(id==="how-sail-works"){
  d=topBoat(400,320,0,p,1.35);d+=arrow(400,295,598,139,p.blue,6);if(state!==0)d+=arrow(400,295,400,139,p.teal,5)+arrow(400,295,598,295,p.sand,5)+path("M400 139H598V295",p.muted,2,"7 7");d+=dot(598,98,1,p)+(state!==0?dot(352,163,2,p)+dot(636,299,3,p):'');if(state===2)d+=arrow(395,351,245,351,p.muted,5)+path("M377 320H419V365H377Z",p.muted,2,"6 6");
  } else if(id==="tacking"||id==="jibing"){
  const angles=id==="tacking"?[315,0,45]:[135,180,225]; const booms=id==="tacking"?[-32,0,32]:[70,0,-70];d=arrow(450,55,450,124,p.blue,4);angles.forEach((a,i)=>{d+=`<g>`+(i===state?circle(215+i*235,293,116,p.faint):"")+topBoat(215+i*235,293,a,p,1.05,booms[i])+dot(215+i*235,431,i+1,p,i===state)+"</g>";});d+=arrow(292,295,362,295,p.muted,3)+arrow(536,295,608,295,p.muted,3);
  } else if(id==="vmg-beating"){
  const a=[40,55,70][state]*Math.PI/180,cx=265,cy=415,x=cx+Math.sin(a)*285,y=cy-Math.cos(a)*285;d=path("M265 454V66",p.muted,2,"7 8")+arrow(cx,cy,x,y,p.blue,5)+arrow(cx-16,cy,cx-16,y,p.teal,6)+path(`M${x} ${y}H265`,p.muted,2,"7 7")+dot(220,76,1,p)+dot(fmt(x+37),fmt(y+12),2,p)+dot(199,fmt((cy+y)/2),3,p)+label(650,191,"6",p.ink,30)+label(650,245,`${(6*Math.cos(a)).toFixed(2)}`,p.teal,30)+label(650,302,`${[40,55,70][state]}°`,p.muted,30);
  } else if(id==="simple-rules"){
  d=arrow(450,67,450,153,p.blue,5)+dot(504,112,1,p);if(state!==1)d+=topBoat(270,310,315,p,1.25,-32)+dot(220,444,2,p);if(state!==0)d+=topBoat(630,310,45,p,1.25,32)+dot(678,444,3,p);
  } else if(id==="mini-race"){
  d=path("M260 433H655",p.blue,3,"8 6")+circle(260,433,13,p.sand)+circle(655,433,13,p.sand)+circle(445,135,16,p.sand)+dot(714,434,1,p)+dot(490,116,2,p)+dot(587,200,3,p)+arrow(160,90,160,167,p.muted,3);
  if(state===0)d+=topBoat(447,467,345,p,.42);if(state>=1)d+=path("M450 411 580 288 445 153",p.blue,4,"8 6");if(state===2)d+=path("M445 153C407 157 407 102 448 101C485 101 486 149 466 174",p.blue,4)+arrow(466,174,507,346,p.blue,4);

  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}" role="img" aria-label="${id}, state ${state + 1}"><rect width="${SCENE_WIDTH}" height="${SCENE_HEIGHT}" rx="20" fill="${p.bg}"/>${d}</svg>`;
}

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
