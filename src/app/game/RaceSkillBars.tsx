'use client';

// M4-1 skill bars on the solo race result screen, under the place and time:
// one plain label and one number per bar (src/lib/race-skill-metrics.ts,
// copy in src/data/race-skill-copy.ts). The bar is decoration for the number
// next to it, so it is hidden from screen readers. A number that reaches its
// threshold gets a check mark next to the label and "good result" for screen
// readers, not a colour of its own: every fill is the same neutral tone (the
// light theme's success teal sits next to its action cyan). Not cyan: nothing
// here is an action. Renders nothing without bars (the physical trial, an
// empty log).

import { useI18n } from "@/lib/i18n";
import { raceSkillCopy, skillBarText } from "@/data/race-skill-copy";
import type { SkillBar } from "@/lib/race-skill-metrics";
import { CheckIcon } from "@/features/race-hud/RaceIcons";

export function RaceSkillBars({ bars }: { bars?: readonly SkillBar[] | null }) {
  const { tl, lang } = useI18n();
  if (!bars?.length) return null;
  return (
    <section className="mb-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-base leading-6" data-testid="race-results-skills">
      <h2 className="mb-2 font-semibold text-[var(--text-muted)]">{tl(raceSkillCopy.title)}</h2>
      <ul className="space-y-3">
        {bars.map((bar) => {
          const text = skillBarText(bar, lang);
          return (
            <li key={bar.id} data-testid={`race-skill-${bar.id}`} data-good={bar.good ? "true" : "false"}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                  {text.label}{bar.good && <CheckIcon size={16} data-testid="race-skill-good" />}
                </span>
                <span className="text-[var(--text-secondary)]">
                  {text.value}{bar.good && <span className="sr-only">, {tl(raceSkillCopy.good)}</span>}
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <div className="h-full rounded-full bg-[var(--text-muted)]" style={{ width: `${Math.round(bar.fill * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
