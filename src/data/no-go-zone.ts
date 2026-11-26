// One truth about the no-go zone (package 7, audit K4): one term in every
// language (scripts/sailing-glossary.md), one number and one glossary article.
//
// - Teaching copy (glossary, the points of sail table, lessons, quiz, drills,
//   strategies, the trainer) states the zone as NO_GO_DEG, which is the shared
//   NO_GO_HALF_DEG of the engine. ADR-0021 made it agree with the cruiser
//   polar (best upwind VMG 45 / 42 / 40 deg in 6 / 12 / 20 kn), and
//   cruiser.test.ts fails if the two drift apart. Never type the number.
// - Race copy (intro, briefing, missions, finish screen, next step, the race
//   coach) states no number at all: the legacy race sails the classic profile
//   with its own 30 deg zone, so it points to the suggested course of the
//   race's own VMG solver (src/lib/upwind-vmg.ts) and links this article.
// no-go-copy.test.ts checks every such string against these rules.

import type { Lang } from "@/lib/languages";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";

type Text = Record<Lang, string>;

/** Half-angle of the no-go zone either side of the true wind, degrees. */
export const NO_GO_DEG = NO_GO_HALF_DEG;

/** Id of the one glossary article (src/data/sailing-data.ts glossaryTerms). */
export const NO_GO_GLOSSARY_ID = "no-go-zone";

/** Link target of that article: the glossary renders every term with its id. */
export const NO_GO_GLOSSARY_HREF = `/glossary#${NO_GO_GLOSSARY_ID}`;

/** The one term (lower case, as it reads inside a sentence). */
export const NO_GO_TERM: Text = {
  ru: "мёртвая зона",
  en: "no-go zone",
  pl: "kąt martwy",
  es: "zona muerta",
  fr: "zone morte",
  de: "toter Winkel",
  it: "angolo morto",
};

/** Label of a link to the glossary article. */
export const NO_GO_LINK: Text = {
  ru: "Что такое мёртвая зона",
  en: "What the no-go zone is",
  pl: "Czym jest kąt martwy",
  es: "Qué es la zona muerta",
  fr: "Ce qu'est la zone morte",
  de: "Was der tote Winkel ist",
  it: "Che cos'è l'angolo morto",
};
