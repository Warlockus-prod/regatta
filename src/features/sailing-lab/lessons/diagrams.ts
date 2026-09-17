import { words, type Language } from "../../../lib/product/catalog";
import type { SailLesson } from "../../../data/sailing-lab/course";
import { mainsheetCopy, mainsheetDrawing, mainsheetReadout } from "./mainsheet-diagram";
import { shapeCopy, shapeDrawing, shapeReadout } from "./shape-diagrams";

export const diagramCopy = {
  vang: shapeCopy.vang,
  outhaul: shapeCopy.outhaul,
  mainsheet: mainsheetCopy.description,
  rig: words("Выбери снасть: номер на схеме совпадает с номером кнопки.", "Select a line: its number matches the diagram.", "Wybierz linę: numer odpowiada schematowi.", "Elige un cabo: su número coincide con el esquema.", "Choisis un cordage : son numéro correspond au schéma.", "Wähle eine Leine: Die Nummer steht auch im Bild.", "Scegli una cima: il numero corrisponde allo schema."),
  wind: words("Измени скорость яхты. Истинный ветер остается 8 узлов сбоку. Стрелки показывают направление движения воздуха и яхты, не «откуда ветер».", "Change boat speed. True wind remains 8 knots abeam. Arrows show air and boat motion, not the direction wind comes from.", "Zmień prędkość jachtu. Wiatr rzeczywisty pozostaje 8 węzłów z boku. Strzałki pokazują ruch powietrza i jachtu, nie kierunek skąd wieje.", "Cambia la velocidad del barco. El viento real sigue a 8 nudos por el través. Las flechas muestran movimiento, no de dónde viene el viento.", "Change la vitesse du bateau. Le vent réel reste à 8 nœuds au travers. Les flèches montrent le mouvement, pas d'où vient le vent.", "Ändere die Bootsfahrt. Wahrer Wind bleibt 8 Knoten querab. Pfeile zeigen die Bewegung, nicht die Windherkunft.", "Cambia la velocità della barca. Il vento reale resta 8 nodi al traverso. Le frecce mostrano il movimento, non da dove viene il vento."),
  sheet: words("Выбери положение: вид сверху показывает предел отхода гика под нагрузкой. Это схема угла, а не расчет скорости.", "Choose a setting: the top view shows the boom's outward limit under load. This is an angle diagram, not a speed calculation.", "Wybierz ustawienie: widok z góry pokazuje granicę wychylenia bomu pod obciążeniem. To schemat kąta, nie obliczenie prędkości.", "Elige un ajuste: la vista superior muestra el límite de apertura bajo carga. Es un esquema angular, no un cálculo de velocidad.", "Choisis un réglage : la vue de dessus montre la limite d'ouverture sous charge. C'est un schéma d'angle, pas un calcul de vitesse.", "Wähle eine Stellung: Die Draufsicht zeigt die Auslenkungsgrenze unter Last. Ein Winkeldiagramm, keine Fahrtberechnung.", "Scegli una regolazione: la vista dall'alto mostra il limite di apertura sotto carico. È uno schema angolare, non un calcolo di velocità."),
  lines: [
    words("Фал", "Halyard", "Fał", "Driza", "Drisse", "Fall", "Drizza"),
    words("Гротшкот", "Mainsheet", "Szot grota", "Escota de mayor", "Écoute de grand-voile", "Großschot", "Scotta randa"),
    words("Оттяжка гика", "Vang", "Obciągacz bomu", "Contra", "Hale-bas", "Baumniederholer", "Vang"),
    words("Outhaul", "Outhaul", "Outhaul", "Pajarín", "Bordure", "Unterliekstrecker", "Base"),
    words("Топенант", "Topping lift", "Topenanta", "Amantillo", "Balancine", "Dirk", "Amantiglio"),
  ],
  windKeys: [words("Истинный ветер", "True wind", "Wiatr rzeczywisty", "Viento real", "Vent réel", "Wahrer Wind", "Vento reale"), words("Скорость яхты", "Boat velocity", "Prędkość jachtu", "Velocidad del barco", "Vitesse du bateau", "Bootsgeschwindigkeit", "Velocità della barca"), words("Вымпельный ветер", "Apparent wind", "Wiatr pozorny", "Viento aparente", "Vent apparent", "Scheinbarer Wind", "Vento apparente")],
  positions: [words("Выбрано", "Trimmed in", "Wybrany", "Cazada", "Bordée", "Dichtgeholt", "Cazzata"), words("Середина", "Intermediate", "Pośrednio", "Intermedia", "Intermédiaire", "Mittel", "Intermedia"), words("Потравлено", "Eased out", "Wyluzowany", "Lascada", "Choquée", "Gefiert", "Lascata")],
};

export function diagramOptions(kind: SailLesson["diagram"], lang: Language) {
  if (kind === "vang" || kind === "outhaul") return shapeCopy.options.map((label, value) => ({ value, label: label[lang] }));
  if (kind === "mainsheet") return mainsheetCopy.options.map((label, value) => ({ value, label: label[lang] }));
  if (kind === "wind") return [0, 4, 8].map(value => ({ value, label: `${value} kn` }));
  return (kind === "rig" ? diagramCopy.lines : diagramCopy.positions).map((label, value) => ({ value, label: `${kind === "rig" ? `${value + 1}. ` : ""}${label[lang]}` }));
}

