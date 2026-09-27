import { words, type Language } from "../../../lib/product/catalog";

// Top view of genoa and main as one wing with a slot (Dedekam p. 28, D3-40..
// D3-44; p. 40, D4-45). Only the genoa's sheeting changes between options; the
// slot width is then measured, not drawn: the shortest distance from the
// genoa's leech to the main. A narrow slot throws air into the lee of the main,
// which luffs at the mast; a wide one loses the extra drive of the pair.

type P = { x: number; y: number };
const bezier = (a: P, b: P, c: P, d: P, t: number): P => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
};

// Boat heading up the page, sails sheeted to starboard (right).
const MAST: P = { x: 150, y: 84 }, MAIN_LEECH: P = { x: 204, y: 214 };
const MAIN_C1: P = { x: 170, y: 112 }, MAIN_C2: P = { x: 198, y: 164 };
const TACK: P = { x: 150, y: 20 };
// Genoa leech per option: sheeted hard (narrow), right, eased (wide).
export const GENOA_LEECH: readonly P[] = [{ x: 180, y: 124 }, { x: 198, y: 120 }, { x: 226, y: 114 }];

const mainAt = (t: number) => bezier(MAST, MAIN_C1, MAIN_C2, MAIN_LEECH, t);
const genoaCurve = (leech: P) => ({
  c1: { x: TACK.x + (leech.x - TACK.x) * .18 + 18, y: TACK.y + (leech.y - TACK.y) * .3 },
  c2: { x: TACK.x + (leech.x - TACK.x) * .7 + 20, y: TACK.y + (leech.y - TACK.y) * .72 },
});

/** Shortest distance from the genoa leech to the main, in drawing units. */
export function slotGap(selection: number) {
  const leech = GENOA_LEECH[slotIndex(selection)];
  let best = Infinity;
  for (let i = 0; i <= 200; i++) {
    const p = mainAt(i / 200);
    best = Math.min(best, Math.hypot(p.x - leech.x, p.y - leech.y));
  }
  return best;
}

export function slotIndex(selection: number) {
  return Math.max(0, Math.min(2, Math.round(Number.isFinite(selection) ? selection : 1)));
}

