// Package 32, stage C (owner 2026-11-13: nothing present in one section and missing in the next):
// every tab opens with a frame of the real 3D scene. Race has had one since package 9
// (SCENE_STILL_WEB in home-entry.ts); these are the frames of Learn, Practice and the Menu.
// The site and the app show the same frames (scripts/capture-hub-scenes.mjs writes both files).
// No "@/..." import here: the app reads this module through Metro's watched folders.
import { words } from "./catalog";

/** Width and height of the site's files; the app's copies are 960 x 480, the same 2:1. */
export const HUB_SCENE_SIZE = { width: 1200, height: 600 } as const;

export const HUB_SCENES = {
  learn: {
    web: "/design-v3/hub-learn.webp",
    alt: words("Яхта идет галфвиндом, стрелки показывают ветер", "A yacht on a beam reach, arrows show the wind", "Jacht płynie półwiatrem, strzałki pokazują wiatr",
      "Un velero navega de través, las flechas muestran el viento", "Un voilier au travers, les flèches montrent le vent", "Eine Yacht auf Halbwindkurs, Pfeile zeigen den Wind",
      "Una barca al traverso, le frecce mostrano il vento"),
  },
  practice: {
    web: "/design-v3/hub-practice.webp",
    alt: words("Яхта с кормы: штурвал, паруса и крен", "A yacht from astern: the wheel, the sails and the heel", "Jacht od rufy: koło sterowe, żagle i przechył",
      "Un velero visto desde popa: la rueda, las velas y la escora", "Un voilier vu de l'arrière : la barre, les voiles et la gîte", "Eine Yacht von achtern: Steuerrad, Segel und Krängung",
      "Una barca vista da poppa: la ruota, le vele e lo sbandamento"),
  },
  library: {
    web: "/design-v3/hub-menu.webp",
    alt: words("Яхты у стартовой линии перед берегом", "Yachts at the start line off the shore", "Jachty przy linii startu na tle brzegu",
      "Veleros en la línea de salida frente a la costa", "Des voiliers sur la ligne de départ devant la côte", "Yachten an der Startlinie vor der Küste",
      "Barche sulla linea di partenza davanti alla costa"),
  },
} as const;
export type HubSceneId = keyof typeof HUB_SCENES;
