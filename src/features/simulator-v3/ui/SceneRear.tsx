'use client';

import { useId } from 'react';
import {
  clamp,
  describeArc,
  REEF_VISUAL,
  type SimulationModel,
  type TpFn,
  type UiState,
} from './shared';

// ---------------------------------------------------------------------------
// Scene: rear view for heel visualization
// ---------------------------------------------------------------------------

export function SceneRear({ ui, sim, tp }: { ui: UiState; sim: SimulationModel; tp: TpFn }) {
  // Unique prefix so def IDs don't collide with the other SceneRear instance
  // rendered in the parallel (desktop / mobile) layout tree.
  const uid = useId();
  const rearBgId = `v3-rear-bg-${uid}`;

  const width = 760;
  const height = 600;
  const cx = width / 2;
  const horizonY = height * 0.6;
  // Heel direction: on starboard tack (signedTwa > 0) boat heels to port =
  // in rear view, top of mast leans LEFT (negative rotation).
  // Displayed heel magnitude is |state.heel|, sign from tack.
  const heelMag = sim.result.state.heel;
  const heelSign = sim.signedTwa > 0 ? -1 : 1;
  const heelVisual = heelMag * heelSign;
  const heelAbs = Math.abs(heelMag);
  const mainScale = REEF_VISUAL[ui.reefLevel];
  const jibOpacity = clamp(ui.jibFurlPct / 100, 0.15, 1);
  const hasMain = ui.sailsRaised !== 'jib';
  const hasJib = ui.sailsRaised !== 'main' && ui.jibFurlPct > 10;

  const heelColor = heelAbs > 28 ? '#ff5252' : heelAbs > 22 ? '#f6b73c' : '#00d4ff';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-full">
      <defs>
        <linearGradient id={rearBgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1b33" />
          <stop offset={`${(horizonY / height) * 100}%`} stopColor="#0c2340" />
          <stop offset={`${(horizonY / height) * 100}%`} stopColor="#09192d" />
          <stop offset="100%" stopColor="#06111f" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill={`url(#${rearBgId})`} />

      {/* Horizon */}
      <line
        x1="0"
        x2={width}
        y1={horizonY}
        y2={horizonY}
        stroke="rgba(0, 212, 255, 0.36)"
        strokeDasharray="8 6"
        strokeWidth={1.2}
      />

      {/* Water wave bands */}
      <g className="sim-waves">
        {Array.from({ length: 8 }).map((_, i) => (
          <path
            key={i}
            d={`M 0 ${horizonY + 18 + i * 16} Q 90 ${horizonY + 10 + i * 16} 180 ${horizonY + 18 + i * 16} T ${width} ${horizonY + 18 + i * 16}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}
      </g>

      {/* Wind indicator from behind - small arrow at top-right */}
      <g transform={`translate(${width - 110} 80)`}>
        <text
          x="0"
          y="-10"
          fill="rgba(139, 167, 184, 0.65)"
          fontSize="10"
          fontWeight="700"
          textAnchor="start"
          style={{ letterSpacing: '0.1em' }}
        >
          TWS {ui.windSpeed} kts
        </text>
        <path d="M 0 0 L 60 0" stroke="#00d4ff" strokeWidth={2.2} />
        <polygon points="60,-6 70,0 60,6" fill="#00d4ff" />
      </g>

      {/* Distant coastline to give the horizon some depth so the scene
          stops looking like a flat navy gradient. */}
      <path
        d={`M 0 ${horizonY - 4} Q 180 ${horizonY - 10} 340 ${horizonY - 6} T 620 ${horizonY - 8} T ${width} ${horizonY - 4} L ${width} ${horizonY} L 0 ${horizonY} Z`}
        fill="rgba(40, 70, 100, 0.55)"
      />

      {/* Boat + rig rotated by heel. Horizon stays level. */}
      <g transform={`translate(${cx} ${horizonY}) rotate(${heelVisual})`}>
        {/* Hull seen from behind: curved bottom, flat top at horizon */}
        <path
          d="M -120 0 Q -100 -32 -68 -36 L 68 -36 Q 100 -32 120 0 Q 104 16 66 20 L -66 20 Q -104 16 -120 0 Z"
          fill="#e8f0f6"
          stroke="#6f8ba0"
          strokeWidth={2.2}
        />
        {/* Cabin hump - low profile rectangle */}
        <rect x="-54" y="-52" width="108" height="18" rx="4" fill="#dde7ee" stroke="#6f8ba0" strokeWidth={1.2} />
        {/* Cabin windows */}
        <rect x="-46" y="-48" width="24" height="10" rx="2" fill="rgba(50, 90, 130, 0.85)" />
        <rect x="-10" y="-48" width="24" height="10" rx="2" fill="rgba(50, 90, 130, 0.85)" />
        <rect x="22" y="-48" width="24" height="10" rx="2" fill="rgba(50, 90, 130, 0.85)" />
        {/* Pulpit rail */}
        <path
          d="M -60 -36 L -64 -52 M -60 -52 L 60 -52 M 60 -36 L 64 -52"
          stroke="rgba(111, 139, 160, 0.6)"
          strokeWidth={1}
          fill="none"
        />
        {/* Rudder hint */}
        <path d="M -8 20 L 10 20 L 4 70 L -4 70 Z" fill="rgba(10, 22, 40, 0.9)" />

        {/* Mast, vertical within the boat frame (so it tilts with the whole rotation) */}
        <rect x="-3" y="-224" width="6" height="224" rx="3" fill="#d0d8e0" />
        {/* Mast cap */}
        <circle cx="0" cy="-226" r="4" fill="#d0d8e0" />
        {/* Spreaders - horizontal crossbar mid-mast */}
        <line x1="-18" x2="18" y1="-130" y2="-130" stroke="#d0d8e0" strokeWidth={1.8} strokeLinecap="round" />
        {/* Shrouds: port + starboard support cables running from spreader
            to deck edge; they stay straight in boat frame so they tilt with
            the boat along with the rig. */}
        <line x1="-18" y1="-130" x2="-64" y2="-16" stroke="rgba(208, 216, 224, 0.4)" strokeWidth={1} />
        <line x1="18" y1="-130" x2="64" y2="-16" stroke="rgba(208, 216, 224, 0.4)" strokeWidth={1} />

        {/* Main (full shape, curved crescent from behind) */}
        {hasMain && (
          <g transform={`scale(1 ${mainScale})`}>
            <path
              d={`M 0 -216 Q ${heelSign * 52} -120 ${heelSign * 78} -14 L 0 -14 Z`}
              fill="#f6fbff"
              stroke="#ffffff"
              strokeWidth={2.5}
            />
            {/* Battens: faint horizontal curves inside the sail */}
            {[-180, -130, -80].map((y) => (
              <path
                key={y}
                d={`M 0 ${y} Q ${heelSign * 32} ${y} ${heelSign * 58} ${y + 4}`}
                fill="none"
                stroke="rgba(160, 185, 205, 0.55)"
                strokeWidth={0.8}
                strokeLinecap="round"
              />
            ))}
          </g>
        )}

        {/* Jib (smaller, behind/alongside main) */}
        {hasJib && (
          <g opacity={jibOpacity}>
            <path
              d={`M 0 -186 Q ${heelSign * 30} -116 ${heelSign * 90} -24 L 0 -24 Z`}
              fill="#f6fbff"
              stroke="#ffffff"
              strokeWidth={2.5}
            />
          </g>
        )}
      </g>

      {/* Heel angle arc overlay (relative to horizon, in world frame) */}
      {heelAbs > 2 && (
        <g transform={`translate(${cx} ${horizonY})`}>
          {/* Vertical reference line (dashed) */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-200"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {/* Arc from vertical to mast */}
          <path
            d={describeArc(0, 0, 110, -90, -90 + heelVisual)}
            fill="none"
            stroke={heelColor}
            strokeWidth={2}
            strokeDasharray="3 3"
          />
          <text
            x={heelVisual * -1.6 - 24}
            y={-118}
            fill={heelColor}
            fontSize="14"
            fontWeight="800"
            textAnchor="middle"
          >
            {Math.round(heelAbs)}°
          </text>
        </g>
      )}

      {/* Big heel numeral overlay, bottom-right */}
      <g transform={`translate(${width - 40} ${height - 40})`}>
        <text
          x="0"
          y="0"
          fill={heelColor}
          fontSize="64"
          fontWeight="900"
          textAnchor="end"
          style={{
            fontFamily: 'ui-monospace, monospace',
            filter: `drop-shadow(0 0 12px ${heelColor})`,
          }}
        >
          {Math.round(heelAbs)}°
        </text>
        <text
          x="0"
          y="-72"
          fill={heelColor}
          fontSize="10"
          fontWeight="700"
          textAnchor="end"
          style={{ letterSpacing: '0.2em', opacity: 0.7 }}
        >
          {tp('КРЕН / HEEL', 'HEEL', 'PRZECHYL')}
        </text>
      </g>

      {/* Top-left label */}
      <g transform="translate(24 36)">
        <text
          x="0"
          y="0"
          fill="#e8f4f8"
          fontSize="16"
          fontWeight="800"
          style={{ letterSpacing: '0.02em' }}
        >
          {tp('ВИД СЗАДИ', 'REAR VIEW', 'WIDOK Z TYLU')}
        </text>
        <text x="0" y="18" fill="rgba(139, 167, 184, 0.75)" fontSize="11">
          {tp('почему появился крен', 'why the heel happens', 'skad przechyl')}
        </text>
      </g>
    </svg>
  );
}
