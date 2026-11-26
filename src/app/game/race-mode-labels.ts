import type { Lang } from "@/lib/languages";
import { RACE_MODES } from "@/lib/product/ui-terms";

/** The two control modes, shared with the leaderboard (M1-7), which ranks
 * them in separate tables. A module of its own so the leaderboard does not
 * bundle the whole race copy (race-copy.ts re-exports it for the race). */
// Package 10: the names are the one UI dictionary's (R-12: "Простой" and "Pro"), the same object.
export const RACE_MODE_LABELS: Record<"simple" | "pro", Record<Lang, string>> = RACE_MODES;
