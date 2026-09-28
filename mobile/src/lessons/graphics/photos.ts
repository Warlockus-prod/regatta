import type { ImageRequireSource } from "react-native";
import { words, type Label } from "../../../../src/lib/product/catalog";

/**
 * Annotated lesson images. Points come from the Codex kit catalog
 * (coordinateSpace "percent-of-full-image-no-crop": x/y are percent of the
 * full original image). Only the kit's points are used: no new hotspots or
 * lines are drawn onto an AI illustration, whose rigging is not a reference.
 * Provenance of each file: assets/lessons/SOURCES.md.
 */
export interface PhotoPoint {
  id: string;
  /** Percent of the full image width, from the left. */
  x: number;
  /** Percent of the full image height, from the top. */
  y: number;
  label: Label;
  /** What it is, what it does, what it is confused with. */
  body: Label;
}

export interface AnnotatedPhoto {
  id: string;
  /** Bundled with the app: annotated images never load from the network. */
  source: ImageRequireSource;
  /** Pixel size of the original, for the aspect ratio. */
  width: number;
  height: number;
  title: Label;
  /** Spoken description of the whole image (VoiceOver). */
  description: Label;
  /** What kind of image it is and what it cannot be used for. */
  caption: Label;
  points: PhotoPoint[];
}

