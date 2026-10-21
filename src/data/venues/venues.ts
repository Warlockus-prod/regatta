// Regatta venues: the land around the race area (owner request 2026-10-21:
// "mountains or islands in the background so racing has a sense of place;
// take Göcek and other popular regatta spots"). Scenery only: the land never
// changes the physics. One source for the 3D boat, the website race, the
// multiplayer race and the native race (geometry in ./geometry.ts).
//
// Layout convention: the race area is a box with the wind from the north
// (top). A coast runs along one side of that box, outside it; an island sits
// on a compass bearing from the centre of the box, a gap away from its edge.
// Shapes are artistic, the placement follows the real venue loosely (which
// shore has the mountains, which islands lie where); island names are real.

import { words, type Label } from "../../lib/product/catalog";

export type VenueId = "gocek" | "split" | "mazury" | "solent" | "open";
export type Relief = "mountains" | "hills" | "flat" | "cliffs";

export interface Coast {
  kind: "coast";
  /** Side of the race area the shore runs along. */
  side: "N" | "E" | "S" | "W";
  /** Part of that side, 0..1 (N and S run west to east, E and W north to south). */
  from: number;
  to: number;
  /** Distance of the waterline outside the race area, min..max (race units). */
  offset: [number, number];
  relief: Relief;
  /** 0..1 of the tallest relief of its kind. */
  height: number;
  seed: number;
  name?: Label;
}

export interface Island {
  kind: "island";
  /** Compass bearing from the centre of the race area, 0 = north (upwind). */
  bearing: number;
  /** Water between the race area and the island (race units). */
  gap: number;
  /** Half-length along the shore of the race area, half-width away from it. */
  size: [number, number];
  relief: Relief;
  height: number;
  seed: number;
  name?: Label;
}

export type LandMass = Coast | Island;

export interface VenuePalette {
  /** Beach and waterline. */
  sand: string;
  /** Lower slopes (pine, maquis, forest or grass). */
  low: string;
  mid: string;
  /** Upper slopes, bare rock. */
  high: string;
  /** Summits (rock, limestone or chalk). */
  peak: string;
}

export interface Venue {
  id: VenueId;
  name: Label;
  place: Label;
  palette: VenuePalette;
  lands: LandMass[];
}

const same = (name: string): Label => words(name, name, name, name, name, name, name);

