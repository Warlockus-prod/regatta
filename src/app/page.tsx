'use client';

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { FOUNDATION_EVENT } from "@/lib/learning/foundation-progress";
import type { LearningSnapshot } from "@/lib/product/learning";
import { readWebLearning } from "@/lib/product/learning-web";
import { DEFAULT_LAST_RACE_SETUP, raceSetupHref, readLastRaceSetup } from "@/lib/race-last-setup";
import { HomeView } from "@/components/product/HomeView";

export default function Home() {
  const { lang } = useI18n();
  const [snapshot, setSnapshot] = useState<LearningSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [raceHref, setRaceHref] = useState(() => raceSetupHref(DEFAULT_LAST_RACE_SETUP, true));
  const refresh = useCallback(() => {
    try { setSnapshot(readWebLearning()); setError(false); }
    catch { setSnapshot(null); setError(true); }
    let storage: Storage | null = null;
    try { storage = localStorage; } catch { /* blocked storage: the first race */ }
    setRaceHref(raceSetupHref(readLastRaceSetup(storage), true));
  }, []);
  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(FOUNDATION_EVENT, refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); window.removeEventListener(FOUNDATION_EVENT, refresh); };
  }, [refresh]);
  return <HomeView lang={lang} snapshot={snapshot} error={error} onRetry={refresh} raceHref={raceHref} />;
}
