import { words, type Label } from "../../../../src/lib/product/catalog";
import type { SceneId } from "./drawings";

/**
 * Words for the pilot drawings, in the seven app languages. The drawings carry
 * only numbers; the legend here explains them in the same order. Meaning comes
 * from the Codex kit's catalog (states, legend, notes, limit), adapted per
 * language and extended where the lesson needs more than a caption.
 */
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

export const scenes: Record<SceneId, SceneCopy> = {
  "wind-direction": {
    id: "wind-direction",
    title: words("Откуда приходит ветер", "Where the wind comes from", "Skąd wieje wiatr", "De dónde viene el viento", "D'où vient le vent", "Woher der Wind kommt", "Da dove arriva il vento"),
    summary: words("Схема: ветер с носа, с борта и с кормы", "Diagram: wind on the bow, on the beam and from astern", "Schemat: wiatr w dziób, z burty i od rufy", "Esquema: viento por proa, por el través y por popa", "Schéma : vent de face, de travers et arrière", "Skizze: Wind von vorn, von der Seite und von achtern", "Schema: vento in prua, al traverso e in poppa"),
    stateGroup: words("Положение ветра", "Wind position", "Położenie wiatru", "Posición del viento", "Position du vent", "Windrichtung zum Boot", "Posizione del vento"),
    states: [
      {
        label: words("С носа", "On the bow", "W dziób", "Por proa", "Par l'avant", "Von vorn", "Da prua"),
        note: words(
          "Ветер приходит прямо в нос, воздух идет от носа к корме. Парус полощет и не тянет: это середина неходовой зоны.",
          "The wind comes straight onto the bow; the air moves from bow to stern. The sail flaps and gives no drive: this is the middle of the no-go zone.",
          "Wiatr wieje prosto w dziób, powietrze płynie od dziobu do rufy. Żagiel łopocze i nie ciągnie: to środek kąta martwego.",
          "El viento entra justo por la proa; el aire va de proa a popa. La vela flamea y no empuja: es el centro de la zona muerta.",
          "Le vent arrive droit sur l'étrave ; l'air va de l'avant vers l'arrière. La voile faseye et ne tire pas : c'est le milieu de la zone morte.",
          "Der Wind kommt genau von vorn; die Luft strömt vom Bug zum Heck. Das Segel killt und zieht nicht: Das ist die Mitte des toten Winkels.",
          "Il vento arriva dritto in prua; l'aria va da prua a poppa. La vela fileggia e non spinge: è il centro dell'angolo morto.",
        ),
        description: words(
          "Вид сверху, лодка носом вверх. Ветер приходит сверху, прямо в нос; гик по центру.",
          "Top view, bow pointing up. The wind comes from above, straight onto the bow; the boom is on the centreline.",
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
          "Wiatr wieje od rufy, powietrze płynie w tę samą stronę co jacht. Żagiel jest mocno wyluzowany, bom stoi prawie w poprzek jachtu.",
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
      "Vista dall'alto semplificata: prua sempre in alto e nessuna rotta bussola. I numeri sono spiegati nella legenda.",
    ),
  },
  "rig-basics": {
    id: "rig-basics",
    title: words("Три снасти у грота", "Three lines on the mainsail", "Trzy liny przy grocie", "Tres cabos de la mayor", "Trois cordages de la grand-voile", "Drei Leinen am Großsegel", "Tre cime della randa"),
    summary: words("Схема: фал, гротшкот и оттяжка гика", "Diagram: halyard, mainsheet and vang", "Schemat: fał, szot grota i obciągacz bomu", "Esquema: driza, escota de mayor y contra", "Schéma : drisse, écoute de grand-voile et hale-bas", "Skizze: Fall, Großschot und Baumniederholer", "Schema: drizza, scotta della randa e vang"),
    stateGroup: words("Снасть", "Line", "Lina", "Cabo", "Cordage", "Leine", "Cima"),
    states: [
      {
        label: words("Фал", "Halyard", "Fał", "Driza", "Drisse", "Fall", "Drizza"),
        note: words(
          "Фал идет к верхнему углу паруса. Им парус поднимают и натягивают переднюю шкаторину. Работу шкота он не делает: потравленный фал опускает парус.",
          "The halyard runs to the head of the sail. It hoists the sail and tensions the luff. It does not do a sheet's job: easing the halyard lowers the sail.",
          "Fał biegnie do głowicy żagla. Nim stawia się żagiel i napina lik przedni. Nie zastępuje szota: poluzowany fał opuszcza żagiel.",
          "La driza va al puño de driza. Con ella se iza la vela y se tensa el grátil. No hace el trabajo de la escota: lascar la driza arría la vela.",
          "La drisse va au point de drisse. Elle hisse la voile et tend le guindant. Elle ne remplace pas l'écoute : choquer la drisse affale la voile.",
          "Das Fall führt zum Segelkopf. Damit wird das Segel gesetzt und das Vorliek gespannt. Es ersetzt keine Schot: Fierst du das Fall, kommt das Segel herunter.",
          "La drizza arriva alla penna. Serve a issare la vela e a tendere l'inferitura. Non fa il lavoro della scotta: lascare la drizza ammaina la vela.",
        ),
        description: words(
          "Яхта сбоку, нос справа. Выделен фал: от верхнего угла грота через топ мачты и вниз вдоль мачты к палубе.",
          "A yacht from the side, bow to the right. Highlighted: the halyard, from the head of the mainsail over the masthead and down the mast to the deck.",
          "Jacht z boku, dziób po prawej. Wyróżniony fał: od głowicy grota przez top masztu i w dół wzdłuż masztu do pokładu.",
          "Un velero de perfil, proa a la derecha. Resaltada: la driza, desde el puño de driza de la mayor, por el tope del mástil y bajando por el mástil hasta la cubierta.",
          "Un voilier de profil, étrave à droite. En surbrillance : la drisse, du point de drisse de la grand-voile par la tête de mât, puis le long du mât jusqu'au pont.",
          "Eine Yacht von der Seite, Bug rechts. Hervorgehoben: das Fall, vom Kopf des Großsegels über den Masttopp und am Mast hinunter zum Deck.",
          "Una barca vista di lato, prua a destra. Evidenziata: la drizza, dalla penna della randa sopra la testa d'albero e giù lungo l'albero fino in coperta.",
        ),
      },
      {
        label: words("Гротшкот", "Mainsheet", "Szot grota", "Escota de mayor", "Écoute de grand-voile", "Großschot", "Scotta della randa"),
        note: words(
          "Гротшкот связывает гик с нижней точкой крепления на лодке. Выбрали шкот: гик ближе к середине. Потравили: гик отходит наружу, а парус остается поднятым.",
          "The mainsheet links the boom to its lower attachment on the boat. Sheet in: the boom comes towards the centre. Ease it: the boom moves out and the sail stays up.",
          "Szot grota łączy bom z dolnym mocowaniem na jachcie. Wybierasz szot: bom idzie do środka. Luzujesz: bom odchodzi na zewnątrz, a żagiel zostaje postawiony.",
          "La escota de mayor une la botavara con su anclaje inferior en el barco. Cazas: la botavara va hacia el centro. Lascas: la botavara sale y la vela sigue izada.",
          "L'écoute de grand-voile relie la bôme à son point d'ancrage bas sur le bateau. On borde : la bôme revient vers l'axe. On choque : elle s'écarte et la voile reste hissée.",
          "Die Großschot verbindet den Baum mit seinem unteren Befestigungspunkt am Boot. Dichtholen: Der Baum kommt zur Mitte. Fieren: Er geht nach außen, das Segel bleibt gesetzt.",
          "La scotta della randa collega il boma all'attacco inferiore sulla barca. Cazzi: il boma va verso il centro. Lasci: il boma si apre e la vela resta issata.",
        ),
        description: words(
          "Яхта сбоку, нос справа. Выделен гротшкот: от гика вниз к палубе.",
          "A yacht from the side, bow to the right. Highlighted: the mainsheet, from the boom down to the deck.",
          "Jacht z boku, dziób po prawej. Wyróżniony szot grota: od bomu w dół do pokładu.",
          "Un velero de perfil, proa a la derecha. Resaltada: la escota de mayor, desde la botavara hacia abajo, hasta la cubierta.",
          "Un voilier de profil, étrave à droite. En surbrillance : l'écoute de grand-voile, de la bôme jusqu'au pont.",
          "Eine Yacht von der Seite, Bug rechts. Hervorgehoben: die Großschot, vom Baum hinunter zum Deck.",
          "Una barca vista di lato, prua a destra. Evidenziata: la scotta della randa, dal boma giù fino in coperta.",
        ),
      },
      {
        label: words("Оттяжка гика", "Vang", "Obciągacz bomu", "Contra", "Hale-bas", "Baumniederholer", "Vang"),
        note: words(
          "Оттяжка гика идет от основания мачты к гику и не дает ему подниматься, особенно когда шкот потравлен. Топенант держит гик сверху: это другая снасть.",
          "The vang runs from the foot of the mast to the boom and stops the boom lifting, especially with the sheet eased. The topping lift holds the boom from above: that is a different line.",
          "Obciągacz bomu biegnie od stopy masztu do bomu i nie pozwala mu się unosić, zwłaszcza przy poluzowanym szocie. Topenanta trzyma bom od góry: to inna lina.",
          "La contra va del pie del mástil a la botavara e impide que suba, sobre todo con la escota lascada. El amantillo sostiene la botavara desde arriba: es otro cabo.",
          "Le hale-bas va du pied de mât à la bôme et l'empêche de monter, surtout écoute choquée. La balancine tient la bôme par le haut : c'est un autre cordage.",
          "Der Baumniederholer führt vom Mastfuß zum Baum und hält ihn unten, besonders bei gefierter Schot. Die Dirk trägt den Baum von oben: Das ist eine andere Leine.",
          "Il vang va dal piede d'albero al boma e gli impedisce di sollevarsi, soprattutto con la scotta lascata. L'amantiglio sostiene il boma dall'alto: è un'altra cima.",
        ),
        description: words(
          "Яхта сбоку, нос справа. Выделена оттяжка гика: от основания мачты наискосок вверх к гику.",
          "A yacht from the side, bow to the right. Highlighted: the vang, running diagonally up from the foot of the mast to the boom.",
          "Jacht z boku, dziób po prawej. Wyróżniony obciągacz bomu: od stopy masztu ukośnie w górę do bomu.",
          "Un velero de perfil, proa a la derecha. Resaltada: la contra, en diagonal desde el pie del mástil hasta la botavara.",
          "Un voilier de profil, étrave à droite. En surbrillance : le hale-bas, en diagonale du pied de mât jusqu'à la bôme.",
          "Eine Yacht von der Seite, Bug rechts. Hervorgehoben: der Baumniederholer, schräg vom Mastfuß hinauf zum Baum.",
          "Una barca vista di lato, prua a destra. Evidenziato: il vang, in diagonale dal piede d'albero fino al boma.",
        ),
      },
    ],
    legend: [
      words("Фал: к верхнему углу паруса", "Halyard: to the head of the sail", "Fał: do głowicy żagla", "Driza: al puño de driza", "Drisse : au point de drisse", "Fall: zum Segelkopf", "Drizza: alla penna"),
      words("Гротшкот: от гика вниз к лодке", "Mainsheet: from the boom down to the boat", "Szot grota: od bomu w dół do jachtu", "Escota de mayor: de la botavara hacia abajo, al barco", "Écoute de grand-voile : de la bôme vers le bas, au bateau", "Großschot: vom Baum hinunter zum Boot", "Scotta della randa: dal boma giù verso la barca"),
      words("Оттяжка: между мачтой и гиком", "Vang: between mast and boom", "Obciągacz: między masztem a bomem", "Contra: entre mástil y botavara", "Hale-bas : entre mât et bôme", "Baumniederholer: zwischen Mast und Baum", "Vang: tra albero e boma"),
    ],
    limit: words(
      "Схема расположения. Блоки, стопоры и свободные концы не показаны: как проведены снасти на твоей лодке, смотри на месте.",
      "A layout sketch. Blocks, clutches and tails are left out: check how the lines are led on your own boat.",
      "Schemat rozmieszczenia. Bloki, stopery i wolne końce pominięto: jak poprowadzono liny na twoim jachcie, sprawdź na miejscu.",
      "Esquema de ubicación. Se omiten motones, mordazas y chicotes: comprueba a bordo cómo van los cabos en tu barco.",
      "Schéma d'implantation. Poulies, bloqueurs et bouts libres sont omis : vérifie à bord comment les cordages sont renvoyés sur ton bateau.",
      "Lageskizze. Blöcke, Fallenstopper und lose Enden fehlen: Wie die Leinen auf deinem Boot geführt sind, prüfst du an Bord.",
      "Schema di posizione. Bozzelli, stopper e code libere non sono disegnati: verifica a bordo come sono rinviate le cime sulla tua barca.",
    ),
  },
};
