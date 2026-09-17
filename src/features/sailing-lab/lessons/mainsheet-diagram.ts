import { words, type Language } from "../../../lib/product/catalog";
import { boomPoint, mainsheetGeometry, type BoomPose } from "../rig/layout";
import { RIG_PASSPORT as P, type RigPoint } from "../rig/passport";

export const mainsheetCopy = {
  description: words("1: сверху, 2: с кормы. Белый гик, голубой шкот, квадрат каретки. Сравни заданные положения под нагрузкой: одинаковый угол, разная высота. Схема не вычисляет равновесие или twist; оттяжка здесь не ограничивает подъем.", "1: top, 2: astern. White boom, cyan sheet, square traveler. Compare prescribed loaded poses: same angle, different height. This diagram does not solve equilibrium or twist; the vang does not limit rise here.", "1: z góry, 2: od rufy. Biały bom, niebieski szot, kwadrat wózka. Porównaj zadane pozycje pod obciążeniem: ten sam kąt, inna wysokość. Schemat nie oblicza równowagi ani skrętu; obciągacz nie ogranicza tu unoszenia.", "1: desde arriba, 2: desde popa. Botavara blanca, escota azul, carro cuadrado. Posiciones fijadas bajo carga: mismo ángulo, distinta altura. No se calcula equilibrio ni torsión; la contra no limita la subida aquí.", "1 : dessus, 2 : arrière. Bôme blanche, écoute bleue, chariot carré. Positions imposées sous charge : même angle, hauteur différente. Le schéma ne calcule ni équilibre ni vrillage ; le hale-bas ne limite pas la montée ici.", "1: oben, 2: achtern. Weißer Baum, blaue Schot, Traveller als Quadrat. Vorgegebene belastete Stellungen: gleicher Winkel, andere Höhe. Kein Gleichgewichts- oder Twistmodell; der Niederholer begrenzt hier nicht das Steigen.", "1: dall'alto, 2: da poppa. Boma bianco, scotta azzurra, carrello quadrato. Posizioni assegnate sotto carico: stesso angolo, altezza diversa. Non si calcolano equilibrio o twist; qui il vang non limita la salita."),
  options: [
    words("Шкот короче, каретка в центре", "Shorter sheet, centered car", "Krótszy szot, wózek na środku", "Escota corta, carro centrado", "Écoute courte, chariot centré", "Kürzere Schot, Traveller mittig", "Scotta corta, carrello al centro"),
    words("Шкот длиннее, каретка на ветер", "Longer sheet, car to windward", "Dłuższy szot, wózek na wiatr", "Escota larga, carro a barlovento", "Écoute longue, chariot au vent", "Längere Schot, Traveller in Luv", "Scotta lunga, carrello sopravvento"),
  ],
  length: words("Длина шести рабочих участков", "Length of six moving spans", "Długość sześciu odcinków roboczych", "Longitud de seis tramos móviles", "Longueur des six brins mobiles", "Länge der sechs beweglichen Parten", "Lunghezza dei sei tratti mobili"),
  angle: words("Угол гика", "Boom angle", "Kąt bomu", "Ángulo de botavara", "Angle de bôme", "Baumwinkel", "Angolo del boma"),
  rise: words("Подъем гика", "Boom rise", "Uniesienie bomu", "Elevación de botavara", "Montée de bôme", "Baumanstieg", "Salita del boma"),
};

export function mainsheetExample(selection: number) {
  const second = Number.isFinite(selection) && Math.round(selection) >= 1;
  const pose: BoomPose = { yaw: -15, rise: second ? 5 : 1 };
  const traveler = second ? .65 : 0;
  return { pose, traveler, ...mainsheetGeometry(pose, traveler) };
}
export function mainsheetReadout(selection: number, lang: Language) {
  const s = mainsheetExample(selection);
  return `${mainsheetCopy.angle[lang]}: 15°. ${mainsheetCopy.rise[lang]}: ${s.pose.rise}°. ${mainsheetCopy.length[lang]}: ${s.workingLength.toFixed(2)} m.`;
}
const n = (value: number) => Math.round(value * 1000) / 1000;
const path = (a: [number, number], b: [number, number], color: string, width: number) => `<path d="M${a.map(n).join(" ")} L${b.map(n).join(" ")}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
export function mainsheetDrawing(selection: number) {
  const { pose, boom, car } = mainsheetExample(selection);
  const end = boomPoint(pose, P.boom.length, 0);
  const top = (p: RigPoint): [number, number] => [86 + p.starboard * 22, 47 + (P.mainPivot.forward - p.forward) * 22];
  const aft = (p: RigPoint): [number, number] => [270 + p.starboard * 34, 209 - (p.up - 1.3) * 59];
  let drawing = '<path d="M177 24 V219" stroke="#29475b"/><path d="M86 29 Q43 66 48 179 H124 Q129 66 86 29Z" fill="#203d50" stroke="#7593a6"/>';
  for (const project of [top, aft]) {
    const [cx, cy] = project(car), [bx, by] = project(boom);
    drawing += path(project({ ...car, starboard: -.8 }), project({ ...car, starboard: .8 }), "#7593a6", 5);
    drawing += path(project(P.mainPivot), project(end), "#e8f4f8", 5);
    drawing += path([bx, by], [cx, cy], "#00d4ff", 3);
    drawing += `<rect x="${n(cx - 5)}" y="${n(cy - 5)}" width="10" height="10" fill="#00d4ff"/><circle cx="${n(bx)}" cy="${n(by)}" r="4" fill="#e8f4f8"/>`;
  }
  drawing += '<path d="M86 38 V169 M270 41 V197" stroke="#7593a6" stroke-dasharray="4 4"/>';
  drawing += '<path d="M217 198 H323" stroke="#7593a6" stroke-width="3"/>';
  drawing += '<path d="M320 53 H291 M299 47 L291 53 L299 59" stroke="#e8b96b" fill="none" stroke-width="2"/>';
  drawing += `<g fill="#e8f4f8" font-family="sans-serif" font-size="16"><text x="24" y="24">1</text><text x="198" y="24">2</text><text x="110" y="83">15°</text><text x="233" y="222">${pose.rise}°</text></g>`;
  return drawing;
}
