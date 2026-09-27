import { words, type Language } from "../../../lib/product/catalog";

// Slab reefing in four phases (Dedekam p. 38, Das and von Krause pp. 69-70).
// The phase table drives both the drawing and the readout, so the order the
// books insist on is data a test can check: the boom goes onto the topping
// lift before the halyard is eased; the reef line comes in only after the
// halyard is back up and the boom is free; the topping lift is eased last.

export const REEF_LINE = { mainsheet: 1, vang: 2, toppingLift: 3, halyard: 4, tack: 5, reefLine: 6, ties: 7 } as const;
type LineId = (typeof REEF_LINE)[keyof typeof REEF_LINE];

export const REEF_PHASES: { lines: LineId[]; headDrop: boolean; tackHooked: boolean; leechDown: boolean; liftSlack: boolean; sheetsSlack: boolean }[] = [
  { lines: [1, 2, 3], headDrop: false, tackHooked: false, leechDown: false, liftSlack: false, sheetsSlack: true },
  { lines: [4, 5], headDrop: true, tackHooked: true, leechDown: false, liftSlack: false, sheetsSlack: true },
  { lines: [4, 6], headDrop: true, tackHooked: true, leechDown: true, liftSlack: false, sheetsSlack: true },
  { lines: [3, 1, 2, 7], headDrop: true, tackHooked: true, leechDown: true, liftSlack: true, sheetsSlack: false },
];

