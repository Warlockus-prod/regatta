import { words, type Label } from "../../../src/lib/product/catalog";
import type { SceneId } from "./graphics/drawings";
import { sailHandlingPhoto, type AnnotatedPhoto } from "./graphics/photos";

/**
 * Lessons on the v3 lesson template (ADR-0015): goal and situation, the image
 * that shows the thing, the explanation, the common mistake and the limit, then
 * the existing check and practice. Two pilots for now; the other lessons keep
 * their layout until the template is accepted. Lesson IDs, questions and the
 * rules for passing a lesson do not change: looking at an image or every
 * marker never counts as passing.
 */
export interface LessonPilot {
  goal: Label;
  situation: Label;
  /** Recognise the thing first (terminology lessons). */
  photo?: AnnotatedPhoto;
  scene: SceneId;
  /**
   * `lead`: the drawing is the main image (wind, courses, forces).
   * `howItWorks`: it follows the photo as a separate "How it works" layer.
   */
  sceneRole: "lead" | "howItWorks";
  /** Explanation paragraphs, when the lesson has no text of its own. */
  explanation?: Label[];
  mistake: Label;
}

export const bootcampPilots: Partial<Record<string, LessonPilot>> = {
  "wind-direction": {
    goal: words(
      "Называть ветер по тому, откуда он приходит, и сразу видеть, с какой стороны лодки он дует.",
      "Name the wind by where it comes from, and see at a glance which side of the boat it blows onto.",
      "Nazywać wiatr od strony, z której wieje, i od razu widzieć, z której strony jachtu przychodzi.",
      "Nombrar el viento por el lugar de donde viene y ver enseguida por qué lado del barco entra.",
      "Nommer le vent d'après la direction d'où il vient, et voir tout de suite de quel côté du bateau il arrive.",
      "Den Wind danach benennen, woher er kommt, und sofort sehen, von welcher Seite er aufs Boot trifft.",
      "Chiamare il vento con la direzione da cui arriva e capire subito da quale lato della barca soffia.",
    ),
    situation: words(
      "Шкипер говорит: «Ветер северный, дует нам в правый борт». Флаг на корме вытянут на юг. Если назвать ветер по тому, куда показывает флаг, получится «южный»: ровно наоборот.",
      "The skipper says: \"Northerly wind, on our starboard side.\" The flag at the stern streams to the south. Name the wind by where the flag points and you get \"southerly\": exactly backwards.",
      "Skiper mówi: \"Wiatr północny, wieje nam w prawą burtę\". Bandera na rufie wskazuje na południe. Jeśli nazwiesz wiatr według tego, gdzie wskazuje bandera, wyjdzie \"południowy\": dokładnie na odwrót.",
      "El patrón dice: \"Viento del norte, nos entra por estribor\". La bandera de popa apunta al sur. Si nombras el viento por donde apunta la bandera, dirás \"del sur\": justo al revés.",
      "Le skipper annonce : \"Vent de nord, il nous arrive par tribord\". Le pavillon à l'arrière flotte vers le sud. Si tu nommes le vent d'après la direction du pavillon, tu diras \"vent de sud\" : exactement l'inverse.",
      "Der Skipper sagt: \"Nordwind, er kommt von Steuerbord.\" Die Flagge am Heck weht nach Süden. Wer den Wind danach benennt, wohin die Flagge zeigt, sagt \"Südwind\": genau verkehrt.",
      "Lo skipper dice: \"Vento da nord, ci entra da dritta\". La bandiera a poppa punta verso sud. Se chiami il vento da dove punta la bandiera, dirai \"da sud\": esattamente al contrario.",
    ),
    scene: "wind-direction",
    sceneRole: "lead",
    explanation: [
      words(
        "Ветер называют по стороне, откуда он приходит: северный ветер дует с севера на юг. Стрелка на схеме показывает движение воздуха: она начинается там, откуда ветер приходит, и указывает туда, куда воздух уходит.",
        "Wind is named after where it comes from: a northerly blows from the north towards the south. The arrow in the diagram shows the moving air: it starts where the wind comes from and points to where the air goes.",
        "Wiatr nazywamy od strony, z której wieje: wiatr północny wieje z północy na południe. Strzałka na schemacie pokazuje ruch powietrza: zaczyna się tam, skąd wieje wiatr, i wskazuje, dokąd płynie powietrze.",
        "El viento se nombra por el lugar de donde viene: el viento del norte sopla del norte hacia el sur. La flecha del esquema muestra el aire en movimiento: empieza donde nace el viento y apunta hacia donde va el aire.",
        "On nomme le vent d'après la direction d'où il vient : un vent de nord souffle du nord vers le sud. La flèche du schéma montre l'air en mouvement : elle part d'où vient le vent et pointe là où va l'air.",
        "Wind wird danach benannt, woher er kommt: Nordwind weht von Norden nach Süden. Der Pfeil im Bild zeigt die strömende Luft: Er beginnt dort, woher der Wind kommt, und zeigt dorthin, wohin die Luft strömt.",
        "Il vento prende il nome dalla direzione da cui arriva: il vento da nord soffia da nord verso sud. La freccia dello schema mostra l'aria in movimento: parte da dove arriva il vento e punta dove va l'aria.",
      ),
      words(
        "На борту удобнее считать от лодки, а не по компасу: ветер с носа, с борта или с кормы. Угол между носом и направлением, откуда дует ветер, и есть TWA, истинный угол к ветру.",
        "On board it is easier to think from the boat than from the compass: wind on the bow, on the beam or from astern. The angle between the bow and the direction the wind comes from is the TWA, the true wind angle.",
        "Na pokładzie łatwiej liczyć od jachtu niż od kompasu: wiatr w dziób, z burty albo od rufy. Kąt między dziobem a kierunkiem, z którego wieje wiatr, to TWA, kąt wiatru prawdziwego.",
        "A bordo es más práctico pensar desde el barco que desde el compás: viento por proa, por el través o por popa. El ángulo entre la proa y la dirección de donde viene el viento es el TWA, el ángulo del viento real.",
        "À bord, on raisonne plus facilement depuis le bateau que depuis le compas : vent de face, de travers ou arrière. L'angle entre l'étrave et la direction d'où vient le vent, c'est le TWA, l'angle du vent réel.",
        "An Bord denkt man leichter vom Boot aus als vom Kompass: Wind von vorn, von der Seite oder von achtern. Der Winkel zwischen Bug und der Richtung, aus der der Wind kommt, ist der TWA, der wahre Windwinkel.",
        "A bordo è più semplice ragionare dalla barca che dalla bussola: vento in prua, al traverso o in poppa. L'angolo tra la prua e la direzione da cui arriva il vento è il TWA, l'angolo del vento reale.",
      ),
      words(
        "Примерно 45° по обе стороны от ветра лежит неходовая зона: парус там полощет и не тянет. Прямо против ветра лодка не идет; к цели на ветре добираются зигзагом, галсами. На круге курсов это верхний сектор.",
        "Roughly 45 degrees either side of the wind lies the no-go zone: the sail flaps there and gives no drive. A boat cannot sail straight into the wind; to reach a point upwind you zigzag, tack after tack. On the points-of-sail wheel it is the top sector.",
        "Mniej więcej 45° po obu stronach wiatru leży kąt martwy: żagiel łopocze i nie ciągnie. Jacht nie popłynie prosto pod wiatr; do celu na wietrze dociera się zygzakiem, halsując. Na kole kursów to górny sektor.",
        "Unos 45 grados a cada lado del viento está la zona muerta: la vela flamea y no empuja. Un barco no puede ir directo contra el viento; para llegar a un punto a barlovento se avanza en zigzag, bordo a bordo. En la rueda de rumbos es el sector de arriba.",
        "Environ 45 degrés de part et d'autre du vent s'étend la zone morte : la voile faseye et ne tire pas. Un bateau ne remonte pas droit dans le vent ; pour atteindre un point au vent, on avance en zigzag, bord après bord. Sur la rose des allures, c'est le secteur du haut.",
        "Etwa 45 Grad zu beiden Seiten des Windes liegt der tote Winkel: Das Segel killt dort und zieht nicht. Direkt gegen den Wind segelt kein Boot; zu einem Ziel in Luv geht es im Zickzack, Schlag für Schlag. Auf dem Kursrad ist das der obere Sektor.",
        "Circa 45 gradi da ogni lato del vento c'è l'angolo morto: la vela fileggia e non spinge. Una barca non va dritta controvento; per raggiungere un punto sopravvento si procede a zigzag, bordo dopo bordo. Sulla rosa delle andature è il settore in alto.",
      ),
      words(
        "Когда лодка меняет курс или ветер меняется, меняется только это положение: тот же ветер приходит с другой стороны лодки. Поэтому сначала находи ветер, потом нос.",
        "When the boat changes course or the wind shifts, only this relation changes: the same wind now reaches the boat from another side. So find the wind first, then the bow.",
        "Gdy jacht zmienia kurs albo wiatr się zmienia, zmienia się tylko to położenie: ten sam wiatr przychodzi z innej strony jachtu. Dlatego najpierw znajdź wiatr, potem dziób.",
        "Cuando el barco cambia de rumbo o el viento rola, solo cambia esa relación: el mismo viento llega ahora por otro lado del barco. Por eso, primero busca el viento y luego la proa.",
        "Quand le bateau change de cap ou que le vent tourne, seule cette relation change : le même vent arrive alors par un autre côté du bateau. Repère donc d'abord le vent, puis l'étrave.",
        "Ändert das Boot den Kurs oder dreht der Wind, ändert sich nur diese Lage: Derselbe Wind kommt dann von einer anderen Seite. Also erst den Wind finden, dann den Bug.",
        "Quando la barca cambia rotta o il vento ruota, cambia solo questa relazione: lo stesso vento arriva ora da un altro lato della barca. Quindi prima trova il vento, poi la prua.",
      ),
    ],
    mistake: words(
      "Смотреть, куда улетает флаг, дым или рябь, и называть эту сторону. Ветер приходит с противоположной: повернись лицом туда, откуда он дует в лицо.",
      "Looking where the flag, smoke or ripples go and naming that side. The wind comes from the opposite side: turn to face where it blows into your face.",
      "Patrzeć, dokąd leci bandera, dym albo zmarszczki na wodzie, i nazywać tę stronę. Wiatr wieje z przeciwnej: stań twarzą tam, skąd dmucha ci w twarz.",
      "Mirar hacia dónde van la bandera, el humo o las ondas y nombrar ese lado. El viento viene del lado opuesto: ponte de cara a donde te sopla en la cara.",
      "Regarder où partent le pavillon, la fumée ou les rides sur l'eau et nommer ce côté. Le vent vient du côté opposé : tourne-toi vers là où il te souffle au visage.",
      "Schauen, wohin Flagge, Rauch oder Kräuselwellen ziehen, und diese Seite nennen. Der Wind kommt von der Gegenseite: Dreh dich dorthin, von wo er dir ins Gesicht weht.",
      "Guardare dove vanno la bandiera, il fumo o le increspature e nominare quel lato. Il vento arriva dal lato opposto: girati verso dove ti soffia in faccia.",
    ),
  },
};

