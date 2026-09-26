import { words, type Language } from "../../../lib/product/catalog";

// Genoa lead car (Dedekam p. 15, D2-28..D2-33). The neutral car sits where the
// sheet line, extended forward through the clew, meets the luff halfway up. The
// meeting point for any car position is computed, not drawn: car forward makes
// the sheet steeper and the line meets the luff higher (more pull down the
// leech, less twist, the foot deepens); car aft does the opposite.

type P = { x: number; y: number };
// Side view, 360 x 240. Tack, head and clew of the genoa; deck and lead track.
const TACK: P = { x: 58, y: 190 }, HEAD: P = { x: 150, y: 16 }, CLEW: P = { x: 246, y: 168 };
const DECK_Y = 196, TRACK = { from: 250, to: 348 };

/** Where the extended sheet line meets the luff: 0 at the tack, 1 at the head. */
export function luffHit(carX: number) {
  const d = { x: CLEW.x - carX, y: CLEW.y - DECK_Y }; // car -> clew, continued forward
  const l = { x: HEAD.x - TACK.x, y: HEAD.y - TACK.y };
  // Solve car + s*d = TACK + t*l.
  const det = d.x * -l.y - d.y * -l.x;
  const rx = TACK.x - carX, ry = TACK.y - DECK_Y;
  const t = (d.x * ry - d.y * rx) / det;
  return t;
}

/** Car position whose sheet line meets the luff at fraction t of its length. */
function carFor(t: number) {
  const m = { x: TACK.x + (HEAD.x - TACK.x) * t, y: TACK.y + (HEAD.y - TACK.y) * t };
  const k = (DECK_Y - m.y) / (CLEW.y - m.y);
  return m.x + (CLEW.x - m.x) * k;
}

const NEUTRAL = carFor(.5);
// Options: car aft, neutral, forward. Aft and forward are fixed offsets.
export const JIB_CARS = [Math.min(TRACK.to - 4, NEUTRAL + 26), NEUTRAL, NEUTRAL - 26] as const;

export function jibLeadState(selection: number) {
  const index = Math.max(0, Math.min(2, Math.round(Number.isFinite(selection) ? selection : 1)));
  const carX = JIB_CARS[index];
  const hit = luffHit(carX);
  const luffsFirst = hit < .45 ? "top" : hit > .55 ? "bottom" : "whole";
  return { index, carX, hit, luffsFirst: luffsFirst as "top" | "bottom" | "whole" };
}

