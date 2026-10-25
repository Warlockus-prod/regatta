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