export const sailPilots: Partial<Record<string, LessonPilot>> = {
  "rig-basics": {
    goal: words(
      "Понять, какой канат за что отвечает: какой поднимает парус, какой задает его положение, какой держит гик внизу.",
      "Know which line does what: which one hoists the sail, which sets its position and which holds the boom down.",
      "Wiedzieć, która lina za co odpowiada: która stawia żagiel, która ustawia jego położenie, a która trzyma bom na dole.",
      "Saber qué hace cada cabo: cuál iza la vela, cuál fija su posición y cuál mantiene abajo la botavara.",
      "Savoir quel cordage fait quoi : lequel hisse la voile, lequel règle sa position et lequel tient la bôme en bas.",
      "Wissen, welche Leine was macht: welche das Segel setzt, welche seine Stellung einstellt und welche den Baum unten hält.",
      "Sapere che cosa fa ogni cima: quale issa la vela, quale ne regola la posizione e quale tiene giù il boma.",
    ),
    situation: words(
      "Шкипер просит: «Потрави грот». Если в руках окажется фал вместо шкота, парус поползет вниз по мачте, а гик останется на месте.",
      "The skipper asks: \"Ease the main.\" If you grab the halyard instead of the sheet, the sail slides down the mast and the boom stays where it was.",
      "Skiper prosi: \"Luzuj grota\". Jeśli złapiesz fał zamiast szota, żagiel zjedzie w dół masztu, a bom zostanie na miejscu.",
      "El patrón pide: \"Lasca la mayor\". Si agarras la driza en vez de la escota, la vela baja por el mástil y la botavara no se mueve.",
      "Le skipper demande : \"Choque la grand-voile\". Si tu prends la drisse au lieu de l'écoute, la voile descend le long du mât et la bôme ne bouge pas.",
      "Der Skipper sagt: \"Groß fieren.\" Greifst du das Fall statt der Schot, rutscht das Segel am Mast herunter und der Baum bleibt, wo er war.",
      "Lo skipper chiede: \"Lasca la randa\". Se prendi la drizza invece della scotta, la vela scende lungo l'albero e il boma resta dov'era.",
    ),
    photo: sailHandlingPhoto,
    scene: "rig-basics",
    sceneRole: "howItWorks",
    mistake: words(
      "Путать фал и шкот. «Потравить грот» значит потравить гротшкот: гик отходит, парус остается поднят. Потравленный фал опускает парус.",
      "Mixing up halyard and sheet. \"Ease the main\" means ease the mainsheet: the boom moves out and the sail stays up. An eased halyard lowers the sail.",
      "Mylenie fału z szotem. \"Luzuj grota\" znaczy: luzuj szot grota. Bom odchodzi, żagiel zostaje postawiony. Poluzowany fał opuszcza żagiel.",
      "Confundir driza y escota. \"Lascar la mayor\" es lascar la escota de mayor: la botavara sale y la vela sigue izada. Lascar la driza arría la vela.",
      "Confondre drisse et écoute. \"Choquer la grand-voile\", c'est choquer l'écoute : la bôme s'écarte et la voile reste hissée. Choquer la drisse affale la voile.",
      "Fall und Schot verwechseln. \"Groß fieren\" heißt, die Großschot zu fieren: Der Baum geht nach außen, das Segel bleibt stehen. Ein gefiertes Fall holt das Segel herunter.",
      "Confondere drizza e scotta. \"Lascare la randa\" vuol dire lascare la scotta: il boma si apre e la vela resta issata. Lascare la drizza ammaina la vela.",
    ),
  },
};

