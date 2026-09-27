import { words, type Language } from "../../../lib/product/catalog";

// The helm as the trim meter (Dedekam pp. 21, 27, 38, 63: D3-09 3-5 deg of
// weather helm is optimal, over 5 is a hand brake, D4-31 over 8 with the trim
// exhausted means reduce sail, D4-36..D4-39 the diagnosis table). Top view of
// the stern, wind from the left. The zone of each tiller angle comes from the
// same thresholds the lesson text quotes.

export const HELM_ZONES = { optimalFrom: 3, optimalTo: 5, brakeTo: 8 } as const;
// Tiller angle to windward per option, degrees; negative is lee helm.
export const HELM_ANGLES = [-4, 4, 6.5, 11] as const;

export type HelmZone = "lee" | "light" | "optimal" | "brake" | "reduce";
export function helmZone(deg: number): HelmZone {
  if (deg < 0) return "lee";
  if (deg < HELM_ZONES.optimalFrom) return "light";
  if (deg <= HELM_ZONES.optimalTo) return "optimal";
  if (deg <= HELM_ZONES.brakeTo) return "brake";
  return "reduce";
}

export function helmState(selection: number) {
  const index = Math.max(0, Math.min(HELM_ANGLES.length - 1, Math.round(Number.isFinite(selection) ? selection : 1)));
  const deg = HELM_ANGLES[index];
  return { index, deg, zone: helmZone(deg) };
}

