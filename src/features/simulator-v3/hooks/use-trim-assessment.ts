'use client';

import { useEffect, useRef, useState } from "react";
import type { SailingSession } from "../../sailing-lab/runtime/session";
import { advanceTrimAssessment, explainTrimAssessment, newTrimAssessment, recordTrimAssessment, type TrimAssessment, type TrimTask } from "../../sailing-lab/lessons/trim-assessment";

// Owned outside responsive panels. Closing/reopening controls cannot restart it.
export function useTrimAssessment(session: SailingSession) {
  const [assessment, setAssessment] = useState<TrimAssessment | null>(null);
  const current = useRef(session);
  useEffect(() => { current.current = session; }, [session]);
  const active = assessment?.phase === "baseline" || assessment?.phase === "perform";
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setAssessment(previous => previous ? advanceTrimAssessment(previous, current.current) : null), 100);
    return () => clearInterval(timer);
  }, [active]);
  return {
    assessment,
    start: (task: TrimTask) => setAssessment(newTrimAssessment(task)),
    cancel: () => setAssessment(null),
    record: () => setAssessment(previous => previous ? recordTrimAssessment(previous, current.current) : null),
    answer: (causal: boolean) => setAssessment(previous => previous ? explainTrimAssessment(previous, causal) : null),
  };
}
