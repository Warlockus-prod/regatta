// F5: the name of the race intro, on its own so the lobby, the race settings,
// the multiplayer menu and the app's Race hub can show the "How to race" entry
// without loading the four cards (race-intro-copy.ts, only in the lazy intro).
// Relative import: the app reads it through Metro.

import type { Lang } from "../lib/languages";

export const RACE_INTRO_TITLE: Record<Lang, string> = {
  ru: "Как проходит гонка", en: "How to race", pl: "Jak przebiega wyścig", es: "Cómo se corre la regata",
  fr: "Comment se déroule la course", de: "So läuft ein Rennen", it: "Come si corre la regata",
};
