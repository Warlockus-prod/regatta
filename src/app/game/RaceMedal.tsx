'use client';

// M4-5 course medals (src/lib/race-medals.ts, copy in src/data/race-medal-copy.ts):
// the medal this race earned and the next one on the solo race result screen,
// and the course medal with the next goal in the race menu. The medal disc is
// decoration for the word next to it, hidden from screen readers; it is not
// cyan (nothing here is an action) and it does not move. Renders nothing for
// a race without a medal course (the physical trial) or a did-not-finish.

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { fillMedal, medalCourseText, medalGoalText, raceMedalCopy } from "@/data/race-medal-copy";
import { courseMedal, medalThresholds, nextMedalGoal, readMedalStore, type MedalAward, type MedalCourse, type RaceMedal } from "@/lib/race-medals";
import type { Lang } from "@/lib/languages";
import { localStore } from "./race-model";

/** Metal tones, the same in both themes; the outline is the text colour. */
const MEDAL_FILL: Record<RaceMedal, string> = { bronze: "#b87333", silver: "#a7b0b9", gold: "#d4a72c" };

export function MedalDisc({ medal, size = 24 }: { medal: RaceMedal | null; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" data-medal-disc={medal ?? "none"} className="shrink-0">
    <path d="M8 2l2.5 6M16 2l-2.5 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
    <circle cx="12" cy="15" r="7" fill={medal ? MEDAL_FILL[medal] : "none"} stroke="currentColor" strokeWidth={medal ? 1.5 : 2} strokeDasharray={medal ? undefined : "3 2"} />
  </svg>;
}

const courseText = (course: MedalCourse, lang: Lang) => medalCourseText(course.difficulty, course.windStrength, lang);

/** Results: what this race earned for the course, and the next medal. */
export function RaceMedalResult({ award, course, mode, hintsUsed, finishSec }: {
  award: MedalAward | null; course: MedalCourse; mode: "simple" | "pro"; hintsUsed: boolean; finishSec: number | null;
}) {
  const { lang } = useI18n();
  if (!award) return null;
  const goal = nextMedalGoal(award.medal, course);
  const gold = medalThresholds(course)?.goldSec ?? null;
  const fastButHinted = goal?.medal === "gold" && hintsUsed && finishSec !== null && gold !== null && finishSec <= gold;
  // Not stored: name only what this race earned, never "New medal" or a course medal the menu will not show.
  const unsaved = award.saved === false;
  const shown = unsaved ? award.earned ?? award.medal : award.medal;
  const heading = unsaved ? raceMedalCopy.thisRace : award.improved ? raceMedalCopy.newMedal : raceMedalCopy.courseMedal;
  return (
    <section className="mb-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-base leading-6" data-testid="race-results-medal"
      data-medal={shown} data-improved={award.improved && !unsaved ? "true" : "false"} data-saved={unsaved ? "false" : "true"}>
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <MedalDisc medal={shown} size={28} />
        <span className="font-semibold">{fillMedal(heading[lang], { medal: raceMedalCopy.medal[shown][lang] })}</span>
      </div>
      <p className="mt-1 text-[var(--text-secondary)]">{courseText(course, lang)}</p>
      {unsaved && <p className="mt-1 text-[var(--text-primary)]" data-testid="race-results-medal-unsaved">{raceMedalCopy.notSaved[lang]}</p>}
      <p className="mt-1 text-[var(--text-primary)]" data-testid="race-results-medal-next">
        {goal === null ? raceMedalCopy.top[lang] : fastButHinted ? raceMedalCopy.goldWithHints[lang] : medalGoalText(goal, mode, lang)}
      </p>
    </section>
  );
}

/** Race menu: the medal of the selected course and the next goal. Reads the
 * stored row on every mount (the menu mounts again after each race). */
export function RaceMedalLine({ course, mode }: { course: MedalCourse; mode: "simple" | "pro" }) {
  const { lang } = useI18n();
  const { raceContext, difficulty, windStrength } = course;
  const medal = useMemo(() => courseMedal(readMedalStore(localStore()), { raceContext, difficulty, windStrength }), [raceContext, difficulty, windStrength]);
  const goal = nextMedalGoal(medal, course);
  if (!medalThresholds(course)) return null;
  return (
    <div className="mb-4 flex items-start gap-2 text-base leading-6" data-testid="race-lobby-medal" data-medal={medal ?? "none"}>
      <span className="mt-0.5 text-[var(--text-secondary)]"><MedalDisc medal={medal} /></span>
      <p className="min-w-0">
        <span className="font-semibold text-[var(--text-primary)]">
          {medal ? fillMedal(raceMedalCopy.courseMedal[lang], { medal: raceMedalCopy.medal[medal][lang] }) : raceMedalCopy.noMedal[lang]}
        </span>
        <span className="text-[var(--text-secondary)]"> · {courseText(course, lang)}</span>
        <span className="block text-[var(--text-secondary)]" data-testid="race-lobby-medal-next">{goal === null ? raceMedalCopy.top[lang] : medalGoalText(goal, mode, lang)}</span>
      </p>
    </div>
  );
}
