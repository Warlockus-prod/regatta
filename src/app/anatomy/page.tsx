'use client';

import { useState } from 'react';
import { anatomyParts } from '@/data/anatomy';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Yacht anatomy - 2D Bavaria 46 side-profile with clickable hotspots.
// 3D viewer removed in Phase 0 (CLEANUP). Rationale: GLB pipeline was never
// real (placeholder Kenney model, no hotspots coordinated with data), and
// the 2D profile already covers every part we teach. If 3D returns later,
// it should come with a proper Bavaria 46 GLB and hotspot positions sourced
// from the same data file as the 2D view.
// ============================================================================

// Bavaria 46 side-profile SVG - stylized, not photorealistic
function Bavaria46Profile({ activeId, onSelect }: { activeId: string | null; onSelect: (id: string) => void }) {
  return (
    <svg viewBox="0 0 1000 500" className="w-full h-auto block" style={{ background: 'linear-gradient(180deg, rgba(13, 40, 71, 0.3) 0%, rgba(13, 40, 71, 0.3) 70%, rgba(6, 20, 40, 0.8) 70%, rgba(6, 20, 40, 0.8) 100%)' }}>
      {/* Water surface */}
      <line x1="0" y1="350" x2="1000" y2="350" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="1" strokeDasharray="4,4" />

      {/* Hull - Bavaria 46 profile (sleek modern cruiser) */}
      <defs>
        <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f0f6" />
          <stop offset="1" stopColor="#8fa8bd" />
        </linearGradient>
        <linearGradient id="sailGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d0d8e0" />
        </linearGradient>
      </defs>

      {/* Keel (underwater) */}
      <path d="M 440 360 L 440 440 L 520 440 L 520 360 Z" fill="#1a2d4d" stroke="#5a7a8a" strokeWidth="1" />

      {/* Twin rudders hint (one visible from side) */}
      <path d="M 800 360 L 800 430 L 825 430 L 825 360 Z" fill="#1a2d4d" stroke="#5a7a8a" strokeWidth="1" />

      {/* Hull above waterline - Bavaria 46 silhouette */}
      <path d="M 140 340
               C 140 320, 160 305, 200 295
               L 250 280 L 720 275
               C 780 275, 820 285, 840 310
               L 840 350
               L 140 350 Z"
            fill="url(#hullGrad)"
            stroke="#4a6b8a"
            strokeWidth="1.5" />

      {/* Hull below waterline (mostly underwater but we show top) */}
      <path d="M 140 350
               C 160 370, 200 380, 280 380
               L 680 380
               C 760 380, 810 370, 840 350"
            fill="none"
            stroke="rgba(74, 107, 138, 0.5)"
            strokeWidth="1"
            strokeDasharray="3,3" />

      {/* Cabin / superstructure */}
      <path d="M 300 275 L 310 240 L 560 240 L 580 275" fill="#2a4570" stroke="#5a7a8a" strokeWidth="1.5" />
      {/* Cabin windows */}
      <rect x="320" y="250" width="50" height="12" rx="2" fill="rgba(0, 40, 70, 0.8)" />
      <rect x="385" y="250" width="50" height="12" rx="2" fill="rgba(0, 40, 70, 0.8)" />
      <rect x="450" y="250" width="50" height="12" rx="2" fill="rgba(0, 40, 70, 0.8)" />
      <rect x="515" y="250" width="40" height="12" rx="2" fill="rgba(0, 40, 70, 0.8)" />

      {/* Cockpit */}
      <rect x="600" y="255" width="180" height="25" rx="3" fill="rgba(30, 50, 80, 0.8)" stroke="#5a7a8a" strokeWidth="1" />
      {/* Wheel binnacle */}
      <rect x="710" y="240" width="20" height="40" rx="2" fill="#5a7a8a" />
      <circle cx="720" cy="260" r="18" fill="none" stroke="#d0d8e0" strokeWidth="2" />

      {/* Mast */}
      <line x1="420" y1="275" x2="420" y2="40" stroke="#d0d8e0" strokeWidth="4" strokeLinecap="round" />

      {/* Boom */}
      <line x1="420" y1="215" x2="560" y2="210" stroke="#d0d8e0" strokeWidth="3" strokeLinecap="round" />
      {/* Mainsail */}
      <path d="M 420 50 L 560 210 L 420 215 Z" fill="url(#sailGrad)" stroke="#ffffff" strokeWidth="1.5" opacity="0.95" />
      {/* Battens */}
      <line x1="420" y1="90" x2="530" y2="200" stroke="rgba(139, 167, 184, 0.4)" strokeWidth="0.5" />
      <line x1="420" y1="130" x2="510" y2="205" stroke="rgba(139, 167, 184, 0.4)" strokeWidth="0.5" />
      <line x1="420" y1="170" x2="490" y2="210" stroke="rgba(139, 167, 184, 0.4)" strokeWidth="0.5" />

      {/* Jib */}
      <path d="M 420 60 L 180 280 L 420 220 Z" fill="url(#sailGrad)" stroke="#ffffff" strokeWidth="1.2" opacity="0.92" />

      {/* Forestay */}
      <line x1="420" y1="40" x2="180" y2="280" stroke="#c0c8d0" strokeWidth="1" />
      {/* Backstay */}
      <line x1="420" y1="40" x2="815" y2="280" stroke="#c0c8d0" strokeWidth="1" />
      {/* Cap shrouds */}
      <line x1="420" y1="60" x2="430" y2="275" stroke="#c0c8d0" strokeWidth="1" />
      {/* Lower shrouds */}
      <line x1="420" y1="160" x2="410" y2="275" stroke="#c0c8d0" strokeWidth="0.8" />
      <line x1="420" y1="160" x2="435" y2="275" stroke="#c0c8d0" strokeWidth="0.8" />

      {/* Winches (abstracted as circles) */}
      <circle cx="560" cy="285" r="6" fill="#5a7a8a" stroke="#d0d8e0" strokeWidth="1" />
      <circle cx="730" cy="285" r="6" fill="#5a7a8a" stroke="#d0d8e0" strokeWidth="1" />

      {/* Main sheet (schematic) */}
      <line x1="500" y1="215" x2="640" y2="280" stroke="rgba(0, 212, 255, 0.5)" strokeWidth="1" />

      {/* Lifelines */}
      <line x1="140" y1="265" x2="840" y2="265" stroke="#5a7a8a" strokeWidth="0.8" />
      <line x1="140" y1="280" x2="840" y2="280" stroke="#5a7a8a" strokeWidth="0.8" />

      {/* Fender */}
      <ellipse cx="610" cy="320" rx="8" ry="18" fill="#d0d8e0" stroke="#5a7a8a" strokeWidth="0.8" />

      {/* Hotspots */}
      {anatomyParts.map((p) => {
        const isActive = activeId === p.id;
        return (
          <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: 'pointer' }}>
            <circle
              cx={p.side.x}
              cy={p.side.y}
              r={isActive ? 11 : 7}
              fill={isActive ? 'var(--accent-cyan)' : 'rgba(0, 212, 255, 0.45)'}
              stroke="#ffffff"
              strokeWidth={isActive ? 2 : 1}
            />
            <circle
              cx={p.side.x}
              cy={p.side.y}
              r={isActive ? 18 : 12}
              fill="none"
              stroke={isActive ? 'var(--accent-cyan)' : 'rgba(0, 212, 255, 0.25)'}
              strokeWidth="1"
              opacity={isActive ? 0.6 : 0.3}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function AnatomyPage() {
  const { lang, tp } = useI18n();
  const [activeId, setActiveId] = useState<string | null>('mast');

  const active = anatomyParts.find((p) => p.id === activeId) ?? null;

  return (
    <div className="page-enter max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(68, 255, 136, 0.1)', border: '1px solid rgba(68, 255, 136, 0.25)', color: 'var(--success)' }}>
          ⚓ {tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Bavaria 46</h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Нажми на точку на яхте - узнай название и зачем это нужно на борту.',
            'Click a point on the yacht to learn the name and why it matters on board.',
            'Kliknij punkt na jachcie - poznasz nazwe i do czego sluzy na pokladzie.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4 sm:gap-6">
        {/* Model area (2D only) */}
        <div className="card p-3 sm:p-4">
          <Bavaria46Profile activeId={activeId} onSelect={setActiveId} />
          <div className="mt-3 text-xs text-[var(--text-muted)] text-center">
            Bavaria 46 Cruiser · LOA 13.99 m · Beam 4.29 m · Draft 2.05 m · Mast ~18 m
          </div>
        </div>

        {/* Info panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {active ? (
            <div className="card p-5">
              <div className="text-xs text-[var(--text-muted)] mb-1">{tp('Деталь', 'Part', 'Element')}</div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                {lang === 'pl' ? active.namePl : lang === 'en' ? active.nameEn : active.nameRu}
              </h2>
              <div className="text-sm text-[var(--text-muted)] mb-4">
                {active.nameEn}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    {tp('Что это', 'What it is', 'Co to jest')}
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed">
                    {lang === 'pl' ? active.descPl : lang === 'en' ? active.descEn : active.descRu}
                  </p>
                </div>

                <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                    {tp('На борту', 'On board', 'Na pokladzie')}
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed">
                    {lang === 'pl' ? active.useOnBoardPl : lang === 'en' ? active.useOnBoardEn : active.useOnBoardRu}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-sm text-[var(--text-muted)]">
              {tp('Нажми на точку на диаграмме', 'Click a hotspot on the diagram', 'Kliknij punkt na diagramie')}
            </div>
          )}

          {/* Quick jump list */}
          <div className="card p-3 mt-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              {tp('Все детали', 'All parts', 'Wszystkie elementy')}
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
                  {lang === 'pl' ? p.namePl : lang === 'en' ? p.nameEn : p.nameRu}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-6 text-center">
        {tp('Стилизованный профиль Bavaria 46.',
            'Stylized Bavaria 46 profile.',
            'Stylizowany profil Bavaria 46.')}
      </p>
    </div>
  );
}