export const jibLeadCopy = {
  description: words(
    "Вид сбоку на геную. 1: каретка стаксель-шкота на погоне, 2: продолжение линии шкота вперед, 3: где оно встречает переднюю шкаторину. Оранжевым отмечено место, которое заполаскивает первым при медленном приведении.",
    "Side view of the genoa. 1: the sheet lead car on its track, 2: the sheet line extended forward, 3: where it meets the luff. Orange marks the part that luffs first as you head up slowly.",
    "Widok z boku na genuę. 1: wózek szota na szynie, 2: przedłużenie linii szota do przodu, 3: gdzie spotyka lik przedni. Na pomarańczowo to, co łopocze pierwsze przy powolnym ostrzeniu.",
    "Vista lateral del génova. 1: el carro de escota en su riel, 2: la línea de la escota prolongada hacia proa, 3: dónde toca el grátil. En naranja, la parte que flamea primero al orzar despacio.",
    "Vue de côté du génois. 1 : le chariot d'écoute sur son rail, 2 : la ligne d'écoute prolongée vers l'avant, 3 : l'endroit où elle rencontre le guindant. En orange, la partie qui faseye en premier quand tu lofes lentement.",
    "Seitenansicht der Genua. 1: der Holepunktschlitten auf seiner Schiene, 2: die Schotlinie nach vorn verlängert, 3: wo sie das Vorliek trifft. Orange ist der Teil, der beim langsamen Anluven zuerst killt.",
    "Vista laterale del genoa. 1: il carrello della scotta sulla rotaia, 2: la linea della scotta prolungata in avanti, 3: dove incontra l'inferitura. In arancione la parte che sventa per prima quando orzi piano.",
  ),
  options: [
    words("Каретка сзади", "Car aft", "Wózek z tyłu", "Carro atrás", "Chariot en arrière", "Schlitten achtern", "Carrello indietro"),
    words("Нейтрально", "Neutral", "Neutralnie", "Neutro", "Neutre", "Neutral", "Neutro"),
    words("Каретка впереди", "Car forward", "Wózek z przodu", "Carro adelante", "Chariot en avant", "Schlitten vorn", "Carrello avanti"),
  ],
  readouts: [
    words("Линия шкота встречает переднюю шкаторину ниже середины, на {p} ее длины. Твиста много: при приведении первым заполаскивает верх. Сдвинь каретку вперед: верх закроется, низ станет глубже.",
      "The sheet line meets the luff below halfway, at {p} of its length. Too much twist: the top luffs first as you head up. Move the car forward: the top closes and the foot deepens.",
      "Linia szota spotyka lik przedni poniżej połowy, na {p} jego długości. Za dużo skrętu: przy ostrzeniu pierwsza łopocze góra. Przesuń wózek do przodu: góra się zamknie, dół się pogłębi.",
      "La línea de la escota toca el grátil por debajo de la mitad, al {p} de su longitud. Demasiada torsión: al orzar flamea primero arriba. Adelanta el carro: arriba se cierra y abajo gana bolsa.",
      "La ligne d'écoute rencontre le guindant sous la moitié, à {p} de sa longueur. Trop de vrillage : le haut faseye en premier quand tu lofes. Avance le chariot : le haut se ferme, le bas se creuse.",
      "Die Schotlinie trifft das Vorliek unterhalb der Mitte, bei {p} seiner Länge. Zu viel Twist: Beim Anluven killt oben zuerst. Schlitten nach vorn: Oben schließt das Segel, unten wird es bauchiger.",
      "La linea della scotta incontra l'inferitura sotto la metà, al {p} della lunghezza. Troppo svergolamento: orzando sventa prima in alto. Porta il carrello avanti: in alto si chiude, in basso prende grasso."),
    words("Линия шкота делит переднюю шкаторину пополам ({p}). При медленном приведении парус заполаскивает по всей высоте сразу: это стартовая установка.",
      "The sheet line splits the luff in half ({p}). Heading up slowly, the sail luffs along its whole height at once: this is the starting setting.",
      "Linia szota dzieli lik przedni na pół ({p}). Przy powolnym ostrzeniu żagiel łopocze na całej wysokości naraz: to ustawienie wyjściowe.",
      "La línea de la escota divide el grátil por la mitad ({p}). Orzando despacio, la vela flamea en toda su altura a la vez: es el ajuste de partida.",
      "La ligne d'écoute partage le guindant en deux ({p}). En lofant lentement, la voile faseye sur toute sa hauteur en même temps : c'est le réglage de départ.",
      "Die Schotlinie teilt das Vorliek in zwei Hälften ({p}). Beim langsamen Anluven killt das Segel auf ganzer Höhe zugleich: das ist die Ausgangsstellung.",
      "La linea della scotta divide l'inferitura a metà ({p}). Orzando piano, la vela sventa su tutta l'altezza insieme: è la regolazione di partenza."),
    words("Линия шкота встречает переднюю шкаторину выше середины, на {p} ее длины. Твиста мало: первым заполаскивает низ. Сдвинь каретку назад: низ станет площе, верх откроется.",
      "The sheet line meets the luff above halfway, at {p} of its length. Too little twist: the foot luffs first. Move the car aft: the foot flattens and the top opens.",
      "Linia szota spotyka lik przedni powyżej połowy, na {p} jego długości. Za mało skrętu: pierwszy łopocze dół. Przesuń wózek do tyłu: dół się spłaszczy, góra się otworzy.",
      "La línea de la escota toca el grátil por encima de la mitad, al {p} de su longitud. Poca torsión: flamea primero abajo. Atrasa el carro: abajo se aplana y arriba se abre.",
      "La ligne d'écoute rencontre le guindant au-dessus de la moitié, à {p} de sa longueur. Pas assez de vrillage : le bas faseye en premier. Recule le chariot : le bas s'aplatit, le haut s'ouvre.",
      "Die Schotlinie trifft das Vorliek oberhalb der Mitte, bei {p} seiner Länge. Zu wenig Twist: unten killt zuerst. Schlitten nach achtern: Unten wird es flacher, oben öffnet es sich.",
      "La linea della scotta incontra l'inferitura sopra la metà, al {p} della lunghezza. Poco svergolamento: sventa prima in basso. Porta il carrello indietro: in basso si appiattisce, in alto si apre."),
  ],
};

