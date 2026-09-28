import { words } from "../../lib/product/catalog";

// Shared by native and web. Steps are navigation, never evidence of completion.
export const lessonSteps = ["understand", "check", "try"] as const;
export type LessonStep = typeof lessonSteps[number];
export const learningCopy = {
  understand: words("Разобраться", "Understand", "Zrozum", "Comprender", "Comprendre", "Verstehen", "Comprendi"),
  check: words("Проверить себя", "Check", "Sprawdź", "Comprobar", "Vérifier", "Prüfen", "Verifica"),
  try: words("На лодке", "On the boat", "Na jachcie", "En el barco", "Sur le bateau", "Am Boot", "Sulla barca"),
  steps: words("Шаги урока", "Lesson steps", "Etapy lekcji", "Pasos de la lección", "Étapes de la leçon", "Lektionsschritte", "Passi della lezione"),
  terms: words("Термины этого урока", "Terms in this lesson", "Pojęcia w tej lekcji", "Términos de esta lección", "Termes de cette leçon", "Begriffe dieser Lektion", "Termini della lezione"),
  toCheck: words("Перейти к проверке", "Continue to the check", "Przejdź do sprawdzenia", "Ir a la comprobación", "Passer à la vérification", "Weiter zur Prüfung", "Vai alla verifica"),
  toTry: words("Перейти к наблюдению", "Continue to observation", "Przejdź do obserwacji", "Ir a la observación", "Passer à l'observation", "Weiter zur Beobachtung", "Vai all'osservazione"),
  toTheory: words("Вернуться к объяснению", "Back to the explanation", "Wróć do wyjaśnienia", "Volver a la explicación", "Revenir à l'explication", "Zurück zur Erklärung", "Torna alla spiegazione"),
  outline: words("Программа", "Course outline", "Program", "Programa", "Programme", "Kursübersicht", "Programma"),
  review: words("Повторить уроки", "Review the lessons", "Powtórz lekcje", "Repasar las lecciones", "Revoir les leçons", "Lektionen wiederholen", "Ripassa le lezioni"),
  theoryOnly: words("Проверка подтверждает понимание теории, а не навык работы на реальной яхте.", "The check records theory understanding, not handling skill on a real yacht.", "Sprawdzenie dotyczy teorii, nie umiejętności na prawdziwym jachcie.", "La comprobación registra teoría, no destreza en un barco real.", "La vérification porte sur la théorie, pas sur la maîtrise à bord d'un vrai bateau.", "Die Prüfung erfasst Theorie, nicht praktische Fähigkeiten auf einer echten Yacht.", "La verifica riguarda la teoria, non l'abilità su una barca reale."),
  observeOnly: words("Наблюдение, без оценки навыка", "Observation, not a skill assessment", "Obserwacja, bez oceny umiejętności", "Observación, sin evaluación práctica", "Observation, sans évaluation pratique", "Beobachtung, keine praktische Prüfung", "Osservazione, non valutazione pratica"),
  sessionNote: words("Откроется отдельная сессия тренажёра. Возвращайся к уроку через кнопку назад; результат теории сохранится после нажатия «Сохранить».", "A separate simulator session will open. Use Back to return to the lesson; the theory result is retained once saved.", "Otworzy się osobna sesja symulatora. Wróć przyciskiem Wstecz; zapisany wynik teorii pozostanie.", "Se abrirá una sesión aparte. Usa Atrás para volver; el resultado teórico se conserva después de guardarlo.", "Une session séparée s'ouvrira. Reviens avec Retour ; le résultat théorique reste après enregistrement.", "Eine separate Sitzung öffnet sich. Mit Zurück kommst du zur Lektion; das gespeicherte Theorieergebnis bleibt erhalten.", "Si aprirà una sessione separata. Torna con Indietro; il risultato teorico resta dopo il salvataggio."),
};

