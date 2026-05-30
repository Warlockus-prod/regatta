'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { TpFn } from './shared';

// Phase 2 live-weather affordance (docs/design/live-weather/DESIGN.md).
//
// Opt-in only. The synthetic TWA + windSpeed sliders stay the default and
// remain fully usable; this button just SETS the existing windSpeed value
// from real data. It does not touch the VPP physics, the runtime, scenario
// presets, or any V3 behavioral contract. On any failure it does nothing
// harmful: it surfaces a retry and leaves the slider exactly as the user
// left it.
//
// i18n: the V3 `tp` prop is 3-arg (ru/en/pl only), so it would fall back to
// English for ES/FR/DE/IT. To give all 7 languages real strings without
// changing the V3 TpFn contract, this component shadows the prop with the
// GLOBAL useI18n() tp (4-arg object form) for its own strings. The prop is
// still accepted for call-site compatibility with WindPod; it is intentionally
// unused.

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

// The sim's wind-speed slider (and WindPod.onApply) clamp speed to this range.
// Direction is never clamped. Kept in sync so the success line can warn when
// the real wind falls outside what the sim can represent.
const SIM_MIN_KN = 4;
const SIM_MAX_KN = 25;

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function cardinal(deg: number): string {
  return CARDINALS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

type State = 'idle' | 'loading' | 'ok' | 'error';

export function LiveWindButton(props: {
  onApply: (speedKn: number, dirDeg: number, spotName: string | null) => void;
  // Accepted for compatibility with WindPod; this component uses the global
  // 4-arg tp internally so all 7 languages render.
  tp: TpFn;
}) {
  const { onApply } = props;
  // Shadow the 3-arg prop tp with the global 4-arg tp (ru/en/pl + { es,fr,de,it }).
  const { tp } = useI18n();
  const [state, setState] = useState<State>('idle');
  const [data, setData] = useState<WeatherNow | null>(null);
  const [spotName, setSpotName] = useState<string | null>(null);
  // True fetched wind speed (rounded) before the sim clamp, kept so we can show
  // an honest "capped" note when it falls outside the slider range.
  const [fetchedKn, setFetchedKn] = useState<number | null>(null);

  async function fetchAt(lat: number, lon: number, name: string | null) {
    setState('loading');
    try {
      const r = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!r.ok) throw new Error('bad response');
      const j = (await r.json()) as WeatherNow;
      const rounded = Math.round(j.wind.speedKn);
      setData(j);
      setSpotName(name);
      setFetchedKn(rounded);
      setState('ok');
      // WindPod's onApply clamps speed to [SIM_MIN_KN, SIM_MAX_KN]; direction
      // is passed through untouched.
      onApply(rounded, j.wind.dirDeg, name);
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

  // When the fetched speed is outside the sim's slider range, the value the
  // sim actually uses is clamped. Report both so the user is not surprised.
  const capped =
    fetchedKn !== null && (fetchedKn < SIM_MIN_KN || fetchedKn > SIM_MAX_KN);
  const cappedTo =
    fetchedKn !== null && fetchedKn > SIM_MAX_KN ? SIM_MAX_KN : SIM_MIN_KN;

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
            ? tp('Обновить живой ветер', 'Refresh live wind', 'Odswiez zywy wiatr', {
                es: 'Actualizar viento en vivo',
                fr: 'Actualiser le vent en direct',
                de: 'Echten Wind aktualisieren',
                it: 'Aggiorna vento dal vivo',
              })
            : tp('Живой ветер', 'Live wind', 'Zywy wiatr', {
                es: 'Viento en vivo',
                fr: 'Vent en direct',
                de: 'Echter Wind',
                it: 'Vento dal vivo',
              })}
        </button>
      )}

      {state === 'loading' && (
        <div className="text-[10px] text-[var(--text-muted)] px-0.5">
          {tp('Загружаю живой ветер...', 'Loading live wind...', 'Laduje zywy wiatr...', {
            es: 'Cargando viento en vivo...',
            fr: 'Chargement du vent en direct...',
            de: 'Lade echten Wind...',
            it: 'Caricamento vento dal vivo...',
          })}
        </div>
      )}

      {state === 'error' && (
        <div className="text-[10px] px-0.5">
          <span style={{ color: 'var(--warning)' }}>
            {tp('Нет данных о ветре.', 'No wind data.', 'Brak danych o wietrze.', {
              es: 'Sin datos de viento.',
              fr: 'Pas de donnees de vent.',
              de: 'Keine Winddaten.',
              it: 'Nessun dato sul vento.',
            })}
          </span>{' '}
          <button onClick={loadLive} className="underline" style={{ color: 'var(--accent-cyan)' }}>
            {tp('Повторить', 'Retry', 'Ponow', {
              es: 'Reintentar',
              fr: 'Reessayer',
              de: 'Erneut',
              it: 'Riprova',
            })}
          </button>
        </div>
      )}

      {state === 'ok' && data && (
        <div className="text-[10px] text-[var(--text-muted)] px-0.5 leading-relaxed">
          <span style={{ color: 'var(--accent-cyan)' }}>
            {tp('Живой', 'Live', 'Zywy', { es: 'En vivo', fr: 'En direct', de: 'Echt', it: 'Dal vivo' })}:
          </span>{' '}
          {tp('от', 'from', 'z', { es: 'desde', fr: 'de', de: 'aus', it: 'da' })}{' '}
          {cardinal(data.wind.dirDeg)} ({Math.round(data.wind.dirDeg)}{' '}
          {tp('град', 'deg', 'st', { es: 'grad', fr: 'deg', de: 'Grad', it: 'gradi' })})
          {spotName ? ` - ${spotName}` : ''}
          {'. '}
          {capped && fetchedKn !== null && (
            <span style={{ color: 'var(--warning)' }}>
              {tp(
                `Живой ${fetchedKn} уз, ограничен до ${cappedTo} для этого симулятора.`,
                `Live ${fetchedKn} kn, capped to ${cappedTo} for this sim.`,
                `Zywy ${fetchedKn} w, ograniczony do ${cappedTo} dla tego symulatora.`,
                {
                  es: `En vivo ${fetchedKn} nudos, limitado a ${cappedTo} para este simulador.`,
                  fr: `En direct ${fetchedKn} noeuds, limite a ${cappedTo} pour ce simulateur.`,
                  de: `Echt ${fetchedKn} kn, begrenzt auf ${cappedTo} fuer diesen Simulator.`,
                  it: `Dal vivo ${fetchedKn} nodi, limitato a ${cappedTo} per questo simulatore.`,
                },
              )}{' '}
            </span>
          )}
          {data.current && (
            <>
              <span style={{ color: 'var(--accent-cyan)' }}>
                {tp('Течение', 'Current', 'Prad', {
                  es: 'Corriente',
                  fr: 'Courant',
                  de: 'Stroemung',
                  it: 'Corrente',
                })}
                :
              </span>{' '}
              {Math.round(data.current.setKn)}{' '}
              {tp('уз', 'kn', 'w', { es: 'nudos', fr: 'noeuds', de: 'kn', it: 'nodi' })} {'->'}{' '}
              {cardinal(data.current.dirDeg)}
              {'. '}
              {tp(
                'Течение сносит лодку, поэтому путь над грунтом отличается от курса.',
                'A current sets the boat, so course over ground differs from heading.',
                'Prad znosi lodke, wiec kurs nad dnem rozni sie od kursu.',
                {
                  es: 'Una corriente desplaza el barco, asi que el rumbo sobre el fondo difiere del rumbo.',
                  fr: 'Un courant deporte le bateau, donc la route sur le fond differe du cap.',
                  de: 'Eine Stroemung versetzt das Boot, daher weicht der Kurs ueber Grund vom Steuerkurs ab.',
                  it: 'Una corrente sposta la barca, quindi la rotta sul fondo differisce dalla prua.',
                },
              )}{' '}
            </>
          )}
          {tp(
            'Для тренировки, не для навигации.',
            'For training, not for navigation.',
            'Do treningu, nie do nawigacji.',
            {
              es: 'Para entrenamiento, no para navegacion.',
              fr: "Pour l'entrainement, pas pour la navigation.",
              de: 'Zum Training, nicht zur Navigation.',
              it: 'Per allenamento, non per navigazione.',
            },
          )}{' '}
          {data.attribution}
        </div>
      )}
    </div>
  );
}
