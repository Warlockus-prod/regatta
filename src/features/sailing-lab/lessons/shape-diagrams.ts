import { words, type Language } from "../../../lib/product/catalog";
import { outhaulDepthFactor } from "../../../lib/sailing-physics/mainsail-shape";
import { boomPoint } from "../rig/layout";
import { RIG_PASSPORT as P, type RigPoint } from "../rig/passport";
import { vangGeometry } from "../rig/vang";

export const shapeCopy = {
  vang: words("Вид сбоку в плоскости гика. Белый: гик. Желтый: оттяжка. Сравни заданные положения, не расчет равновесия. Укороченная оттяжка не дает гику подняться так высоко.", "Side view in the boom plane. White: boom. Yellow: vang. Compare prescribed poses, not an equilibrium calculation. The shorter vang limits how high the boom can rise.", "Widok w płaszczyźnie bomu. Biały: bom. Żółty: obciągacz. To zadane pozycje, nie obliczenie równowagi. Krótszy obciągacz ogranicza unoszenie bomu.", "Vista en el plano de la botavara. Blanca: botavara. Amarilla: contra. Posiciones fijadas, no equilibrio calculado. Acortar la contra limita la subida.", "Vue dans le plan de la bôme. Blanc : bôme. Jaune : hale-bas. Positions imposées, pas un équilibre calculé. Le hale-bas raccourci limite la montée.", "Ansicht in der Baumebene. Weiß: Baum. Gelb: Niederholer. Vorgegebene Stellungen, keine Gleichgewichtsrechnung. Kürzer begrenzt das Steigen.", "Vista nel piano del boma. Bianco: boma. Giallo: vang. Posizioni assegnate, non equilibrio calcolato. Il vang corto limita la salita."),
  outhaul: words("Горизонтальные сечения на 20%, 40% и 70% высоты. Пунктир: хорда. Голубой: профиль. Хорды показаны одинаковыми для сравнения глубины; twist здесь отключен.", "Horizontal sections at 20%, 40% and 70% height. Dashed: chord. Cyan: profile. Chords have equal display length to compare depth; twist is disabled here.", "Przekroje na 20%, 40% i 70% wysokości. Przerywana: cięciwa. Niebieski: profil. Cięciwy mają jednakową długość na rysunku; skręt jest wyłączony.", "Secciones al 20%, 40% y 70% de altura. Discontinua: cuerda. Azul: perfil. Cuerdas iguales para comparar profundidad; sin twist.", "Coupes à 20%, 40% et 70% de hauteur. Pointillé : corde. Bleu : profil. Cordes égales pour comparer le creux ; sans vrillage.", "Schnitte bei 20%, 40% und 70% Höhe. Gestrichelt: Sehne. Blau: Profil. Gleiche Sehnenlänge zum Tiefenvergleich; ohne Twist.", "Sezioni al 20%, 40% e 70% dell'altezza. Tratteggio: corda. Azzurro: profilo. Corde uguali per confrontare la profondità; senza twist."),
  options: [
    words("Выбрано", "Hauled in", "Wybrane", "Cazado", "Étarqué", "Dichtgeholt", "Cazzato"),
    words("Потравлено", "Eased", "Wyluzowane", "Lascado", "Relâché", "Gefiert", "Lascato"),
  ],
  span: words("Расстояние между блоками", "Block separation", "Odstęp bloków", "Separación de bloques", "Écart des poulies", "Blockabstand", "Distanza dei bozzelli"),
  depth: words("Изменяется глубина, не направление хорды", "Depth changes, not chord direction", "Zmienia się głębokość, nie kierunek cięciwy", "Cambia la profundidad, no la dirección", "Le creux change, pas la direction", "Tiefe ändert sich, nicht die Sehnenrichtung", "Cambia la profondità, non la direzione"),
};
export const vangExample = (selection: number) => {
  const pose = { yaw: 0, rise: selection >= 1 ? 8 : 2 };
  return { pose, ...vangGeometry(pose) };
};
// Avoid server/browser trigonometric last-bit differences in inline SVG.
const coordinate = (value: number) => Math.round(value * 1000) / 1000;
export function shapeReadout(kind: "vang" | "outhaul", selection: number, lang: Language) {
  if (kind === "outhaul") return shapeCopy.depth[lang];
  const { span, pose } = vangExample(selection);
  return `${shapeCopy.span[lang]}: ${span.toFixed(2)} m · ${pose.rise}°`;
}
export function shapeDrawing(kind: "vang" | "outhaul", selection: number) {
  if (kind === "vang") {
    const { pose, upper, lower } = vangExample(selection), end = boomPoint(pose, P.boom.length, 0);
    const xy = (p: RigPoint) => `${coordinate(45 + (P.mainPivot.forward - p.forward) * 52)},${coordinate(210 - (p.up - 1.2) * 55)}`;
    return `<path d="M45 28 V208 M25 208 H334" stroke="#7593a6" stroke-width="4"/><path d="M${xy(P.mainPivot)} L${xy(end)}" stroke="#e8f4f8" stroke-width="6"/><path d="M${xy(upper)} L${xy(lower)}" stroke="#e8b96b" stroke-width="4"/><path d="M${xy(P.mainPivot)} H310" stroke="#7593a6" stroke-dasharray="4 5"/><text x="230" y="150" fill="#e8f4f8" font-family="sans-serif" font-size="20">${pose.rise}°</text>`;
  }
  return [.2, .4, .7].map((height, i) => {
    const y = 37 + i * 65, depth = 240 * .128 * (.65 + .35 * Math.sin(Math.PI * height)) * outhaulDepthFactor(selection >= 1 ? 1 : 0, height);
    const points = Array.from({ length: 41 }, (_, j) => {
      const u = j / 40, profile = u <= .45 ? 1 - ((u - .45) / .45) ** 2 : 1 - ((u - .45) / .55) ** 2;
      return `${coordinate(70 + u * 240)},${coordinate(y + profile * depth)}`;
    }).join(" ");
    return `<text x="15" y="${y + 4}" fill="#e8f4f8" font-family="sans-serif" font-size="14">${height * 100}%</text><path d="M70 ${y} H310" stroke="#7593a6" stroke-dasharray="3 4"/><polyline points="${points}" stroke="#00d4ff" stroke-width="3" fill="none"/>`;
  }).join("");
}
