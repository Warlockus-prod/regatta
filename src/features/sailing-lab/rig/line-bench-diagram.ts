import { newLineBench, type LineBench } from "./line-handling";

const cyan = "#00d4ff", ink = "#e8f4f8", muted = "#7894a6";
const number = (x: number, y: number, n: number) => `<circle cx="${x}" cy="${y}" r="12" fill="#102738" stroke="${muted}"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="${ink}" font-size="12" font-family="sans-serif">${n}</text>`;
/** Side-view teaching diagram. Lever opens towards the incoming load, not the winch.
 * Wraps are separated for legibility. This is not a rigging or installation drawing.
 */
export function lineBenchDrawing(s: LineBench) {
  const loadedWinch = s.owner === "winch";
  const leverEnd = s.lever === "closed" ? [197, 118] : s.lever === "first-stage" ? [185, 78] : [110, 103];
  let svg = `<path d="M20 192 H340" stroke="${muted}" stroke-width="2"/>`;
  svg += `<path d="M20 148 H147" stroke="${cyan}" stroke-width="5"/><path d="M35 140 L23 148 L35 156" stroke="${cyan}" stroke-width="2" fill="none"/>`;
  if (s.wraps) svg += `<path d="M147 148 H249" stroke="${loadedWinch ? cyan : muted}" stroke-width="${loadedWinch ? 5 : 3}" ${loadedWinch ? "" : 'stroke-dasharray="5 4"'}/>`;
  svg += `<rect x="129" y="127" width="68" height="50" rx="8" fill="#29475b" stroke="${s.owner === "clutch" ? cyan : muted}" stroke-width="2"/><circle cx="164" cy="150" r="10" fill="#102738" stroke="${muted}"/><path d="M164 138 L${leverEnd[0]} ${leverEnd[1]}" stroke="${ink}" stroke-width="9" stroke-linecap="round"/>`;
  svg += `<path d="M242 126 Q267 115 292 126 L297 177 Q267 190 237 177 Z" fill="#29475b" stroke="${loadedWinch ? cyan : muted}" stroke-width="2"/><ellipse cx="267" cy="119" rx="32" ry="8" fill="#102738" stroke="${s.selfTailed ? cyan : muted}" stroke-width="3"/>`;
  for (let i = 0; i < s.wraps; i++) svg += `<path d="M240 ${171 - i * 9} Q267 ${184 - i * 9} 294 ${171 - i * 9}" stroke="${loadedWinch ? cyan : ink}" fill="none" stroke-width="3"/>`;
  if (s.wraps) svg += `<path d="M294 ${171 - (s.wraps - 1) * 9} Q326 152 330 190" fill="none" stroke="${s.tailHeld || s.selfTailed ? cyan : muted}" stroke-width="3"/>`;
  else svg += `<path d="M197 148 Q205 189 224 188 H330" fill="none" stroke="${muted}" stroke-width="3" stroke-dasharray="5 4"/>`;
  if (s.selfTailed) svg += `<path d="M294 144 L298 120 H246" stroke="${cyan}" fill="none" stroke-width="3"/>`;
  if (s.handleInserted) svg += `<path d="M267 118 V92 H313 V81" fill="none" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  if (s.tailHeld) svg += `<rect x="320" y="179" width="20" height="18" rx="5" fill="#e8b96b"/>`;
  svg += number(48, 109, 1) + number(154, 213, 2) + number(267, 213, 3) + number(330, 218, 4);
  // Inset explicitly shows winding viewed from above, independently of gear choice.
  if (s.wraps) {
    const cw = s.direction === "clockwise";
    svg += `<circle cx="268" cy="51" r="19" fill="none" stroke="${ink}" stroke-width="2"/><path d="M250 45 A19 19 0 1 1 279 67" fill="none" stroke="${cyan}" stroke-width="3"/><path d="${cw ? "M287 68 L278 68 L280 59" : "M243 48 L250 43 L255 50"}" fill="none" stroke="${cyan}" stroke-width="3"/>`;
  }
  return svg;
}
export const lineBenchSvg = (s: LineBench) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240" width="360" height="240"><rect width="360" height="240" rx="12" fill="#0f2035"/>${lineBenchDrawing(s)}</svg>`;
export function lineBenchExample(selection: number): LineBench {
  if (selection === 0) return newLineBench();
  return { ...newLineBench(), owner: "winch", wraps: 3, tailHeld: true, transferred: true, lever: selection === 1 ? "closed" : "open", paidOut: selection === 1 ? 0 : .1 };
}
