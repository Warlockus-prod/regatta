'use client';

import { useState } from 'react';
import type { TpFn } from './shared';

// Phase 2 live-weather affordance (docs/design/live-weather/DESIGN.md).
//
// Opt-in only. The synthetic TWA + windSpeed sliders stay the default and
// remain fully usable; this button just SETS the existing windSpeed value
// from real data. It does not touch the VPP physics, the runtime, scenario
// presets, or any V3 behavioral contract. On any failure it does nothing
// harmful: it surfaces a retry and leaves the slider exactly as the user
// left it.

// Minimal slice of the /api/weather response (shape: src/lib/weather/types.ts).
// We read the wind speed/direction, the optional ocean current (Phase 3,
// display-only), and the required attribution string.
interface WeatherNow {
  wind: { speedKn: number; dirDeg: number; gustKn: number | null };
  current?: { setKn: number; dirDeg: number } | null;
  attribution: string;
}

// Fallback when geolocation is denied or unavailable: a well-known sailing
// venue so the affordance still works without a precise position. Mirrors the
// DEFAULT_SPOT in src/components/WindNowCard.tsx.
const DEFAULT_SPOT = { lat: 39.57, lon: 2.65, name: 'Palma' };

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function cardinal(deg: number): string {
  return CARDINALS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

type State = 'idle' | 'loading' | 'ok' | 'error';

export function LiveWindButton(props: {
  onApply: (speedKn: number, dirDeg: number, spotName: string | null) => void;
  tp: TpFn;
}) {
  const { onApply, tp } = props;
  const [state, setState] = useState<State>('idle');
  const [data, setData] = useState<WeatherNow | null>(null);
  const [spotName, setSpotName] = useState<string | null>(null);

  async function fetchAt(lat: number, lon: number, name: string | null) {
    setState('loading');
    try {
      const r = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!r.ok) throw new Error('bad response');
      const j = (await r.json()) as WeatherNow;
      setData(j);
      setSpotName(name);
      setState('ok');
      onApply(Math.round(j.wind.speedKn), j.wind.dirDeg, name);
    } catch {
      // Any failure (offline, 4xx/5xx, bad JSON) leaves the slider as-is and
      // offers a retry. Never throws, never mutates wind on failure.
      setState('error');
    }
  }

  function loadLive() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      void fetchAt(DEFAULT_SPOT.lat, DEFAULT_SPOT.lon, DEFAULT_SPOT.name);
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => void fetchAt(pos.coords.latitude, pos.coords.longitude, null),
      // Denial / unavailable / timeout -> fall back to the default spot.
      () => void fetchAt(DEFAULT_SPOT.lat, DEFAULT_SPOT.lon, DEFAULT_SPOT.name),
      { timeout: 8000, maximumAge: 600000 },
    );
  }

  return (
    <div className="space-y-1">
      {(state === 'idle' || state === 'ok' || state === 'error') && (
        <button
          onClick={loadLive}
          className="w-full px-2 py-1 text-[10px] rounded-md border font-semibold transition uppercase tracking-wider"
          style={{
            borderColor: 'rgba(0, 212, 255, 0.22)',
            background: 'rgba(0, 212, 255, 0.08)',
            color: 'var(--accent-cyan)',
          }}
        >
          {state === 'ok'
            ? tp('Обновить живой ветер', 'Refresh live wind', 'Odswiez zywy wiatr')
            : tp('Живой ветер', 'Live wind', 'Zywy wiatr')}
        </button>
      )}

      {state === 'loading' && (
        <div className="text-[10px] text-[var(--text-muted)] px-0.5">
          {tp('Загружаю живой ветер...', 'Loading live wind...', 'Laduje zywy wiatr...')}
        </div>
      )}

      {state === 'error' && (
        <div className="text-[10px] px-0.5">
          <span style={{ color: 'var(--warning)' }}>
            {tp('Нет данных о ветре.', 'No wind data.', 'Brak danych o wietrze.')}
          </span>{' '}
          <button onClick={loadLive} className="underline" style={{ color: 'var(--accent-cyan)' }}>
            {tp('Повторить', 'Retry', 'Ponow')}
          </button>
        </div>
      )}

      {state === 'ok' && data && (
        <div className="text-[10px] text-[var(--text-muted)] px-0.5 leading-relaxed">
          <span style={{ color: 'var(--accent-cyan)' }}>
            {tp('Живой', 'Live', 'Zywy')}:
          </span>{' '}
          {tp('от', 'from', 'z')} {cardinal(data.wind.dirDeg)} ({Math.round(data.wind.dirDeg)}{' '}
          {tp('град', 'deg', 'st')})
          {spotName ? ` - ${spotName}` : ''}
          {'. '}
          {data.current && (
            <>
              <span style={{ color: 'var(--accent-cyan)' }}>
                {tp('Течение', 'Current', 'Prad')}:
              </span>{' '}
              {Math.round(data.current.setKn)} {tp('уз', 'kn', 'w')} {'->'}{' '}
              {cardinal(data.current.dirDeg)}
              {'. '}
              {tp(
                'Течение сносит лодку, поэтому путь над грунтом отличается от курса.',
                'A current sets the boat, so course over ground differs from heading.',
                'Prad znosi lodke, wiec kurs nad dnem rozni sie od kursu.',
              )}{' '}
            </>
          )}
          {tp(
            'Для тренировки, не для навигации.',
            'For training, not for navigation.',
            'Do treningu, nie do nawigacji.',
          )}{' '}
          {data.attribution}
        </div>
      )}
    </div>
  );
}
