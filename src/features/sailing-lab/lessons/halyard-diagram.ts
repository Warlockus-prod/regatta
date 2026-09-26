import { words, type Language } from "../../../lib/product/catalog";

// Halyard tension read two ways (Dedekam pp. 11, 18-19, 26, 34-35; Das and
// von Krause p. 13). Left: the luff next to the mast, where the wrinkles tell
// you the tension. Right: a horizontal section whose draft position is
// computed from the same two-piece camber line as the outhaul diagram, so the
// entry really does grow rounder as the draft moves forward.

export const HALYARD_DRAFT_PCT = [55, 45, 35] as const; // eased, set, over-tensioned
type Wrinkles = "across" | "none" | "along";
const WRINKLES: Wrinkles[] = ["across", "none", "along"];

export const halyardCopy = {
  description: words(
    "Слева: парус у мачты, 1 - передняя шкаторина. Справа: горизонтальное сечение, 2 - положение пуза в процентах хорды от передней шкаторины. Проценты иллюстративные: они показывают направление, а не цель для твоего паруса.",
    "Left: the sail next to the mast, 1 - the luff. Right: a horizontal section, 2 - draft position as a percentage of the chord from the luff. The percentages are illustrative: they show direction, not a target for your sail.",
    "Po lewej: żagiel przy maszcie, 1 - lik przedni. Po prawej: przekrój poziomy, 2 - położenie brzucha w procentach cięciwy od liku przedniego. Procenty są poglądowe: pokazują kierunek, a nie cel dla twojego żagla.",
    "A la izquierda: la vela junto al mástil, 1 - el grátil. A la derecha: una sección horizontal, 2 - posición de la bolsa en porcentaje de la cuerda desde el grátil. Los porcentajes son ilustrativos: indican la dirección, no un objetivo para tu vela.",
    "À gauche : la voile près du mât, 1 - le guindant. À droite : une section horizontale, 2 - position du creux en pourcentage de la corde depuis le guindant. Les pourcentages sont illustratifs : ils montrent le sens, pas une cible pour ta voile.",
    "Links: das Segel am Mast, 1 - das Vorliek. Rechts: ein waagerechter Schnitt, 2 - die Bauchlage in Prozent der Sehne vom Vorliek. Die Prozente sind Beispiele: Sie zeigen die Richtung, kein Ziel für dein Segel.",
    "A sinistra: la vela vicino all'albero, 1 - l'inferitura. A destra: una sezione orizzontale, 2 - posizione del grasso in percentuale della corda dall'inferitura. Le percentuali sono indicative: mostrano la direzione, non un obiettivo per la tua vela.",
  ),
  options: [
    words("Потравлен", "Eased", "Poluzowany", "Lascada", "Choquée", "Gefiert", "Lascata"),
    words("В норме", "Set right", "Ustawiony", "En su punto", "Bien réglée", "Richtig", "Giusta"),
    words("Перетянут", "Over-tensioned", "Przeciągnięty", "Demasiado tensa", "Trop étarquée", "Zu dicht", "Troppo tesa"),
  ],
  readouts: [
    words(
      "Горизонтальная рябь поперек передней шкаторины: фал потравлен. Пузо уходит назад, вход плоский: можно идти острее, но вести лодку труднее. Уместно только в очень слабый ветер.",
      "Horizontal ripples across the luff: the halyard is eased. The draft moves aft and the entry flattens: you can point higher, but the boat is harder to steer. Only right in very light air.",
      "Poziome zmarszczki w poprzek liku przedniego: fał jest poluzowany. Brzuch idzie do tyłu, wejście się spłaszcza: można iść ostrzej, ale trudniej prowadzić jacht. Właściwe tylko przy bardzo słabym wietrze.",
      "Arrugas horizontales a lo ancho del grátil: la driza está lascada. La bolsa se va atrás y la entrada se aplana: puedes ceñir más, pero cuesta más gobernar. Solo conviene con viento muy flojo.",
      "Des rides horizontales en travers du guindant : la drisse est choquée. Le creux recule et l'entrée s'aplatit : tu remontes mieux, mais le bateau est plus dur à barrer. Ne convient que par vent très faible.",
      "Waagerechte Falten quer zum Vorliek: Das Fall ist gefiert. Der Bauch wandert nach achtern, der Eintritt wird flach: Du kannst höher laufen, aber das Boot ist schwerer zu steuern. Nur bei sehr leichtem Wind richtig.",
      "Grinze orizzontali di traverso all'inferitura: la drizza è lascata. Il grasso va indietro e l'entrata si appiattisce: puoi stringere di più, ma la barca è più difficile da governare. Va bene solo con vento molto leggero.",
    ),
    words(
      "Рябь только что исчезла, продольных складок нет: для легкого и среднего ветра это и есть нужное натяжение.",
      "The ripples have just gone and there is no fold along the luff: for light and medium wind this is the tension you want.",
      "Zmarszczki właśnie zniknęły, a wzdłuż liku nie ma fałdy: przy słabym i średnim wietrze to jest właściwe napięcie.",
      "Las arrugas acaban de desaparecer y no hay pliegue a lo largo del grátil: con viento flojo y medio, esta es la tensión buscada.",
      "Les rides viennent de disparaître et aucun pli ne longe le guindant : par vent faible et moyen, c'est la tension voulue.",
      "Die Falten sind gerade verschwunden, und am Vorliek entlang gibt es keine Falte: Bei leichtem und mittlerem Wind ist das die richtige Spannung.",
      "Le grinze sono appena sparite e non c'è una piega lungo l'inferitura: con vento leggero e medio è la tensione giusta.",
    ),
    words(
      "Длинная складка вдоль передней шкаторины: перетянуто даже для сильного ветра. Пузо ушло далеко вперед, вход круглый: он прощает ошибки рулевого, но острота теряется. Потрави, пока складка не уйдет.",
      "A long fold along the luff: too tight even for a strong wind. The draft has gone far forward and the entry is round: forgiving for the helmsman, but you lose height. Ease until the fold disappears.",
      "Długa fałda wzdłuż liku przedniego: za mocno nawet na silny wiatr. Brzuch poszedł daleko do przodu, a wejście jest okrągłe: wybacza błędy sternika, ale traci się ostrość. Luzuj, aż fałda zniknie.",
      "Un pliegue largo a lo largo del grátil: demasiado tensa incluso para viento fuerte. La bolsa se ha ido muy adelante y la entrada es redonda: perdona errores del timonel, pero se pierde ángulo. Lasca hasta que desaparezca el pliegue.",
      "Un long pli le long du guindant : trop étarqué même pour du vent fort. Le creux est parti très en avant et l'entrée est ronde : elle pardonne les erreurs du barreur, mais tu perds du cap. Choque jusqu'à ce que le pli disparaisse.",
      "Eine lange Falte längs des Vorlieks: zu dicht, sogar für starken Wind. Der Bauch ist weit nach vorn gewandert, der Eintritt ist rund: Das verzeiht Steuerfehler, kostet aber Höhe. Fieren, bis die Falte verschwindet.",
      "Una piega lunga lungo l'inferitura: troppo tesa anche per vento forte. Il grasso è andato molto avanti e l'entrata è tonda: perdona gli errori del timoniere, ma si perde angolo. Lasca finché la piega sparisce.",
    ),
  ],
};

