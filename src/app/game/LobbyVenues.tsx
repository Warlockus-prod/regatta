'use client';

// Race lobby (M1-6): the venues as cards. A venue has no photo in the repo, so
// each card shows a still strip of its own shore colours (the same palette the
// 3D scene draws), then its name and place. The shore switch stays beside the
// heading. Same storage as the shared venue picker (useVenue).

import { useI18n } from "@/lib/i18n";
import { PICKABLE_VENUES, shoreLabel, venueLabel, type Venue } from "@/data/venues/venues";
import { useVenue } from "@/features/venues/useVenue";

function shoreStrip(v: Venue): string {
  const p = v.palette;
  return `linear-gradient(90deg, ${p.sand} 0 12%, ${p.low} 12% 40%, ${p.mid} 40% 68%, ${p.high} 68% 88%, ${p.peak} 88% 100%)`;
}

export function LobbyVenues() {
  const { lang } = useI18n();
  const { picked, shoreOn, setVenue, setShoreOn } = useVenue();
  return (
    <section className="mb-5" data-testid="race-lobby-venues" aria-label={venueLabel[lang]}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wider text-[var(--text-muted)]">{venueLabel[lang].toUpperCase()}</h2>
        <label className="flex min-h-11 items-center gap-2 text-base text-[var(--text-primary)]">
          <input type="checkbox" role="switch" checked={shoreOn} onChange={(e) => setShoreOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent-cyan)]" />
          {shoreLabel[lang]}
        </label>
      </div>
      {shoreOn && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="radiogroup" aria-label={venueLabel[lang]}>
          {PICKABLE_VENUES.map((v) => {
            const active = v.id === picked.id;
            return (
              <button key={v.id} type="button" role="radio" aria-checked={active} onClick={() => setVenue(v.id)}
                className="card min-h-11 overflow-hidden p-0 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
                style={{ borderColor: active ? "var(--accent-cyan)" : undefined }}>
                <span aria-hidden className="block h-6 w-full" style={{ background: shoreStrip(v) }} />
                <span className="block px-3 pb-2 pt-1.5">
                  <span className="block text-base font-semibold leading-6 text-[var(--text-primary)]">{v.name[lang]}</span>
                  <span className="block text-sm leading-5 text-[var(--text-secondary)]">{v.place[lang]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
