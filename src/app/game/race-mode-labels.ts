import type { Lang } from "@/lib/languages";

/** The two control modes, shared with the leaderboard (M1-7), which ranks
 * them in separate tables. A module of its own so the leaderboard does not
 * bundle the whole race copy (race-copy.ts re-exports it for the race). */
export const RACE_MODE_LABELS = {
  simple: { ru: "Обычный", en: "Simple", pl: "Prosty", es: "Sencillo", fr: "Simple", de: "Einfach", it: "Semplice" },
  pro: { ru: "Pro", en: "Pro", pl: "Pro", es: "Pro", fr: "Pro", de: "Pro", it: "Pro" },
} as const satisfies Record<"simple" | "pro", Record<Lang, string>>;