export function jibLeadReadout(selection: number, lang: Language) {
  const s = jibLeadState(selection);
  return jibLeadCopy.readouts[s.index][lang].replace("{p}", `${Math.round(s.hit * 100)}%`);
}

// Avoid server/browser trigonometric last-bit differences in inline SVG.
const c = (value: number) => Math.round(value * 1000) / 1000;
const ink = "#e8f4f8", muted = "#7593a6", cyan = "#00d4ff", warn = "#e8b96b", cloth = "#d0e1e8";
const marker = (x: number, y: number, n: number, color: string) =>
  `<circle cx="${c(x)}" cy="${c(y)}" r="11" fill="#102738" stroke="${color}"/><text x="${c(x)}" y="${c(y + 4)}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12">${n}</text>`;

export function jibLeadDrawing(selection: number) {
  const s = jibLeadState(selection);
  const hit = { x: TACK.x + (HEAD.x - TACK.x) * s.hit, y: TACK.y + (HEAD.y - TACK.y) * s.hit };
  let out = `<path d="M24 ${DECK_Y} H352" stroke="${muted}" stroke-width="3"/>`;
  out += `<path d="M${TRACK.from} ${DECK_Y + 5} H${TRACK.to}" stroke="${muted}" stroke-width="5" stroke-linecap="round"/>`;
  out += `<path d="M${TACK.x} ${TACK.y} L${HEAD.x} ${HEAD.y} L${CLEW.x} ${CLEW.y} Z" fill="${cloth}" opacity=".45" stroke="${ink}" stroke-width="2"/>`;
  // Where the sail luffs first.
  const along = (a: number, b: number) => {
    let d = "";
    for (let i = 0; i <= 5; i++) {
      const t = a + (b - a) * i / 5, p = { x: TACK.x + (HEAD.x - TACK.x) * t, y: TACK.y + (HEAD.y - TACK.y) * t };
      d += `<path d="M${c(p.x + 4)} ${c(p.y)} q5 -3 10 0 t10 0" stroke="${warn}" stroke-width="2.5" fill="none"/>`;
    }
    return d;
  };
  out += s.luffsFirst === "top" ? along(.62, .95) : s.luffsFirst === "bottom" ? along(.05, .38) : along(.05, .95).replace(new RegExp(warn, "g"), cyan);
  // Sheet from clew to car, and its extension forward to the luff.
  out += `<path d="M${CLEW.x} ${CLEW.y} L${c(s.carX)} ${DECK_Y}" stroke="${cyan}" stroke-width="3"/>`;
  out += `<path d="M${CLEW.x} ${CLEW.y} L${c(hit.x)} ${c(hit.y)}" stroke="${cyan}" stroke-width="2" stroke-dasharray="5 5"/>`;
  out += `<rect x="${c(s.carX - 9)}" y="${DECK_Y - 1}" width="18" height="10" rx="3" fill="${cyan}"/>`;
  out += `<circle cx="${c(hit.x)}" cy="${c(hit.y)}" r="5" fill="${ink}"/>`;
  // Midpoint of the luff for reference.
  const mid = { x: (TACK.x + HEAD.x) / 2, y: (TACK.y + HEAD.y) / 2 };
  out += `<path d="M${c(mid.x - 10)} ${c(mid.y)} h-8" stroke="${muted}" stroke-width="2"/>`;
  out += marker(s.carX, DECK_Y + 24, 1, cyan) + marker((CLEW.x + hit.x) / 2 + 4, (CLEW.y + hit.y) / 2 - 16, 2, cyan) + marker(hit.x - 28, hit.y - 4, 3, ink);
  return out;
}