export const helmCopy = {
  description: words(
    "Вид сверху на корму, ветер слева. Белым - румпель, числа - угол руля на ветер в градусах. Зеленая зона 3-5: оптимум. Желтая 5-8: руль тормозит. Красная больше 8: уменьшай паруса. Справа: руль под ветер.",
    "Top view of the stern, wind from the left. White is the tiller, the numbers are degrees of weather helm. Green 3-5: optimal. Yellow 5-8: the rudder brakes. Red over 8: reduce sail. On the right: lee helm.",
    "Widok z gory na rufe, wiatr z lewej. Na bialo rumpel, liczby to kat steru na nawietrzna w stopniach. Zielona strefa 3-5: optimum. Zolta 5-8: ster hamuje. Czerwona powyzej 8: zmniejsz zagle. Po prawej: ster na zawietrzna.",
    "Vista cenital de la popa, viento por la izquierda. En blanco la caña, los números son grados de caña a barlovento. Verde 3-5: óptimo. Amarillo 5-8: el timón frena. Rojo más de 8: reduce vela. A la derecha: caña a sotavento.",
    "Vue de dessus de l'arrière, vent de la gauche. En blanc la barre, les chiffres sont des degrés de barre au vent. Vert 3-5 : optimal. Jaune 5-8 : le safran freine. Rouge au-delà de 8 : réduis la toile. À droite : barre sous le vent.",
    "Draufsicht aufs Heck, Wind von links. Weiß die Pinne, die Zahlen sind Grad Luvruder. Grün 3-5: optimal. Gelb 5-8: das Ruder bremst. Rot über 8: Segelfläche verkleinern. Rechts: Leeruder.",
    "Vista dall'alto della poppa, vento da sinistra. In bianco la barra, i numeri sono gradi di timone sopravvento. Verde 3-5: ottimale. Giallo 5-8: il timone frena. Rosso oltre 8: riduci la vela. A destra: timone sottovento.",
  ),
  options: [
    words("Руль под ветер", "Lee helm", "Ster na zawietrzna", "Caña a sotavento", "Barre sous le vent", "Leeruder", "Timone sottovento"),
    words("3-5° на ветер", "3-5° to windward", "3-5° na nawietrzna", "3-5° a barlovento", "3-5° au vent", "3-5° Luvruder", "3-5° sopravvento"),
    words("5-8°", "5-8°", "5-8°", "5-8°", "5-8°", "5-8°", "5-8°"),
    words("Больше 8°", "Over 8°", "Ponad 8°", "Más de 8°", "Plus de 8°", "Über 8°", "Oltre 8°"),
  ],
  readouts: [
    words(
      "Лодка уваливается, руль приходится держать под ветер. Паруса слишком плоские, задняя шкаторина грота слишком открыта или гика-шкот растравлен. Сделай грот глубже, подбери гика-шкот или сдвинь каретку на ветер, сохранив твист.",
      "The boat bears away and you hold the helm to leeward. The sails are too flat, the main leech too open, or the mainsheet eased too far. Make the main deeper, trim the mainsheet, or move the traveller to windward while keeping the twist.",
      "Jacht odpada, ster trzeba trzymac na zawietrzna. Zagle sa za plaskie, lik tylny grota za bardzo otwarty albo szot grota za luzny. Pogleb grota, wybierz szot albo przesun wozek na nawietrzna, zachowujac skret.",
      "El barco arriba y hay que llevar la caña a sotavento. Las velas están demasiado planas, la baluma de la mayor muy abierta o la escota demasiado lascada. Da más bolsa a la mayor, caza la escota o sube el carro a barlovento manteniendo la torsión.",
      "Le bateau abat et tu tiens la barre sous le vent. Les voiles sont trop plates, la chute de grand-voile trop ouverte ou l'écoute trop choquée. Creuse la grand-voile, borde l'écoute ou monte le chariot au vent en gardant le vrillage.",
      "Das Boot fällt ab, und du hältst das Ruder nach Lee. Die Segel sind zu flach, das Achterliek des Groß zu offen oder die Großschot zu weit gefiert. Das Groß bauchiger machen, die Schot dichtholen oder den Traveller nach Luv setzen und dabei den Twist halten.",
      "La barca poggia e devi tenere il timone sottovento. Le vele sono troppo piatte, la balumina della randa troppo aperta o la scotta troppo lascata. Dai più grasso alla randa, cazza la scotta o porta il carrello sopravvento mantenendo lo svergolamento.",
    ),
    words(
      "Легкий наветренный руль: оптимум. Рулевой чувствует лодку, и она немного помогает идти остро. Но нейтральный руль еще не значит верный трим: если лодка не идет остро или медленнее других, смотри последний раздел.",
      "A light weather helm: optimal. The helmsman can feel the boat, and it helps a little to point. A balanced helm is not yet a right trim, though: if the boat will not point or is slower than others, see the last section.",
      "Lekki ster na nawietrzna: optimum. Sternik czuje jacht, a to troche pomaga isc ostro. Ale zrownowazony ster to jeszcze nie dobry trym: jesli jacht nie idzie ostro albo jest wolniejszy od innych, zobacz ostatnia czesc.",
      "Una ligera caña a barlovento: óptimo. El timonel siente el barco y eso ayuda un poco a ceñir. Pero un timón equilibrado no es aún un buen trimado: si el barco no ciñe o va más lento que otros, mira la última parte.",
      "Une légère barre au vent : c'est l'optimum. Le barreur sent le bateau, et cela aide un peu à remonter. Mais une barre équilibrée n'est pas encore un bon réglage : si le bateau ne remonte pas ou va moins vite que les autres, vois la dernière partie.",
      "Leichtes Luvruder: optimal. Der Rudergänger spürt das Boot, und es hilft etwas beim Höhelaufen. Ein ausgewogenes Ruder ist aber noch kein richtiger Trimm: Läuft das Boot keine Höhe oder ist es langsamer als andere, sieh den letzten Teil an.",
      "Un leggero timone sopravvento: ottimale. Il timoniere sente la barca, e aiuta un po' a stringere. Ma un timone equilibrato non è ancora una buona regolazione: se la barca non stringe o va più piano di altre, guarda l'ultima parte.",
    ),
    words(
      "Руль работает как ручной тормоз. Уплости паруса, открой твист грота, потравив гика-шкот, и сдвинь каретку под ветер.",
      "The rudder works as a hand brake. Flatten the sails, open the main's twist by easing the mainsheet, and move the traveller to leeward.",
      "Ster dziala jak hamulec reczny. Splaszcz zagle, otworz skret grota, luzujac szot, i przesun wozek na zawietrzna.",
      "El timón trabaja como un freno de mano. Aplana las velas, abre la torsión de la mayor lascando la escota y baja el carro a sotavento.",
      "Le safran travaille comme un frein à main. Aplatis les voiles, ouvre le vrillage de la grand-voile en choquant l'écoute et descends le chariot sous le vent.",
      "Das Ruder wirkt wie eine Handbremse. Segel flacher machen, den Twist des Groß durch Fieren der Schot öffnen und den Traveller nach Lee setzen.",
      "Il timone lavora come un freno a mano. Appiattisci le vele, apri lo svergolamento della randa lascando la scotta e porta il carrello sottovento.",
    ),
    words(
      "Тяжелый руль. Если трим уже исчерпан, а крен больше 25 градусов или руль на ветер больше 8, уменьшай парусность: риф грота или меньше генуи.",
      "Heavy weather helm. If the trim is exhausted and heel is over 25 degrees or the helm over 8, reduce sail: reef the main or roll away some genoa.",
      "Ciezki ster. Jesli trym jest wyczerpany, a przechyl przekracza 25 stopni albo ster na nawietrzna ponad 8, zmniejsz zagle: ref na grocie albo mniej genui.",
      "Caña dura. Si el trimado está agotado y la escora pasa de 25 grados o la caña de 8, reduce vela: rizo en la mayor o menos génova.",
      "Barre dure. Si les réglages sont épuisés et que la gîte dépasse 25 degrés ou la barre 8, réduis la toile : un ris dans la grand-voile ou moins de génois.",
      "Schwerer Ruderdruck. Ist der Trimm ausgeschöpft und liegt die Krängung über 25 Grad oder das Luvruder über 8, Segelfläche verkleinern: Reff im Groß oder weniger Genua.",
      "Timone duro. Se la regolazione è esaurita e lo sbandamento supera i 25 gradi o il timone gli 8, riduci la vela: una mano alla randa o meno genoa.",
    ),
  ],
};