export const VENUES: Venue[] = [
  {
    id: "gocek",
    name: words("Гёджек", "Göcek", "Göcek", "Göcek", "Göcek", "Göcek", "Göcek"),
    place: words("Турция, залив Фетхие", "Turkey, Gulf of Fethiye", "Turcja, Zatoka Fethiye", "Turquía, golfo de Fethiye", "Turquie, golfe de Fethiye", "Türkei, Golf von Fethiye", "Turchia, golfo di Fethiye"),
    palette: { sand: "#d8c79e", low: "#3f6b45", mid: "#2e5638", high: "#7d6f52", peak: "#9a8a6a" },
    lands: [
      { kind: "coast", side: "N", from: 0, to: 1, offset: [50, 170], relief: "mountains", height: 1, seed: 11 },
      { kind: "coast", side: "W", from: 0, to: 0.78, offset: [70, 230], relief: "hills", height: 0.6, seed: 12 },
      { kind: "coast", side: "S", from: 0, to: 0.55, offset: [60, 150], relief: "flat", height: 0.3, seed: 13, name: same("Göcek") },
      { kind: "coast", side: "E", from: 0.55, to: 1, offset: [200, 320], relief: "mountains", height: 0.75, seed: 14 },
      { kind: "island", bearing: 68, gap: 70, size: [70, 42], relief: "hills", height: 0.45, seed: 15, name: same("Yassıca") },
      { kind: "island", bearing: 96, gap: 45, size: [38, 28], relief: "hills", height: 0.35, seed: 16 },
      { kind: "island", bearing: 136, gap: 90, size: [150, 80], relief: "hills", height: 0.6, seed: 17, name: same("Tersane") },
      { kind: "island", bearing: 30, gap: 150, size: [60, 40], relief: "hills", height: 0.4, seed: 18, name: same("Zeytinli") },
    ],
  },
  {
    id: "split",
    name: words("Сплит", "Split", "Split", "Split", "Split", "Split", "Spalato"),
    place: words("Хорватия, Средняя Далмация", "Croatia, central Dalmatia", "Chorwacja, środkowa Dalmacja", "Croacia, Dalmacia central", "Croatie, Dalmatie centrale", "Kroatien, Mitteldalmatien", "Croazia, Dalmazia centrale"),
    palette: { sand: "#e2dccb", low: "#7d8a5a", mid: "#8f9474", high: "#bdb6a4", peak: "#d6d0c2" },
    lands: [
      { kind: "coast", side: "N", from: 0, to: 1, offset: [60, 170], relief: "mountains", height: 0.75, seed: 21, name: same("Kozjak") },
      { kind: "coast", side: "E", from: 0, to: 0.6, offset: [130, 270], relief: "mountains", height: 1, seed: 22, name: same("Mosor") },
      { kind: "island", bearing: 176, gap: 70, size: [320, 70], relief: "hills", height: 0.55, seed: 23, name: same("Brač") },
      { kind: "island", bearing: 232, gap: 80, size: [180, 55], relief: "hills", height: 0.45, seed: 24, name: same("Šolta") },
      { kind: "island", bearing: 282, gap: 40, size: [150, 40], relief: "hills", height: 0.35, seed: 25, name: same("Čiovo") },
      { kind: "island", bearing: 152, gap: 280, size: [260, 60], relief: "hills", height: 0.5, seed: 26, name: same("Hvar") },
    ],
  },
  {
    id: "mazury",
    name: words("Мазуры", "Masuria", "Mazury", "Masuria", "Mazurie", "Masuren", "Masuria"),
    place: words("Польша, озеро Снярдвы", "Poland, Lake Śniardwy", "Polska, jezioro Śniardwy", "Polonia, lago Śniardwy", "Pologne, lac Śniardwy", "Polen, Śniardwy-See", "Polonia, lago Śniardwy"),
    palette: { sand: "#cdbf92", low: "#3b5f35", mid: "#2c4d2b", high: "#4a6b3c", peak: "#56783f" },
    lands: [
      { kind: "coast", side: "N", from: 0, to: 1, offset: [50, 130], relief: "flat", height: 0.5, seed: 31 },
      { kind: "coast", side: "W", from: 0, to: 1, offset: [60, 150], relief: "flat", height: 0.45, seed: 32, name: same("Mikołajki") },
      { kind: "coast", side: "E", from: 0, to: 1, offset: [90, 190], relief: "flat", height: 0.5, seed: 33 },
      { kind: "coast", side: "S", from: 0, to: 1, offset: [60, 160], relief: "flat", height: 0.4, seed: 34 },
      { kind: "island", bearing: 300, gap: 30, size: [90, 50], relief: "flat", height: 0.5, seed: 35, name: same("Szeroki Ostrów") },
      { kind: "island", bearing: 118, gap: 40, size: [50, 34], relief: "flat", height: 0.5, seed: 36, name: same("Czarci Ostrów") },
      { kind: "island", bearing: 205, gap: 30, size: [28, 22], relief: "flat", height: 0.4, seed: 37, name: same("Pajęcza Wyspa") },
    ],
  },
  {
    id: "solent",
    name: words("Солент", "The Solent", "Solent", "El Solent", "Le Solent", "Solent", "Il Solent"),
    place: words("Англия, Каус", "England, Cowes", "Anglia, Cowes", "Inglaterra, Cowes", "Angleterre, Cowes", "England, Cowes", "Inghilterra, Cowes"),
    palette: { sand: "#d4c9a6", low: "#6b8f52", mid: "#5a7d46", high: "#83a066", peak: "#e9e6da" },
    lands: [
      { kind: "coast", side: "N", from: 0, to: 1, offset: [60, 150], relief: "flat", height: 0.4, seed: 41, name: same("Lymington") },
      { kind: "coast", side: "S", from: 0, to: 1, offset: [50, 140], relief: "hills", height: 0.5, seed: 42,
        name: words("остров Уайт", "Isle of Wight", "Wyspa Wight", "Isla de Wight", "Île de Wight", "Isle of Wight", "Isola di Wight") },
      { kind: "island", bearing: 250, gap: 120, size: [60, 20], relief: "cliffs", height: 0.6, seed: 43, name: same("The Needles") },
      { kind: "coast", side: "E", from: 0.3, to: 1, offset: [200, 320], relief: "flat", height: 0.3, seed: 44, name: same("Portsmouth") },
    ],
  },
  {
    id: "open",
    name: words("Открытое море", "Open sea", "Otwarte morze", "Mar abierto", "Pleine mer", "Offene See", "Mare aperto"),
    place: words("Без берега", "No shore", "Bez brzegu", "Sin costa", "Sans côte", "Ohne Küste", "Senza costa"),
    palette: { sand: "#d8c79e", low: "#3f6b45", mid: "#2e5638", high: "#7d6f52", peak: "#9a8a6a" },
    lands: [],
  },
];

export const DEFAULT_VENUE: VenueId = "gocek";

export const venueLabel = words("Акватория", "Venue", "Akwen", "Campo de regatas", "Plan d'eau", "Revier", "Campo di regata");

export function findVenue(id: string | null | undefined): Venue {
  return VENUES.find((v) => v.id === id) ?? VENUES.find((v) => v.id === DEFAULT_VENUE)!;
}

/** Shared preference key, the same on the website and in the app. */
export const VENUE_STORAGE_KEY = "regatta.venue.v1";