export function halyardState(selection: number) {
  const index = Math.max(0, Math.min(2, Math.round(Number.isFinite(selection) ? selection : 1)));
  return { index, draftPct: HALYARD_DRAFT_PCT[index], wrinkles: WRINKLES[index] };
}

export function halyardReadout(selection: number, lang: Language) {
  return halyardCopy.readouts[halyardState(selection).index][lang];
}

/** Two-piece camber line with its maximum at `draft` (0..1 of the chord). */
export function camberAt(u: number, draft: number) {
  return u <= draft ? 1 - ((u - draft) / draft) ** 2 : 1 - ((u - draft) / (1 - draft)) ** 2;
}

// Avoid server/browser trigonometric last-bit differences in inline SVG.
const c = (value: number) => Math.round(value * 1000) / 1000;
const ink = "#e8f4f8", muted = "#7593a6", cyan = "#00d4ff", warn = "#e8b96b", cloth = "#d0e1e8";
const marker = (x: number, y: number, n: number, color: string) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="#102738" stroke="${color}"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12">${n}</text>`;

export function halyardDrawing(selection: number) {
  const s = halyardState(selection);
  // Left: mast and the strip of sail along it.
  let out = `<path d="M44 22 V218" stroke="${ink}" stroke-width="6"/><path d="M49 26 L150 58 V214 H49 Z" fill="${cloth}" opacity=".35"/>`;
  if (s.wrinkles === "across") {
    for (let y = 52; y <= 198; y += 24) out += `<path d="M52 ${y} q9 -4 18 0 t18 0" stroke="${warn}" stroke-width="2.5" fill="none"/>`;
  } else if (s.wrinkles === "along") {
    out += `<path d="M62 40 Q66 128 61 206" stroke="${warn}" stroke-width="3" fill="none"/><path d="M74 58 Q77 132 73 196" stroke="${warn}" stroke-width="2" fill="none" opacity=".7"/>`;
  }
  out += marker(118, 200, 1, s.wrinkles === "none" ? muted : warn);

  // Right: section with the draft at its computed position.
  const x0 = 178, x1 = 338, base = 150, depth = 30, draft = s.draftPct / 100;
  const points = Array.from({ length: 41 }, (_, j) => {
    const u = j / 40;
    return `${c(x0 + u * (x1 - x0))},${c(base - camberAt(u, draft) * depth)}`;
  }).join(" ");
  const dx = x0 + draft * (x1 - x0);
  out += `<path d="M${x0} ${base} H${x1}" stroke="${muted}" stroke-dasharray="3 4"/>`;
  out += `<polyline points="${points}" stroke="${cyan}" stroke-width="3" fill="none"/>`;
  out += `<path d="M${c(dx)} ${base} V${base - depth}" stroke="${ink}" stroke-width="2" stroke-dasharray="2 3"/>`;
  out += `<text x="${c(dx)}" y="${base + 22}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="14">${s.draftPct}%</text>`;
  out += `<circle cx="${x0}" cy="${base}" r="4" fill="${muted}"/>`;
  out += marker(x0 + 10, base - depth - 26, 2, cyan);
  return out;
}
