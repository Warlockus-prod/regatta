'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

// Phase 4 "charts track" of docs/design/live-weather/DESIGN.md.
// A "where to sail" view: a FREE nautical chart (OpenSeaMap, an OpenStreetMap
// overlay) plus the live wind/wave/current for a handful of well-known sailing
// venues. Strictly "not for navigation" - it is a teaching / planning aid, not
// a charting tool. No map library is added: the chart is an OpenSeaMap iframe
// embed with a visible link fallback in case framing is blocked, which keeps
// the bundle tiny (this page is just an iframe + a small fetch).

// ---- Weather snapshot shape (mirrors /api/weather, see WindNowCard) ---------
// Replicated locally on purpose: this is a read-only consumer of the same
// endpoint and we avoid importing the home-page card.
interface WeatherNow {
  provider: string;
  ts: string;
  wind: { speedKn: number; dirDeg: number; gustKn: number | null };
  wave: { heightM: number; dirDeg: number; periodS: number } | null;
  current?: { setKn: number; dirDeg: number } | null;
  attribution: string;
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function cardinal(deg: number): string {
  return CARDINALS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

// ---- Preset venues ----------------------------------------------------------
// Well-known sailing spots across Europe. `name` is a proper noun (kept as-is
// in every language); `country` is localized via tp() at render time using the
// ISO-ish `cc` key below.
interface Spot {
  name: string;
  lat: number;
  lon: number;
  cc: 'es' | 'gb' | 'fr' | 'pl';
}

const SPOTS: Spot[] = [
  { name: 'Palma', lat: 39.57, lon: 2.65, cc: 'es' },
  { name: 'Tarifa', lat: 36.01, lon: -5.6, cc: 'es' },
  { name: 'Cowes', lat: 50.76, lon: -1.3, cc: 'gb' },
  { name: 'Hyeres', lat: 43.07, lon: 6.15, cc: 'fr' },
  { name: 'Sopot', lat: 54.45, lon: 18.57, cc: 'pl' },
  { name: 'Valencia', lat: 39.46, lon: -0.33, cc: 'es' },
];

// OpenSeaMap embed URL. The `layers` mask turns on the seamark overlay on top
// of the base map; mlat/mlon drop a marker on the venue.
function chartUrl(spot: Spot): string {
  return (
    `https://map.openseamap.org/?zoom=12` +
    `&lat=${spot.lat}&lon=${spot.lon}` +
    `&mlat=${spot.lat}&mlon=${spot.lon}` +
    `&layers=BFTFFFTFFTF0`
  );
}

type WeatherState = 'loading' | 'ok' | 'error';

export default function SpotsPage() {
  const { tp } = useI18n();
  const [selected, setSelected] = useState(0);
  const [state, setState] = useState<WeatherState>('loading');
  const [data, setData] = useState<WeatherNow | null>(null);

  const spot = SPOTS[selected];

  function countryLabel(cc: Spot['cc']): string {
    switch (cc) {
      case 'es': return tp('Испания', 'Spain', 'Hiszpania',
        { es: 'Espana', fr: 'Espagne', de: 'Spanien', it: 'Spagna' });
      case 'gb': return tp('Великобритания', 'United Kingdom', 'Wielka Brytania',
        { es: 'Reino Unido', fr: 'Royaume-Uni', de: 'Vereinigtes Koenigreich', it: 'Regno Unito' });
      case 'fr': return tp('Франция', 'France', 'Francja',
        { es: 'Francia', fr: 'France', de: 'Frankreich', it: 'Francia' });
      case 'pl': return tp('Польша', 'Poland', 'Polska',
        { es: 'Polonia', fr: 'Pologne', de: 'Polen', it: 'Polonia' });
    }
  }

  // Fetch live weather whenever the selected spot changes. Read-only, falls to
  // an 'error' state on any failure (the chart still renders regardless).
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setData(null);
    fetch(`/api/weather?lat=${spot.lat}&lon=${spot.lon}`)
      .then((r) => {
        if (!r.ok) throw new Error('bad response');
        return r.json();
      })
      .then((j: WeatherNow) => {
        if (cancelled) return;
        setData(j);
        setState('ok');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => { cancelled = true; };
  }, [spot.lat, spot.lon]);

  const url = chartUrl(spot);

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* ===== Header ===== */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-3xl" aria-hidden>📍</span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {tp('Споты: где ходить', 'Spots: where to sail', 'Spoty: gdzie plywac',
              { es: 'Spots: donde navegar', fr: 'Spots : ou naviguer', de: 'Spots: wo segeln', it: 'Spot: dove navigare' })}
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Известные парусные точки: морская карта и ветер прямо сейчас. Прикинь, какой это будет курс, когда поедешь.',
            'Well-known sailing venues: a nautical chart and the wind right now. Work out what point of sail it will be when you go.',
            'Znane miejscowki zeglarskie: mapa morska i wiatr teraz. Ustal, jaki to bedzie kurs, gdy poplyniesz.',
            {
              es: 'Lugares conocidos para navegar: una carta nautica y el viento ahora mismo. Deduce que rumbo sera cuando vayas.',
              fr: 'Spots de voile connus : une carte marine et le vent en ce moment. Deduis quelle allure ce sera quand tu iras.',
              de: 'Bekannte Segelreviere: eine Seekarte und der Wind genau jetzt. Bestimme, welcher Kurs es sein wird, wenn du faehrst.',
              it: 'Localita veliche note: una carta nautica e il vento in questo momento. Deduci che andatura sara quando andrai.',
            },
          )}
        </p>
      </div>

      {/* ===== Spot selector chips ===== */}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label={tp('Споты', 'Spots', 'Spoty', { es: 'Spots', fr: 'Spots', de: 'Spots', it: 'Spot' })}>
        {SPOTS.map((s, i) => {
          const active = i === selected;
          return (
            <button
              key={s.name}
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(i)}
              className="text-sm px-3.5 py-1.5 rounded-full border transition"
              style={
                active
                  ? { borderColor: 'var(--accent-cyan)', background: 'rgba(0, 212, 255, 0.12)', color: 'var(--accent-cyan)' }
                  : { borderColor: 'rgba(139, 167, 184, 0.25)', color: 'var(--text-secondary)' }
              }
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* ===== Selected spot: chart + weather ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart (2/3) */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden" style={{ borderColor: 'rgba(0, 212, 255, 0.25)' }}>
            <iframe
              key={url}
              src={url}
              title={tp(
                `Морская карта OpenSeaMap: ${spot.name}`,
                `OpenSeaMap nautical chart: ${spot.name}`,
                `Mapa morska OpenSeaMap: ${spot.name}`,
                {
                  es: `Carta nautica OpenSeaMap: ${spot.name}`,
                  fr: `Carte marine OpenSeaMap : ${spot.name}`,
                  de: `OpenSeaMap-Seekarte: ${spot.name}`,
                  it: `Carta nautica OpenSeaMap: ${spot.name}`,
                },
              )}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: 360, border: 'none', display: 'block' }}
            />
          </div>
          {/* Always-visible fallback link in case framing is blocked. */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm mt-3 hover:underline"
            style={{ color: 'var(--accent-cyan)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {tp('Открыть карту целиком на OpenSeaMap', 'Open the full chart on OpenSeaMap', 'Otworz pelna mape na OpenSeaMap',
              { es: 'Abrir la carta completa en OpenSeaMap', fr: 'Ouvrir la carte complete sur OpenSeaMap', de: 'Vollstaendige Karte auf OpenSeaMap oeffnen', it: 'Apri la carta completa su OpenSeaMap' })}
          </a>
        </div>

        {/* Live weather (1/3) */}
        <div className="card p-5" style={{ borderColor: 'rgba(0, 212, 255, 0.25)' }}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div className="text-base font-semibold">{spot.name}</div>
            <div className="text-xs text-[var(--text-muted)]">{countryLabel(spot.cc)}</div>
          </div>
          <div className="text-xs text-[var(--text-muted)] mb-4">
            {spot.lat.toFixed(2)}, {spot.lon.toFixed(2)}
          </div>

          {state === 'loading' && (
            <div className="text-sm text-[var(--text-muted)]">
              {tp('Загружаю ветер...', 'Loading wind...', 'Laduje wiatr...',
                { es: 'Cargando viento...', fr: 'Chargement du vent...', de: 'Wind laedt...', it: 'Caricamento vento...' })}
            </div>
          )}

          {state === 'error' && (
            <div className="text-sm text-[var(--warning)]">
              {tp('Не удалось получить погоду.', 'Could not fetch the weather.', 'Nie udalo sie pobrac pogody.',
                { es: 'No se pudo obtener el clima.', fr: 'Impossible de recuperer la meteo.', de: 'Wetter konnte nicht geladen werden.', it: 'Impossibile ottenere il meteo.' })}
            </div>
          )}

          {state === 'ok' && data && (
            <div className="space-y-4">
              {/* Wind */}
              <div className="flex items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"
                     style={{ transform: `rotate(${data.wind.dirDeg + 180}deg)` }} aria-hidden>
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <polyline points="6 10 12 4 18 10" />
                </svg>
                <div>
                  <div className="text-2xl font-bold leading-none">
                    {Math.round(data.wind.speedKn)}<span className="text-sm font-normal text-[var(--text-muted)]"> kn</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {tp('от', 'from', 'z', { es: 'desde', fr: 'de', de: 'aus', it: 'da' })}{' '}
                    {cardinal(data.wind.dirDeg)} ({Math.round(data.wind.dirDeg)}&deg;)
                  </div>
                </div>
              </div>

              {/* Gust / Wave / Current rows */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {data.wind.gustKn != null && (
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {tp('Порывы', 'Gusts', 'Porywy', { es: 'Rachas', fr: 'Rafales', de: 'Boeen', it: 'Raffiche' })}
                    </div>
                    <div className="font-semibold">{Math.round(data.wind.gustKn)} kn</div>
                  </div>
                )}

                {data.wave && (
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {tp('Волна', 'Waves', 'Fale', { es: 'Olas', fr: 'Vagues', de: 'Wellen', it: 'Onde' })}
                    </div>
                    <div className="font-semibold">
                      {data.wave.heightM.toFixed(1)} m
                      <span className="text-xs font-normal text-[var(--text-muted)]"> / {Math.round(data.wave.periodS)} s</span>
                    </div>
                  </div>
                )}

                {data.current != null && (
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {tp('Течение', 'Current', 'Prad', { es: 'Corriente', fr: 'Courant', de: 'Stroemung', it: 'Corrente' })}
                    </div>
                    <div className="font-semibold">
                      {data.current.setKn.toFixed(1)} kn
                      <span className="text-xs font-normal text-[var(--text-muted)]"> {tp('к', 'toward', 'ku', { es: 'hacia', fr: 'vers', de: 'Richtung', it: 'verso' })} {cardinal(data.current.dirDeg)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/courses#wind" className="inline-block text-xs underline" style={{ color: 'var(--text-secondary)' }}>
                {tp('Что значит направление ветра?', 'What does wind direction mean?', 'Co oznacza kierunek wiatru?',
                  { es: 'Que significa la direccion del viento?', fr: 'Que signifie la direction du vent ?', de: 'Was bedeutet die Windrichtung?', it: 'Cosa significa la direzione del vento?' })}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ===== Footer: disclaimer + attribution ===== */}
      <div className="text-[11px] text-[var(--text-muted)] mt-8 leading-relaxed border-t pt-4" style={{ borderColor: 'rgba(139, 167, 184, 0.15)' }}>
        <div className="font-medium text-[var(--text-secondary)]">
          {tp('Для тренировки, не для навигации.', 'For training, not for navigation.', 'Do treningu, nie do nawigacji.',
            { es: 'Para entrenamiento, no para navegacion.', fr: 'Pour l\'entrainement, pas pour la navigation.', de: 'Zum Training, nicht zur Navigation.', it: 'Per allenamento, non per navigazione.' })}
        </div>
        <div className="mt-1">
          {tp(
            'Карта: OpenSeaMap / участники OpenStreetMap. Погода: Open-Meteo.com (CC BY 4.0).',
            'Chart: OpenSeaMap / OpenStreetMap contributors. Weather: Open-Meteo.com (CC BY 4.0).',
            'Mapa: OpenSeaMap / wspoltworcy OpenStreetMap. Pogoda: Open-Meteo.com (CC BY 4.0).',
            {
              es: 'Carta: OpenSeaMap / colaboradores de OpenStreetMap. Clima: Open-Meteo.com (CC BY 4.0).',
              fr: 'Carte : OpenSeaMap / contributeurs OpenStreetMap. Meteo : Open-Meteo.com (CC BY 4.0).',
              de: 'Karte: OpenSeaMap / OpenStreetMap-Mitwirkende. Wetter: Open-Meteo.com (CC BY 4.0).',
              it: 'Carta: OpenSeaMap / contributori OpenStreetMap. Meteo: Open-Meteo.com (CC BY 4.0).',
            },
          )}
        </div>
      </div>
    </div>
  );
}