export const reefCopy = {
  description: words(
    "Вид сбоку на грот при слэб-рифлении. 1: гика-шкот, 2: оттяжка гика, 3: топенант, 4: грота-фал, 5: передний риф-кренгельс и гак, 6: риф-шкентель, 7: риф-штерты. Выбери фазу: подсвечено, что делаешь сейчас.",
    "Side view of the main during slab reefing. 1: mainsheet, 2: vang, 3: topping lift, 4: main halyard, 5: tack reef cringle and hook, 6: reef line, 7: reef ties. Choose a phase: the highlight shows what you do now.",
    "Widok z boku na grot przy refowaniu. 1: szot grota, 2: obciagacz bomu, 3: topenanta, 4: fal grota, 5: przedni kausz refowy i hak, 6: linka refowa, 7: refsejzingi. Wybierz faze: podswietlenie pokazuje, co robisz teraz.",
    "Vista lateral de la mayor al tomar un rizo. 1: escota de mayor, 2: contra, 3: amantillo, 4: driza de mayor, 5: ollao de amura y gancho, 6: cabo de rizo, 7: tomadores. Elige una fase: lo resaltado es lo que haces ahora.",
    "Vue de côté de la grand-voile pendant une prise de ris. 1 : écoute, 2 : hale-bas, 3 : balancine, 4 : drisse de grand-voile, 5 : œillet d'amure et croc, 6 : bosse de ris, 7 : garcettes. Choisis une phase : ce qui est en évidence est ce que tu fais maintenant.",
    "Seitenansicht des Großsegels beim Reffen. 1: Großschot, 2: Baumniederholer, 3: Dirk, 4: Großfall, 5: Reffkausch am Hals und Haken, 6: Reffleine, 7: Reffbändsel. Wähle eine Phase: Hervorgehoben ist, was du jetzt tust.",
    "Vista laterale della randa durante la presa di terzaroli. 1: scotta randa, 2: vang, 3: amantiglio, 4: drizza randa, 5: brancarella di mura e gancio, 6: borosa, 7: matafioni. Scegli una fase: l'evidenziato è ciò che fai adesso.",
  ),
  options: [
    words("Разгрузить", "Unload", "Odciaz", "Descargar", "Décharger", "Entlasten", "Scaricare"),
    words("Опустить", "Lower", "Opusc", "Arriar", "Affaler", "Fieren", "Ammainare"),
    words("Натянуть", "Tension", "Naciagnij", "Tensar", "Tendre", "Spannen", "Tesare"),
    words("Закрепить", "Secure", "Zabezpiecz", "Asegurar", "Assurer", "Sichern", "Fissare"),
  ],
  readouts: [
    words(
      "Рулевой держит круто к ветру. 1-2: потрави гика-шкот и оттяжку, пока грот не заполощет. 3: возьми гик на топенант, иначе после травления фала он упадет в кокпит.",
      "The helmsman holds close to the wind. 1-2: ease the mainsheet and vang until the main luffs. 3: take the boom on the topping lift, or it drops into the cockpit once the halyard is eased.",
      "Sternik trzyma ostro do wiatru. 1-2: poluzuj szot grota i obciagacz, az grot zacznie lopotac. 3: wez bom na topenante, inaczej po poluzowaniu falu spadnie do kokpitu.",
      "El timonel ciñe. 1-2: lasca escota y contra hasta que la mayor flamee. 3: toma la botavara con el amantillo; si no, caerá a la bañera al lascar la driza.",
      "Le barreur tient le près. 1-2 : choque l'écoute et le hale-bas jusqu'à ce que la grand-voile faseye. 3 : reprends la bôme à la balancine, sinon elle tombe dans le cockpit quand la drisse est choquée.",
      "Der Rudergänger hält hoch am Wind. 1-2: Großschot und Niederholer fieren, bis das Groß killt. 3: Baum in die Dirk nehmen, sonst fällt er ins Cockpit, sobald das Fall gefiert ist.",
      "Il timoniere tiene di bolina. 1-2: lasca scotta e vang finché la randa sventa. 3: prendi il boma sull'amantiglio, altrimenti cade nel pozzetto quando lasci la drizza.",
    ),
    words(
      "4: потрави грота-фал до марки для этого рифа. 5: надень передний риф-кренгельс на гак у пятки гика. Нижняя часть паруса пока висит свободно.",
      "4: ease the main halyard to the mark for this reef. 5: put the tack reef cringle on the hook at the gooseneck. The lower part of the sail hangs loose for now.",
      "4: poluzuj fal grota do znacznika tego refu. 5: zaloz przedni kausz refowy na hak przy okuciu bomu. Dolna czesc zagla na razie wisi luzno.",
      "4: lasca la driza hasta la marca de este rizo. 5: engancha el ollao de amura en el gancho de la botavara. La parte baja de la vela cuelga suelta por ahora.",
      "4 : choque la drisse jusqu'à la marque de ce ris. 5 : capelle l'œillet d'amure sur le croc au vit-de-mulet. Le bas de la voile pend librement pour l'instant.",
      "4: Großfall bis zur Marke für dieses Reff fieren. 5: Reffkausch am Hals in den Haken am Lümmelbeschlag. Der untere Segelteil hängt vorerst lose.",
      "4: lasca la drizza fino al segno di questa mano. 5: aggancia la brancarella di mura al gancio della trozza. La parte bassa della vela per ora pende libera.",
    ),
    words(
      "4: снова набей фал, и полностью: ветер сильный. Проверь, что гик поднимается свободно. 6: выбери риф-шкентель почти до гика.",
      "4: tension the halyard again, and fully: the wind is strong. Check that the boom can rise freely. 6: haul the reef line almost down to the boom.",
      "4: ponownie naciagnij fal, i to do konca: wiatr jest silny. Sprawdz, czy bom swobodnie sie unosi. 6: wybierz linke refowa prawie do bomu.",
      "4: vuelve a tensar la driza, y a fondo: el viento es fuerte. Comprueba que la botavara sube libremente. 6: cobra el cabo de rizo casi hasta la botavara.",
      "4 : reprends la drisse, à fond : le vent est fort. Vérifie que la bôme monte librement. 6 : embraque la bosse de ris presque jusqu'à la bôme.",
      "4: Fall wieder durchsetzen, und zwar voll: Es weht stark. Prüfen, dass der Baum frei steigen kann. 6: Reffleine fast bis zum Baum dichtholen.",
      "4: tesa di nuovo la drizza, e a fondo: il vento è forte. Controlla che il boma salga libero. 6: cazza la borosa quasi fino al boma.",
    ),
    words(
      "3: потрави топенант до слабины, иначе у грота будет очень большой твист. 1-2: набей гика-шкот и оттяжку. 7: подвяжи излишек паруса риф-штертами через риф-гаты.",
      "3: ease the topping lift until slack, or the main will have a very large twist. 1-2: set the mainsheet and vang. 7: tie the loose cloth with reef ties through the reef points.",
      "3: poluzuj topenante do luzu, inaczej grot bedzie mial bardzo duzy skret. 1-2: dociagnij szot grota i obciagacz. 7: przywiaz nadmiar zagla refsejzingami przez otwory refowe.",
      "3: lasca el amantillo hasta que quede flojo, o la mayor tendrá una torsión enorme. 1-2: ajusta escota y contra. 7: amarra la tela sobrante con los tomadores por los ollaos de rizo.",
      "3 : choque la balancine jusqu'à ce qu'elle soit molle, sinon le vrillage sera énorme. 1-2 : règle écoute et hale-bas. 7 : ferle la toile en trop avec les garcettes passées dans les œillets de ris.",
      "3: Dirk fieren, bis sie lose ist, sonst bekommt das Groß sehr viel Twist. 1-2: Großschot und Niederholer setzen. 7: Das lose Tuch mit Reffbändseln durch die Reffgatchen festbinden.",
      "3: lasca l'amantiglio finché è lento, altrimenti la randa avrà uno svergolamento enorme. 1-2: regola scotta e vang. 7: lega la tela in eccesso con i matafioni nei fori dei terzaroli.",
    ),
  ],
};