export const slotCopy = {
  description: words(
    "Вид сверху, лодка идет вверх по схеме. 1: генуя, 2: грот, 3: щель между задней шкаториной генуи и гротом. Меняется только выборка стаксель-шкота; ширина щели измеряется, а не рисуется. Оранжевым: где грот полощет.",
    "Top view, the boat sails up the page. 1: genoa, 2: main, 3: the slot between the genoa's leech and the main. Only the jib sheet changes; the slot width is measured, not drawn. Orange marks where the main luffs.",
    "Widok z gory, jacht plynie w gore rysunku. 1: genua, 2: grot, 3: szczelina miedzy likiem tylnym genui a grotem. Zmienia sie tylko wybranie szota foka; szerokosc szczeliny jest mierzona, a nie rysowana. Na pomaranczowo: gdzie grot lopocze.",
    "Vista cenital, el barco navega hacia arriba del esquema. 1: génova, 2: mayor, 3: la ranura entre la baluma del génova y la mayor. Solo cambia la escota del foque; el ancho de la ranura se mide, no se dibuja. En naranja: dónde flamea la mayor.",
    "Vue de dessus, le bateau remonte le schéma. 1 : génois, 2 : grand-voile, 3 : la fente entre la chute du génois et la grand-voile. Seule l'écoute de foc change ; la largeur de fente est mesurée, pas dessinée. En orange : là où la grand-voile faseye.",
    "Draufsicht, das Boot fährt im Bild nach oben. 1: Genua, 2: Großsegel, 3: der Spalt zwischen Achterliek der Genua und Großsegel. Nur die Fockschot ändert sich; die Spaltbreite wird gemessen, nicht gezeichnet. Orange: wo das Großsegel killt.",
    "Vista dall'alto, la barca va verso l'alto dello schema. 1: genoa, 2: randa, 3: la fessura tra la balumina del genoa e la randa. Cambia solo la scotta del fiocco; la larghezza della fessura si misura, non si disegna. In arancione: dove la randa sventa.",
  ),
  options: [
    words("Щель узкая", "Slot too narrow", "Za waska szczelina", "Ranura estrecha", "Fente trop étroite", "Spalt zu eng", "Fessura stretta"),
    words("Щель в норме", "Slot right", "Szczelina w normie", "Ranura correcta", "Fente correcte", "Spalt richtig", "Fessura giusta"),
    words("Щель широкая", "Slot too wide", "Za szeroka szczelina", "Ranura ancha", "Fente trop large", "Spalt zu weit", "Fessura larga"),
  ],
  readouts: [
    words(
      "Генуя выбрана слишком сильно, щель зажата: поток отражается в подветренную сторону грота, и грот полощет у мачты. Лечи геную, а не грот: немного потрави стаксель-шкот, открой твист грота кареткой на ветер с потравленным шкотом, уплости грот.",
      "The genoa is trimmed too hard and the slot is choked: air is thrown into the lee of the main, which luffs at the mast. Treat the genoa, not the main: ease the jib sheet a little, open the main's twist with the traveller up and the sheet eased, flatten the main.",
      "Genua jest wybrana za mocno, szczelina scisnieta: strumien trafia na zawietrzna strone grota i grot lopocze przy maszcie. Lecz genue, nie grota: lekko poluzuj szot foka, otworz skret grota wozkiem na nawietrzna z poluzowanym szotem, splaszcz grota.",
      "El génova está demasiado cazado y la ranura ahogada: el aire se lanza al sotavento de la mayor, que flamea junto al mástil. Corrige el génova, no la mayor: lasca un poco la escota del foque, abre la torsión de la mayor con el carro a barlovento y la escota lascada, aplana la mayor.",
      "Le génois est trop bordé et la fente étranglée : l'air est projeté sous le vent de la grand-voile, qui faseye au mât. Soigne le génois, pas la grand-voile : choque un peu l'écoute de foc, ouvre le vrillage de la grand-voile chariot au vent et écoute choquée, aplatis la grand-voile.",
      "Die Genua ist zu dicht, der Spalt ist zugeschnürt: Luft wird in die Lee des Großsegels gelenkt, das am Mast killt. Die Genua behandeln, nicht das Groß: Fockschot etwas fieren, Twist des Groß mit Traveller nach Luv und gefierter Schot öffnen, das Groß flacher machen.",
      "Il genoa è troppo cazzato e la fessura è strozzata: l'aria viene gettata sottovento alla randa, che sventa vicino all'albero. Cura il genoa, non la randa: lasca un po' la scotta del fiocco, apri lo svergolamento della randa col carrello sopravvento e la scotta lascata, appiattisci la randa.",
    ),
    words(
      "Щель в норме: передняя шкаторина грота на грани заполаскивания, генуя тоже на грани. При приведении в слабый и средний ветер грот начинает полоскать равномерно по всей высоте, а генуя только подрагивает.",
      "The slot is right: the main's luff is on the edge of luffing, and so is the genoa. Heading up in light and medium wind, the main starts to luff evenly along its whole height while the genoa only flickers.",
      "Szczelina w normie: lik przedni grota jest na granicy lopotania, genua tez. Przy ostrzeniu w slaby i sredni wiatr grot zaczyna lopotac rowno na calej wysokosci, a genua tylko drzy.",
      "La ranura está bien: el grátil de la mayor está al límite de flamear, y el génova también. Al orzar con viento flojo y medio, la mayor empieza a flamear por igual en toda su altura mientras el génova solo tiembla.",
      "La fente est correcte : le guindant de la grand-voile est à la limite du faseyement, le génois aussi. En lofant par vent faible et moyen, la grand-voile commence à faseyer régulièrement sur toute sa hauteur, le génois ne fait que frémir.",
      "Der Spalt stimmt: Das Vorliek des Großsegels steht an der Grenze zum Killen, die Genua ebenso. Beim Anluven bei leichtem und mittlerem Wind beginnt das Groß auf ganzer Höhe gleichmäßig zu killen, die Genua zittert nur.",
      "La fessura è giusta: l'inferitura della randa è al limite dello sventare, e così il genoa. Orzando con vento leggero e medio, la randa comincia a sventare uniformemente su tutta l'altezza mentre il genoa appena trema.",
    ),
    words(
      "Генуя потравлена, щель широкая: грот теряет дополнительную тягу от взаимодействия парусов. Потрави гика-шкот ради тяги и скорости, набери стаксель-шкот, чтобы идти острее, сделай грот глубже.",
      "The genoa is eased and the slot is wide: the main loses the extra drive the two sails make together. Ease the mainsheet for drive and speed, trim the jib sheet to point higher, make the main deeper.",
      "Genua jest poluzowana, szczelina szeroka: grot traci dodatkowa sile ze wspolpracy zagli. Poluzuj szot grota dla sily i predkosci, wybierz szot foka, zeby isc ostrzej, pogleb grota.",
      "El génova está lascado y la ranura ancha: la mayor pierde el empuje extra que dan las dos velas juntas. Lasca la escota de la mayor para ganar empuje y velocidad, caza la del foque para ceñir más, da más bolsa a la mayor.",
      "Le génois est choqué et la fente large : la grand-voile perd le surcroît de poussée que donnent les deux voiles ensemble. Choque l'écoute de grand-voile pour la puissance et la vitesse, borde l'écoute de foc pour remonter, creuse la grand-voile.",
      "Die Genua ist gefiert, der Spalt ist weit: Das Groß verliert den zusätzlichen Vortrieb aus dem Zusammenspiel beider Segel. Großschot fieren für Vortrieb und Fahrt, Fockschot dichtholen für mehr Höhe, das Groß bauchiger machen.",
      "Il genoa è lascato e la fessura larga: la randa perde la spinta in più che danno le due vele insieme. Lasca la scotta randa per spinta e velocità, cazza quella del fiocco per stringere di più, dai più grasso alla randa.",
    ),
  ],
};

