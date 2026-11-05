import { UI_TERMS, words, type Label } from "../lib/product/catalog";
import { NO_GO_HALF_DEG } from "../lib/sailing-physics/constants";
import type { MiniTask } from "../lib/learning/mini-task";

// In-lesson practice (audit B7, package 24): one handle, the same drawing, and
// the lesson itself sees the result. Only lessons whose idea is one angle have a
// task. How-sail-works, VMG, rules and the mini race need the real trainer or
// the race, so they keep their link; a fake check here would award nothing real.
//
// Angle convention: 0 is the bow head to wind, positive turns the bow clockwise,
// so the wind arrives over the port side and the boom sits to starboard
// (src/lib/learning/foundation-drawings.ts, topBoat).

const pointOfSail = (name: Label, angle: number): Label => ({
  ru: `Поставь курс: ${name.ru}, ${angle}°`,
  en: `Set the course: ${name.en}, ${angle}°`,
  pl: `Ustaw kurs: ${name.pl}, ${angle}°`,
  es: `Pon el rumbo: ${name.es}, ${angle}°`,
  fr: `Prends l'allure : ${name.fr}, ${angle}°`,
  de: `Stelle den Kurs ein: ${name.de}, ${angle}°`,
  it: `Imposta l'andatura: ${name.it}, ${angle}°`,
});

export const foundationMiniTasks: Record<string, MiniTask> = {
  "wind-direction": {
    min: 0, max: 180, start: 60,
    targets: [
      { angle: 0, tolerance: 4, prompt: words("Поставь нос прямо на ветер: 0°", "Point the bow straight into the wind: 0°", "Ustaw dziób prosto w wiatr: 0°", "Pon la proa directa al viento: 0°", "Mets l'étrave droit dans le vent : 0°", "Richte den Bug genau in den Wind: 0°", "Punta la prua dritta al vento: 0°") },
      { angle: 90, tolerance: 4, prompt: words("Поверни так, чтобы ветер дул в борт: 90°", "Turn so the wind hits the side: 90°", "Obróć tak, aby wiatr wiał w burtę: 90°", "Gira hasta que el viento dé en el costado: 90°", "Tourne pour que le vent arrive sur le côté : 90°", "Drehe, bis der Wind von der Seite kommt: 90°", "Gira finché il vento arriva di lato: 90°") },
      { angle: 180, tolerance: 4, prompt: words("Поверни так, чтобы ветер дул в корму: 180°", "Turn so the wind comes from behind: 180°", "Obróć tak, aby wiatr wiał w rufę: 180°", "Gira hasta que el viento venga de popa: 180°", "Tourne pour que le vent vienne de l'arrière : 180°", "Drehe, bis der Wind von hinten kommt: 180°", "Gira finché il vento arriva da poppa: 180°") },
    ],
    done: words("Это и есть угол к ветру: угол между носом и направлением, откуда дует ветер.", "That is the angle to the wind: between the bow and the direction the wind comes from.", "To właśnie kąt do wiatru: między dziobem a kierunkiem, z którego wieje wiatr.", "Ese es el ángulo al viento: entre la proa y la dirección de donde viene el viento.", "C'est l'angle au vent : entre l'étrave et la direction d'où vient le vent.", "Das ist der Winkel zum Wind: zwischen Bug und der Richtung, aus der der Wind kommt.", "Questo è l'angolo al vento: tra la prua e la direzione da cui arriva il vento."),
  },
  "points-of-sail": {
    min: 0, max: 180, start: 160,
    targets: [
      // Teaching copy states the beat as the edge of the no-go zone (no-go-copy.test.ts).
      { angle: NO_GO_HALF_DEG, tolerance: 4, prompt: pointOfSail(words("бейдевинд", "close-hauled", "bajdewind", "ceñida", "près", "hoch am Wind", "bolina"), NO_GO_HALF_DEG) },
      { angle: 90, tolerance: 4, prompt: pointOfSail(words("галфвинд", "beam reach", "półwiatr", "través", "travers", "halber Wind", "traverso"), 90) },
      { angle: 135, tolerance: 4, prompt: pointOfSail(words("бакштаг", "broad reach", "baksztag", "largo", "grand largue", "raumer Wind", "lasco"), 135) },
    ],
    done: words("Чем дальше нос от ветра, тем сильнее травят парус: гик уходит в сторону.", "The further the bow is from the wind, the more the sail is eased: the boom swings out.", "Im dalej dziób od wiatru, tym bardziej luzujesz żagiel: bom odchodzi na bok.", "Cuanto más lejos del viento está la proa, más se suelta la vela: la botavara se abre.", "Plus l'étrave s'éloigne du vent, plus on choque la voile : la bôme s'ouvre.", "Je weiter der Bug vom Wind weg zeigt, desto mehr wird das Segel gefiert: der Baum schwingt aus.", "Più la prua si allontana dal vento, più si lasca la vela: il boma si apre."),
  },
  tacking: {
    min: -60, max: 60, start: 45,
    targets: [
      { angle: 0, tolerance: 4, prompt: words("Приводись: веди нос к ветру до 0°", "Head up: bring the bow to the wind, 0°", "Ostrz: prowadź dziób do wiatru, 0°", "Orza: lleva la proa al viento, 0°", "Lofe : amène l'étrave dans le vent, 0°", "Anluven: führe den Bug in den Wind, 0°", "Orza: porta la prua al vento, 0°") },
      { angle: -45, tolerance: 4, prompt: words("Продолжай поворот: 45° с другого борта", "Keep turning: 45° on the other side", "Obracaj dalej: 45° z drugiej burty", "Sigue girando: 45° por la otra banda", "Continue le virement : 45° de l'autre côté", "Dreh weiter: 45° auf der anderen Seite", "Continua a virare: 45° dall'altro lato") },
    ],
    done: words("Это оверштаг: нос прошел через ветер, и гик перешел на другой борт.", "That is a tack: the bow passed through the wind and the boom moved to the other side.", "To zwrot przez sztag: dziób przeszedł przez wiatr, a bom przeszedł na drugą burtę.", "Eso es una virada: la proa pasó por el viento y la botavara cambió de banda.", "C'est un virement de bord : l'étrave a traversé le vent et la bôme a changé de côté.", "Das ist eine Wende: Der Bug ging durch den Wind und der Baum wechselte die Seite.", "Questa è una virata: la prua ha attraversato il vento e il boma è passato dall'altro lato."),
  },
  jibing: {
    min: 120, max: 240, start: 150,
    targets: [
      { angle: 180, tolerance: 4, prompt: words("Уваливай: поставь корму на ветер, 180°", "Bear away: put the stern to the wind, 180°", "Odpadaj: ustaw rufę do wiatru, 180°", "Arriba: pon la popa al viento, 180°", "Abats : mets la poupe au vent, 180°", "Abfallen: bring das Heck in den Wind, 180°", "Poggia: porta la poppa al vento, 180°") },
      { angle: 210, tolerance: 4, prompt: words("Продолжай поворот: 150° с другого борта", "Keep turning: 150° on the other side", "Obracaj dalej: 150° z drugiej burty", "Sigue girando: 150° por la otra banda", "Continue l'empannage : 150° de l'autre côté", "Dreh weiter: 150° auf der anderen Seite", "Continua a girare: 150° dall'altro lato") },
    ],
    done: words("Это поворот фордевинд: корма прошла через ветер. На настоящей лодке гик перелетает резко, поэтому шкот держат под контролем.", "That is a gybe: the stern passed through the wind. On a real boat the boom swings across hard, so the sheet stays under control.", "To zwrot przez rufę: rufa przeszła przez wiatr. Na prawdziwym jachcie bom przelatuje gwałtownie, dlatego szot trzyma się pod kontrolą.", "Eso es una trasluchada: la popa pasó por el viento. En un barco real la botavara cruza con fuerza, por eso se controla la escota.", "C'est un empannage : la poupe a traversé le vent. Sur un vrai bateau, la bôme passe violemment : on garde l'écoute sous contrôle.", "Das ist eine Halse: Das Heck ging durch den Wind. Auf einem echten Boot schlägt der Baum hart um, deshalb bleibt die Schot unter Kontrolle.", "Questa è una strambata: la poppa ha attraversato il vento. Su una barca vera il boma passa con forza, perciò la scotta resta sotto controllo."),
  },
};

