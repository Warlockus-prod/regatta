'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { clearWeakSpots, weakest, type WeakSpot } from './weakSpots';

// ============================================================================
// "Here is what you keep getting wrong."
//
// A score tells a learner how they did. It does not tell them what to DO. Every
// trainer here already knew which element was missed - it just forgot the moment
// the panel closed, so the same person failed the same thing eight times and was
// told about it eight separate times, as if each were new.
//
// This is the pattern, named. It only appears once there IS a pattern (something
// missed more often than it has since been fixed), so an occasional slip never
// gets promoted into an identity.
// ============================================================================

const AREA: Record<WeakSpot['area'], { icon: string; href: string }> = {
  voice: { icon: '🎙', href: '/radio/rozmowa' },
  procedure: { icon: '📻', href: '/radio/symulator' },
  dialogue: { icon: '🗣', href: '/radio/rozmowa' },
  control: { icon: '🔍', href: '/radio/obsluga' },
  position: { icon: '🧭', href: '/radio/pozycja' },
  oral: { icon: '🎓', href: '/sternik/ustny' },
};

export default function WeakSpotsPanel() {
  const { tp } = useI18n();
  const [spots, setSpots] = useState<WeakSpot[]>([]);

  useEffect(() => { setSpots(weakest()); }, []);

  if (spots.length === 0) return null;

  return (
    <section
      data-testid="weak-spots"
      className="mb-6 rounded-2xl p-4"
      style={{ background: 'rgba(255,206,77,0.06)', border: '1px solid rgba(255,206,77,0.25)' }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
          🎯 {tp('Твои слабые места', 'What you keep getting wrong', 'Twoje slabe punkty')}
        </span>
        <button
          type="button"
          data-testid="clear-weak"
          onClick={() => { clearWeakSpots(); setSpots([]); }}
          className="ml-auto min-h-[32px] rounded-full px-2 text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {tp('Сбросить', 'Reset', 'Resetuj')}
        </button>
      </div>

      <ul className="space-y-1.5">
        {spots.map((w) => (
          <li key={`${w.area}:${w.id}`} className="flex items-start gap-2 text-sm">
            <span>{AREA[w.area].icon}</span>
            <Link
              href={AREA[w.area].href}
              className="flex-1 leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              {w.label}
            </Link>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'rgba(255,107,82,0.12)', color: 'var(--danger)' }}
            >
              {w.misses}x
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {tp(
          'Это не оценка, а список того, что стоит починить. Он копится по всем тренажёрам и живёт только на этом устройстве.',
          'This is not a grade, it is a list of things to go and fix. It builds up across every trainer and never leaves this device.',
          'To nie ocena, tylko lista rzeczy do naprawienia. Zbiera sie ze wszystkich trenazerow i nie opuszcza tego urzadzenia.',
        )}
      </p>
    </section>
  );
}
