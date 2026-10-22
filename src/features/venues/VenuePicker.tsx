'use client';

import { useI18n } from "@/lib/i18n";
import { PICKABLE_VENUES, shoreLabel, venueLabel } from "@/data/venues/venues";
import { useVenue } from "./useVenue";

/** Race menu: the shore switch and the venue chips (which shore surrounds the race area). */
export function VenuePicker() {
  const { lang } = useI18n();
  const { picked, shoreOn, setVenue, setShoreOn } = useVenue();
  return (
    <div className="mb-4" data-testid="venue-picker">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">{venueLabel[lang].toUpperCase()}</div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--text-primary)]">
          <input type="checkbox" role="switch" checked={shoreOn} onChange={(e) => setShoreOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent-cyan)]" />
          {shoreLabel[lang]}
        </label>
      </div>
      {shoreOn && <>
        <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label={venueLabel[lang]}>
          {PICKABLE_VENUES.map((v) => {
            const active = v.id === picked.id;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setVenue(v.id)}
                className="shrink-0 min-h-11 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
                style={{
                  borderColor: active ? "var(--accent-cyan)" : "rgba(139, 167, 184, 0.25)",
                  background: active ? "rgba(0, 212, 255, 0.1)" : "transparent",
                  color: active ? "var(--accent-cyan)" : "var(--text-primary)",
                }}
              >
                {v.name[lang]}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{picked.place[lang]}</p>
      </>}
    </div>
  );
}
