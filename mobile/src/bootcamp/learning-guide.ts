import { windDirectionPractice } from "../../../src/data/foundation-practice";
import { words, type Label } from "../../../src/lib/product/catalog";

// Compatibility entry: native routes stay local; teaching text has one source.
export * from "../../../src/data/foundation-guide";

/** Focused native practice replaces the general checklist detour for turns. */
export const foundationPractice: Record<string, { route: string; task: Label; title?: Label }> = {
  "wind-direction": { route: windDirectionPractice.native, task: windDirectionPractice.task, title: windDirectionPractice.title },
  tacking: {
    route: "/simulator?drill=noGoRecovery&lesson=tacking",
    task: words("Выполни упражнение выхода из мёртвой зоны. Наблюдай, когда паруса снова наполнятся и лодка наберет скорость. Это тренировка восстановления хода, не проверка всего оверштага.", "Complete the no-go recovery drill. Watch when the sails fill again and the boat regains speed. This practices recovering drive, not the whole tack.", "Wykonaj ćwiczenie wyjścia z kąta martwego. Obserwuj napełnienie żagli i powrót prędkości. To trening odzyskania napędu, nie sprawdzian całego zwrotu.", "Completa el ejercicio de salida de la zona muerta. Observa cuándo se llenan las velas y vuelve la velocidad. Practicas recuperar el avance, no toda la virada.", "Fais l'exercice de sortie de la zone morte. Observe quand les voiles se remplissent et la vitesse revient. Cela entraîne la reprise de propulsion, pas le virement complet.", "Absolviere die Übung zum Herauskommen aus dem toten Winkel. Beobachte, wann die Segel wieder tragen und Fahrt entsteht. Geübt wird die Wiederaufnahme der Fahrt, nicht die ganze Wende.", "Completa l'esercizio di uscita dall'angolo morto. Osserva quando le vele si gonfiano e torna la velocità. Alleni la ripresa del moto, non l'intera virata."),
  },
  jibing: {
    route: "/simulator-v3",
    task: words("В свободном режиме выбери вид сверху и полный курс. Плавно поверни кормой через ветер. Сравни сторону гика до и после, затем вернись к схеме. Наблюдение не засчитывается как выполненный маневр на воде.", "In free mode, choose the top view and a downwind course. Turn the stern smoothly through the wind. Compare the boom side before and after, then return to the diagram. Observation does not count as an on-water maneuver.", "W trybie swobodnym wybierz widok z góry i kurs pełny. Płynnie przeprowadź rufę przez wiatr. Porównaj stronę bomu przed i po, potem wróć do schematu. Obserwacja nie zalicza manewru na wodzie.", "En modo libre elige vista superior y rumbo portante. Gira suavemente la popa a través del viento. Compara el lado de la botavara antes y después y vuelve al esquema. Observar no acredita una maniobra real.", "En mode libre, choisis la vue de dessus et une allure portante. Fais passer doucement la poupe par le vent. Compare le côté de la bôme avant et après, puis reviens au schéma. Observer ne valide pas une manœuvre sur l'eau.", "Im freien Modus Draufsicht und einen raumen Kurs wählen. Das Heck langsam durch den Wind drehen. Die Baumseite vorher und nachher vergleichen und zur Skizze zurückkehren. Beobachten bestätigt kein Manöver auf dem Wasser.", "In modalità libera scegli vista dall'alto e andatura portante. Porta dolcemente la poppa attraverso il vento. Confronta il lato del boma prima e dopo, poi torna allo schema. Osservare non certifica una manovra in acqua."),
  },
};
