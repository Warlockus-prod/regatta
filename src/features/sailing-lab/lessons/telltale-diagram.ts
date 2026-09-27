import { words, type Language } from "../../../lib/product/catalog";

// Top view of the genoa entry with one telltale on each side, 10-20 cm behind
// the luff (Dedekam p. 12). Which telltale breaks away is derived from the
// incidence of the oncoming flow at the entry, not drawn per option: flow that
// meets the entry from leeward tears the windward telltale; flow that meets it
// too steeply from windward separates the leeward one.

export const telltaleCopy = {
  description: words(
    "Вид сверху на вход генуи. 1: наветренный колдунчик, 2: подветренный, 3: набегающий поток. Схема качественная: она показывает, какая сторона теряет поток, а не точные углы.",
    "Top view of the genoa entry. 1: windward telltale, 2: leeward telltale, 3: oncoming flow. The diagram is qualitative: it shows which side loses the flow, not exact angles.",
    "Widok z góry na wejście genui. 1: włóczka nawietrzna, 2: zawietrzna, 3: napływające powietrze. Schemat jest jakościowy: pokazuje, która strona traci opływ, a nie dokładne kąty.",
    "Vista cenital de la entrada del génova. 1: cataviento de barlovento, 2: de sotavento, 3: flujo incidente. El esquema es cualitativo: muestra qué cara pierde el flujo, no ángulos exactos.",
    "Vue de dessus de l'entrée du génois. 1 : penon au vent, 2 : penon sous le vent, 3 : écoulement incident. Le schéma est qualitatif : il montre quelle face perd l'écoulement, pas des angles exacts.",
    "Draufsicht auf den Vorliekbereich der Genua. 1: Luv-Windfaden, 2: Lee-Windfaden, 3: anströmende Luft. Das Bild ist qualitativ: Es zeigt, welche Seite die Strömung verliert, keine genauen Winkel.",
    "Vista dall'alto dell'entrata del genoa. 1: filetto sopravvento, 2: sottovento, 3: flusso in arrivo. Lo schema è qualitativo: mostra quale lato perde il flusso, non angoli esatti.",
  ),
  options: [
    words("Слишком круто", "Too close", "Za ostro", "Demasiado ceñido", "Trop près", "Zu hoch", "Troppo stretto"),
    words("В струе", "In the groove", "W sam raz", "En su punto", "Dans le bon angle", "Optimal", "Al punto giusto"),
    words("Парус заторможен", "Sail stalled", "Żagiel przeciągnięty", "Vela en pérdida", "Voile décrochée", "Strömungsabriss", "Vela in stallo"),
  ],
  readouts: [
    words(
      "Наветренный колдунчик поднялся и крутится: поток бьет во вход с подветренной стороны. Рулем: увалиться. Шкотом, не меняя курса: подобрать.",
      "The windward telltale lifts and spins: the flow meets the entry from leeward. With the helm: bear away. With the sheet, keeping the course: trim in.",
      "Nawietrzna włóczka unosi się i wiruje: strumień trafia we wlot od zawietrznej. Sterem: odpadnij. Szotem, bez zmiany kursu: wybierz.",
      "El cataviento de barlovento se levanta y gira: el flujo entra por sotavento. Con la caña: arriba. Con la escota, sin cambiar el rumbo: caza.",
      "Le penon au vent se lève et tourne : l'air attaque l'entrée par sous le vent. À la barre : abats. À l'écoute, sans changer de cap : borde.",
      "Der Luv-Windfaden steigt und dreht sich: Die Luft trifft den Segeleintritt von Lee. Mit der Pinne: abfallen. Mit der Schot, ohne Kursänderung: dichtholen.",
      "Il filetto sopravvento si alza e gira: il flusso entra da sottovento. Con la barra: poggia. Con la scotta, senza cambiare rotta: cazza.",
    ),
    words(
      "Оба колдунчика вытянуты в корму и слегка подрагивают: поток прижат к обеим сторонам паруса. Ничего не трогай.",
      "Both telltales stream aft and flicker slightly: the flow is attached on both sides of the sail. Leave everything as it is.",
      "Obie włóczki są wyciągnięte ku rufie i lekko drgają: opływ przylega do obu stron żagla. Niczego nie zmieniaj.",
      "Ambos catavientos van hacia popa y tiemblan un poco: el flujo está pegado a las dos caras de la vela. No toques nada.",
      "Les deux penons filent vers l'arrière et frémissent un peu : l'écoulement colle aux deux faces de la voile. Ne touche à rien.",
      "Beide Windfäden wehen nach achtern und zittern leicht: Die Strömung liegt auf beiden Segelseiten an. Nichts verstellen.",
      "Entrambi i filetti vanno verso poppa e tremano appena: il flusso è attaccato a entrambi i lati della vela. Non toccare nulla.",
    ),
    words(
      "Подветренный колдунчик изгибается и колеблется: поток оторвался, парус не работает. Рулем: привестись. Шкотом, не меняя курса: потравить.",
      "The leeward telltale curls and flutters: the flow has separated and the sail is not working. With the helm: luff up. With the sheet, keeping the course: ease.",
      "Zawietrzna włóczka wygina się i trzepocze: opływ się oderwał, żagiel nie pracuje. Sterem: ostrz. Szotem, bez zmiany kursu: poluzuj.",
      "El cataviento de sotavento se curva y aletea: el flujo se ha desprendido y la vela no trabaja. Con la caña: orza. Con la escota, sin cambiar el rumbo: lasca.",
      "Le penon sous le vent se tord et bat : l'écoulement a décroché, la voile ne travaille plus. À la barre : lofe. À l'écoute, sans changer de cap : choque.",
      "Der Lee-Windfaden knickt und flattert: Die Strömung ist abgerissen, das Segel arbeitet nicht. Mit der Pinne: anluven. Mit der Schot, ohne Kursänderung: fieren.",
      "Il filetto sottovento si piega e sbatte: il flusso si è staccato e la vela non lavora. Con la barra: orza. Con la scotta, senza cambiare rotta: lasca.",
    ),
  ],
};

