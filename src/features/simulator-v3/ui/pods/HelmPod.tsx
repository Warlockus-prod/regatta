'use client';

import {
  PodCard,
  PodLabel,
  finite,
  type SimulationModel,
  type TpFn,
} from '../shared';
import { useI18n } from '@/lib/i18n';
import { TRAINER_TERMS } from '@/lib/product/trainer-terms';

function normalizeDeg(deg: number): number {
  const safe = finite(deg);
  return ((safe % 360) + 360) % 360;
}

function shortestDelta(a: number, b: number): number {
  let d = normalizeDeg(b) - normalizeDeg(a);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// ---------------------------------------------------------------------------
// HelmPod - reads the boat's live heading and the targetHeading the runtime
// is steering toward. Shows both on a compact compass so a tack/gybe is
// visible as a turn in progress rather than an instant jump.
//
// No controls yet in PR-3: heading intent is expressed via ui.twa + tack
// flip in WindPod; HelmPod just visualizes the result. A proper wheel or
// rudder control is a later PR.
// ---------------------------------------------------------------------------

export function HelmPod({
  sim,
  tp,
  compact,
}: {
  sim: SimulationModel;
  tp: TpFn;
  compact?: boolean;
}) {
  const { lang } = useI18n();
  const hdg = normalizeDeg(sim.result.state.heading);
  const target = normalizeDeg(sim.targetHeading);
  const delta = shortestDelta(hdg, target);
  const turning = Math.abs(delta) > 1;

  const size = compact ? 68 : 86;
  const half = size / 2;
  const r = half - 6;

  return (
    <PodCard compact={compact}>
      <PodLabel
        text={tp('РУЛЬ', 'HELM', 'STER', {
          es: 'TIMÓN',
          fr: 'BARRE',
          de: 'RUDER',
          it: 'TIMONE',
        })}
        compact={compact}
      />
      <div className="flex items-center gap-3">
        <svg
          width={size}
          height={size}
          viewBox={`${-half} ${-half} ${size} ${size}`}
          className="shrink-0"
        >
          <circle
            r={r}
            fill="rgba(0, 212, 255, 0.04)"
            stroke="rgba(139, 167, 184, 0.22)"
            strokeWidth={1}
          />
          {/* Package 11 (audit B11): compass points in the reader's language
              (TRAINER_TERMS, src/lib/product/trainer-terms.ts), 12 px and the secondary text colour (they were 7-8 px
              at 1.3:1). */}
          {([
            ['compassN', 0, -r + 11, 'middle'],
            ['compassE', r - 3, 4, 'end'],
            ['compassS', 0, r - 3, 'middle'],
            ['compassW', -r + 3, 4, 'start'],
          ] as const).map(([term, x, y, anchor]) => (
            <text key={term} x={x} y={y} fill="var(--text-secondary)" fontSize="12" fontWeight="700" textAnchor={anchor}>
              {TRAINER_TERMS[term][lang]}
            </text>
          ))}

          {/* Target bearing (dashed green) - shown only while turning. */}
          {turning && (
            <g transform={`rotate(${target})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-r + 2}
                stroke="#52ff8e"
                strokeWidth={1.4}
                strokeDasharray="2 2"
                opacity="0.75"
              />
              <polygon
                points={`-3,${-r + 6} 3,${-r + 6} 0,${-r + 1}`}
                fill="#52ff8e"
                opacity="0.8"
              />
            </g>
          )}

          {/* Current heading (solid cyan). */}
          <g transform={`rotate(${hdg})`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={-r + 2}
              stroke="var(--accent-cyan)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <polygon
              points={`-4,${-r + 8} 4,${-r + 8} 0,${-r + 1}`}
              fill="var(--accent-cyan)"
            />
          </g>
          <circle r={2.5} fill="var(--accent-cyan)" />
        </svg>
        <div className="flex-1 min-w-0">
          <div
            className={`${compact ? 'text-xs' : 'text-xs'} uppercase tracking-wider font-bold text-[var(--text-muted)]`}
          >
            {tp('Курс', 'HDG', 'Kurs', {
              es: 'Rumbo',
              fr: 'Cap',
              de: 'Kurs',
              it: 'Rotta',
            })}
          </div>
          <div
            className={`font-mono font-black tabular-nums leading-none mt-0.5 ${compact ? 'text-lg' : 'text-2xl'}`}
            style={{ color: 'var(--accent-cyan)' }}
          >
            {Math.round(hdg).toString().padStart(3, '0')}°
          </div>
          {turning ? (
            <div
              className={`mt-1 ${compact ? 'text-xs' : 'text-xs'} font-bold tabular-nums`}
              style={{ color: 'var(--success)' }}
            >
              → {Math.round(target).toString().padStart(3, '0')}°
            </div>
          ) : (
            <div
              className={`mt-1 ${compact ? 'text-xs' : 'text-xs'} text-[var(--text-muted)]`}
            >
              {tp('на курсе', 'on course', 'na kursie', {
                es: 'a rumbo',
                fr: 'en route',
                de: 'auf Kurs',
                it: 'in rotta',
              })}
            </div>
          )}
        </div>
      </div>
    </PodCard>
  );
}