/** Shared words of the lesson template. */
export const lessonCopy = {
  goal: words("Цель", "Goal", "Cel", "Objetivo", "Objectif", "Ziel", "Obiettivo"),
  situation: words("Ситуация", "Situation", "Sytuacja", "Situación", "Situation", "Situation", "Situazione"),
  explanation: words("Как это устроено", "How it works", "Jak to działa", "Cómo funciona", "Comment ça marche", "So hängt es zusammen", "Come funziona"),
  howItWorks: words("Как это работает", "How it works", "Jak to działa", "Cómo funciona", "Comment ça marche", "So funktioniert es", "Come funziona"),
  mistake: words("Частая ошибка", "Common mistake", "Częsty błąd", "Error frecuente", "Erreur fréquente", "Häufiger Fehler", "Errore frequente"),
  practice: words("Практика", "Practice", "Ćwiczenie", "Práctica", "Pratique", "Übung", "Pratica"),
  legend: words("Легенда", "Key", "Legenda", "Leyenda", "Légende", "Legende", "Legenda"),
  limit: words("Ограничение", "Limits", "Ograniczenia", "Límites", "Limites", "Grenzen", "Limiti"),
  photoHint: words(
    "Нажми на номер на картинке или на название в списке.",
    "Tap a number on the picture or a name in the list.",
    "Dotknij numeru na obrazku albo nazwy na liście.",
    "Toca un número en la imagen o un nombre de la lista.",
    "Touche un numéro sur l'image ou un nom dans la liste.",
    "Tippe auf eine Zahl im Bild oder einen Namen in der Liste.",
    "Tocca un numero sull'immagine o un nome nell'elenco.",
  ),
  parts: words("Детали на картинке", "Parts in the picture", "Elementy na obrazku", "Piezas de la imagen", "Éléments de l'image", "Teile im Bild", "Parti nell'immagine"),
  closeup: words("Крупный план", "Closeup", "Zbliżenie", "Primer plano", "Gros plan", "Nahaufnahme", "Primo piano"),
  hideMarks: words("Скрыть отметки", "Hide markers", "Ukryj znaczniki", "Ocultar marcas", "Masquer les repères", "Markierungen ausblenden", "Nascondi i segni"),
  showMarks: words("Показать отметки", "Show markers", "Pokaż znaczniki", "Mostrar marcas", "Afficher les repères", "Markierungen einblenden", "Mostra i segni"),
  showDiagram: words("Показать схему", "Show the diagram", "Pokaż schemat", "Mostrar el esquema", "Afficher le schéma", "Skizze zeigen", "Mostra lo schema"),
  hideDiagram: words("Скрыть схему", "Hide the diagram", "Ukryj schemat", "Ocultar el esquema", "Masquer le schéma", "Skizze ausblenden", "Nascondi lo schema"),
};