export const sailHandlingPhoto: AnnotatedPhoto = {
  id: "sail-handling",
  source: require("../../../assets/lessons/sail-handling.jpg"),
  width: 1200,
  height: 1200,
  title: words("Парус, гик и мачта", "Sail, boom and mast", "Żagiel, bom i maszt", "Vela, botavara y mástil", "Voile, bôme et mât", "Segel, Baum und Mast", "Vela, boma e albero"),
  description: words(
    "Иллюстрация: поднятый грот, под ним гик с синим чехлом паруса, слева мачта, за бортом море и берег.",
    "Illustration: a hoisted mainsail, below it the boom with a blue sail cover, the mast on the left, sea and coast beyond.",
    "Ilustracja: postawiony grot, pod nim bom z niebieskim pokrowcem, po lewej maszt, za burtą morze i brzeg.",
    "Ilustración: la mayor izada, debajo la botavara con una funda azul, el mástil a la izquierda y, detrás, el mar y la costa.",
    "Illustration : la grand-voile hissée, dessous la bôme avec une housse bleue, le mât à gauche, la mer et la côte au loin.",
    "Illustration: das gesetzte Großsegel, darunter der Baum mit blauer Segelpersenning, links der Mast, dahinter Meer und Küste.",
    "Illustrazione: la randa issata, sotto il boma con una sacca blu, a sinistra l'albero, sullo sfondo mare e costa.",
  ),
  caption: words(
    "Иллюстрация, созданная ИИ: по ней узнают крупные детали. Проводку снастей, блоки и крепления по ней не изучают.",
    "AI-generated illustration: good for recognising the large parts. Do not learn how lines, blocks or fittings are rigged from it.",
    "Ilustracja wygenerowana przez AI: pozwala rozpoznać duże elementy. Nie ucz się z niej prowadzenia lin, bloków ani okuć.",
    "Ilustración generada por IA: sirve para reconocer las piezas grandes. No aprendas con ella cómo van los cabos, motones o herrajes.",
    "Illustration générée par IA : utile pour reconnaître les grandes pièces. N'y apprends pas le passage des cordages, les poulies ni les ferrures.",
    "KI-generierte Illustration: gut, um die großen Teile zu erkennen. Leinenführung, Blöcke und Beschläge lernst du daran nicht.",
    "Illustrazione generata con l'IA: utile per riconoscere le parti principali. Non usarla per imparare come sono rinviate cime, bozzelli o attrezzature.",
  ),
  points: [
    {
      id: "cloth",
      x: 62,
      y: 15,
      label: words("Парусина", "Sailcloth", "Tkanina żaglowa", "Tela de la vela", "Tissu de la voile", "Segeltuch", "Tessuto della vela"),
      body: words(
        "Материал паруса. На крупном плане видны швы и панели, из которых сшит парус.",
        "The sail's fabric. The closeup shows the seams and panels the sail is sewn from.",
        "Materiał żagla. Na zbliżeniu widać szwy i panele, z których uszyto żagiel.",
        "El tejido de la vela. En el primer plano se ven las costuras y los paños con que está cosida.",
        "Le tissu de la voile. Le gros plan montre les coutures et les laizes qui la composent.",
        "Das Material des Segels. Die Nahaufnahme zeigt Nähte und Bahnen, aus denen es genäht ist.",
        "Il tessuto della vela. Il primo piano mostra cuciture e ferzi di cui è fatta.",
      ),
    },
    {
      id: "boom",
      x: 68,
      y: 39,
      label: words("Гик", "Boom", "Bom", "Botavara", "Bôme", "Baum", "Boma"),
      body: words(
        "Жесткий рангоут вдоль нижней кромки грота. К нему крепятся гротшкот и оттяжка из схемы ниже.",
        "The rigid spar along the foot of the mainsail. The mainsheet and the vang in the diagram below attach to it.",
        "Sztywne drzewce wzdłuż dolnej krawędzi grota. Mocuje się do niego szot grota i obciągacz ze schematu poniżej.",
        "La percha rígida a lo largo del pujamen de la mayor. A ella se sujetan la escota de mayor y la contra del esquema de abajo.",
        "L'espar rigide le long de la bordure de la grand-voile. L'écoute et le hale-bas du schéma ci-dessous s'y fixent.",
        "Die feste Spiere am Unterliek des Großsegels. Großschot und Baumniederholer aus der Skizze unten greifen daran an.",
        "L'asta rigida lungo la base della randa. Scotta della randa e vang dello schema qui sotto sono fissati qui.",
      ),
    },
    {
      id: "cover",
      x: 58,
      y: 35,
      label: words("Чехол паруса", "Sail cover", "Pokrowiec żagla", "Funda de la vela", "Housse de voile", "Segelpersenning", "Copriranda"),
      body: words(
        "Темный чехол на гике. Это не гик и не снасть: в него укладывают опущенный грот.",
        "The dark bag on the boom. It is neither the boom nor a working line: the lowered mainsail is stowed in it.",
        "Ciemny pokrowiec na bomie. To nie bom ani lina robocza: składa się do niego opuszczony grot.",
        "La funda oscura sobre la botavara. No es la botavara ni un cabo de maniobra: en ella se guarda la mayor arriada.",
        "La housse sombre sur la bôme. Ce n'est ni la bôme ni un cordage de manœuvre : on y range la grand-voile affalée.",
        "Die dunkle Persenning auf dem Baum. Sie ist weder Baum noch Leine: Das geborgene Großsegel wird darin verstaut.",
        "La sacca scura sul boma. Non è il boma né una cima di manovra: ci si ripone la randa ammainata.",
      ),
    },
    {
      id: "mast",
      x: 15.2,
      y: 30,
      label: words("Мачта", "Mast", "Maszt", "Mástil", "Mât", "Mast", "Albero"),
      body: words(
        "Вертикальный рангоут слева в кадре. На нем стоит грот, вдоль него идет фал. Крепления на этой иллюстрации не образец.",
        "The vertical spar on the left of the picture. The mainsail is set on it and the halyard runs along it. The fittings in this illustration are not a reference.",
        "Pionowe drzewce po lewej stronie kadru. Na nim stoi grot i wzdłuż niego biegnie fał. Okucia na tej ilustracji nie są wzorem.",
        "La percha vertical a la izquierda de la imagen. En ella va la mayor y a lo largo de ella corre la driza. Los herrajes de esta ilustración no son una referencia.",
        "L'espar vertical à gauche de l'image. La grand-voile y est envergée et la drisse le longe. Les ferrures de cette illustration ne sont pas une référence.",
        "Die senkrechte Spiere links im Bild. Daran steht das Großsegel, das Fall läuft daran entlang. Die Beschläge in dieser Illustration sind kein Vorbild.",
        "L'asta verticale a sinistra nell'immagine. Qui è inferita la randa e lungo di essa corre la drizza. Le attrezzature di questa illustrazione non sono un riferimento.",
      ),
    },
  ],
};
