'use client';

// React wiring of the first race hints (M4-7, first-race-hints.ts): the
// device record the race loop reads every tick (a ref, so the loop never
// touches storage), the entry point that posts a hint to the feedback bus,
// and "Show hints again". A hint counts as seen only once its toast has been
// on screen for HINT_TIMING.readSec while the race runs: one still waiting
// for a slot, or one that ran out behind the pause sheet (toasts keep the
// page clock, not the race clock), comes back next race.

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { Lang } from "@/lib/languages";
import { firstRaceHintText } from "@/data/race-first-hints-copy";
import type { FeedbackPost, FeedbackToast } from "./feedback";
import { FIRST_RACE_HINTS, HINT_TIMING, markFirstRaceHintSeen, readFirstRaceHints, resetFirstRaceHints, type FirstRaceHint, type FirstRaceHintId } from "./first-race-hints";

/** What the race loop reads: the hints already shown, and a revision that
 * "Show hints again" bumps so the running race forgets what it fired. */
export interface FirstRaceHintsRecord { seen: Set<FirstRaceHintId>; revision: number }

const isHintId = (v: unknown): v is FirstRaceHintId => typeof v === "string" && (FIRST_RACE_HINTS as readonly string[]).includes(v);

export function useFirstRaceHints(post: (message: FeedbackPost) => void, visible: readonly FeedbackToast[], langRef: RefObject<Lang>, paused = false) {
  // Every hint counts as seen until the device record is read (server render, first paint).
  const hintsRef = useRef<FirstRaceHintsRecord>({ seen: new Set(FIRST_RACE_HINTS), revision: 0 });
  /** Read the device record; GameClient calls it when a race is set up. */
  const reload = useCallback(() => { hintsRef.current = { ...hintsRef.current, seen: readFirstRaceHints() }; }, []);
  useEffect(reload, [reload]);
  const showHint = useCallback((hint: FirstRaceHint) => {
    post({ source: "hint", text: firstRaceHintText(langRef.current, hint), tone: "info", tag: hint.id });
  }, [post, langRef]);
  // The hint on screen, as primitives: other toasts coming and going do not restart its reading time.
  const showing = visible.find(t => t.source === "hint" && isHintId(t.tag));
  const showingTag = showing?.tag;
  const showingKey = showing ? `${showing.id}@${showing.shownAt}` : null;
  /** Reading time of the hint on screen so far, ms, summed over the stretches the race ran. */
  const readRef = useRef<{ key: string | null; ms: number }>({ key: null, ms: 0 });
  useEffect(() => {
    if (readRef.current.key !== showingKey) readRef.current = { key: showingKey, ms: 0 };
    if (!showingKey || !isHintId(showingTag) || hintsRef.current.seen.has(showingTag)) return;
    if (paused) return;
    const id = showingTag, started = performance.now();
    const timer = setTimeout(() => {
      if (hintsRef.current.seen.has(id)) return;
      hintsRef.current.seen.add(id);
      markFirstRaceHintSeen(id);
    }, Math.max(0, HINT_TIMING.readSec * 1000 - readRef.current.ms));
    return () => {
      clearTimeout(timer);
      if (readRef.current.key === showingKey) readRef.current.ms += performance.now() - started;
    };
  }, [showingKey, showingTag, paused]);
  const showAgain = useCallback(() => {
    resetFirstRaceHints();
    hintsRef.current = { seen: new Set(), revision: hintsRef.current.revision + 1 };
  }, []);
  return { hintsRef, showHint, reload, showAgain };
}