// Modules follow the stored lesson order (course.ts appends, never inserts).
export const courseModules = [
  { id: "orientation", title: words("Устройство и ветер", "Rig and wind", "Takielunek i wiatr", "Aparejo y viento", "Gréement et vent", "Rigg und Wind", "Attrezzatura e vento"), lessons: ["rig-basics", "apparent-wind", "sheet-control"] },
  { id: "shape", title: words("Управление формой грота", "Mainsail shape", "Kształt grota", "Forma de la mayor", "Forme de la grand-voile", "Großsegelform", "Forma della randa"), lessons: ["mainsheet", "vang", "outhaul"] },
  { id: "fine-trim", title: words("Настройка и рифление", "Fine trim and reefing", "Dostrajanie i refowanie", "Ajuste fino y rizos", "Réglage fin et ris", "Feintrimm und Reffen", "Regolazione fine e terzaroli"), lessons: ["telltales", "halyard", "jib-lead", "slot", "trim-doctor", "reef"] },
  { id: "equipment", title: words("Оборудование и нагрузка", "Equipment and load", "Sprzęt i obciążenie", "Equipo y carga", "Matériel et charge", "Ausrüstung und Last", "Attrezzatura e carico"), lessons: ["winch-clutch"] },
];

export const lessonTerms = {
  clutch: {
    name: words("Стопор · clutch", "Rope clutch", "Stoper linowy", "Stopper", "Bloqueur", "Fallstopper", "Stopper"),
    meaning: words("Удерживает нагруженную линию без лебёдки. Здесь двухступенчатый рычаг типа XTS, не кулачковый зажим. Процедура зависит от модели.", "Holds a loaded line without the winch. Here it has an XTS-style two-stage lever, not a cam cleat. The procedure depends on the model.", "Trzyma obciążoną linę bez kabestanu. Tu jest dwuetapowa dźwignia typu XTS, nie knaga szczękowa. Procedura zależy od modelu.", "Sujeta el cabo cargado sin winch. Aquí tiene palanca de dos etapas tipo XTS, no mordaza de levas. La maniobra depende del modelo.", "Retient le cordage chargé sans winch. Ici, poignée à deux temps de type XTS, pas un taquet coinceur. La procédure dépend du modèle.", "Hält die belastete Leine ohne Winsch. Hier ein zweistufiger XTS-artiger Hebel, keine Curryklemme. Ablauf modellabhängig.", "Trattiene la cima carica senza winch. Qui leva a due stadi tipo XTS, non strozzascotte a camme. Procedura dipendente dal modello."),
  },
  winch: {
    name: words("Лебёдка · winch", "Winch", "Kabestan", "Winch", "Winch", "Winsch", "Winch"),
    meaning: words("Шлаги создают трение на барабане, передача помогает выбирать линию. Самозахват удерживает ходовой конец, но не заменяет палубный стопор.", "Wraps create drum friction; gears help haul the line. The self-tailer holds the tail but does not replace a deck clutch.", "Zwoje tworzą tarcie na bębnie, przekładnia pomaga wybierać. Szczęki samoknagujące trzymają koniec, ale nie zastępują stopera.", "Las vueltas crean fricción; los engranajes ayudan a cobrar. El autocazante sujeta el chicote, pero no sustituye al stopper.", "Les tours créent du frottement, les engrenages aident à reprendre. Le self-tailing retient le brin mais ne remplace pas le bloqueur.", "Törns erzeugen Reibung, das Getriebe hilft beim Holen. Die Selbstholklemme hält das Ende, ersetzt aber keinen Decksstopper.", "I giri creano attrito, gli ingranaggi aiutano a recuperare. Il self-tailer trattiene il corrente, non sostituisce lo stopper."),
  },
  tail: {
    name: words("Ходовой конец · tail", "Tail / working end", "Wolny koniec · tail", "Chicote · tail", "Brin libre · tail", "Loses Ende · tail", "Corrente · tail"),
    meaning: words("Конец после барабана, который контролирует человек или самозахват. «Свободный» не означает, что его безопасно отпустить под нагрузкой.", "The end after the drum, controlled by a person or self-tailer. A free end is not safe to let go under load.", "Koniec za bębnem kontrolowany ręką lub szczękami. Wolny koniec nie oznacza, że można go puścić pod obciążeniem.", "Extremo tras el tambor, controlado por la persona o autocazante. Libre no significa seguro para soltar con carga.", "Brin après le tambour, contrôlé par une personne ou le self-tailing. Libre ne veut pas dire qu'on peut le lâcher sous charge.", "Ende hinter der Trommel, von Hand oder Klemme kontrolliert. Lose bedeutet nicht, dass man es unter Last loslassen darf.", "Estremità dopo il tamburo, controllata a mano o dal self-tailer. Libera non significa sicura da lasciare sotto carico."),
  },
  halyard: {
    name: words("Фал · halyard", "Halyard", "Fał · halyard", "Driza · halyard", "Drisse · halyard", "Fall · halyard", "Drizza · halyard"),
    meaning: words("Поднимает парус за верхний угол. Это не шкот: потравить шкот не значит опустить парус.", "Hoists the sail by its head. Not a sheet: easing a sheet does not lower the sail.", "Stawia żagiel za głowicę. To nie szot: luzowanie szota nie opuszcza żagla.", "Iza la vela por su puño de driza. Lascar una escota no arría la vela.", "Hisse la voile par sa tête. Choquer une écoute n'affale pas la voile.", "Setzt das Segel am Kopf. Fieren einer Schot birgt das Segel nicht.", "Issa la vela dalla penna. Lascare una scotta non ammaina la vela."),
  },
  sheet: {
    name: words("Шкот · sheet", "Sheet", "Szot · sheet", "Escota · sheet", "Écoute · sheet", "Schot · sheet", "Scotta · sheet"),
    meaning: words("Управляет поднятым парусом. Выбрать: укоротить рабочую длину. Потравить: контролируемо увеличить.", "Controls a raised sail. Trim in: shorten the working length. Ease: lengthen under control.", "Reguluje postawiony żagiel. Wybrać: skrócić długość roboczą. Luzować: wydłużać pod kontrolą.", "Regula una vela izada. Cazar: acortar la longitud útil. Lascar: alargar bajo control.", "Règle une voile hissée. Border : raccourcir la longueur utile. Choquer : allonger sous contrôle.", "Regelt ein gesetztes Segel. Dichtholen: Arbeitslänge verkürzen. Fieren: kontrolliert verlängern.", "Regola una vela issata. Cazzare: accorciare la lunghezza utile. Lascare: allungare sotto controllo."),
  },
  edges: {
    name: words("Шкаторины · luff, leech, foot", "Luff, leech, foot", "Lik przedni, tylny, dolny", "Grátil, baluma, pujamen", "Guindant, chute, bordure", "Vorliek, Achterliek, Unterliek", "Inferitura, balumina, base"),
    meaning: words("Три края паруса: передний у мачты или штага, задний свободный и нижний. Шкотовый угол соединяет задний и нижний края.", "The front, aft and bottom edges of a sail. The clew joins the aft and bottom edges.", "Przednia, tylna i dolna krawędź żagla. Róg szotowy łączy krawędź tylną i dolną.", "Los bordes delantero, trasero e inferior. El puño de escota une el trasero y el inferior.", "Les bords avant, arrière et inférieur. Le point d'écoute relie l'arrière et le bas.", "Die vordere, hintere und untere Segelkante. Das Schothorn verbindet Achter- und Unterliek.", "I bordi anteriore, posteriore e inferiore. La bugna unisce bordo posteriore e base."),
  },
  apparent: {
    name: words("AWA / AWS · вымпельный ветер", "AWA / AWS · apparent wind", "AWA / AWS · wiatr pozorny", "AWA / AWS · viento aparente", "AWA / AWS · vent apparent", "AWA / AWS · scheinbarer Wind", "AWA / AWS · vento apparente"),
    meaning: words("Apparent Wind Angle / Speed: угол к носу и скорость потока относительно движущейся яхты. Именно его чувствует парус.", "Apparent Wind Angle / Speed: angle from the bow and airflow speed relative to the moving boat. This is the wind the sail feels.", "Apparent Wind Angle / Speed: kąt do dziobu i prędkość względem płynącego jachtu. Ten wiatr czuje żagiel.", "Apparent Wind Angle / Speed: ángulo desde proa y velocidad respecto al barco en movimiento. Es el viento que recibe la vela.", "Apparent Wind Angle / Speed : angle depuis l'étrave et vitesse par rapport au bateau en mouvement. C'est le vent reçu par la voile.", "Apparent Wind Angle / Speed: Winkel vom Bug und Geschwindigkeit relativ zum fahrenden Boot. Diesen Wind spürt das Segel.", "Apparent Wind Angle / Speed: angolo dalla prua e velocità rispetto alla barca in moto. È il vento sulla vela."),
  },
  trueWind: {
    name: words("TWA / TWS · истинный ветер", "TWA / TWS · true wind", "TWA / TWS · wiatr rzeczywisty", "TWA / TWS · viento real", "TWA / TWS · vent réel", "TWA / TWS · wahrer Wind", "TWA / TWS · vento reale"),
    meaning: words("True Wind Angle / Speed: угол истинного ветра к носу и его скорость. В этих упражнениях течения нет. Не путай угол к носу с направлением по компасу.", "True Wind Angle / Speed: true wind angle from the bow and its speed. These exercises have no current. An angle from the bow is not a compass direction.", "True Wind Angle / Speed: kąt wiatru rzeczywistego do dziobu i jego prędkość. Tu nie ma prądu. Kąt do dziobu nie jest kierunkiem kompasowym.", "True Wind Angle / Speed: ángulo real desde proa y velocidad. Aquí no hay corriente. El ángulo desde proa no es una dirección de brújula.", "True Wind Angle / Speed : angle réel depuis l'étrave et vitesse. Ici, pas de courant. Cet angle n'est pas une direction au compas.", "True Wind Angle / Speed: wahrer Windwinkel vom Bug und Geschwindigkeit. Hier gibt es keine Strömung. Der Bugwinkel ist keine Kompassrichtung.", "True Wind Angle / Speed: angolo reale dalla prua e velocità. Qui non c'è corrente. L'angolo dalla prua non è una direzione di bussola."),
  },
  traveler: {
    name: words("Каретка · traveler", "Traveler", "Wózek · traveler", "Carro · traveler", "Chariot · traveler", "Traveller", "Carrello · traveler"),
    meaning: words("Перемещает нижнюю точку крепления гротшкота поперёк яхты. Меняет направление тяги: это не замена выборке шкота.", "Moves the mainsheet's lower attachment across the boat. Changes the direction of pull, not a substitute for sheet trim.", "Przesuwa dolne mocowanie szota grota w poprzek jachtu. Zmienia kierunek siły, nie zastępuje wybierania szota.", "Mueve el anclaje inferior de la escota transversalmente. Cambia la dirección de tiro, no sustituye su ajuste.", "Déplace l'ancrage inférieur de l'écoute en travers du bateau. Change la direction de traction, pas la longueur de l'écoute.", "Verschiebt den unteren Großschotanschlag quer zum Boot. Ändert die Zugrichtung, ersetzt nicht den Schottrimm.", "Sposta l'attacco inferiore della scotta trasversalmente. Cambia la direzione del tiro, non sostituisce la regolazione della scotta."),
  },
  twist: {
    name: words("Твист · twist", "Twist", "Skręt · twist", "Torsión · twist", "Vrillage · twist", "Twist", "Svergolamento · twist"),
    meaning: words("Изменение угла паруса по высоте: верх может быть открыт сильнее низа. Это не глубина профиля и не угол всего гика.", "Change of sail angle with height: the top may be more open than the bottom. Not profile depth or the angle of the whole boom.", "Zmiana kąta żagla z wysokością: góra może być bardziej otwarta niż dół. To nie głębokość profilu ani kąt całego bomu.", "Cambio de ángulo con la altura: arriba puede abrirse más que abajo. No es profundidad ni ángulo de toda la botavara.", "Variation de l'angle avec la hauteur : le haut peut être plus ouvert. Ce n'est ni le creux ni l'angle de toute la bôme.", "Änderung des Segelwinkels über die Höhe: oben kann es offener sein. Nicht Profiltiefe oder Winkel des ganzen Baums.", "Variazione dell'angolo con l'altezza: la parte alta può aprirsi di più. Non è profondità né angolo dell'intero boma."),
  },
  vang: {
    name: words("Оттяжка гика · vang", "Vang / kicker", "Obciągacz bomu · vang", "Contra · vang", "Hale-bas · vang", "Baumniederholer · Vang", "Vang"),
    meaning: words("Ограничивает подъём гика и влияет на раскрытие верха. У нашей учебной яхты мягкая оттяжка: она тянет вниз, но не поддерживает гик снизу.", "Limits boom rise and affects top opening. Our training boat has a rope vang: it pulls down but cannot support the boom from below.", "Ogranicza unoszenie bomu i wpływa na otwarcie góry. Tu jest obciągacz linowy: ciągnie w dół, nie podpiera bomu.", "Limita la subida de la botavara y afecta a la apertura alta. Aquí es de cabo: tira hacia abajo pero no sostiene desde abajo.", "Limite la montée de la bôme et agit sur l'ouverture haute. Ici il est souple : il tire vers le bas mais ne soutient pas la bôme.", "Begrenzt den Baumanstieg und beeinflusst die Öffnung oben. Hier als Talje: zieht nach unten, stützt den Baum nicht von unten.", "Limita la salita del boma e l'apertura alta. Qui è in cima: tira verso il basso ma non sostiene il boma da sotto."),
  },
  toppingLift: {
    name: words("Топенант · topping lift", "Topping lift", "Topenanta", "Amantillo", "Balancine", "Dirk", "Amantiglio"),
    meaning: words("Поддерживает гик сверху, когда парус не держит его. Не путай с оттяжкой, которая тянет вниз.", "Supports the boom from above when the sail does not. Not the vang, which pulls down.", "Podtrzymuje bom od góry, gdy nie robi tego żagiel. Nie myl z obciągaczem ciągnącym w dół.", "Sostiene la botavara desde arriba cuando no lo hace la vela. No es la contra, que tira hacia abajo.", "Soutient la bôme par le haut quand la voile ne la porte pas. Ce n'est pas le hale-bas.", "Trägt den Baum von oben, wenn das Segel ihn nicht trägt. Nicht der nach unten ziehende Niederholer.", "Sostiene il boma dall'alto quando non lo fa la vela. Non è il vang, che tira verso il basso."),
  },
  outhaul: {
    name: words("Оттяжка шкотового угла · outhaul", "Outhaul", "Naciąg liku dolnego · outhaul", "Pajarín · outhaul", "Réglage de bordure · outhaul", "Unterliekstrecker · Outhaul", "Tesabase · outhaul"),
    meaning: words("Тянет шкотовый угол вдоль гика. Выборка обычно уплощает нижнюю часть грота, потравливание добавляет глубину. Это не прямое управление твистом.", "Pulls the clew along the boom. Tightening usually flattens the lower main; easing adds depth. Not direct twist control.", "Ciągnie róg szotowy wzdłuż bomu. Wybranie zwykle spłaszcza dół grota; luzowanie zwiększa głębokość. To nie bezpośrednia regulacja skrętu.", "Tira del puño de escota a lo largo de la botavara. Tensar suele aplanar la parte baja; soltar añade profundidad. No regula directamente la torsión.", "Tire le point d'écoute le long de la bôme. Tendre aplatit généralement le bas ; choquer ajoute du creux. Pas un réglage direct du vrillage.", "Zieht das Schothorn längs des Baums. Dichtholen macht das Untersegel meist flacher, Fieren bauchiger. Keine direkte Twistregelung.", "Tira la bugna lungo il boma. Tendere appiattisce in genere la parte bassa; lascare aggiunge profondità. Non regola direttamente lo svergolamento."),
  },
};

export type LessonTermId = keyof typeof lessonTerms;
export const lessonTermIds: Record<string, LessonTermId[]> = {
  "rig-basics": ["halyard", "sheet", "edges", "toppingLift"],
  "apparent-wind": ["apparent", "trueWind"],
  "sheet-control": ["sheet", "apparent", "edges"],
  mainsheet: ["sheet", "traveler", "twist"],
  vang: ["vang", "toppingLift", "twist"],
  outhaul: ["outhaul", "edges", "twist"],
  telltales: ["apparent", "twist"],
  halyard: ["halyard", "edges"],
  "jib-lead": ["sheet", "twist"],
  slot: ["sheet", "twist"],
  "trim-doctor": ["sheet", "traveler", "twist"],
  reef: ["halyard", "outhaul", "toppingLift"],
  "winch-clutch": ["clutch", "winch", "tail", "halyard"],
};
