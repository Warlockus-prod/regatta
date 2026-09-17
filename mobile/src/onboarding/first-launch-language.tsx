import { useEffect, type ReactNode } from "react";
import { useI18n } from "../i18n/context";
import { useFirstLaunch } from "../persistence/firstLaunch";

/**
 * Home owns the guided next step. Never cover navigation or a deep link with
 * a promotional tour. I18nProvider already restores a saved language, detects
 * a supported device locale, or uses the documented default. Settings keeps
 * language selection available, without overwriting an existing preference.
 * Mark legacy interrupted tours complete after both stores have hydrated.
 */
export function FirstLaunchGate({ children }: { children: ReactNode }) {
  const { ready: i18nReady } = useI18n();
  const { ready, stage, markDone } = useFirstLaunch();
  useEffect(() => {
    if (ready && i18nReady && stage !== "done") markDone();
  }, [ready, i18nReady, stage, markDone]);
  return <>{children}</>;
}

export type { FirstLaunchStage } from "../persistence/firstLaunch";
