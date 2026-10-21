'use client';

import { useI18n } from "@/lib/i18n";
import { VENUES, venueLabel } from "@/data/venues/venues";
import { useVenue } from "./useVenue";

/** Venue chips for the race menu: which shore surrounds the race area. */
export function VenuePicker() {
  const { lang } = useI18n();
  const [venue, setVenue] = useVenue();
  return (
    <div className="mb-4" data-testid="venue-picker">
      <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{venueLabel[lang].toUpperCase()}</div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label={venueLabel[lang]}>
        {VENUES.map((v) => {
          const active = v.id === venue.id;
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
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{venue.place[lang]}</p>
    </div>
  );
}