export function diagramReadout(kind: SailLesson["diagram"], selection: number, lang: Language) {
  if (kind === "vang" || kind === "outhaul") return shapeReadout(kind, selection, lang);
  return kind === "mainsheet" ? mainsheetReadout(selection, lang) : null;
}

const ink = "#e8f4f8", muted = "#7593a6", cyan = "#00d4ff";
const dot = (x: number, y: number, number: number, active = true) => `<circle cx="${x}" cy="${y}" r="12" fill="#102738" stroke="${active ? cyan : muted}"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12">${number}</text>`;
const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, dashed = false) => {
  if (Math.hypot(x2 - x1, y2 - y1) < 0.01) return `<circle cx="${x1}" cy="${y1}" r="3" fill="${color}"/>`;
  const a = Math.atan2(y2 - y1, x2 - x1), s = 9;
  return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="3" ${dashed ? 'stroke-dasharray="5 4"' : ""}/><path d="M${x2 - s * Math.cos(a - 0.4)} ${y2 - s * Math.sin(a - 0.4)} L${x2} ${y2} L${x2 - s * Math.cos(a + 0.4)} ${y2 - s * Math.sin(a + 0.4)}" stroke="${color}" stroke-width="3" fill="none"/>`;
};
export function windExample(boatSpeed: number) {
  const speed = Math.max(0, Math.min(8, Number.isFinite(boatSpeed) ? boatSpeed : 0));
  return { boatSpeed: speed, aws: Math.hypot(8, speed), awa: Math.atan2(8, speed) * 180 / Math.PI };
}
/** Same dependency-free SVG used by web and native. Numbers avoid tiny translations. */
export function sailDiagram(kind: SailLesson["diagram"], selection: number): string {
  selection = Number.isFinite(selection) ? selection : 0;
  let drawing = "";
  if (kind === "vang" || kind === "outhaul") {
    drawing = shapeDrawing(kind, selection);
  } else if (kind === "mainsheet") {
    drawing = mainsheetDrawing(selection);
  } else if (kind === "rig") {
    drawing = `<path d="M45 196 Q150 230 310 196 L286 215 H75 Z" fill="#29475b" stroke="${muted}"/><path d="M105 28 V195 M105 167 H270" fill="none" stroke="${ink}" stroke-width="5"/><path d="M108 42 L258 164 H108 Z" fill="#d0e1e8" opacity=".45"/>`;
    const lines = [
      { d: "M109 42 L119 25 V187 L298 187", x: 119, y: 87 },
      { d: "M254 170 L241 196 L273 170 L260 196 L300 196", x: 283, y: 185 },
      { d: "M173 170 L105 195", x: 151, y: 195 },
      { d: "M150 160 H260", x: 216, y: 155 },
      { d: "M105 28 L270 163", x: 210, y: 110 },
    ];
    lines.forEach((line, index) => { drawing += `<path d="${line.d}" fill="none" stroke="${selection === index ? cyan : muted}" stroke-width="${selection === index ? 4 : 2}"/>` + dot(line.x, line.y, index + 1, selection === index); });
  } else if (kind === "wind") {
    const { boatSpeed, aws, awa } = windExample(selection);
    // All vectors use the same scale: the 8 kn true wind is 120 px long.
    const drop = boatSpeed * 15;
    drawing = `<path d="M75 78 Q30 130 46 208 H104 Q120 130 75 78Z" fill="#29475b" stroke="${muted}"/>`;
    drawing += arrow(285, 70, 165, 70, muted) + dot(225, 46, 1);
    drawing += arrow(75, 178, 75, 178 - drop, "#e8b96b", true) + dot(103, 152, 2);
    drawing += arrow(285, 70, 165, 70 + drop, cyan) + dot(236, 105 + drop / 2, 3);
    drawing += `<path d="M165 70 V${70 + drop}" stroke="${muted}" stroke-dasharray="3 5"/><text x="156" y="224" fill="${ink}" font-family="sans-serif" font-size="14">AWS ${aws.toFixed(1)} kn · AWA ${awa.toFixed(1)}°</text>`;
  } else {
    const angle = [12, 42, 78][Math.max(0, Math.min(2, Math.round(selection)))] * Math.PI / 180;
    const endX = 165 + Math.sin(angle) * 108, endY = 108 + Math.cos(angle) * 108;
    drawing = `<path d="M165 25 Q101 83 122 221 H208 Q229 83 165 25Z" fill="#29475b" stroke="${muted}"/><path d="M165 35 V220" stroke="${muted}" stroke-dasharray="4 5"/><path d="M165 108 L${endX} ${endY}" fill="none" stroke="${ink}" stroke-width="8"/><path d="M${endX} ${endY} L165 198" stroke="${cyan}" stroke-width="3"/><circle cx="165" cy="108" r="5" fill="${cyan}"/><path d="M165 144 A36 36 0 0 0 ${165 + Math.sin(angle) * 36} ${108 + Math.cos(angle) * 36}" stroke="${cyan}" fill="none"/><text x="238" y="69" font-size="18" fill="${ink}" font-family="sans-serif">${Math.round(angle * 180 / Math.PI)}°</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240" width="360" height="240"><rect width="360" height="240" rx="12" fill="#0f2035"/>${drawing}</svg>`;
}
