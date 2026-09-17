'use client';

import { useEffect, useRef, useState } from "react";
import type { SailingSession } from "../../sailing-lab/runtime/session";
import { advanceTrimStudy, explainTrimStudy, newTrimStudy, recordTrimStudy, type TrimStudy } from "../../sailing-lab/lessons/trim-study";

/** Owned above the responsive layout so rotating the phone/changing view
 * does not erase observations. Checkpoint restoration resets hold continuity.
 */
export function useTrimStudy(session: SailingSession) {
  const [study, setStudy] = useState<TrimStudy | null>(null);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const observing = study !== null && study.phase !== "complete" && study.phase !== "explain";
  useEffect(() => {
    if (!observing) return;
    const timer = setInterval(() => setStudy(prev => prev ? advanceTrimStudy(prev, sessionRef.current) : prev), 100);
    return () => clearInterval(timer);
  }, [observing]);
  return {
    study,
    start: () => setStudy(newTrimStudy()),
    cancel: () => setStudy(null),
    restore: (saved: TrimStudy | null) => setStudy(saved ? { ...saved, stableFor: 0, last: null, issue: null } : null),
    record: () => setStudy(prev => prev ? recordTrimStudy(prev, sessionRef.current) : prev),
    answer: (answer: "angle-only" | "shape") => setStudy(prev => prev ? explainTrimStudy(prev, answer) : prev),
  };
}
