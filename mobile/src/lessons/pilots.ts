import { foundationWindLesson } from "../../../src/data/foundation-wind";
import { words, type Label } from "../../../src/lib/product/catalog";
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
  scene: "wind-direction" | "rig-basics";
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
    ...foundationWindLesson,
    scene: "wind-direction",
    sceneRole: "lead",
  },
};

export const sailPilots: Partial<Record<string, LessonPilot>> = {
  "rig-basics": {
    goal: words(
      "Понять, какая снасть за что отвечает: какая поднимает парус, какая задает его положение, какая держит гик внизу.",
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
      "Путать фал и шкот. «Потравить грот» значит потравить гика-шкот: гик отходит, парус остается поднят. Потравленный фал опускает парус.",
      "Mixing up halyard and sheet. \"Ease the main\" means ease the mainsheet: the boom moves out and the sail stays up. An eased halyard lowers the sail.",
      "Mylenie fału z szotem. \"Luzuj grota\" znaczy: luzuj szot grota. Bom odchodzi, żagiel zostaje postawiony. Poluzowany fał opuszcza żagiel.",
      "Confundir driza y escota. \"Lascar la mayor\" es lascar la escota de mayor: la botavara sale y la vela sigue izada. Lascar la driza arría la vela.",
      "Confondre drisse et écoute. \"Choquer la grand-voile\", c'est choquer l'écoute de grand-voile : la bôme s'écarte et la voile reste hissée. Choquer la drisse affale la voile.",
      "Fall und Schot verwechseln. \"Groß fieren\" heißt, die Großschot zu fieren: Der Baum geht nach außen, das Segel bleibt stehen. Ein gefiertes Fall holt das Segel herunter.",
      "Confondere drizza e scotta. \"Lascare la randa\" vuol dire lascare la scotta della randa: il boma si apre e la vela resta issata. Lascare la drizza ammaina la vela.",
    ),
  },
};

/** Shared words of the lesson template. */
export { lessonCopy } from "../../../src/data/lesson-copy";