// Incidence of the oncoming flow relative to the sail's entry, degrees. Positive
// means the flow meets the entry from windward. Illustrative values, one per
// option; the thresholds below decide which telltale breaks away.
const INCIDENCE = [-8, 4, 24] as const;
const WINDWARD_BREAKS_BELOW = 0;
const LEEWARD_BREAKS_ABOVE = 15;

export type TelltaleFlow = "streaming" | "breaking";

export function telltaleState(selection: number) {
  const index = Math.max(0, Math.min(2, Math.round(Number.isFinite(selection) ? selection : 1)));
  const incidence = INCIDENCE[index];
  return {
    index,
    incidence,
    windward: (incidence < WINDWARD_BREAKS_BELOW ? "breaking" : "streaming") as TelltaleFlow,
    leeward: (incidence > LEEWARD_BREAKS_ABOVE ? "breaking" : "streaming") as TelltaleFlow,
  };
}

export function telltaleReadout(selection: number, lang: Language) {
  return telltaleCopy.readouts[telltaleState(selection).index][lang];
}

// Avoid server/browser trigonometric last-bit differences in inline SVG.
const c = (value: number) => Math.round(value * 1000) / 1000;
const ink = "#e8f4f8", muted = "#7593a6", cyan = "#00d4ff", warn = "#e8b96b";

// Sail section: a cubic from the luff (left) toward the leech (right, cut short),
// camber up, so the leeward side is on top and the windward side underneath.
// The frame is zoomed onto the entry, where the telltales are.
const L = { x: 70, y: 168 }, C1 = { x: 105, y: 98 }, C2 = { x: 215, y: 56 }, T = { x: 346, y: 64 };
const at = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * L.x + 3 * u * u * t * C1.x + 3 * u * t * t * C2.x + t * t * t * T.x,
    y: u * u * u * L.y + 3 * u * u * t * C1.y + 3 * u * t * t * C2.y + t * t * t * T.y,
  };
};
const tangentAt = (t: number) => {
  const u = 1 - t;
  const dx = 3 * u * u * (C1.x - L.x) + 6 * u * t * (C2.x - C1.x) + 3 * t * t * (T.x - C2.x);
  const dy = 3 * u * u * (C1.y - L.y) + 6 * u * t * (C2.y - C1.y) + 3 * t * t * (T.y - C2.y);
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
};
// side -1: leeward (above the sail), +1: windward (below it). The section bends
// clockwise from luff to leech, so leeward is on the left of travel.
const normalAt = (t: number, side: 1 | -1) => {
  const along = tangentAt(t);
  return { x: -along.y * side, y: along.x * side };
};

