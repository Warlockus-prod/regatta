'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

// Phase 1 live-weather widget (docs/design/live-weather/DESIGN.md).
// Opt-in: it never fetches on mount, so it adds no latency or permission
// prompt to the landing page. The synthetic simulator wind is unaffected;
// this is a read-only "what is the wind doing right now" teaching card.

interface WeatherNow {
  provider: string;
  ts: string;
  wind: { speedKn: number; dirDeg: number; gustKn: number | null };
  wave: { heightM: number; dirDeg: number; periodS: number } | null;
  attribution: string;
}

// Fallback when geolocation is denied or unavailable: a well-known sailing
// venue so the card is still useful without a precise position.
const DEFAULT_SPOT = { lat: 39.57, lon: 2.65, name: 'Palma' };

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function cardinal(deg: number): string {
  return CARDINALS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

type State = 'idle' | 'loading' | 'ok' | 'error';

export function WindNowCard() {
  const { tp } = useI18n();
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
    } catch {
      setState('error');
    }
  }

  function showWind() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      fetchAt(DEFAULT_SPOT.lat, DEFAULT_SPOT.lon, DEFAULT_SPOT.name);
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchAt(pos.coords.latitude, pos.coords.longitude, null),
      () => fetchAt(DEFAULT_SPOT.lat, DEFAULT_SPOT.lon, DEFAULT_SPOT.name),
      { timeout: 8000, maximumAge: 600000 },
    );
  }

  return (
    <div className="card p-5" style={{ borderColor: 'rgba(0, 212, 255, 0.25)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">🌬</span>
        <div className="text-base font-semibold">
          {tp('Ветер сейчас', 'Wind right now', 'Wiatr teraz',
            { es: 'Viento ahora', fr: 'Vent maintenant', de: 'Wind jetzt', it: 'Vento ora' })}
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
        {tp(
          'Реальный ветер на твоей точке. Прикинь, какой это курс и где неходовая зона - то, что учил в первом уроке.',
          'Real wind at your spot. Work out the point of sail and where the no-go zone is - what you learned in lesson one.',
          'Prawdziwy wiatr w twoim punkcie. Ustal kurs i gdzie jest strefa martwa - to, czego uczyles sie na pierwszej lekcji.',
          {
            es: 'Viento real en tu punto. Deduce el rumbo y donde esta la zona muerta - lo que aprendiste en la primera leccion.',
            fr: 'Vent reel a ton point. Deduis l\'allure et ou se trouve la zone morte - ce que tu as appris a la premiere lecon.',
            de: 'Echter Wind an deinem Punkt. Bestimme den Kurs und wo die Totzone liegt - was du in der ersten Lektion gelernt hast.',
            it: 'Vento reale al tuo punto. Deduci l\'andatura e dove e la zona morta - cio che hai imparato nella prima lezione.',
          },
        )}
      </p>

      {state === 'idle' && (
        <button
          onClick={showWind}
          className="text-sm px-4 py-2 rounded-md border transition hover:bg-[rgba(0,212,255,0.08)]"
          style={{ borderColor: 'rgba(0, 212, 255, 0.4)', color: 'var(--accent-cyan)' }}
        >
          {tp('Показать ветер у меня', 'Show wind near me', 'Pokaz wiatr u mnie',
            { es: 'Ver viento cerca de mi', fr: 'Voir le vent pres de moi', de: 'Wind in der Naehe zeigen', it: 'Mostra il vento vicino a me' })}
        </button>
      )}

      {state === 'loading' && (
        <div className="text-sm text-[var(--text-muted)]">
          {tp('Загружаю...', 'Loading...', 'Laduje...',
            { es: 'Cargando...', fr: 'Chargement...', de: 'Laedt...', it: 'Caricamento...' })}
        </div>
      )}

      {state === 'error' && (
        <div className="text-sm">
          <span className="text-[var(--warning)]">
            {tp('Не удалось получить погоду.', 'Could not fetch the weather.', 'Nie udalo sie pobrac pogody.',
              { es: 'No se pudo obtener el clima.', fr: 'Impossible de recuperer la meteo.', de: 'Wetter konnte nicht geladen werden.', it: 'Impossibile ottenere il meteo.' })}
          </span>{' '}
          <button onClick={showWind} className="underline" style={{ color: 'var(--accent-cyan)' }}>
            {tp('Повторить', 'Retry', 'Ponow',
              { es: 'Reintentar', fr: 'Reessayer', de: 'Erneut', it: 'Riprova' })}
          </button>
        </div>
      )}

      {state === 'ok' && data && (
        <div>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"
                   style={{ transform: `rotate(${data.wind.dirDeg + 180}deg)` }} aria-hidden>
                <line x1="12" y1="20" x2="12" y2="4" />
                <polyline points="6 10 12 4 18 10" />
              </svg>
              <div>
                <div className="text-3xl font-bold leading-none">
                  {Math.round(data.wind.speedKn)}<span className="text-base font-normal text-[var(--text-muted)]"> kn</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {tp('от', 'from', 'z',
                    { es: 'desde', fr: 'de', de: 'aus', it: 'da' })}{' '}
                  {cardinal(data.wind.dirDeg)} ({Math.round(data.wind.dirDeg)}&deg;)
                </div>
              </div>
            </div>

            {data.wind.gustKn != null && (
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  {tp('Порывы', 'Gusts', 'Porywy',
                    { es: 'Rachas', fr: 'Rafales', de: 'Boeen', it: 'Raffiche' })}
                </div>
                <div className="text-lg font-semibold">{Math.round(data.wind.gustKn)} kn</div>
              </div>
            )}

            {data.wave && (
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  {tp('Волна', 'Waves', 'Fale',
                    { es: 'Olas', fr: 'Vagues', de: 'Wellen', it: 'Onde' })}
                </div>
                <div className="text-lg font-semibold">
                  {data.wave.heightM.toFixed(1)} m
                  <span className="text-xs font-normal text-[var(--text-muted)]"> / {Math.round(data.wave.periodS)} s</span>
                </div>
              </div>
            )}
          </div>

          {spotName && (
            <div className="text-xs text-[var(--text-muted)] mt-3">
              {tp('Показан спот', 'Showing spot', 'Pokazany spot',
                { es: 'Mostrando spot', fr: 'Spot affiche', de: 'Gezeigter Spot', it: 'Spot mostrato' })}: {spotName}{' '}
              ({tp('геолокация недоступна', 'location unavailable', 'lokalizacja niedostepna',
                { es: 'ubicacion no disponible', fr: 'position indisponible', de: 'Standort nicht verfuegbar', it: 'posizione non disponibile' })})
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <button onClick={showWind} className="text-xs underline" style={{ color: 'var(--accent-cyan)' }}>
              {tp('Обновить', 'Refresh', 'Odswiez',
                { es: 'Actualizar', fr: 'Actualiser', de: 'Aktualisieren', it: 'Aggiorna' })}
            </button>
            <Link href="/courses#wind" className="text-xs underline" style={{ color: 'var(--text-secondary)' }}>
              {tp('Что значит направление ветра?', 'What does wind direction mean?', 'Co oznacza kierunek wiatru?',
                { es: 'Que significa la direccion del viento?', fr: 'Que signifie la direction du vent ?', de: 'Was bedeutet die Windrichtung?', it: 'Cosa significa la direzione del vento?' })}
            </Link>
          </div>
        </div>
      )}

      <div className="text-[10px] text-[var(--text-muted)] mt-4 leading-relaxed">
        {tp('Для тренировки, не для навигации.', 'For training, not for navigation.', 'Do treningu, nie do nawigacji.',
          { es: 'Para entrenamiento, no para navegacion.', fr: 'Pour l\'entrainement, pas pour la navigation.', de: 'Zum Training, nicht zur Navigation.', it: 'Per allenamento, non per navigazione.' })}
        {data ? ` ${data.attribution}` : ' Weather data by Open-Meteo.com (CC BY 4.0).'}
      </div>
    </div>
  );
}
