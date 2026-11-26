// Manoeuvres section: harbour and boat-handling exercises on our yacht.
// Data only. Physics: src/lib/harbour-physics (engine) and the shared sailing
// session (sail). Runner, scoring and progress: src/features/manoeuvres.
// Coordinates are metres, x east and y north; headings are compass degrees.
// Wind direction is where it blows FROM.

import { hullOutline, OUR_YACHT, rect, type MooringLine, type Obstacle, type Vec2 } from "../lib/harbour-physics";

export type Text7 = { ru: string; en: string; pl: string; es: string; fr: string; de: string; it: string };

export interface SceneObstacle extends Obstacle {
  /** Moored yachts are drawn as hulls from this pose. */
  boat?: { x: number; y: number; heading: number; loa: number; beam: number };
}

export type ManoeuvreGoal =
  /** Stop in a berth: centre within posTol metres, heading within headingTol, slow, for hold seconds. */
  | { type: "berth"; x: number; y: number; heading: number; posTol: number; headingTol: number; maxSpeedKn: number; hold: number }
  /** Bring the bow (or any part of the hull) within reach of a buoy or a person, slow. */
  | { type: "pickup"; targetId: string; reach: number; at: "bow" | "hull"; maxSpeedKn: number; neutral: boolean }
  /** Get the whole hull into a clear zone. */
  | { type: "leave"; zone: Vec2[] }
  /** Turn to a heading inside a zone, then hold it slowly. */
  | { type: "turn"; heading: number; headingTol: number; zone: Vec2[]; maxSpeedKn: number; hold: number }
  /** Sail through each gate (pair of buoys) in order. */
  | { type: "gates"; gates: [string, string][] }
  /** Stay within radius of a mark for this many seconds in a row. */
  | { type: "station"; markId: string; radius: number; seconds: number };

export interface ManoeuvreExercise {
  id: string;
  track: "engine" | "sail";
  /** 1 easy, 3 hard: wind strength and how tight the space is. */
  difficulty: 1 | 2 | 3;
  title: Text7;
  goal: Text7;
  explain: Text7;
  hint: Text7;
  wind: { speed: number; direction: number; /** gust amplitude as a fraction of speed */ gust: number };
  start: { x: number; y: number; heading: number; speedKn: number };
  /** Visible part of the harbour, [minX, minY, maxX, maxY]. */
  bounds: [number, number, number, number];
  obstacles: SceneObstacle[];
  /** Lines made fast at the start, cast off with a button. */
  lines?: MooringLine[];
  target: ManoeuvreGoal;
  /** Suggested track for the schematic, start first. */
  plan: Vec2[];
  criteria: {
    timeLimit: number;
    /** Three stars need this time or less. */
    parTime: number;
    /** A touch at or below this speed is a fender touch, above it a hit. */
    gentleKn: number;
    /** Obstacles a gentle touch is expected on (the berth itself). */
    allowed: string[];
  };
}

const t7 = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): Text7 => ({ ru, en, pl, es, fr, de, it });

// --- Scene helpers ---
const HALF_BEAM = OUR_YACHT.beam / 2;
const HALF_LOA = OUR_YACHT.loa / 2;
/** Fender gap between our hull and a berth edge, m. */
const FENDER = 0.3;

function pontoon(id: string, cx: number, cy: number, width: number, height: number): SceneObstacle {
  return { id, kind: "pontoon", shape: { type: "poly", points: rect(cx, cy, width, height) } };
}
function quay(id: string, cx: number, cy: number, width: number, height: number): SceneObstacle {
  return { id, kind: "quay", shape: { type: "poly", points: rect(cx, cy, width, height) } };
}
function pile(id: string, x: number, y: number): SceneObstacle {
  return { id, kind: "pile", shape: { type: "circle", x, y, r: 0.2 } };
}
function buoy(id: string, x: number, y: number, r = 0.5): SceneObstacle {
  return { id, kind: "buoy", shape: { type: "circle", x, y, r } };
}
function moored(id: string, x: number, y: number, heading: number, loa = 12, beam = 3.9): SceneObstacle {
  const h = heading * Math.PI / 180, f: Vec2 = [Math.sin(h), Math.cos(h)], s: Vec2 = [Math.cos(h), -Math.sin(h)];
  const points = hullOutline(loa, beam).map(([a, b]) => [x + a * f[0] + b * s[0], y + a * f[1] + b * s[1]] as Vec2);
  return { id, kind: "boat", shape: { type: "poly", points }, boat: { x, y, heading, loa, beam } };
}

// Alongside berth on the south side of an east-west pontoon (edge at y = 0).
const ALONGSIDE_Y = -(HALF_BEAM + FENDER);
const alongsidePontoon = pontoon("pontoon", 0, 1, 90, 2);

// Stern-to and bow-to berths off an east-west quay (face at y = 0).
const BERTH_Y = -(HALF_LOA + 1);
const quayNorth = quay("quay", 0, 6, 120, 12);

// Narrow fairway between two rows of stern-to yachts.
const fairwayRows: SceneObstacle[] = [-30, -18, -6, 6, 18, 30].flatMap((x, i) => [
  moored(`north-${i}`, x, 18, 180), moored(`south-${i}`, x, -18, 0),
]);

