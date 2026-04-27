'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { legacyPick } from '@/lib/languages';
import { anatomyParts } from '@/data/anatomy';
import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';
import AnatomyPosters from '@/components/AnatomyPosters';

// ============================================================================
// Yacht anatomy - interactive 3D Bavaria 46 with clickable hotspots.
//
// History: previously had a 2D side-profile SVG with a 2D/3D toggle. The
// 3D viewer (Andryu Yacht v3 GLB, 17 hotspots, 5 projections) covered every
// teaching need on its own and the 2D fallback added clutter, so the SVG
// view + toggle were removed in 2026-04-26.
//
// Three.js + r3f is heavy (~120 KB gzipped). Code-split it with ssr:false
// so the heavy bundle loads only after the initial paint, not as part of
// the route's critical path.
// ============================================================================

const YachtViewer3D = dynamic(() => import('@/components/YachtViewer3D'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full flex items-center justify-center text-xs"
      style={{ aspectRatio: '16 / 10', background: 'linear-gradient(180deg, rgba(13, 40, 71, 0.4), rgba(6, 20, 40, 0.7))', color: 'var(--text-muted)' }}
    >
      Loading 3D model...
    </div>
  ),
});

export default function AnatomyPage() {
  const { lang, tp } = useI18n();
  const [activeId, setActiveId] = useState<string | null>('mast');

  const active = anatomyParts.find((p) => p.id === activeId) ?? null;

  return (
    <div className="page-enter max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(68, 255, 136, 0.1)', border: '1px solid rgba(68, 255, 136, 0.25)', color: 'var(--success)' }}>
          ⚓ {tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu',
            { es: 'Anatomia del velero', fr: 'Anatomie du voilier', de: 'Aufbau der Yacht', it: 'Anatomia della barca' })}
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Нажми на точку на яхте - узнай название и зачем это нужно на борту.',
            'Click a point on the yacht to learn the name and why it matters on board.',
            'Kliknij punkt na jachcie - poznasz nazwe i do czego sluzy na pokladzie.',
            {
              es: 'Haz clic en un punto del velero para ver su nombre y para que sirve a bordo.',
              fr: 'Clique sur un point du voilier pour son nom et pourquoi il importe a bord.',
              de: 'Klicke auf einen Punkt der Yacht, um Name und Bordfunktion zu sehen.',
              it: 'Clicca su un punto della barca per il nome e a cosa serve a bordo.',
            },
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4 sm:gap-6">
        {/* 3D viewer with all 17 hotspots + 5 camera projections. */}
        <div className="card p-3 sm:p-4">
          <YachtViewer3D
            parts={anatomyParts}
            activeId={activeId}
            onSelect={setActiveId}
            pickName={(p) => legacyPick(p, 'name', lang)}
            pickAltName={(p) => p.nameEn}
            viewLabels={{
              threeQuarter: tp('3/4', '3/4', '3/4', { es: '3/4', fr: '3/4', de: '3/4', it: '3/4' }),
              top: tp('Сверху', 'Top', 'Z gory',
                { es: 'Cenital', fr: 'Dessus', de: 'Oben', it: 'Alto' }),
              side: tp('Сбоку', 'Side', 'Z boku',
                { es: 'Lateral', fr: 'Cote', de: 'Seitlich', it: 'Lato' }),
              bow: tp('С носа', 'Bow', 'Z dziobu',
                { es: 'Proa', fr: 'Proue', de: 'Bug', it: 'Prua' }),
              stern: tp('С кормы', 'Stern', 'Z rufy',
                { es: 'Popa', fr: 'Poupe', de: 'Heck', it: 'Poppa' }),
              fullscreen: tp('Во весь экран', 'Fullscreen', 'Pelny ekran',
                { es: 'Pantalla completa', fr: 'Plein ecran', de: 'Vollbild', it: 'Schermo intero' }),
              exitFullscreen: tp('Свернуть', 'Exit fullscreen', 'Wyjdz z pelnego ekranu',
                { es: 'Salir de pantalla completa', fr: 'Quitter le plein ecran', de: 'Vollbild verlassen', it: 'Esci da schermo intero' }),
            }}
            loadingLabel={tp('Загружаю 3D...', 'Loading 3D...', 'Ladowanie 3D...',
              { es: 'Cargando 3D...', fr: 'Chargement 3D...', de: '3D laden...', it: 'Caricamento 3D...' })}
            hintLabel={tp(
              'Тяни для вращения · клик по точке - название и описание · кнопки сверху - проекции',
              'Drag to rotate · click a hotspot for name + details · top buttons - projections',
              'Przeciagnij aby obrocic · klik na punkt - nazwa i opis · gorne przyciski - rzuty',
              {
                es: 'Arrastra para rotar · clic en un punto - nombre y detalles · botones - proyecciones',
                fr: 'Glisse pour pivoter · clique sur un point pour les details · boutons - projections',
                de: 'Ziehen zum Drehen · Klick auf einen Punkt fuer Details · Buttons - Projektionen',
                it: 'Trascina per ruotare · clicca su un punto per i dettagli · pulsanti - proiezioni',
              },
            )}
          />
          <div className="mt-3 text-xs text-[var(--text-muted)] text-center">
            LOA 14.00 m · Beam 4.31 m · Draft 2.18 m · Mast ~20.75 m
          </div>
        </div>

        {/* Info panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {active ? (
            <div className="card p-5">
              <div className="text-xs text-[var(--text-muted)] mb-1">
                {tp('Деталь', 'Part', 'Element',
                  { es: 'Parte', fr: 'Piece', de: 'Teil', it: 'Parte' })}
              </div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                {legacyPick(active, 'name', lang)}
              </h2>
              <div className="text-sm text-[var(--text-muted)] mb-4">
                {active.nameEn}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    {tp('Что это', 'What it is', 'Co to jest',
                      { es: 'Que es', fr: 'Qu\'est-ce que c\'est', de: 'Was ist das', it: 'Cosa e' })}
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed">
                    {legacyPick(active, 'desc', lang)}
                  </p>
                </div>

                <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                    {tp('На борту', 'On board', 'Na pokladzie',
                      { es: 'A bordo', fr: 'A bord', de: 'An Bord', it: 'A bordo' })}
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed">
                    {legacyPick(active, 'useOnBoard', lang)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-sm text-[var(--text-muted)]">
              {tp('Нажми на точку на модели', 'Click a hotspot on the model', 'Kliknij punkt na modelu',
                { es: 'Haz clic en un punto del modelo', fr: 'Clique sur un point du modele', de: 'Klicke einen Punkt am Modell an', it: 'Clicca un punto sul modello' })}
            </div>
          )}

          {/* Quick jump list */}
          <div className="card p-3 mt-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              {tp('Все детали', 'All parts', 'Wszystkie elementy',
                { es: 'Todas las partes', fr: 'Toutes les pieces', de: 'Alle Teile', it: 'Tutte le parti' })}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {anatomyParts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className="text-left text-xs px-2 py-1.5 rounded transition"
                  style={{
                    background: activeId === p.id ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: activeId === p.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  {legacyPick(p, 'name', lang)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-6 text-center">
        {tp(
          'Стилизованная модель круизной яхты. Low-poly заготовка под симулятор.',
          'Stylized cruising yacht model. Low-poly placeholder for the simulator pipeline.',
          'Stylizowany model jachtu turystycznego. Low-poly model do symulatora.',
          {
            es: 'Modelo estilizado de yate de crucero. Modelo low-poly para el pipeline del simulador.',
            fr: 'Modele stylise de voilier de croisiere. Modele low-poly pour le pipeline du simulateur.',
            de: 'Stilisiertes Modell einer Fahrtenyacht. Low-Poly-Modell fuer die Simulator-Pipeline.',
            it: 'Modello stilizzato di yacht da crociera. Modello low-poly per la pipeline del simulatore.',
          },
        )}
      </p>

      {/* Infographic posters in RU + EN. The component renders nothing
          if the active locale isn't RU or EN. */}
      <AnatomyPosters />

      <ContentFooterNav page="/anatomy" />
    </div>
  );
}
