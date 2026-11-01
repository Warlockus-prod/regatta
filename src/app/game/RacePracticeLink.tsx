'use client';

// M4-2 links of the race finish screen: a mistake's practice (judge items,
// coach mistakes, the "Practise" slot) and the return of a lesson race. On the
// website they are plain links that carry the race to return to
// (src/lib/race-return.ts); inside the app the race page asks the app to open
// the matching in-app screen instead (navigateNativeRaceFinish).

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { RacePracticeTarget } from "@/data/race-practice";
import { RACE_PRACTICE_COPY } from "@/data/race-practice";
import { useI18n } from "@/lib/i18n";
import { navigateNativeRaceFinish } from "@/lib/race-native-env";
import { raceLessonLinks, racePracticeHref, racePracticeLabel, racePracticeNativeHref, racePracticeTitle } from "@/lib/race-practice";
import type { RaceReturn } from "@/lib/race-return";

const ACTION = "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-center text-base leading-6 text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)]";
const INLINE = "inline-flex min-h-11 items-center text-base leading-6 text-[var(--accent-cyan)] underline-offset-2 hover:underline";

function FinishLink({ href, nativeHref, native, className, testId, children, data, newTab = false }: {
  href: string; nativeHref: string; native: boolean; className: string; testId: string; children: ReactNode; data?: Record<string, string>; newTab?: boolean;
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (native && navigateNativeRaceFinish(nativeHref)) event.preventDefault();
  };
  const tab = newTab && !native ? { target: "_blank", rel: "noopener" } : {};
  return <Link href={href} prefetch={false} onClick={onClick} data-testid={testId} data-native-href={nativeHref} className={className} {...tab} {...data}>{children}</Link>;
}

/** One practice link. `variant="action"`: the finish screen's "Practise"
 * button for the main mistake; `"inline"`: under a judge item or a coach mistake.
 * On the website it opens in a new tab: the finish screen lives only in this
 * page's memory, so leaving it would lose the debrief, the replay and a result
 * not yet saved to the leaderboard. The practice tab still has "Back to the
 * race" (the same setup). In the app the native screen opens over the race. */
export function RacePracticeLink({ target, ret, native, variant = "inline" }: {
  target: RacePracticeTarget | null; ret: RaceReturn | null; native: boolean; variant?: "action" | "inline";
}) {
  const { lang } = useI18n();
  if (!target) return null;
  return <FinishLink href={racePracticeHref(target, ret)} nativeHref={racePracticeNativeHref(target)} native={native} newTab
    className={variant === "action" ? ACTION : INLINE} testId={variant === "action" ? "race-practise" : "race-practice-link"}
    data={{ "data-practice-kind": target.kind, "data-practice-id": target.id }}>
    {variant === "action" ? `${RACE_PRACTICE_COPY.practise[lang]}: ${racePracticeTitle(target, lang)}` : racePracticeLabel(target, lang)}
  </FinishLink>;
}

/** After a race opened from a foundation lesson (lesson 8, the mini race):
 * "Back to the lesson" and the next lesson, or the next course after the last one. */
export function RaceLessonReturn({ lessonId, native }: { lessonId: string | null; native: boolean }) {
  const { lang } = useI18n();
  if (!lessonId) return null;
  const web = raceLessonLinks(lessonId, lang, false);
  const app = raceLessonLinks(lessonId, lang, true);
  if (!web || !app) return null;
  return <nav className="mb-5 flex flex-col gap-2" aria-label={RACE_PRACTICE_COPY.backToLesson[lang]} data-testid="race-lesson-return">
    <FinishLink href={web.back.href} nativeHref={app.back.href} native={native} className={ACTION} testId="race-lesson-back">{web.back.label}</FinishLink>
    <FinishLink href={web.next.href} nativeHref={app.next.href} native={native} className={ACTION} testId="race-lesson-next">{web.next.label}</FinishLink>
  </nav>;
}
