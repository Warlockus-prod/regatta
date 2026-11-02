import { words, type Label } from "../lib/product/catalog";
import type { SceneId } from "../lib/learning/foundation-drawings";
import { NO_GO_HALF_DEG } from "../lib/sailing-physics/constants";

/** Shared reviewed first lesson. Native and web consume the same copy. */
export interface SceneStateCopy {
  /** Button name: what this state shows, never just "1 / 2 / 3". */
  label: Label;
  /** What changes in this state and why. */
  note: Label;
  /** Spoken description of the drawing in this state (VoiceOver). */
  description: Label;
}

export interface SceneCopy {
  id: SceneId;
  title: Label;
  /** One line under the "How it works" row: what the drawing shows. */
  summary: Label;
  /** Accessible name of the group of state buttons. */
  stateGroup: Label;
  states: [SceneStateCopy, SceneStateCopy, SceneStateCopy];
  /** Numbered like the markers in the drawing. */
  legend: [Label, Label, Label];
  /** What the drawing leaves out (the kit's `limit`). */
  limit: Label;
}

export const foundationWindLesson = {
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
        `Прямо против ветра яхта не может идти под парусом: парус полощет и теряет тягу. Граница мёртвой зоны зависит от яхты и условий, у нашей яхты это около ±${NO_GO_HALF_DEG}° от ветра. К цели на ветре идут галсами.`,
        `A boat cannot sail straight into the wind: the sail luffs and loses drive. The no-go boundary depends on the boat and conditions; for our yacht it is about ±${NO_GO_HALF_DEG}° from the wind. To reach an upwind point, sail in alternating tacks.`,
        `Jacht nie płynie prosto pod wiatr: żagiel łopocze i traci siłę napędową. Granica kąta martwego zależy od jachtu i warunków, dla naszego jachtu to około ±${NO_GO_HALF_DEG}° od wiatru. Do punktu na wiatr dociera się halsami.`,
        `Un velero no puede navegar directamente contra el viento: la vela flamea y pierde empuje. El límite de la zona muerta depende del barco y las condiciones; en nuestro barco está a unos ±${NO_GO_HALF_DEG}° del viento. Para llegar a un punto a barlovento, alterna bordadas.`,
        `Un voilier ne peut pas avancer directement face au vent : la voile faseye et perd sa propulsion. La limite de la zone morte dépend du bateau et des conditions ; pour notre voilier, elle est à environ ±${NO_GO_HALF_DEG}° du vent. Pour atteindre un point au vent, on tire des bords.`,
        `Ein Segelboot kann nicht dauerhaft direkt gegen den Wind segeln: Das Segel killt und verliert Vortrieb. Die Grenze des toten Winkels hängt vom Boot und den Bedingungen ab, bei unserer Yacht liegt sie bei etwa ±${NO_GO_HALF_DEG}° zum Wind. Ein Ziel in Luv erreicht man durch Kreuzen.`,
        `Una barca non può navigare direttamente controvento: la vela fileggia e perde spinta. Il limite dell'angolo morto dipende dalla barca e dalle condizioni; per la nostra barca è a circa ±${NO_GO_HALF_DEG}° dal vento. Per raggiungere un punto sopravvento si alternano le mura.`,
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
};

