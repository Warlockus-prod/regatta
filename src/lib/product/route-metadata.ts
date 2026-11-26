import type { Metadata } from "next";
import { headers } from "next/headers";
import { isLang } from "../languages";
import { destinations, sections, UI_TERMS, words, type Label } from "./catalog";

// One tab title per route (audit B13): every page used to carry the root title,
// so browser tabs, history and search results could not tell them apart. Names
// come from the catalog, the same words the navigation shows; only routes the
// catalog does not list have their own label here. A layout or server page
// exports `generateMetadata = routeMetadata("id")`; route-metadata.test.ts fails
// when a route has no title.

const destination = (id: string): Label => {
  const found = destinations.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown destination: ${id}`);
  return found.title;
};
const section = (id: string): Label => {
  const found = sections.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown section: ${id}`);
  return found.title;
};

export const routeTitles = {
  learn: section("learn"),
  practice: section("practice"),
  race: section("race"),
  menu: words("Меню", "Menu", "Menu", "Menú", "Menu", "Menü", "Menu"),
  offline: words("Нет соединения", "No connection", "Brak połączenia", "Sin conexión", "Pas de connexion", "Keine Verbindung", "Nessuna connessione"),
  diagnostics: words("Диагностика", "Diagnostics", "Diagnostyka", "Diagnóstico", "Diagnostic", "Diagnose", "Diagnostica"),
  // The page teaches both the racing rules and the collision rules at sea, so its
  // heading and tab say more than the catalog's "Racing rules" link.
  rules: words("Правила на воде", "Rules on the water", "Zasady na wodzie", "Reglas en el agua", "Règles sur l'eau", "Regeln auf dem Wasser", "Regole in acqua"),
  start: destination("course"),
  sails: destination("sails"),
  quick: destination("quick"),
  racing: destination("tactics"),
  courses: destination("points"),
  simulator: destination("basics"),
  "simulator-v3": destination("trainer"),
  simulator2: destination("boat"),
  manoeuvres: destination("manoeuvres"),
  game: destination("solo"),
  multiplayer: destination("multiplayer"),
  leaderboard: destination("leaderboard"),
  anatomy: destination("anatomy"),
  onboard: destination("onboard"),
  checklist: destination("checklist"),
  glossary: destination("glossary"),
  spots: destination("spots"),
  gallery: destination("gallery"),
  support: destination("support"),
  privacy: destination("privacy"),
} satisfies Record<string, Label>;

export type RouteTitleId = keyof typeof routeTitles;

export const routeTitle = (id: RouteTitleId, lang: keyof Label) => `${routeTitles[id][lang]} | ${UI_TERMS.brand.en}`;

/** The proxy resolves the language and forwards it, as in src/app/radio/layout.tsx. */
export function routeMetadata(id: RouteTitleId) {
  return async function generateMetadata(): Promise<Metadata> {
    const requestLang = (await headers()).get("x-regatta-lang");
    return { title: routeTitle(id, isLang(requestLang) ? requestLang : "ru") };
  };
}
