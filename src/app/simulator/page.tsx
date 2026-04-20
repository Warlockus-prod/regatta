'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  createInitialState,
  getBoatParams,
  settle,
  type Controls,
} from '@/lib/sailing-physics';

// ============================================================================
// SIMULATOR V1 - absolute minimum.
//
// Per user request (2026-04-20): strip down to the simplest possible learning
// surface. What you see here is what "the first simulator" was conceptually:
//   - one 3D-feel boat in the middle
//   - the boat rotates as you change TWA (its bow points to the course)
//   - a wind arrow is always pointing down from "north" (true wind from)
//   - two buttons: main on/off, jib on/off
//   - one speed number
//   - nothing else
//
// Everything fancier (overlays, optimal, diagnostics, rear view) lives at
// /simulator2 (experimental) and /simulator-v3 (cockpit). This page is
// deliberately small so a first-time user is not overwhelmed.
// ============================================================================

interface UiState {
  twa: number;            // 30 to 180 deg off the wind
  tack: 'starboard' | 'port';
  windSpeed: number;      // knots
  mainOn: boolean;
  jibOn: boolean;
}

const DEFAULT: UiState = {
  twa: 90,
  tack: 'starboard',
  windSpeed: 12,
  mainOn: true,
  jibOn: true,
};

export default function SimulatorSimplePage() {
  const { tp } = useI18n();
  const params = useMemo(() => getBoatParams(), []);
  const [ui, setUi] = useState<UiState>(DEFAULT);

  // Compute boat speed using the real physics engine at an auto-optimal trim
  // for the current TWA. We only expose sail on/off + course + wind - the
  // engine picks "roughly right" sheet angles so the learning focus is on
  // wind angle effect, not trim.
  const { boatSpeed, heelAbs } = useMemo(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    if (!ui.mainOn && !ui.jibOn) {
      return { boatSpeed: 0, heelAbs: 0 };
    }
    // Heuristic auto-trim: put each sail roughly at AWA - 14 deg.
    const awaEstimate = Math.max(20, ui.twa - 10); // rough AWA before full settle
    const mainAngle = Math.max(0, Math.min(params.mainMaxOff, awaEstimate - 14));
    const jibAngle = Math.max(params.jibMinOff, Math.min(params.jibMaxOff, awaEstimate - 12));

    const controls: Controls = {
      mainSheet: Math.max(0, Math.min(1, 1 - mainAngle / params.mainMaxOff)),
      jibSheet: Math.max(0, Math.min(1, 1 - (jibAngle - params.jibMinOff) / (params.jibMaxOff - params.jibMinOff))),
      mainTwist: 0.15,
      jibTwist: 0.12,
      reef: 0,
      jibFurl: ui.jibOn ? 0 : 1,
      jibSide: 1,
    };
    // Zero the main area by forcing reef = 1 when main is off.
    if (!ui.mainOn) controls.reef = 1;

    const initial = createInitialState({
      tws: ui.windSpeed,
      twa: signedTwa,
      boatSpeed: Math.max(1.8, ui.windSpeed * 0.28),
    });
    const { state } = settle(initial, controls, params, 45, 0.1);
    return { boatSpeed: state.boatSpeed, heelAbs: Math.abs(state.heel) };
  }, [ui, params]);

  // The boat rotation: bow points up by default; TWA means "wind from the
  // bow, rotating CW to port of the boat". Visually, we rotate the boat so
  // its bow is at -TWA from the wind axis (which we always draw at top of
  // scene). For starboard tack, wind is on starboard = boat rotated CCW by
  // TWA from wind axis; for port tack, CW.
  const tack = ui.tack;
  const boatRotation = tack === 'starboard' ? -ui.twa : ui.twa;
  const noGo = ui.twa < 30;
  const sailSide: 1 | -1 = tack === 'starboard' ? -1 : 1;

  return (
    <div className="page-enter relative" style={{ background: '#081326', minHeight: 'calc(100vh - 56px)' }}>
      {/* A/B header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b"
           style={{ background: 'rgba(5, 11, 24, 0.92)', borderColor: 'rgba(0, 212, 255, 0.14)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0"
                style={{ background: 'rgba(0, 212, 255, 0.14)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 212, 255, 0.28)' }}>
            V1 · Simple
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">
            {tp('Ветер, курс, паруса on/off. Всё.',
                'Wind, course, sails on/off. That is it.',
                'Wiatr, kurs, zagle on/off.')}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href="/simulator2" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
             style={{ borderColor: 'rgba(255, 170, 0, 0.35)', color: 'var(--warning)' }}>V2 exp</a>
          <a href="/simulator-v3" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
             style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: 'var(--success)' }}>V3</a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Scene + speed readout */}
        <div className="rounded-2xl overflow-hidden border shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
             style={{ borderColor: 'rgba(0, 212, 255, 0.16)', background: 'radial-gradient(ellipse at center 40%, #0e2749 0%, #061020 65%, #040a16 100%)' }}>
          <IsoScene
            rotation={boatRotation}
            sailSide={sailSide}
            mainOn={ui.mainOn}
            jibOn={ui.jibOn}
            noGo={noGo}
            twa={ui.twa}
            windSpeed={ui.windSpeed}
          />

          {/* Big speed readout below scene */}
          <div className="grid grid-cols-2 border-t" style={{ borderColor: 'rgba(0, 212, 255, 0.1)' }}>
            <div className="p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                {tp('СКОРОСТЬ', 'SPEED', 'PREDKOSC')}
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-4xl sm:text-5xl font-black font-mono tabular-nums"
                      style={{ color: boatSpeed > 0.1 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {boatSpeed.toFixed(1)}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-semibold">kts</span>
              </div>
            </div>
            <div className="p-4 text-center border-l" style={{ borderColor: 'rgba(0, 212, 255, 0.1)' }}>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                {tp('КРЕН', 'HEEL', 'PRZECHYL')}
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-4xl sm:text-5xl font-black font-mono tabular-nums"
                      style={{ color: heelAbs > 28 ? 'var(--danger)' : heelAbs > 22 ? 'var(--warning)' : 'var(--accent-cyan)' }}>
                  {Math.round(heelAbs)}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-semibold">°</span>
              </div>
            </div>
          </div>
        </div>

        {/* One-line status / reason message */}
        {noGo && (
          <div className="rounded-xl p-3 text-sm"
               style={{ background: 'rgba(255, 82, 82, 0.08)', border: '1px solid rgba(255, 82, 82, 0.3)', color: 'var(--danger)' }}>
            {tp('Мёртвая зона: яхта не идёт против ветра. Поверни в сторону.',
                'No-go zone: a yacht cannot sail into the wind. Turn away.',
                'Strefa martwa: jacht nie plynie pod wiatr.')}
          </div>
        )}
        {!ui.mainOn && !ui.jibOn && !noGo && (
          <div className="rounded-xl p-3 text-sm"
               style={{ background: 'rgba(139, 167, 184, 0.08)', border: '1px solid rgba(139, 167, 184, 0.25)', color: 'var(--text-muted)' }}>
            {tp('Оба паруса убраны. Подними хотя бы один.',
                'Both sails are down. Raise at least one.',
                'Oba zagle zwiniete.')}
          </div>
        )}

        {/* Controls: 4 big blocks */}
        <div className="grid grid-cols-2 gap-3">
          <SailButton
            label={tp('ГРОТ', 'MAIN', 'GROT')}
            on={ui.mainOn}
            onToggle={() => setUi((p) => ({ ...p, mainOn: !p.mainOn }))}
          />
          <SailButton
            label={tp('СТАКСЕЛЬ', 'JIB', 'FOK')}
            on={ui.jibOn}
            onToggle={() => setUi((p) => ({ ...p, jibOn: !p.jibOn }))}
          />
        </div>

        {/* Course slider + tack */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(8, 24, 48, 0.65)', border: '1px solid rgba(0, 212, 255, 0.16)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--accent-cyan)' }}>
              {tp('КУРС К ВЕТРУ', 'ANGLE TO WIND', 'KAT DO WIATRU')}
            </span>
            <span className="text-xl font-mono font-black tabular-nums" style={{ color: 'var(--accent-cyan)' }}>
              {ui.twa}°
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={ui.twa}
            onChange={(e) => setUi((p) => ({ ...p, twa: Number(e.target.value) }))}
            className="w-full"
            style={{ accentColor: '#00d4ff' }}
          />
          <div className="flex items-center justify-between mt-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            <span>{tp('в ветер', 'into wind', 'pod wiatr')}</span>
            <span>{tp('галф', 'beam', 'galf')}</span>
            <span>{tp('попутный', 'downwind', 'pelnym')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => setUi((p) => ({ ...p, tack: 'starboard' }))}
              className="px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition"
              style={{
                borderColor: ui.tack === 'starboard' ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.22)',
                background: ui.tack === 'starboard' ? 'rgba(0, 212, 255, 0.14)' : 'transparent',
                color: ui.tack === 'starboard' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}
            >
              {tp('Правый галс', 'Starboard', 'Prawy hals')}
            </button>
            <button
              onClick={() => setUi((p) => ({ ...p, tack: 'port' }))}
              className="px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition"
              style={{
                borderColor: ui.tack === 'port' ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.22)',
                background: ui.tack === 'port' ? 'rgba(0, 212, 255, 0.14)' : 'transparent',
                color: ui.tack === 'port' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}
            >
              {tp('Левый галс', 'Port', 'Lewy hals')}
            </button>
          </div>
        </div>

        {/* Wind strength */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(8, 24, 48, 0.65)', border: '1px solid rgba(0, 212, 255, 0.16)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--accent-cyan)' }}>
              {tp('СИЛА ВЕТРА', 'WIND SPEED', 'SILA WIATRU')}
            </span>
            <span className="text-xl font-mono font-black tabular-nums" style={{ color: 'var(--accent-cyan)' }}>
              {ui.windSpeed} kts
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={25}
            step={1}
            value={ui.windSpeed}
            onChange={(e) => setUi((p) => ({ ...p, windSpeed: Number(e.target.value) }))}
            className="w-full"
            style={{ accentColor: '#00d4ff' }}
          />
          <div className="flex items-center justify-between mt-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            <span>{tp('слабый', 'light', 'slaby')}</span>
            <span>{tp('средний', 'medium', 'sredni')}</span>
            <span>{tp('сильный', 'strong', 'silny')}</span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed text-center pt-2">
          {tp(
            'Попробуй V3 cockpit чтобы увидеть угол атаки, оптимум и крен сзади. V2 для экспериментов.',
            'Try V3 cockpit to see angle of attack, optimum, and rear-view heel. V2 is the experimental one.',
            'Sprobuj V3 cockpit.',
          )}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Isometric-ish 3D-feel scene: boat in top-down view with slight perspective
// via scaleY(0.75), rotates on course, wind arrow from top, horizon ring.
// ---------------------------------------------------------------------------

function IsoScene(props: {
  rotation: number;  // degrees, 0 = bow up
  sailSide: 1 | -1;
  mainOn: boolean;
  jibOn: boolean;
  noGo: boolean;
  twa: number;
  windSpeed: number;
}) {
  const { rotation, sailSide, mainOn, jibOn, noGo, twa, windSpeed } = props;
  const w = 720;
  const h = 480;
  const cx = w / 2;
  const cy = h / 2 + 20;
  const r = 170;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-auto" style={{ minHeight: '42vh', maxHeight: '65vh' }}>
      <defs>
        <radialGradient id="v1-glow" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="rgba(0, 212, 255, 0.14)" />
          <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
        </radialGradient>
        <filter id="v1-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="0" dy="5" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="v1-arrow-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Glow backdrop */}
      <rect x="0" y="0" width={w} height={h} fill="url(#v1-glow)" />

      {/* Horizon ring (slight isometric squash) */}
      <g transform={`translate(${cx} ${cy}) scale(1 0.58)`}>
        <circle cx="0" cy="0" r={r + 40}
                fill="none"
                stroke="rgba(0, 212, 255, 0.16)"
                strokeWidth={1}
                strokeDasharray="3 7" />
        <circle cx="0" cy="0" r={r}
                fill="rgba(6, 18, 36, 0.35)"
                stroke="rgba(0, 212, 255, 0.22)"
                strokeWidth={1.5} />
      </g>

      {/* No-go cone (red, small sector at top indicating wind direction) */}
      {noGo && (
        <g transform={`translate(${cx} ${cy}) scale(1 0.58)`}>
          <path d="M 0 0 L -60 -200 A 210 210 0 0 1 60 -200 Z"
                fill="rgba(255, 82, 82, 0.14)"
                stroke="rgba(255, 82, 82, 0.4)"
                strokeDasharray="4 4" />
        </g>
      )}

      {/* Wind from arrow (always from top in world frame) */}
      <g filter="url(#v1-arrow-glow)">
        <line x1={cx} y1={24} x2={cx} y2={cy - 150} stroke="#00d4ff" strokeWidth={2.8} strokeLinecap="round" />
        <polygon points={`${cx - 8},${cy - 160} ${cx + 8},${cy - 160} ${cx},${cy - 146}`} fill="#00d4ff" />
        <text x={cx} y={16} textAnchor="middle" fill="#00d4ff" fontSize="11" fontWeight="800"
              style={{ fontFamily: 'ui-monospace, monospace' }}>
          TW {windSpeed} kts
        </text>
      </g>

      {/* Boat, rotated by course, with slight isometric squash */}
      <g transform={`translate(${cx} ${cy}) scale(1 0.75)`} filter="url(#v1-shadow)">
        <g transform={`rotate(${rotation})`}>
          <SimpleBoat sailSide={sailSide} mainOn={mainOn} jibOn={jibOn} noGo={noGo} twa={twa} />
        </g>
      </g>

      {/* TWA label, bottom-left */}
      <g transform="translate(22 460)">
        <text x="0" y="0" fill="rgba(139, 167, 184, 0.7)" fontSize="10" fontWeight="700"
              style={{ letterSpacing: '0.1em' }}>
          TWA {twa}°
        </text>
      </g>
    </svg>
  );
}

// Simple boat drawn top-down (sized for the isometric squash above).
function SimpleBoat({ sailSide, mainOn, jibOn, noGo, twa }: {
  sailSide: 1 | -1; mainOn: boolean; jibOn: boolean; noGo: boolean; twa: number;
}) {
  // Sail angle heuristic: place sails at ~AWA - 14 on the leeward side.
  const awaEstimate = Math.max(20, twa - 10);
  const mainAngle = Math.max(0, Math.min(85, awaEstimate - 14));
  const jibAngle = Math.max(5, Math.min(55, awaEstimate - 12));
  const sailsLook = noGo ? 'luffing' : 'set';

  return (
    <>
      {/* Waterline shadow */}
      <ellipse cx="0" cy="58" rx="38" ry="12" fill="rgba(0, 0, 0, 0.22)" />

      {/* Hull */}
      <path
        d="M 0 -110 Q 42 -50 32 60 Q 28 130 0 178 Q -28 130 -32 60 Q -42 -50 0 -110 Z"
        fill="#e8f0f6"
        stroke="#6f8ba0"
        strokeWidth={4}
      />

      {/* Deck hint */}
      <ellipse cx="0" cy="24" rx="14" ry="32" fill="rgba(0, 0, 0, 0.18)" />

      {/* Bow indicator triangle */}
      <polygon points="-6,-105 6,-105 0,-114" fill="#00d4ff" />

      {/* Mast */}
      <rect x="-3.5" y="-62" width="7" height="146" rx="3.5" fill="#2a4060" />
      <circle cx="0" cy="-8" r="7" fill="#0a1628" stroke="#2a4060" strokeWidth={2} />

      {/* Jib - forward of mast, leeward side */}
      {jibOn && (
        <g transform={`translate(0 -64) rotate(${jibAngle * sailSide})`}
           opacity={sailsLook === 'luffing' ? 0.55 : 1}>
          <path
            d={`M 0 0 Q ${sailSide * 24} 50 ${sailSide * 8} 110 L 0 110 Z`}
            fill="#f6fbff"
            stroke="#ffffff"
            strokeWidth={3}
          />
          <text x={sailSide * 24} y={64} fill="#0a1628" fontSize="11" fontWeight="800"
                textAnchor="middle" style={{ letterSpacing: '0.1em' }}>JIB</text>
        </g>
      )}

      {/* Main - aft of mast, leeward side */}
      {mainOn && (
        <g transform={`rotate(${mainAngle * sailSide})`}
           opacity={sailsLook === 'luffing' ? 0.55 : 1}>
          <path
            d={`M 0 -32 Q ${sailSide * 34} 52 ${sailSide * 12} 162 L 0 162 Z`}
            fill="#f6fbff"
            stroke="#ffffff"
            strokeWidth={3}
          />
          <text x={sailSide * 36} y={100} fill="#0a1628" fontSize="11" fontWeight="800"
                textAnchor="middle" style={{ letterSpacing: '0.1em' }}>MAIN</text>
        </g>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Big on/off sail button - single control, hero size
// ---------------------------------------------------------------------------

function SailButton({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="rounded-xl p-4 transition"
      style={{
        background: on ? 'rgba(82, 255, 142, 0.12)' : 'rgba(139, 167, 184, 0.08)',
        border: `1px solid ${on ? 'rgba(82, 255, 142, 0.4)' : 'rgba(139, 167, 184, 0.22)'}`,
      }}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold"
           style={{ color: on ? 'var(--success)' : 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-black"
           style={{ color: on ? 'var(--success)' : 'var(--text-muted)' }}>
        {on ? 'ON' : 'OFF'}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider"
           style={{ color: on ? 'var(--success)' : 'var(--text-muted)', opacity: 0.65 }}>
        {on ? 'поднят' : 'убран'}
      </div>
    </button>
  );
}