const ROOT_T = .09, GAP = 9;

function telltale(side: 1 | -1, flow: TelltaleFlow) {
  if (flow === "streaming") {
    // Attached flow lays the yarn along the cloth: follow an offset of the curve.
    const points = Array.from({ length: 9 }, (_, i) => {
      const t = ROOT_T + i * .018, p = at(t), n = normalAt(t, side);
      return `${c(p.x + n.x * GAP)},${c(p.y + n.y * GAP)}`;
    }).join(" ");
    return `<polyline points="${points}" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  }
  // Breaking away: the yarn lifts off the cloth and curls back on itself.
  const p = at(ROOT_T), n = normalAt(ROOT_T, side), along = tangentAt(ROOT_T);
  const root = { x: p.x + n.x * GAP, y: p.y + n.y * GAP };
  const up = { x: root.x + n.x * 34 + along.x * 10, y: root.y + n.y * 34 + along.y * 10 };
  const curl = { x: root.x + n.x * 28 - along.x * 16, y: root.y + n.y * 28 - along.y * 16 };
  const tip = { x: root.x + n.x * 12 - along.x * 6, y: root.y + n.y * 12 - along.y * 6 };
  return `<path d="M${c(root.x)} ${c(root.y)} Q${c(up.x)} ${c(up.y)} ${c(curl.x)} ${c(curl.y)} T${c(tip.x)} ${c(tip.y)}" stroke="${warn}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
}

const marker = (x: number, y: number, n: number, color: string) =>
  `<circle cx="${c(x)}" cy="${c(y)}" r="11" fill="#102738" stroke="${color}"/><text x="${c(x)}" y="${c(y + 4)}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12">${n}</text>`;

export function telltaleDrawing(selection: number) {
  const s = telltaleState(selection);
  const entry = tangentAt(0);
  const entryAngle = Math.atan2(-entry.y, entry.x) * 180 / Math.PI; // degrees above +x
  // Flow direction, degrees above +x. Flow from windward meets the entry more
  // steeply than its tangent (positive incidence); from leeward, flatter.
  const flow = (entryAngle + s.incidence) * Math.PI / 180;
  const d = { x: Math.cos(flow), y: -Math.sin(flow) };
  const len = 62, start = { x: L.x - d.x * len, y: L.y - d.y * len }, stop = { x: L.x - d.x * 12, y: L.y - d.y * 12 };
  const head = 9, a = Math.atan2(d.y, d.x);
  const arrow = `<path d="M${c(start.x)} ${c(start.y)} L${c(stop.x)} ${c(stop.y)}" stroke="${cyan}" stroke-width="3"/><path d="M${c(stop.x - head * Math.cos(a - .4))} ${c(stop.y - head * Math.sin(a - .4))} L${c(stop.x)} ${c(stop.y)} L${c(stop.x - head * Math.cos(a + .4))} ${c(stop.y - head * Math.sin(a + .4))}" stroke="${cyan}" stroke-width="3" fill="none"/>`;

  const sail = `<path d="M${L.x} ${L.y} C${C1.x} ${C1.y} ${C2.x} ${C2.y} ${T.x} ${T.y}" stroke="${ink}" stroke-width="5" fill="none"/><circle cx="${L.x}" cy="${L.y}" r="4" fill="${muted}"/>`;
  const anchor = (side: 1 | -1) => { const p = at(ROOT_T + .07), n = normalAt(ROOT_T + .07, side); return { x: p.x + n.x * 48, y: p.y + n.y * 48 }; };
  const w = anchor(1), l = anchor(-1);
  const labels = marker(w.x, w.y, 1, s.windward === "breaking" ? warn : muted)
    + marker(l.x, l.y, 2, s.leeward === "breaking" ? warn : muted)
    + marker(start.x - 4, start.y - 16, 3, cyan);
  return `${arrow}${sail}${telltale(1, s.windward)}${telltale(-1, s.leeward)}${labels}`;
}
