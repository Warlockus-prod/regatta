import type { Label } from "../lib/product/catalog";

/** M5 step 8 (ADR-0015 point 1): the multiplayer race's one name on every
 * surface (the catalog entry, the lobby heading and invitation, the
 * leaderboard board, the app's screen title). Part of the UI_TERMS dictionary
 * (src/lib/product/ui-terms.ts) in a module of its own, like
 * HELM_CONTROL_TERMS: UI_TERMS is copied into many site chunks and the JS
 * budget must not grow. The id stays "multiplayer"; "quick" is the 15-minute
 * refresher. PL "wyścig" for one race (scripts/sailing-glossary.md). */
export const QUICK_ONLINE_RACE: Label = {
  ru: "Быстрая онлайн-гонка", en: "Quick online race", pl: "Szybki wyścig online", es: "Regata rápida en línea",
  fr: "Course rapide en ligne", de: "Schnelles Online-Rennen", it: "Regata veloce online",
};
