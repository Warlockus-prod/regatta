"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { RACE_PRACTICE_COPY } from "@/data/race-practice";
import { useI18n } from "@/lib/i18n";
import { raceReturnHref, readRaceReturn } from "@/lib/race-return";

const subscribe = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};

/** The /game link to return to, or null: the page was not opened from a race
 * finish screen, or it runs inside the app (native back returns there). */
export function useRaceReturnHref(initialSearch?: string): string | null {
  return useSyncExternalStore(subscribe, () => {
    const ret = readRaceReturn(initialSearch ?? window.location.search, Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView));
    return ret ? raceReturnHref(ret) : null;
  }, () => null);
}

/** M4-2: "Back to the race" on a practice page opened from the race debrief
 * (src/lib/race-return.ts). Renders nothing otherwise. */
export function RaceReturn({ bar = false, initialSearch }: { bar?: boolean; initialSearch?: string }) {
  const { lang } = useI18n();
  const href = useRaceReturnHref(initialSearch);
  if (!href) return null;
  const link = <Link href={href} data-testid="race-return" className="inline-flex min-h-11 min-w-11 shrink-0 items-center rounded-md px-2 text-sm text-[var(--accent-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]">
    ‹ {RACE_PRACTICE_COPY.backToRace[lang]}
  </Link>;
  return bar ? <div className="shrink-0 border-b border-[var(--border-subtle)] px-5">{link}</div> : link;
}