export function slotReadout(selection: number, lang: Language) {
  return slotCopy.readouts[slotIndex(selection)][lang];
}

// Avoid server/browser trigonometric last-bit differences in inline SVG.
const c = (value: number) => Math.round(value * 1000) / 1000;
const ink = "#e8f4f8", muted = "#7593a6", cyan = "#00d4ff", warn = "#e8b96b";
const marker = (x: number, y: number, n: number, color: string) =>
  `<circle cx="${c(x)}" cy="${c(y)}" r="11" fill="#102738" stroke="${color}"/><text x="${c(x)}" y="${c(y + 4)}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12">${n}</text>`;
const arrow = (a: P, b: P, color: string, width: number) => {
  const t = Math.atan2(b.y - a.y, b.x - a.x), s = 7;
  return `<path d="M${c(a.x)} ${c(a.y)} L${c(b.x)} ${c(b.y)}" stroke="${color}" stroke-width="${width}"/><path d="M${c(b.x - s * Math.cos(t - .45))} ${c(b.y - s * Math.sin(t - .45))} L${c(b.x)} ${c(b.y)} L${c(b.x - s * Math.cos(t + .45))} ${c(b.y - s * Math.sin(t + .45))}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
};

export function slotDrawing(selection: number) {
  const index = slotIndex(selection), leech = GENOA_LEECH[index], g = genoaCurve(leech);
  let out = `<path d="M150 14 V226" stroke="${muted}" stroke-dasharray="3 6"/>`;
  out += `<path d="M${MAST.x} ${MAST.y} C${MAIN_C1.x} ${MAIN_C1.y} ${MAIN_C2.x} ${MAIN_C2.y} ${MAIN_LEECH.x} ${MAIN_LEECH.y}" stroke="${ink}" stroke-width="5" fill="none"/>`;
  out += `<circle cx="${MAST.x}" cy="${MAST.y}" r="6" fill="${muted}"/>`;
  out += `<path d="M${TACK.x} ${TACK.y} C${c(g.c1.x)} ${c(g.c1.y)} ${c(g.c2.x)} ${c(g.c2.y)} ${leech.x} ${leech.y}" stroke="${cyan}" stroke-width="4" fill="none"/>`;

  // Flow through the slot, from above the genoa leech down along the main.
  const target = mainAt(.42), mid = { x: (leech.x + target.x) / 2 + 6, y: (leech.y + target.y) / 2 + 4 };
  const flowColor = index === 0 ? warn : index === 2 ? muted : cyan;
  out += arrow({ x: mid.x - 4, y: mid.y - 34 }, { x: mid.x + 4, y: mid.y + 12 }, flowColor, index === 2 ? 1.5 : 2.5);
  // Where the main luffs: a backwinded patch at the mast when the slot is choked,
  // the whole luff on the edge when it is right.
  if (index === 0) {
    for (const t of [.06, .13, .2]) { const p = mainAt(t); out += `<path d="M${c(p.x - 16)} ${c(p.y)} q4 -5 8 0 t8 0" stroke="${warn}" stroke-width="2.5" fill="none"/>`; }
  } else if (index === 1) {
    const p = mainAt(.08); out += `<path d="M${c(p.x - 16)} ${c(p.y)} q4 -3 8 0 t8 0" stroke="${cyan}" stroke-width="2" fill="none"/>`;
  }
  out += marker(leech.x + 26, leech.y - 34, 1, cyan) + marker(MAIN_LEECH.x + 24, MAIN_LEECH.y - 14, 2, ink) + marker(mid.x + 30, mid.y + 6, 3, flowColor);
  return out;
}