const ALL: ManoeuvreExercise[] = [
  {
    id: "alongside-onshore",
    track: "engine",
    difficulty: 1,
    title: t7("Лагом к понтону: прижимной ветер", "Alongside: onshore wind", "Burtą do pomostu: wiatr dopychający", "De costado al pantalán: viento hacia el pantalán", "À couple du ponton : vent plaquant", "Längsseits an den Steg: auflandiger Wind", "All'inglese sul pontile: vento verso il pontile"),
    goal: t7("Встань левым бортом к понтону в пунктирный контур и остановись.", "Bring your port side to the pontoon inside the dashed outline and stop.", "Stań lewą burtą przy pomoście w przerywanym obrysie i zatrzymaj jacht.", "Acerca el costado de babor al pantalán dentro del contorno discontinuo y detén el barco.", "Amène le flanc bâbord contre le ponton dans le contour en pointillés et arrête-toi.", "Lege dich mit Backbord an den Steg in die gestrichelte Markierung und stoppe.", "Porta il fianco sinistro al pontile dentro la sagoma tratteggiata e fermati."),
    explain: t7(
      "Ветер дует на понтон, он сам прижмет лодку. Подойди параллельно, в паре метров от понтона, погаси ход коротким задним и дай ветру мягко положить тебя на кранцы.",
      "The wind blows onto the pontoon and will press the boat on by itself. Come in parallel a couple of metres off, take the way off with a short burst astern and let the wind lay you gently on the fenders.",
      "Wiatr wieje na pomost i sam dociśnie jacht. Podejdź równolegle, kilka metrów od pomostu, wytrać prędkość krótkim wstecznym i pozwól wiatrowi łagodnie położyć jacht na odbijaczach.",
      "El viento sopla hacia el pantalán y empujará el barco solo. Entra en paralelo a un par de metros, quita la arrancada con un toque atrás y deja que el viento te apoye suavemente en las defensas.",
      "Le vent souffle vers le ponton et plaquera le bateau tout seul. Arrive parallèlement à deux mètres, casse l'erre par un coup de marche arrière et laisse le vent te poser doucement sur les pare-battages.",
      "Der Wind weht auf den Steg und drückt das Boot von selbst heran. Komm parallel ein paar Meter entfernt heran, nimm mit kurz Rückwärts die Fahrt raus und lass dich vom Wind sanft auf die Fender legen.",
      "Il vento soffia verso il pontile e spingerà la barca da solo. Arriva in parallelo a un paio di metri, togli l'abbrivio con un colpo di retromarcia e lascia che il vento ti appoggi piano sui parabordi."),
    hint: t7("Останавливайся напротив контура, а не у самого понтона: последние метры сделает ветер.", "Stop abreast of the outline, not at the pontoon: the wind does the last metres.", "Zatrzymaj się na wysokości miejsca, nie przy samym pomoście: ostatnie metry zrobi wiatr.", "Detente a la altura del contorno, no junto al pantalán: el viento hará los últimos metros.", "Arrête-toi à hauteur du contour, pas contre le ponton : le vent fait les derniers mètres.", "Stoppe auf Höhe der Markierung, nicht am Steg: die letzten Meter macht der Wind.", "Fermati all'altezza della sagoma, non contro il pontile: gli ultimi metri li fa il vento."),
    wind: { speed: 10, direction: 180, gust: 0 },
    start: { x: -40, y: -9, heading: 90, speedKn: 0 },
    bounds: [-50, -22, 45, 6],
    obstacles: [alongsidePontoon, moored("astern", -26, -2.4, 90), moored("ahead", 26, -2.4, 90)],
    target: { type: "berth", x: 0, y: ALONGSIDE_Y, heading: 90, posTol: 2.5, headingTol: 12, maxSpeedKn: 0.3, hold: 3 },
    plan: [[-40, -9], [-16, -8.5], [-2, -5.5], [0, ALONGSIDE_Y]],
    criteria: { timeLimit: 150, parTime: 75, gentleKn: 0.6, allowed: ["pontoon"] },
  },
  {
    id: "alongside-offshore",
    track: "engine",
    difficulty: 2,
    title: t7("Лагом к понтону: отжимной ветер", "Alongside: offshore wind", "Burtą do pomostu: wiatr odpychający", "De costado al pantalán: viento que aparta", "À couple du ponton : vent dégageant", "Längsseits an den Steg: ablandiger Wind", "All'inglese sul pontile: vento che allontana"),
    goal: t7("Встань лагом между двумя лодками, пока ветер отжимает тебя от понтона.", "Get alongside between two boats while the wind pushes you off the pontoon.", "Stań burtą między dwoma jachtami, choć wiatr odpycha cię od pomostu.", "Atraca de costado entre dos barcos mientras el viento te aparta del pantalán.", "Mets-toi à couple entre deux bateaux pendant que le vent t'écarte du ponton.", "Geh zwischen zwei Booten längsseits, während der Wind dich vom Steg drückt.", "Ormeggiati all'inglese tra due barche mentre il vento ti allontana dal pontile."),
    explain: t7(
      "Отжимной ветер сносит лодку от понтона, а нос уходит под ветер быстрее кормы. Подходи круче, под углом около 30 градусов, носом почти к понтону, и в последний момент доверни кормой, работая рулем на малом переднем.",
      "An offshore wind sets the boat away from the pontoon, and the bow blows off faster than the stern. Come in steeper, at about 30 degrees with the bow nearly at the pontoon, and swing the stern in at the last moment with the rudder and a little ahead.",
      "Wiatr odpychający znosi jacht od pomostu, a dziób odpada szybciej niż rufa. Podchodź ostrzej, pod kątem około 30 stopni, dziobem prawie do pomostu, i na końcu dociągnij rufę sterem na małej naprzód.",
      "El viento que aparta empuja el barco lejos del pantalán y la proa cae antes que la popa. Entra más cerrado, a unos 30 grados con la proa casi en el pantalán, y al final mete la popa con el timón y un poco avante.",
      "Le vent dégageant écarte le bateau du ponton et l'étrave abat plus vite que l'arrière. Arrive plus pointu, à environ 30 degrés, l'étrave presque au ponton, puis ramène l'arrière au dernier moment à la barre avec un peu de marche avant.",
      "Ablandiger Wind versetzt das Boot vom Steg weg, und der Bug fällt schneller ab als das Heck. Komm steiler, etwa 30 Grad, mit dem Bug fast am Steg, und hol das Heck zuletzt mit Ruder und etwas Voraus heran.",
      "Il vento che allontana porta la barca via dal pontile e la prua scade prima della poppa. Arriva più stretto, a circa 30 gradi con la prua quasi al pontile, e all'ultimo porta dentro la poppa con il timone e un filo di marcia avanti."),
    hint: t7("Не останавливайся далеко от понтона: стоящую лодку ветер унесет за секунды.", "Do not stop far off the pontoon: the wind carries a stopped boat away in seconds.", "Nie zatrzymuj się daleko od pomostu: stojący jacht wiatr odniesie w kilka sekund.", "No te detengas lejos del pantalán: el viento se lleva un barco parado en segundos.", "Ne t'arrête pas loin du ponton : le vent emporte un bateau arrêté en quelques secondes.", "Stoppe nicht weit vom Steg: ein stehendes Boot treibt der Wind in Sekunden weg.", "Non fermarti lontano dal pontile: il vento porta via una barca ferma in pochi secondi."),
    wind: { speed: 10, direction: 0, gust: 0.15 },
    start: { x: -36, y: -24, heading: 60, speedKn: 0 },
    bounds: [-45, -30, 45, 6],
    obstacles: [alongsidePontoon, moored("astern", -17, -2.4, 90), moored("ahead", 17, -2.4, 90)],
    target: { type: "berth", x: 0, y: ALONGSIDE_Y, heading: 90, posTol: 2, headingTol: 15, maxSpeedKn: 0.4, hold: 2 },
    plan: [[-36, -24], [-12, -8], [-2, -3], [0, ALONGSIDE_Y]],
    criteria: { timeLimit: 150, parTime: 70, gentleKn: 0.6, allowed: ["pontoon"] },
  },
  {
    id: "leave-onshore",
    track: "engine",
    difficulty: 2,
    title: t7("Отход от понтона при прижимном ветре", "Leaving the pontoon in an onshore wind", "Odejście od pomostu przy wietrze dopychającym", "Salir del pantalán con viento hacia el pantalán", "Quitter le ponton par vent plaquant", "Ablegen bei auflandigem Wind", "Disormeggio con vento verso il pontile"),
    goal: t7("Выйди от понтона на чистую воду, не задев соседей спереди и сзади.", "Get off the pontoon into clear water without touching the boats ahead and astern.", "Odejdź od pomostu na czystą wodę, nie dotykając jachtów z przodu i z tyłu.", "Sal del pantalán a aguas libres sin tocar los barcos de proa y de popa.", "Quitte le ponton vers l'eau libre sans toucher les bateaux devant et derrière.", "Leg vom Steg ab ins freie Wasser, ohne die Boote vor und hinter dir zu berühren.", "Lascia il pontile verso l'acqua libera senza toccare le barche a prua e a poppa."),
    explain: t7(
      "Ветер прижимает лодку, и просто отойти задним не выйдет: ее потащит по понтону. Отходят на шпринге: носовой шпринг заведен назад, малый передний и руль к понтону. Нос держится, корма выходит против ветра. Когда корма отошла градусов на 40, отдай шпринг и уходи задним.",
      "The wind pins the boat, and simply backing off will drag her along the pontoon. Leave on a spring: the bow spring runs aft, slow ahead with the rudder towards the pontoon. The bow is held and the stern swings out into the wind. Once the stern is out about 40 degrees, cast off the spring and go astern.",
      "Wiatr dociska jacht i zwykłe odejście wstecz nie wyjdzie: jacht będzie ciągnięty po pomoście. Odchodzi się na szpringu: dziobowy szpring biegnie do tyłu, mała naprzód i ster w stronę pomostu. Dziób jest trzymany, rufa wychodzi pod wiatr. Gdy rufa odejdzie na około 40 stopni, oddaj szpring i odejdź wstecz.",
      "El viento aprieta el barco contra el pantalán y salir marcha atrás sin más lo arrastra por él. Se sale con un spring: el spring de proa va hacia popa, avante poco y timón hacia el pantalán. La proa queda sujeta y la popa sale contra el viento. Cuando la popa se haya abierto unos 40 grados, larga el spring y sal atrás.",
      "Le vent plaque le bateau et reculer simplement le fait frotter le long du ponton. On déborde sur une garde : la garde avant part vers l'arrière, marche avant lente, barre vers le ponton. L'étrave reste tenue et l'arrière s'écarte face au vent. Quand l'arrière est sorti d'environ 40 degrés, largue la garde et recule.",
      "Der Wind drückt das Boot an, und einfach rückwärts weg schleift es am Steg entlang. Man legt über die Spring ab: die Vorspring läuft nach achtern, langsam voraus, Ruder zum Steg. Der Bug wird gehalten, das Heck schwenkt gegen den Wind aus. Steht das Heck etwa 40 Grad ab, Spring loswerfen und rückwärts raus.",
      "Il vento schiaccia la barca e uscire semplicemente in retromarcia la trascina lungo il pontile. Si esce sullo spring: lo spring di prua va verso poppa, avanti adagio e timone verso il pontile. La prua resta trattenuta e la poppa si apre contro vento. Quando la poppa è aperta di circa 40 gradi, molla lo spring ed esci in retromarcia."),
    hint: t7("Руль к понтону, то есть влево, и малый передний. Шпринг отдай кнопкой, когда корма отойдет.", "Rudder towards the pontoon, so to port, and slow ahead. Cast off the spring with the button once the stern is out.", "Ster w stronę pomostu, czyli w lewo, i mała naprzód. Oddaj szpring przyciskiem, gdy rufa odejdzie.", "Timón hacia el pantalán, o sea a babor, y avante poco. Larga el spring con el botón cuando la popa se abra.", "Barre vers le ponton, donc à bâbord, et marche avant lente. Largue la garde avec le bouton quand l'arrière est sorti.", "Ruder zum Steg, also nach Backbord, und langsam voraus. Wirf die Spring per Knopf los, sobald das Heck absteht.", "Timone verso il pontile, cioè a sinistra, e avanti adagio. Molla lo spring con il pulsante quando la poppa si è aperta."),
    wind: { speed: 12, direction: 180, gust: 0.1 },
    start: { x: 0, y: ALONGSIDE_Y, heading: 90, speedKn: 0 },
    bounds: [-40, -32, 40, 6],
    obstacles: [alongsidePontoon, moored("astern", -15.5, -2.4, 90), moored("ahead", 15.5, -2.4, 90)],
    lines: [{ id: "bow-spring", cleat: [HALF_LOA - 0.8, -(HALF_BEAM - 0.7)], anchor: [-2, 0], length: 8.4 }],
    target: { type: "leave", zone: rect(0, -26, 160, 20) },
    plan: [[0, ALONGSIDE_Y], [-6, -8], [-10, -16], [-8, -24]],
    // The bow pivots on its fender against the pontoon while the stern swings out.
    criteria: { timeLimit: 120, parTime: 60, gentleKn: 1, allowed: ["pontoon"] },
  },
  {
    id: "stern-to",
    track: "engine",
    difficulty: 2,
    title: t7("Кормой к причалу между лодками", "Stern-to between boats", "Rufą do kei między jachtami", "De popa al muelle entre barcos", "Cul à quai entre deux bateaux", "Mit dem Heck an die Pier zwischen Booten", "Di poppa in banchina tra le barche"),
    goal: t7("Задним ходом войди в свободное место и остановись кормой в метре от стенки.", "Reverse into the free slot and stop with the stern a metre off the quay.", "Wejdź wstecz w wolne miejsce i zatrzymaj się rufą metr od kei.", "Entra marcha atrás en el hueco libre y detente con la popa a un metro del muelle.", "Entre en marche arrière dans la place libre et arrête-toi l'arrière à un mètre du quai.", "Fahr rückwärts in die freie Lücke und stoppe mit dem Heck einen Meter vor der Pier.", "Entra in retromarcia nel posto libero e fermati con la poppa a un metro dalla banchina."),
    explain: t7(
      "Задним лодка слушается руля только на ходу, а винт тянет корму в сторону: правый винт уводит корму влево. Встань носом от причала заранее, дай задний, поймай заброс кормы и держи ход около узла, чтобы руль работал.",
      "Astern the boat answers the rudder only with way on, and the propeller pulls the stern sideways: a right-handed prop walks the stern to port. Line up early with the bow away from the quay, go astern, catch the stern kick and keep about a knot so the rudder bites.",
      "Na wstecznym jacht słucha steru dopiero, gdy płynie, a śruba ściąga rufę w bok: prawoskrętna śruba znosi rufę w lewo. Ustaw się wcześnie dziobem od kei, daj wstecz, wyłap znoszenie rufy i trzymaj około węzła, żeby ster działał.",
      "Marcha atrás el barco solo obedece al timón con arrancada, y la hélice tira de la popa hacia un lado: una hélice dextrógira lleva la popa a babor. Alinéate pronto con la proa hacia fuera, da atrás, controla el efecto de la hélice y mantén cerca de un nudo para que el timón trabaje.",
      "En marche arrière le bateau n'obéit à la barre qu'avec de l'erre, et l'hélice tire l'arrière de côté : une hélice à pas à droite envoie l'arrière à bâbord. Aligne-toi tôt l'étrave vers le large, recule, rattrape le pas d'hélice et garde environ un nœud pour que le safran porte.",
      "Rückwärts gehorcht das Boot dem Ruder nur mit Fahrt, und der Propeller zieht das Heck zur Seite: ein rechtsgängiger Propeller versetzt das Heck nach Backbord. Richte dich früh mit dem Bug weg von der Pier aus, gib Rückwärts, fang den Radeffekt ab und halte etwa einen Knoten, damit das Ruder greift.",
      "In retromarcia la barca risponde al timone solo con abbrivio, e l'elica tira la poppa di lato: un'elica destrorsa porta la poppa a sinistra. Allineati presto con la prua verso l'esterno, dai indietro, controlla l'effetto evolutivo e tieni circa un nodo perché il timone lavori."),
    hint: t7("Начинай задний правее места: заброс кормы влево сам доведет ее в проход.", "Start astern a little to starboard of the slot: the stern kick to port carries it into the gap.", "Zacznij wstecz trochę na prawo od miejsca: znoszenie rufy w lewo samo wprowadzi ją w lukę.", "Empieza atrás un poco a estribor del hueco: el efecto de la hélice a babor la llevará dentro.", "Commence à reculer un peu à tribord de la place : le pas d'hélice vers bâbord l'y amène.", "Beginne rückwärts etwas steuerbords der Lücke: der Radeffekt nach Backbord trägt das Heck hinein.", "Comincia indietro un po' a dritta del posto: l'effetto evolutivo a sinistra porta dentro la poppa."),
    wind: { speed: 8, direction: 270, gust: 0.1 },
    start: { x: -28, y: -30, heading: 90, speedKn: 2 },
    bounds: [-36, -40, 36, 4],
    obstacles: [quayNorth, moored("left-1", -5.6, BERTH_Y + 0.9, 180), moored("right-1", 5.6, BERTH_Y + 0.9, 180), moored("left-2", -11.2, BERTH_Y + 0.9, 180), moored("right-2", 11.2, BERTH_Y + 0.9, 180)],
    target: { type: "berth", x: 0, y: BERTH_Y, heading: 180, posTol: 1.2, headingTol: 10, maxSpeedKn: 0.3, hold: 3 },
    plan: [[-28, -30], [4, -30], [2, -20], [0, BERTH_Y]],
    criteria: { timeLimit: 180, parTime: 90, gentleKn: 0.5, allowed: [] },
  },
  {
    id: "piles-bow-to",
    track: "engine",
    difficulty: 3,
    title: t7("На дальбах носом к причалу", "Bow-to between piles", "Dziobem do kei między dalbami", "De proa al muelle entre pilotes", "Proue à quai entre deux pieux", "Mit dem Bug in die Box zwischen Dalben", "Di prua in banchina tra i pali"),
    goal: t7("Пройди между дальбами и остановись носом в метре от причала, как в порту на Мазурах.", "Pass between the piles and stop with the bow a metre off the quay, as in a Masurian port.", "Przejdź między dalbami i zatrzymaj się dziobem metr od kei, jak w porcie na Mazurach.", "Pasa entre los pilotes y detente con la proa a un metro del muelle, como en un puerto de Masuria.", "Passe entre les pieux et arrête-toi l'étrave à un mètre du quai, comme dans un port de Mazurie.", "Fahr zwischen den Dalben durch und stoppe mit dem Bug einen Meter vor der Pier, wie in einem masurischen Hafen.", "Passa tra i pali e fermati con la prua a un metro dalla banchina, come in un porto della Masuria."),
    explain: t7(
      "Между дальбами меньше метра с каждого борта, а боковой ветер сносит лодку на одну из них. Заходи по оси места, держа нос чуть на ветер, малым ходом. Ход гаси задним уже за дальбами, помня про заброс кормы.",
      "There is less than a metre each side between the piles, and the crosswind sets the boat onto one of them. Come in along the centre of the slot, bow slightly to windward, at slow speed. Take the way off astern once past the piles, remembering the stern kick.",
      "Między dalbami jest mniej niż metr z każdej burty, a boczny wiatr znosi jacht na jedną z nich. Wchodź osią miejsca, dziobem lekko na wiatr, małą prędkością. Wytracaj prędkość wstecznym już za dalbami, pamiętając o znoszeniu rufy.",
      "Entre los pilotes queda menos de un metro por banda y el viento de costado empuja el barco contra uno. Entra por el centro del puesto, con la proa algo a barlovento y poca velocidad. Quita la arrancada atrás ya pasados los pilotes, contando con el efecto de la hélice.",
      "Entre les pieux il reste moins d'un mètre de chaque bord et le vent de travers pousse le bateau sur l'un d'eux. Entre dans l'axe de la place, l'étrave un peu au vent, doucement. Casse l'erre en arrière une fois les pieux passés, en pensant au pas d'hélice.",
      "Zwischen den Dalben bleibt auf jeder Seite weniger als ein Meter, und Seitenwind versetzt das Boot auf einen davon. Fahr in der Mitte der Box ein, den Bug etwas in Luv, langsam. Nimm die Fahrt erst hinter den Dalben rückwärts raus und denk an den Radeffekt.",
      "Tra i pali resta meno di un metro per lato e il vento al traverso spinge la barca contro uno di essi. Entra sull'asse del posto, prua un po' al vento, adagio. Togli l'abbrivio in retromarcia solo dopo i pali, ricordando l'effetto evolutivo."),
    hint: t7("Ветер справа: целься носом на полметра правее середины прохода.", "Wind from starboard: aim the bow half a metre to starboard of the gap's centre.", "Wiatr z prawej: celuj dziobem pół metra na prawo od środka przejścia.", "Viento por estribor: apunta la proa medio metro a estribor del centro del hueco.", "Vent de tribord : vise avec l'étrave un demi-mètre à tribord du milieu du passage.", "Wind von Steuerbord: halte den Bug einen halben Meter steuerbords der Mitte.", "Vento da dritta: punta la prua mezzo metro a dritta del centro del varco."),
    wind: { speed: 8, direction: 90, gust: 0.15 },
    start: { x: -12, y: -45, heading: 20, speedKn: 0 },
    bounds: [-30, -56, 30, 4],
    obstacles: [
      quayNorth,
      pile("pile-left", -3.25, -13.5), pile("pile-right", 3.25, -13.5), pile("pile-left-2", -9.75, -13.5), pile("pile-right-2", 9.75, -13.5),
      moored("left", -6.5, -7, 0, 12, 3.6), moored("right", 6.5, -7, 0, 12, 3.6),
    ],
    target: { type: "berth", x: 0, y: BERTH_Y, heading: 0, posTol: 1.2, headingTol: 10, maxSpeedKn: 0.3, hold: 3 },
    plan: [[-12, -45], [-2, -30], [0, -16], [0, BERTH_Y]],
    criteria: { timeLimit: 150, parTime: 70, gentleKn: 0.5, allowed: ["quay", "pile-left", "pile-right"] },
  },
  {
    id: "buoy-engine",
    track: "engine",
    difficulty: 1,
    title: t7("Подход к бочке на моторе", "Picking up a mooring buoy under engine", "Podejście do boi na silniku", "Coger una boya a motor", "Prendre une bouée au moteur", "Eine Muringtonne unter Motor aufnehmen", "Prendere un gavitello a motore"),
    goal: t7("Подойди к бочке против ветра и останови нос рядом с ней, чтобы экипаж взял швартов.", "Approach the buoy into the wind and stop the bow next to it so the crew can pick it up.", "Podejdź do boi pod wiatr i zatrzymaj dziób przy niej, żeby załoga podjęła cumę.", "Acércate a la boya contra el viento y detén la proa junto a ella para que la tripulación la coja.", "Approche la bouée face au vent et arrête l'étrave tout près pour que l'équipage la prenne.", "Lauf die Tonne gegen den Wind an und stoppe den Bug daneben, damit die Crew sie aufnimmt.", "Avvicinati al gavitello controvento e ferma la prua accanto perché l'equipaggio lo prenda."),
    explain: t7(
      "Против ветра лодка тормозит сама и легче останавливается точно. Подходи с подветра, курсом на ветер, держи бочку чуть сбоку от носа: перед самым носом ее не видно с руля.",
      "Into the wind the boat slows by herself and stops more precisely. Approach from downwind, heading into the wind, and keep the buoy slightly to one side of the bow: right under the bow the helmsman cannot see it.",
      "Pod wiatr jacht sam hamuje i łatwiej zatrzymać go dokładnie. Podchodź od strony zawietrznej, kursem na wiatr, trzymaj boję lekko z boku dziobu: tuż przed dziobem sternik jej nie widzi.",
      "Contra el viento el barco frena solo y se detiene con más precisión. Llega desde sotavento, proa al viento, y deja la boya un poco a un lado de la proa: justo delante el timonel no la ve.",
      "Face au vent le bateau ralentit tout seul et s'arrête plus précisément. Arrive par sous le vent, cap au vent, et garde la bouée un peu sur le côté de l'étrave : juste devant, le barreur ne la voit plus.",
      "Gegen den Wind bremst das Boot von selbst und stoppt genauer. Komm von Lee, mit Kurs in den Wind, und halte die Tonne etwas seitlich vom Bug: direkt davor sieht der Rudergänger sie nicht.",
      "Controvento la barca rallenta da sola e si ferma con più precisione. Arriva da sottovento, prua al vento, e tieni il gavitello un po' di lato rispetto alla prua: proprio davanti il timoniere non lo vede."),
    hint: t7("Поставь нейтраль за две длины лодки: остаток хода погасит ветер.", "Go to neutral two boat lengths out: the wind takes off the rest of the way.", "Daj luz dwie długości jachtu wcześniej: resztę prędkości wytraci wiatr.", "Pon punto muerto a dos esloras: el viento quitará el resto de la arrancada.", "Passe au point mort à deux longueurs : le vent casse le reste de l'erre.", "Kupple zwei Bootslängen vorher aus: den Rest der Fahrt nimmt der Wind.", "Metti in folle a due lunghezze: il resto dell'abbrivio lo toglie il vento."),
    wind: { speed: 12, direction: 0, gust: 0.1 },
    start: { x: -14, y: -60, heading: 20, speedKn: 0 },
    bounds: [-40, -68, 40, 14],
    obstacles: [buoy("buoy", 0, 0), moored("moored-1", -24, -4, 0), buoy("buoy-1", -24, 4.5), moored("moored-2", 22, 6, 0), buoy("buoy-2", 22, 14.5)],
    target: { type: "pickup", targetId: "buoy", reach: 1.5, at: "bow", maxSpeedKn: 0.6, neutral: false },
    plan: [[-14, -60], [-2, -35], [0, -12], [0, -2]],
    criteria: { timeLimit: 150, parTime: 70, gentleKn: 0.6, allowed: ["buoy"] },
  },
  {
    id: "turn-fairway",
    track: "engine",
    difficulty: 3,
    title: t7("Разворот в узком проходе марины", "Turning in a narrow marina fairway", "Obrót w wąskim przejściu mariny", "Girar en un canal estrecho de la marina", "Demi-tour dans une allée étroite du port", "Wenden in einer engen Hafengasse", "Inversione in un corridoio stretto del porto"),
    goal: t7("Развернись на 180 градусов в проходе шириной меньше двух длин лодки, никого не задев.", "Turn through 180 degrees in a fairway less than two boat lengths wide without touching anyone.", "Obróć się o 180 stopni w przejściu węższym niż dwie długości jachtu, nikogo nie dotykając.", "Gira 180 grados en un canal de menos de dos esloras de ancho sin tocar a nadie.", "Fais demi-tour dans une allée de moins de deux longueurs de large sans toucher personne.", "Dreh um 180 Grad in einer Gasse, die schmaler als zwei Bootslängen ist, ohne jemanden zu berühren.", "Gira di 180 gradi in un corridoio largo meno di due lunghezze senza toccare nessuno."),
    explain: t7(
      "На месте разворачиваются толчками: малый передний с полной перекладкой руля толкает корму струей винта, короткий задний гасит ход и, с правым винтом, сам уводит корму влево. Поэтому вправо лодка разворачивается легче.",
      "You turn on the spot in bursts: slow ahead with full rudder pushes the stern round with prop wash, a short burst astern takes the way off and, with a right-handed prop, walks the stern to port by itself. That is why she turns to starboard more easily.",
      "W miejscu obraca się impulsami: mała naprzód z pełnym wychyleniem steru odpycha rufę strumieniem śruby, krótki wsteczny wytraca prędkość i przy prawoskrętnej śrubie sam znosi rufę w lewo. Dlatego w prawo jacht obraca się łatwiej.",
      "En el sitio se gira a golpes: avante poco con todo el timón empuja la popa con la corriente de la hélice, un toque atrás quita la arrancada y, con hélice dextrógira, lleva sola la popa a babor. Por eso gira mejor a estribor.",
      "Sur place on tourne par à-coups : marche avant lente barre toute empoigne l'arrière par le flux de l'hélice, un coup de marche arrière casse l'erre et, avec une hélice à droite, envoie seul l'arrière à bâbord. C'est pourquoi le bateau tourne mieux sur tribord.",
      "Auf der Stelle dreht man in Schüben: langsam voraus mit Hartruder schiebt das Heck mit dem Schraubenstrom herum, kurz rückwärts nimmt die Fahrt raus und versetzt mit rechtsgängigem Propeller das Heck selbst nach Backbord. Deshalb dreht das Boot nach Steuerbord leichter.",
      "Sul posto si gira a colpi: avanti adagio con tutto il timone spinge la poppa con il flusso dell'elica, un colpo indietro toglie l'abbrivio e, con elica destrorsa, porta da solo la poppa a sinistra. Per questo la barca gira meglio a dritta."),
    hint: t7("Руль держи вправо все время, меняй только передний и задний.", "Keep the rudder hard to starboard throughout and only alternate ahead and astern.", "Trzymaj ster cały czas w prawo i zmieniaj tylko naprzód i wstecz.", "Mantén el timón a estribor todo el tiempo y alterna solo avante y atrás.", "Garde la barre à tribord tout du long et alterne seulement avant et arrière.", "Halte das Ruder die ganze Zeit hart Steuerbord und wechsle nur voraus und rückwärts.", "Tieni il timone sempre a dritta e alterna solo avanti e indietro."),
    wind: { speed: 10, direction: 0, gust: 0.15 },
    start: { x: -26, y: 0, heading: 90, speedKn: 1.5 },
    bounds: [-38, -26, 38, 26],
    obstacles: [...fairwayRows, quay("end", 42, 0, 8, 60)],
    target: { type: "turn", heading: 270, headingTol: 20, zone: rect(0, 0, 76, 22), maxSpeedKn: 1.5, hold: 2 },
    plan: [[-26, 0], [-4, 0], [2, 2], [-6, 0]],
    criteria: { timeLimit: 150, parTime: 80, gentleKn: 0.5, allowed: [] },
  },
  {
    id: "mob-engine",
    track: "engine",
    difficulty: 2,
    title: t7("Человек за бортом на моторе", "Man overboard under engine", "Człowiek za burtą na silniku", "Hombre al agua a motor", "Homme à la mer au moteur", "Mensch über Bord unter Motor", "Uomo a mare a motore"),
    goal: t7("Развернись к человеку в воде и подойди к нему бортом на малом ходу, с винтом на нейтрали.", "Turn back to the person in the water and come alongside them slowly with the propeller in neutral.", "Zawróć do człowieka w wodzie i podejdź do niego burtą powoli, ze śrubą na luzie.", "Vuelve hacia la persona en el agua y acércate de costado despacio con la hélice en punto muerto.", "Reviens vers la personne à l'eau et approche-la par le flanc doucement, hélice au point mort.", "Kehr zur Person im Wasser zurück und komm langsam längsseits, mit dem Propeller ausgekuppelt.", "Torna verso la persona in acqua e accostala di fianco piano con l'elica in folle."),
    explain: t7(
      "Главное в этом манёвре: не потерять человека из виду и не подойти к нему с работающим винтом. Разворачивайся сразу, подходи против ветра или под углом к нему, последние метры иди по инерции на нейтрали. Это элемент практического экзамена.",
      "The essentials: never lose sight of the person and never come near them with the propeller turning. Turn back at once, approach into the wind or at an angle to it, and cover the last metres on your way in neutral. This is part of the practical exam.",
      "Najważniejsze: nie stracić człowieka z oczu i nie podejść do niego z pracującą śrubą. Zawracaj od razu, podchodź pod wiatr lub pod kątem do niego, ostatnie metry płyń siłą rozpędu na luzie. To element egzaminu praktycznego.",
      "Lo esencial: no perder de vista a la persona y no acercarse con la hélice girando. Vira enseguida, llega contra el viento o en ángulo con él y haz los últimos metros con arrancada en punto muerto. Es parte del examen práctico.",
      "L'essentiel : ne jamais perdre la personne de vue et ne jamais l'approcher hélice embrayée. Fais demi-tour tout de suite, arrive face au vent ou en biais, et fais les derniers mètres sur l'erre au point mort. C'est un élément de l'examen pratique.",
      "Das Wichtigste: die Person nie aus den Augen verlieren und ihr nie mit drehendem Propeller nahe kommen. Sofort umkehren, gegen den Wind oder schräg dazu anlaufen, die letzten Meter ausgekuppelt mit Restfahrt. Das ist Teil der praktischen Prüfung.",
      "L'essenziale: non perdere mai di vista la persona e non avvicinarla con l'elica che gira. Torna indietro subito, arriva controvento o di traverso al vento e fai gli ultimi metri per abbrivio in folle. È una parte dell'esame pratico."),
    hint: t7("Поставь нейтраль, когда до человека останется полторы длины лодки.", "Shift to neutral when the person is a boat length and a half away.", "Daj luz, gdy do człowieka zostanie półtorej długości jachtu.", "Pon punto muerto cuando la persona esté a eslora y media.", "Passe au point mort quand la personne est à une longueur et demie.", "Kupple aus, wenn die Person noch anderthalb Bootslängen entfernt ist.", "Metti in folle quando la persona è a una lunghezza e mezza."),
    wind: { speed: 12, direction: 45, gust: 0.15 },
    start: { x: 0, y: 0, heading: 0, speedKn: 4 },
    bounds: [-45, -40, 45, 50],
    obstacles: [{ id: "person", kind: "person", shape: { type: "circle", x: 0, y: -14, r: 0.4 } }],
    target: { type: "pickup", targetId: "person", reach: 1.5, at: "hull", maxSpeedKn: 1, neutral: true },
    plan: [[0, 0], [0, 25], [-18, 18], [-10, -4], [-1.5, -12]],
    criteria: { timeLimit: 150, parTime: 75, gentleKn: 0.4, allowed: ["person"] },
  },
  {
    id: "gates-sail",
    track: "sail",
    difficulty: 1,
    title: t7("Слалом в воротах под парусом", "Gate slalom under sail", "Slalom przez bramki pod żaglami", "Eslalon entre puertas a vela", "Slalom entre des portes à la voile", "Torslalom unter Segeln", "Slalom tra le porte a vela"),
    goal: t7("Пройди под парусом через четверо ворот по порядку, не задев буи.", "Sail through four gates in order without touching the buoys.", "Przepłyń pod żaglami przez cztery bramki po kolei, nie dotykając boi.", "Pasa a vela por cuatro puertas en orden sin tocar las boyas.", "Passe à la voile les quatre portes dans l'ordre sans toucher les bouées.", "Segle der Reihe nach durch vier Tore, ohne die Tonnen zu berühren.", "Passa a vela le quattro porte in ordine senza toccare le boe."),
    explain: t7(
      "Ворота стоят то выше, то ниже по ветру, поэтому курс меняется от бейдевинда до бакштага. Паруса тримуются сами, твоя задача руль: начинай поворот заранее, лодка под парусом не разворачивается на месте.",
      "The gates alternate up and down the wind, so your course changes from a close reach to a broad reach. The sails trim themselves; your job is the helm: start each turn early, a boat under sail does not pivot on the spot.",
      "Bramki stoją raz wyżej, raz niżej względem wiatru, więc kurs zmienia się od półwiatru ostrego do baksztagu. Żagle trymują się same, twoje zadanie to ster: zaczynaj zwrot wcześniej, jacht pod żaglami nie obraca się w miejscu.",
      "Las puertas alternan a barlovento y sotavento, así que el rumbo va de un descuartelar a una aleta. Las velas se ajustan solas; tu tarea es el timón: empieza cada giro pronto, un velero no gira sobre sí mismo.",
      "Les portes alternent au vent et sous le vent, donc ton cap passe du bon plein au grand largue. Les voiles se règlent seules ; ton travail, c'est la barre : commence chaque virage tôt, un voilier ne pivote pas sur place.",
      "Die Tore liegen abwechselnd luv- und leewärts, darum wechselt dein Kurs zwischen Amwind und Raumschots. Die Segel trimmen sich selbst, deine Aufgabe ist das Ruder: beginne jede Kurve früh, ein Segelboot dreht nicht auf der Stelle.",
      "Le porte si alternano sopra e sotto vento, quindi la rotta passa dal lasco stretto al lasco largo. Le vele si regolano da sole; il tuo compito è il timone: inizia ogni virata presto, una barca a vela non gira su se stessa."),
    hint: t7("Смотри на следующие ворота, а не на ближний буй.", "Look at the next gate, not at the nearest buoy.", "Patrz na następną bramkę, a nie na najbliższą boję.", "Mira a la siguiente puerta, no a la boya más cercana.", "Regarde la porte suivante, pas la bouée la plus proche.", "Schau auf das nächste Tor, nicht auf die nächste Tonne.", "Guarda la porta successiva, non la boa più vicina."),
    wind: { speed: 12, direction: 0, gust: 0 },
    start: { x: 0, y: 0, heading: 90, speedKn: 5 },
    bounds: [-10, -40, 270, 70],
    obstacles: [
      buoy("g1a", 60, 12, 0.6), buoy("g1b", 60, -12, 0.6), buoy("g2a", 120, 42, 0.6), buoy("g2b", 120, 18, 0.6),
      buoy("g3a", 180, 12, 0.6), buoy("g3b", 180, -12, 0.6), buoy("g4a", 240, 42, 0.6), buoy("g4b", 240, 18, 0.6),
    ],
    target: { type: "gates", gates: [["g1a", "g1b"], ["g2a", "g2b"], ["g3a", "g3b"], ["g4a", "g4b"]] },
    plan: [[0, 0], [60, 0], [120, 30], [180, 0], [240, 30], [260, 30]],
    criteria: { timeLimit: 240, parTime: 120, gentleKn: 0, allowed: [] },
  },
  {
    id: "station-sail",
    track: "sail",
    difficulty: 2,
    title: t7("Удержаться у знака под парусом", "Hold station at a mark under sail", "Utrzymanie się przy znaku pod żaglami", "Mantenerse junto a una baliza a vela", "Rester près d'une bouée à la voile", "Unter Segeln an einer Tonne bleiben", "Restare vicino a una boa a vela"),
    goal: t7("Продержись 40 секунд подряд в круге 25 метров у знака, как перед стартом гонки.", "Stay inside the 25 metre circle around the mark for 40 seconds in a row, as before a race start.", "Utrzymaj się 40 sekund bez przerwy w kole 25 metrów wokół znaku, jak przed startem regat.", "Mantente 40 segundos seguidos dentro del círculo de 25 metros de la baliza, como antes de una salida.", "Reste 40 secondes d'affilée dans le cercle de 25 mètres autour de la bouée, comme avant un départ.", "Bleib 40 Sekunden am Stück im 25-Meter-Kreis um die Tonne, wie vor einem Start.", "Resta 40 secondi di fila nel cerchio di 25 metri attorno alla boa, come prima di una partenza."),
    explain: t7(
      "Лодку под парусом нельзя поставить на месте. Ход сбрасывают, приводясь к ветру или потравив шкоты, а набирают, уваливаясь и выбирая шкоты. Ходи короткими галсами вокруг знака и не уходи под ветер: обратно придется лавировать.",
      "A boat under sail cannot be parked. You lose speed by heading up or easing the sheets and gain it by bearing away and trimming in. Sail short legs around the mark and do not drop to leeward: getting back means beating.",
      "Jachtu pod żaglami nie da się zatrzymać w miejscu. Prędkość traci się, ostrząc lub luzując szoty, a zyskuje, odpadając i wybierając szoty. Pływaj krótkimi halsami wokół znaku i nie schodź na zawietrzną: powrót oznacza halsowanie.",
      "Un velero no se puede aparcar. Se pierde velocidad orzando o largando escotas y se gana arribando y cazando. Navega bordos cortos alrededor de la baliza y no caigas a sotavento: volver obliga a ceñir.",
      "Un voilier ne se gare pas. On perd de la vitesse en lofant ou en choquant les écoutes et on en reprend en abattant et en bordant. Tire de petits bords autour de la bouée et ne descends pas sous le vent : y revenir oblige à louvoyer.",
      "Ein Segelboot lässt sich nicht parken. Fahrt verliert man durch Anluven oder Fieren der Schoten, gewinnt sie durch Abfallen und Dichtholen. Segle kurze Schläge um die Tonne und fall nicht nach Lee ab: zurück musst du kreuzen.",
      "Una barca a vela non si parcheggia. Si perde velocità orzando o lascando le scotte e la si riprende poggiando e cazzando. Fai bordi corti attorno alla boa e non scendere sottovento: tornare vuol dire bolinare."),
    hint: t7("Потрави шкоты кнопкой, когда подходишь к краю круга с наветра.", "Ease the sheets with the button as you near the windward edge of the circle.", "Luzuj szoty przyciskiem, gdy zbliżasz się do nawietrznej krawędzi koła.", "Larga escotas con el botón al acercarte al borde de barlovento del círculo.", "Choque les écoutes avec le bouton en approchant du bord au vent du cercle.", "Fier die Schoten per Knopf, wenn du dich dem Luvrand des Kreises näherst.", "Lasca le scotte con il pulsante quando ti avvicini al bordo sopravvento del cerchio."),
    wind: { speed: 10, direction: 0, gust: 0 },
    start: { x: -50, y: -50, heading: 45, speedKn: 4 },
    bounds: [-70, -70, 70, 50],
    obstacles: [buoy("mark", 0, 0, 0.8)],
    target: { type: "station", markId: "mark", radius: 25, seconds: 40 },
    plan: [[-50, -50], [-15, -15], [15, 5], [-15, 5]],
    criteria: { timeLimit: 240, parTime: 110, gentleKn: 0, allowed: [] },
  },
];

/** Track order: each exercise unlocks the next one in its track. */
const ORDER = ["alongside-onshore", "buoy-engine", "alongside-offshore", "leave-onshore", "mob-engine", "stern-to", "piles-bow-to", "turn-fairway", "gates-sail", "station-sail"];
export const MANOEUVRES: ManoeuvreExercise[] = ORDER.map(id => ALL.find(e => e.id === id)!);

export const MANOEUVRE_TRACKS: { id: ManoeuvreExercise["track"]; title: Text7 }[] = [
  { id: "engine", title: t7("Гавань на моторе", "Harbour under engine", "Port na silniku", "Puerto a motor", "Au port au moteur", "Hafen unter Motor", "In porto a motore") },
  { id: "sail", title: t7("Под парусом", "Under sail", "Pod żaglami", "A vela", "À la voile", "Unter Segeln", "A vela") },
];

export function manoeuvreById(id: string): ManoeuvreExercise | undefined {
  return MANOEUVRES.find(e => e.id === id);
}
