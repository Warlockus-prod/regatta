'use client';

// Race vibration on/off (M3-4, owner decision #4). Sits next to the race sound
// switch: a labelled row in the pause sheet, a switch row in race settings.
// Shown only where a race event can vibrate (raceHapticsAvailable in
// src/lib/race-haptics.ts); default on. 44 px target, cyan only while on
// (the active control). No animation, no external asset.

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { raceHapticsAvailable, readRaceHaptics, subscribeRaceHaptics, subscribeRaceHapticsAvailable, writeRaceHaptics } from "@/lib/race-haptics";
import { useRaceSoundCopy } from "./RaceSoundToggle";

export function useRaceHapticsCopy() {
  const { tl } = useI18n();
  const { on, off } = useRaceSoundCopy();
  return {
    label: tl({ ru: "Вибрация", en: "Vibration", pl: "Wibracje", es: "Vibración", fr: "Vibrations", de: "Vibration", it: "Vibrazione" }),
    on, off,
  };
}

/** The stored choice and whether this device can vibrate at all (false during SSR). */
export function useRaceHaptics(surface: "race" | "multiplayer" = "race") {
  const on = useSyncExternalStore(subscribeRaceHaptics, readRaceHaptics, () => true);
  const available = useSyncExternalStore(subscribeRaceHapticsAvailable, raceHapticsAvailable, () => false);
  // A plain function, not useCallback: the switch is a checkbox, nothing memoizes on it.
  const setOn = (next: boolean) => writeRaceHaptics(next, surface);
  return { on, available, setOn };
}

function VibrationIcon({ on }: { on: boolean }) {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-haptics-icon={on ? "on" : "off"}>
    <rect x="8" y="4" width="8" height="16" rx="1.5" />
    {on ? <><path d="M4.5 9v6" /><path d="M19.5 9v6" /></> : <path d="M4 4l16 16" />}
  </svg>;
}

/** Labelled row for the pause sheet, beside the race sound row. */
export function RaceHapticsToggle({ on, onChange, className = "" }: {
  on: boolean; onChange: (next: boolean) => void; className?: string;
}) {
  const copy = useRaceHapticsCopy();
  const tone = on ? "text-[var(--accent-cyan)] border-[var(--accent-cyan)]" : "text-[var(--text-secondary)] border-[var(--border-subtle)]";
  return <button type="button" aria-pressed={on} onClick={() => onChange(!on)} data-testid="race-haptics-toggle"
    className={`inline-flex min-h-11 min-w-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base leading-6 ${tone} ${className}`.trim()}>
    <span className="text-[var(--text-primary)]">{copy.label}</span>
    <span className="inline-flex items-center gap-2">
      <VibrationIcon on={on} />
      <span>{on ? copy.on : copy.off}</span>
    </span>
  </button>;
}