export function reefPhase(selection: number) {
  return Math.max(0, Math.min(REEF_PHASES.length - 1, Math.round(Number.isFinite(selection) ? selection : 0)));
}

export function reefReadout(selection: number, lang: Language) {
  return reefCopy.readouts[reefPhase(selection)][lang];
}

const ink = "#e8f4f8", muted = "#7593a6", cyan = "#00d4ff", cloth = "#d0e1e8";
const marker = (x: number, y: number, n: number, on: boolean) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="#102738" stroke="${on ? cyan : muted}"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12">${n}</text>`;
const line = (d: string, on: boolean, dashed = false) =>
  `<path d="${d}" fill="none" stroke="${on ? cyan : muted}" stroke-width="${on ? 3.5 : 2}"${dashed ? ' stroke-dasharray="5 4"' : ""}/>`;

// Fixed side-view layout, 360 x 240. Mast at x 96, boom at y 172.
const MAST = 96, BOOM_Y = 172, BOOM_END = 300, HEAD_Y = 34, REEF_DEPTH = 42;

export function reefDrawing(selection: number) {
  const p = REEF_PHASES[reefPhase(selection)];
  const on = (id: LineId) => p.lines.includes(id);
  const headY = HEAD_Y + (p.headDrop ? REEF_DEPTH : 0);
  // Clew well inboard of the boom end so the leech and the topping lift read apart.
  const clewX = BOOM_END - 30;
  const leechCringle = { x: clewX - 34, y: BOOM_Y - REEF_DEPTH };
  let s = `<path d="M40 214 Q160 236 330 214 L310 226 H62 Z" fill="#29475b" stroke="${muted}"/>`;
  s += `<path d="M${MAST} 24 V210" stroke="${ink}" stroke-width="5"/><path d="M${MAST} ${BOOM_Y} H${BOOM_END}" stroke="${ink}" stroke-width="5"/>`;

  // Sail. Before the reef line is in, the loose foot still reaches the clew;
  // afterwards the new foot runs from the hooked tack to the leech cringle.
  const tackY = BOOM_Y - 3;
  if (p.leechDown) {
    s += `<path d="M${MAST + 4} ${headY} L${MAST + 4} ${tackY} L${clewX - 6} ${BOOM_Y - 3} Z" fill="${cloth}" opacity=".5"/>`;
    // The reefed bunt lies along the boom.
    s += `<path d="M${MAST + 8} ${BOOM_Y + 4} Q${(MAST + clewX) / 2} ${BOOM_Y + 16} ${clewX - 8} ${BOOM_Y + 4}" fill="none" stroke="${cloth}" stroke-width="7" opacity=".6"/>`;
  } else {
    const reefRowY = BOOM_Y - REEF_DEPTH + (p.headDrop ? REEF_DEPTH : 0);
    s += `<path d="M${MAST + 4} ${headY} L${MAST + 4} ${tackY} L${clewX} ${BOOM_Y - 3} Z" fill="${cloth}" opacity=".45"/>`;
    s += `<path d="M${MAST + 4} ${reefRowY} L${leechCringle.x} ${leechCringle.y + (p.headDrop ? REEF_DEPTH * .55 : 0)}" stroke="${muted}" stroke-dasharray="3 4"/>`;
  }

  // 1 mainsheet (boom end to deck), 2 vang (mast foot to boom).
  s += line(p.sheetsSlack ? `M${BOOM_END - 20} ${BOOM_Y} Q${BOOM_END - 6} ${BOOM_Y + 22} ${BOOM_END - 26} ${BOOM_Y + 40}` : `M${BOOM_END - 20} ${BOOM_Y} L${BOOM_END - 26} ${BOOM_Y + 40}`, on(1));
  s += line(p.sheetsSlack ? `M${MAST + 6} ${BOOM_Y + 34} Q${MAST + 18} ${BOOM_Y + 28} ${MAST + 44} ${BOOM_Y}` : `M${MAST + 6} ${BOOM_Y + 34} L${MAST + 44} ${BOOM_Y}`, on(2));
  // 3 topping lift: masthead to boom end. Once eased it sags below its taut line.
  const liftEnd = { x: BOOM_END - 2, y: BOOM_Y }, liftMid = { x: (MAST + liftEnd.x) / 2, y: (26 + liftEnd.y) / 2 };
  s += line(p.liftSlack ? `M${MAST} 26 Q${liftMid.x + 14} ${liftMid.y + 30} ${liftEnd.x} ${liftEnd.y}` : `M${MAST} 26 L${liftEnd.x} ${liftEnd.y}`, on(3), p.liftSlack);
  // 4 halyard: masthead sheave to the head.
  s += line(`M${MAST - 8} 26 V${headY} H${MAST + 4}`, on(4));
  // 5 tack reef cringle: up the luff until it is lowered onto the hook.
  const tackCringle = { x: MAST + 6, y: p.tackHooked ? BOOM_Y - 6 : BOOM_Y - REEF_DEPTH };
  s += `<circle cx="${tackCringle.x}" cy="${tackCringle.y}" r="5" fill="none" stroke="${on(5) ? cyan : muted}" stroke-width="3"/>`;
  // 6 reef line: from the leech cringle down to the boom end.
  const lc = p.leechDown ? { x: clewX - 6, y: BOOM_Y - 3 } : { x: leechCringle.x, y: leechCringle.y + (p.headDrop ? REEF_DEPTH * .55 : 0) };
  s += `<circle cx="${lc.x}" cy="${lc.y}" r="5" fill="none" stroke="${on(6) ? cyan : muted}" stroke-width="3"/>`;
  s += line(`M${lc.x} ${lc.y} L${BOOM_END - 2} ${BOOM_Y}`, on(6));
  // 7 reef ties around the bunt.
  if (p.leechDown) [0.3, 0.5, 0.7].forEach(f => { const x = MAST + (clewX - MAST) * f; s += `<path d="M${x} ${BOOM_Y - 6} v18" stroke="${on(7) ? cyan : muted}" stroke-width="${on(7) ? 3 : 2}"/>`; });

  const liftLabel = { x: MAST + (liftEnd.x - MAST) * .42 + 16, y: 26 + (liftEnd.y - 26) * .42 - 16 };
  s += marker(BOOM_END - 2, BOOM_Y + 44, 1, on(1)) + marker(MAST + 30, BOOM_Y + 42, 2, on(2)) + marker(Math.round(liftLabel.x), Math.round(liftLabel.y), 3, on(3))
    + marker(MAST - 26, headY + 16, 4, on(4)) + marker(tackCringle.x + 24, tackCringle.y - 12, 5, on(5)) + marker(lc.x + 4, lc.y + 26, 6, on(6))
    + (p.leechDown ? marker(MAST + (clewX - MAST) * .5, BOOM_Y + 34, 7, on(7)) : "");
  return s;
}