export function helmReadout(selection: number, lang: Language) {
  return helmCopy.readouts[helmState(selection).index][lang];
}

// Avoid server/browser trigonometric last-bit differences in inline SVG.
const c = (value: number) => Math.round(value * 1000) / 1000;
const ink = "#e8f4f8", muted = "#7593a6", cyan = "#00d4ff", green = "#6fd08c", amber = "#e8b96b", red = "#ef6b6b";
const ZONE_COLOR: Record<HelmZone, string> = { lee: amber, light: muted, optimal: green, brake: amber, reduce: red };

// Visual gain: real helm angles are small, so they are drawn 4x to be legible.
const GAIN = 4, POST = { x: 180, y: 196 }, R = 128;
const at = (deg: number, r: number) => {
  const a = (deg * GAIN) * Math.PI / 180; // positive = to windward = left
  return { x: POST.x - Math.sin(a) * r, y: POST.y - Math.cos(a) * r };
};
const arc = (from: number, to: number, r: number, color: string, width: number) => {
  const a = at(from, r), b = at(to, r), large = Math.abs(to - from) * GAIN > 180 ? 1 : 0, sweep = to > from ? 0 : 1;
  return `<path d="M${c(a.x)} ${c(a.y)} A${r} ${r} 0 ${large} ${sweep} ${c(b.x)} ${c(b.y)}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
};

export function helmDrawing(selection: number) {
  const s = helmState(selection);
  // Aft end of the hull: widening forward from the transom at the bottom.
  let out = `<path d="M82 96 Q86 196 138 232 H222 Q274 196 278 96" fill="#29475b" stroke="${muted}"/>`;
  out += `<path d="M${POST.x} 40 V232" stroke="${muted}" stroke-dasharray="3 6"/>`;
  // Zones on the arc: lee side, then light, optimal, brake, reduce to windward.
  out += arc(-12, 0, R, amber, 7) + arc(0, 3, R, muted, 7) + arc(3, 5, R, green, 9) + arc(5, 8, R, amber, 9) + arc(8, 14, R, red, 9);
  for (const d of [3, 5, 8]) {
    const p = at(d, R + 16);
    out += `<text x="${c(p.x)}" y="${c(p.y + 4)}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12">${d}°</text>`;
  }
  // Wind from the left.
  out += `<path d="M18 70 H58" stroke="${cyan}" stroke-width="3"/><path d="M50 63 L58 70 L50 77" stroke="${cyan}" stroke-width="3" fill="none"/>`;
  // The tiller at this option's angle, coloured by its zone.
  const tip = at(s.deg, R - 14);
  out += `<path d="M${POST.x} ${POST.y} L${c(tip.x)} ${c(tip.y)}" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`;
  out += `<circle cx="${POST.x}" cy="${POST.y}" r="7" fill="${ZONE_COLOR[s.zone]}"/>`;
  return out;
}
