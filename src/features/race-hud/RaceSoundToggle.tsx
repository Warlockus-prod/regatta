'use client';

// Race sound on/off (M1-5, owner decision #3). One button for the race status
// row (icon only, the name is the accessible label) and, with `showLabel`, a
// row for the pause sheet. 44 px target. Cyan marks it only while it is the
// active control, i.e. while race sound is on; off is the neutral text colour.
// Controlled: the caller passes the stored choice (useRaceSound in
// src/app/game/race-prefs.ts) so the click that turns sound on is the gesture
// that unlocks audio on iOS / Safari. No animation, no external asset.

import { useI18n } from "@/lib/i18n";

export function useRaceSoundCopy() {
  const { tl } = useI18n();
  return {
    label: tl({ ru: "Звук гонки", en: "Race sound", pl: "Dźwięk wyścigu", es: "Sonido de la regata", fr: "Son de la course", de: "Rennton", it: "Audio della regata" }),
    on: tl({ ru: "Вкл.", en: "On", pl: "Wł.", es: "Activado", fr: "Activé", de: "An", it: "Attivo" }),
    off: tl({ ru: "Выкл.", en: "Off", pl: "Wył.", es: "Desactivado", fr: "Désactivé", de: "Aus", it: "Disattivo" }),
  };
}

function SpeakerIcon({ on }: { on: boolean }) {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-sound-icon={on ? "on" : "off"}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {on ? <><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></>
      : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
  </svg>;
}

export function RaceSoundToggle({ on, onChange, showLabel = false, className = "" }: {
  on: boolean; onChange: (next: boolean) => void; showLabel?: boolean; className?: string;
}) {
  const copy = useRaceSoundCopy();
  const tone = on ? "text-[var(--accent-cyan)] border-[var(--accent-cyan)]" : "text-[var(--text-secondary)] border-[var(--border-subtle)]";
  const shape = showLabel ? "w-full justify-between gap-3 px-3 text-base leading-6" : "justify-center";
  return <button type="button" aria-pressed={on} aria-label={showLabel ? undefined : copy.label}
    title={showLabel ? undefined : `${copy.label}: ${on ? copy.on : copy.off}`}
    onClick={() => onChange(!on)} data-testid="race-sound-toggle"
    className={`inline-flex min-h-11 min-w-11 items-center rounded-lg border bg-transparent ${shape} ${tone} ${className}`.trim()}>
    {showLabel && <span className="text-[var(--text-primary)]">{copy.label}</span>}
    <span className="inline-flex items-center gap-2">
      <SpeakerIcon on={on} />
      {showLabel && <span>{on ? copy.on : copy.off}</span>}
    </span>
  </button>;
}