export const miniTaskCopy = {
  title: words("Попробуй прямо здесь", "Try it right here", "Spróbuj tutaj", "Pruébalo aquí", "Essaie ici", "Probier es hier aus", "Provalo qui"),
  control: words("Угол к ветру", "Angle to the wind", "Kąt do wiatru", "Ángulo al viento", "Angle au vent", "Winkel zum Wind", "Angolo al vento"),
  wind: words("Ветер", "Wind", "Wiatr", "Viento", "Vent", "Wind", "Vento"),
  hold: words("Задержи лодку на этой отметке", "Hold the boat on this mark", "Zatrzymaj jacht na tym znaku", "Mantén el barco en esta marca", "Garde le bateau sur ce repère", "Halte das Boot auf dieser Marke", "Tieni la barca su questo segno"),
  noGo: words(
    `Здесь паруса заполаскивают: ближе чем на ${NO_GO_HALF_DEG}° к ветру яхта не идет.`,
    `The sails flap here: a yacht cannot sail closer than ${NO_GO_HALF_DEG}° to the wind.`,
    `Tu żagle łopoczą: bliżej niż ${NO_GO_HALF_DEG}° do wiatru jacht nie płynie.`,
    `Aquí las velas flamean: un velero no navega a menos de ${NO_GO_HALF_DEG}° del viento.`,
    `Ici les voiles faseyent : un voilier ne remonte pas à moins de ${NO_GO_HALF_DEG}° du vent.`,
    `Hier killen die Segel: Näher als ${NO_GO_HALF_DEG}° am Wind segelt eine Yacht nicht.`,
    `Qui le vele sventano: una barca non naviga a meno di ${NO_GO_HALF_DEG}° dal vento.`,
  ),
  success: words("Получилось!", "You did it!", "Udało się!", "¡Lo lograste!", "Réussi !", "Geschafft!", "Ce l'hai fatta!"),
  again: UI_TERMS.again,
  fullPractice: words("Больше практики", "More practice", "Więcej ćwiczeń", "Más práctica", "Plus de pratique", "Mehr Übung", "Più pratica"),
};
