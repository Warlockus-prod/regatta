import { windDirectionScene, type SceneCopy } from "../../../../src/data/foundation-wind";
export type { SceneCopy, SceneStateCopy } from "../../../../src/data/foundation-wind";
import { words } from "../../../../src/lib/product/catalog";

/**
 * Words for the pilot drawings, in the seven app languages. The drawings carry
 * only numbers; the legend here explains them in the same order. Meaning comes
 * from the Codex kit's catalog (states, legend, notes, limit), adapted per
 * language and extended where the lesson needs more than a caption.
 */
export const scenes: Record<"wind-direction" | "rig-basics", SceneCopy> = {
  "wind-direction": windDirectionScene,
  "rig-basics": {
    id: "rig-basics",
    title: words("Три снасти у грота", "Three lines on the mainsail", "Trzy liny przy grocie", "Tres cabos de la mayor", "Trois cordages de la grand-voile", "Drei Leinen am Großsegel", "Tre cime della randa"),
    summary: words("Схема: фал, гика-шкот и оттяжка гика", "Diagram: halyard, mainsheet and vang", "Schemat: fał, szot grota i obciągacz bomu", "Esquema: driza, escota de mayor y contra", "Schéma : drisse, écoute de grand-voile et hale-bas", "Skizze: Fall, Großschot und Baumniederholer", "Schema: drizza, scotta della randa e vang"),
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
        label: words("Гика-шкот", "Mainsheet", "Szot grota", "Escota de mayor", "Écoute de grand-voile", "Großschot", "Scotta della randa"),
        note: words(
          "Гика-шкот связывает гик с нижней точкой крепления на лодке. Выбрали шкот: гик ближе к середине. Потравили: гик отходит наружу, а парус остается поднятым.",
          "The mainsheet links the boom to its lower attachment on the boat. Sheet in: the boom comes towards the center. Ease it: the boom moves out and the sail stays up.",
          "Szot grota łączy bom z dolnym mocowaniem na jachcie. Wybierasz szot: bom idzie do środka. Luzujesz: bom odchodzi na zewnątrz, a żagiel zostaje postawiony.",
          "La escota de mayor une la botavara con su anclaje inferior en el barco. Cazas: la botavara va hacia el centro. Lascas: la botavara sale y la vela sigue izada.",
          "L'écoute de grand-voile relie la bôme à son point d'ancrage bas sur le bateau. On borde : la bôme revient vers l'axe. On choque : elle s'écarte et la voile reste hissée.",
          "Die Großschot verbindet den Baum mit seinem unteren Befestigungspunkt am Boot. Dichtholen: Der Baum kommt zur Mitte. Fieren: Er geht nach außen, das Segel bleibt gesetzt.",
          "La scotta della randa collega il boma all'attacco inferiore sulla barca. Cazzando, il boma va verso il centro. Lascando, il boma si apre e la vela resta issata.",
        ),
        description: words(
          "Яхта сбоку, нос справа. Выделен гика-шкот: от гика вниз к палубе.",
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
      words("Гика-шкот: от гика вниз к лодке", "Mainsheet: from the boom down to the boat", "Szot grota: od bomu w dół do jachtu", "Escota de mayor: de la botavara hacia abajo, al barco", "Écoute de grand-voile : de la bôme vers le bas, au bateau", "Großschot: vom Baum hinunter zum Boot", "Scotta della randa: dal boma giù verso la barca"),
      words("Оттяжка: между мачтой и гиком", "Vang: between mast and boom", "Obciągacz: między masztem a bomem", "Contra: entre mástil y botavara", "Hale-bas : entre mât et bôme", "Baumniederholer: zwischen Mast und Baum", "Vang: tra albero e boma"),
    ],
    limit: words(
      "Схема расположения. Блоки, стопоры и свободные концы не показаны: как проведены снасти на твоей лодке, смотри на месте.",
      "A layout sketch. Blocks, clutches and tails are left out: check how the lines are led on your own boat.",
      "Schemat rozmieszczenia. Bloki, stopery i wolne końce pominięto: jak poprowadzono liny na twoim jachcie, sprawdź na miejscu.",
      "Esquema de ubicación. Se omiten motones, stoppers y chicotes: comprueba a bordo cómo van los cabos en tu barco.",
      "Schéma d'implantation. Poulies, bloqueurs et bouts libres sont omis : vérifie à bord comment les cordages sont renvoyés sur ton bateau.",
      "Lageskizze. Blöcke, Fallenstopper und lose Enden fehlen: Wie die Leinen auf deinem Boot geführt sind, prüfst du an Bord.",
      "Schema di posizione. Bozzelli, stopper e code libere non sono disegnati: verifica a bordo come sono rinviate le cime sulla tua barca.",
    ),
  },
};