export const windDirectionScene: SceneCopy = {

    id: "wind-direction",
    title: words("Откуда приходит ветер", "Where the wind comes from", "Skąd wieje wiatr", "De dónde viene el viento", "D'où vient le vent", "Woher der Wind kommt", "Da dove arriva il vento"),
    summary: words("Схема: ветер с носа, с борта и с кормы", "Diagram: wind on the bow, on the beam and from astern", "Schemat: wiatr w dziób, z burty i od rufy", "Esquema: viento por proa, por el través y por popa", "Schéma : vent de face, de travers et arrière", "Skizze: Wind von vorn, von der Seite und von achtern", "Schema: vento in prua, al traverso e in poppa"),
    stateGroup: words("Положение ветра", "Wind position", "Położenie wiatru", "Posición del viento", "Position du vent", "Windrichtung zum Boot", "Posizione del vento"),
    states: [
      {
        label: words("С носа", "On the bow", "W dziób", "Por proa", "Par l'avant", "Von vorn", "Da prua"),
        note: words(
          "Ветер приходит прямо в нос, воздух идет от носа к корме. Парус полощет и не тянет: это середина мёртвой зоны.",
          "The wind comes straight onto the bow; the air moves from bow to stern. The sail flaps and gives no drive: this is the middle of the no-go zone.",
          "Wiatr wieje prosto w dziób, powietrze płynie od dziobu do rufy. Żagiel łopocze i nie ciągnie: to środek kąta martwego.",
          "El viento entra justo por la proa; el aire va de proa a popa. La vela flamea y no empuja: es el centro de la zona muerta.",
          "Le vent arrive droit sur l'étrave ; l'air va de l'avant vers l'arrière. La voile faseye et ne tire pas : c'est le milieu de la zone morte.",
          "Der Wind kommt genau von vorn; die Luft strömt vom Bug zum Heck. Das Segel killt und zieht nicht: Das ist die Mitte des toten Winkels.",
          "Il vento arriva dritto in prua; l'aria va da prua a poppa. La vela fileggia e non spinge: è il centro dell'angolo morto.",
        ),
        description: words(
          "Вид сверху, лодка носом вверх. Ветер приходит сверху, прямо в нос; гик по центру.",
          "Top view, bow pointing up. The wind comes from above, straight onto the bow; the boom is on the centerline.",
          "Widok z góry, dziób skierowany w górę. Wiatr wieje z góry, prosto w dziób; bom jest w osi jachtu.",
          "Vista desde arriba, proa hacia arriba. El viento llega desde arriba, justo por la proa; la botavara está en el centro.",
          "Vue de dessus, étrave vers le haut. Le vent arrive d'en haut, droit sur l'étrave ; la bôme est dans l'axe.",
          "Draufsicht, Bug nach oben. Der Wind kommt von oben, genau auf den Bug; der Baum steht mittschiffs.",
          "Vista dall'alto, prua verso l'alto. Il vento arriva dall'alto, dritto in prua; il boma è al centro.",
        ),
      },
      {
        label: words("С правого борта", "From starboard", "Z prawej burty", "Por estribor", "Par tribord", "Von Steuerbord", "Da dritta"),
        note: words(
          "Ветер приходит с правого борта, воздух идет поперек лодки справа налево. Гик с парусом уходит на левую сторону, от ветра: она подветренная, правая наветренная.",
          "The wind comes over the starboard side; the air crosses the boat from right to left. The boom and sail swing to port, away from the wind: port is the leeward side, starboard the windward side.",
          "Wiatr wieje z prawej burty, powietrze przechodzi w poprzek jachtu z prawej na lewą. Bom z żaglem odchodzi na lewą stronę, od wiatru: lewa burta jest zawietrzna, prawa nawietrzna.",
          "El viento entra por estribor; el aire cruza el barco de derecha a izquierda. La botavara y la vela se van a babor, lejos del viento: babor es sotavento y estribor, barlovento.",
          "Le vent arrive par tribord ; l'air traverse le bateau de droite à gauche. La bôme et la voile partent sur bâbord, à l'opposé du vent : bâbord est sous le vent, tribord au vent.",
          "Der Wind kommt von Steuerbord; die Luft strömt quer von rechts nach links übers Boot. Baum und Segel gehen nach Backbord, weg vom Wind: Backbord ist Lee, Steuerbord Luv.",
          "Il vento arriva da dritta; l'aria attraversa la barca da destra a sinistra. Boma e vela vanno a sinistra, lontano dal vento: la sinistra è sottovento, la dritta sopravvento.",
        ),
        description: words(
          "Вид сверху, лодка носом вверх. Ветер приходит справа, в правый борт, и уходит налево; гик на левой стороне.",
          "Top view, bow pointing up. The wind comes from the right, onto the starboard side, and goes off to the left; the boom is on the port side.",
          "Widok z góry, dziób skierowany w górę. Wiatr wieje z prawej, w prawą burtę, i odchodzi w lewo; bom jest po lewej stronie.",
          "Vista desde arriba, proa hacia arriba. El viento llega por la derecha, por estribor, y sale hacia la izquierda; la botavara está a babor.",
          "Vue de dessus, étrave vers le haut. Le vent arrive par la droite, sur tribord, et repart vers la gauche ; la bôme est à bâbord.",
          "Draufsicht, Bug nach oben. Der Wind kommt von rechts, auf Steuerbord, und zieht nach links ab; der Baum steht auf Backbord.",
          "Vista dall'alto, prua verso l'alto. Il vento arriva da destra, sul lato di dritta, e se ne va a sinistra; il boma è a sinistra.",
        ),
      },
      {
        label: words("С кормы", "From astern", "Od rufy", "Por popa", "Par l'arrière", "Von achtern", "Da poppa"),
        note: words(
          "Ветер приходит с кормы, воздух движется туда же, куда идет лодка. Парус вытравлен далеко за борт, гик почти поперек лодки.",
          "The wind comes from astern; the air moves the same way as the boat. The sail is eased far out, the boom nearly across the boat.",
          "Wiatr wieje od rufy, powietrze płynie w tę samą stronę co jacht. Żagiel jest mocno poluzowany, bom stoi prawie w poprzek jachtu.",
          "El viento entra por popa; el aire va en el mismo sentido que el barco. La vela va muy abierta y la botavara, casi atravesada.",
          "Le vent arrive par l'arrière ; l'air va dans le même sens que le bateau. La voile est très choquée, la bôme presque en travers.",
          "Der Wind kommt von achtern; die Luft strömt in dieselbe Richtung wie das Boot. Das Segel ist weit gefiert, der Baum steht fast quer.",
          "Il vento arriva da poppa; l'aria va nella stessa direzione della barca. La vela è molto lascata, il boma quasi di traverso.",
        ),
        description: words(
          "Вид сверху, лодка носом вверх. Ветер приходит снизу, с кормы, и дует вперед; гик далеко на левой стороне.",
          "Top view, bow pointing up. The wind comes from below, from astern, and blows forward; the boom is far out on the port side.",
          "Widok z góry, dziób skierowany w górę. Wiatr wieje od dołu, od rufy, do przodu; bom jest mocno wychylony na lewą stronę.",
          "Vista desde arriba, proa hacia arriba. El viento llega desde abajo, por popa, y sopla hacia delante; la botavara va muy abierta a babor.",
          "Vue de dessus, étrave vers le haut. Le vent arrive d'en bas, par l'arrière, et souffle vers l'avant ; la bôme est très ouverte à bâbord.",
          "Draufsicht, Bug nach oben. Der Wind kommt von unten, von achtern, und weht nach vorn; der Baum steht weit draußen auf Backbord.",
          "Vista dall'alto, prua verso l'alto. Il vento arriva dal basso, da poppa, e soffia in avanti; il boma è molto aperto a sinistra.",
        ),
      },
    ],
    legend: [
      words("Нос лодки", "Bow", "Dziób", "Proa", "Étrave", "Bug", "Prua"),
      words("Откуда приходит ветер", "Where the wind comes from", "Skąd wieje wiatr", "De dónde viene el viento", "D'où vient le vent", "Woher der Wind kommt", "Da dove arriva il vento"),
      words("Куда движется воздух", "Where the air goes", "Dokąd płynie powietrze", "Hacia dónde va el aire", "Où va l'air", "Wohin die Luft strömt", "Dove va l'aria"),
    ],
    limit: words(
      "Упрощенный вид сверху: лодка всегда носом вверх, компасных курсов нет. Номера на рисунке объяснены в легенде.",
      "A simplified view from above: the bow always points up and there are no compass courses. The numbers are explained in the key.",
      "Uproszczony widok z góry: dziób zawsze skierowany w górę, bez kursów kompasowych. Numery na rysunku objaśnia legenda.",
      "Vista simplificada desde arriba: la proa siempre hacia arriba y sin rumbos de compás. Los números se explican en la leyenda.",
      "Vue de dessus simplifiée : l'étrave toujours vers le haut, sans cap au compas. Les numéros sont expliqués dans la légende.",
      "Vereinfachte Draufsicht: Der Bug zeigt immer nach oben, Kompasskurse gibt es nicht. Die Zahlen erklärt die Legende.",
      "Vista dall'alto semplificata: prua sempre in alto e nessuna rotta alla bussola. I numeri sono spiegati nella legenda.",
    ),
};

export const windDirectionGuide = {
  ...foundationWindLesson,
  states: windDirectionScene.states.map(state => state.label) as [Label, Label, Label],
  notes: windDirectionScene.states.map(state => state.note) as [Label, Label, Label],
  descriptions: windDirectionScene.states.map(state => state.description) as [Label, Label, Label],
  legend: windDirectionScene.legend,
  limit: windDirectionScene.limit,
};
