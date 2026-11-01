'use client';

// M4-6 race home on the website lobby (/game): ONE "next step" card on top
// (src/lib/race-next-step.ts picks it: the last race's goal, the next medal
// of the course, or today's daily race), the personal record and the progress
// under it, and the entry to the daily race. Not cyan except the one
// secondary link, which is an action; the lobby's primary action stays the
// start button. No animation. Gentle: a count of days, never a streak.

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { raceNextStepCopy } from "@/data/race-next-step-copy";
import { fillMedal, medalCourseText } from "@/data/race-medal-copy";
import { RaceMedalLine } from "./RaceMedal";
import { RACE_PRACTICE_COPY } from "@/data/race-practice";
import { copy as productCopy } from "@/lib/product/copy";
import { BEST_TIMES_STORAGE_KEY, formatRecordTime } from "@/lib/best-times";
import { readMedalStore, type MedalCourse } from "@/lib/race-medals";
import { racePracticeHref, racePracticeTitle } from "@/lib/race-practice";
import { hasRacedBefore, raceHomeView, readRaceHomeStore, type RaceHomeView } from "@/lib/race-next-step";
import type { RaceReturn } from "@/lib/race-return";

/** The lobby's view of the stored rows. A plain read, not a hook: the lobby
 * mounts again after every race, and each read is three small rows. */
export function readLobbyHome(storage: Pick<Storage, "getItem"> | null, course: MedalCourse, mode: "simple" | "pro",
  opts: { now?: Date; inDaily: boolean; courseChosen: boolean }): RaceHomeView {
  let bestTimesRaw: string | null = null;
  try { bestTimesRaw = storage?.getItem(BEST_TIMES_STORAGE_KEY) ?? null; } catch { bestTimesRaw = null; }
  return raceHomeView({ home: readRaceHomeStore(storage), medals: readMedalStore(storage), bestTimesRaw, course, mode,
    now: opts.now ?? new Date(), inDaily: opts.inDaily, courseChosen: opts.courseChosen });
}

/** F1: whether this browser has ended a solo race (the race home row or a
 * personal best), so the lobby names its easy preset "Easy race", not "First
 * race". A storage that throws reads as no race. */
export function readRacedBefore(storage: Pick<Storage, "getItem"> | null): boolean {
  let bestTimesRaw: string | null = null;
  try { bestTimesRaw = storage?.getItem(BEST_TIMES_STORAGE_KEY) ?? null; } catch { bestTimesRaw = null; }
  return hasRacedBefore({ home: readRaceHomeStore(storage), bestTimesRaw });
}

/** The daily race's link: a full page load, so the race reads its setup from the query. */
export const dailyRaceHref = (day: string) => `/game?daily=${day}`;

const SECONDARY = "mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-center text-base leading-6 text-[var(--accent-cyan)] transition hover:border-[var(--accent-cyan)]";

export function RaceNextStepCard({ view, mode, practiceReturn }: { view: RaceHomeView; mode: "simple" | "pro"; practiceReturn: RaceReturn | null }) {
  const { lang } = useI18n();
  const { step } = view;
  const progress = [
    view.recordSec !== null ? fillMedal(raceNextStepCopy.record[lang], { time: formatRecordTime(view.recordSec) }) : null,
    view.medals.total > 0 ? fillMedal(raceNextStepCopy.medals[lang], { won: String(view.medals.won), total: String(view.medals.total) }) : null,
    view.weekDays > 0 ? fillMedal(raceNextStepCopy.week[lang], { n: String(view.weekDays) }) : null,
  ].filter((line): line is string => line !== null);
  if (!step && !progress.length) return null;
  const dailyCourse = medalCourseText(view.daily.difficulty, view.daily.windStrength, lang);
  return (
    <section className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-base leading-6"
      data-testid="race-next-step" data-step={step?.kind ?? "none"} aria-labelledby={step && step.kind !== "medal" ? "race-next-step-title" : undefined}>
      {step && <>
        <p className="text-sm font-semibold text-[var(--text-muted)]">{raceNextStepCopy.eyebrow[lang]}</p>
        {step.kind === "medal" ? (
          // The medal step is the course medal line of M4-5 (the medal so far and the next one), moved into the card.
          <div className="mt-1 [&>div]:mb-0" data-testid="race-next-step-title"><RaceMedalLine course={view.medalCourse} mode={mode} /></div>
        ) : <>
          <h2 id="race-next-step-title" className="mt-1 font-semibold text-[var(--text-primary)]" data-testid="race-next-step-title">
            {step.kind === "goal" ? raceNextStepCopy.goal[step.goal].title[lang] : productCopy.daily[lang]}
          </h2>
          <p className="mt-1 text-[var(--text-secondary)]" data-testid="race-next-step-body">
            {step.kind === "goal" ? raceNextStepCopy.goal[step.goal].body[lang] : fillMedal(raceNextStepCopy.dailyToday[lang], { course: dailyCourse })}
          </p>
        </>}
        {step.kind === "goal" && (
          <Link href={racePracticeHref(step.practice, practiceReturn)} prefetch={false} className={SECONDARY} data-testid="race-next-step-action"
            data-practice-kind={step.practice.kind} data-practice-id={step.practice.id}>
            {`${RACE_PRACTICE_COPY.practise[lang]}: ${racePracticeTitle(step.practice, lang)}`}
          </Link>
        )}
        {step.kind === "daily" && (
          // A plain <a>: a full load, the race reads the daily setup once, on mount.
          <a href={dailyRaceHref(step.day)} className={SECONDARY} data-testid="race-next-step-action">{raceNextStepCopy.dailyGo[lang]}</a>
        )}
      </>}
      {progress.length > 0 && (
        <ul className={`${step ? "mt-3 border-t border-[var(--border-subtle)] pt-3 " : ""}space-y-1 text-[var(--text-secondary)]`} data-testid="race-next-step-progress">
          {progress.map(line => <li key={line}>{line}</li>)}
        </ul>
      )}
    </section>
  );
}

/** The website's entry to today's daily race, when the card is not already it. */
export function RaceDailyEntry({ view }: { view: RaceHomeView }) {
  const { lang } = useI18n();
  const course = medalCourseText(view.daily.difficulty, view.daily.windStrength, lang);
  return (
    // A plain <a>: a full load, the race reads the daily setup once, on mount.
    <a href={dailyRaceHref(view.daily.day)} data-testid="race-lobby-daily-entry"
      className="mb-4 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-base leading-6 transition hover:border-[var(--accent-cyan)]">
      <span className="font-semibold text-[var(--text-primary)]">{productCopy.daily[lang]}</span>
      <span className="text-[var(--text-secondary)] text-right">{fillMedal(raceNextStepCopy.dailyToday[lang], { course })}</span>
    </a>
  );
}
