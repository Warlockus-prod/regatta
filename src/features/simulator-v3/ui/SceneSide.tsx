'use client';

import { useId } from 'react';
import {
  clamp,
  finite,
  REEF_VISUAL,
  type SimulationModel,
  type TpFn,
  type UiState,
} from './shared';

// ---------------------------------------------------------------------------
// Scene: side-on profile view. The third toggle alongside Top and Rear.
// Shows the boat from the beam so heel, mast angle, boom swing, keel
// depth, and bow wave are all legible at once. Complements:
// - TOP  = course reading (where am I vs wind)
// - REAR = heel magnitude (how hard am I leaning)
// - SIDE = hull + rig profile (what am I moving through the water with)
//
// Conventions for this view:
// - Horizontal axis: boat forward direction. Bow right.
// - Vertical axis: up.
// - Wind arrives from astern or abeam depending on TWA; we show an
//   apparent-wind ribbon across the top.
// - Heel tilts the whole boat+rig group around the waterline so the hull
//   banks left or right slightly even though we're "looking from port".
// ---------------------------------------------------------------------------

export function SceneSide({
  ui,
  sim,
  tp,
}: {
  ui: UiState;
  sim: SimulationModel;
  tp: TpFn;
}) {
  const uid = useId();
  const skyId = `v3-side-sky-${uid}`;
  const hullId = `v3-side-hull-${uid}`;

  const width = 760;
  const height = 600;
  const cx = width / 2;
  const waterY = height * 0.62;
  const boatSpeed = sim.result.state.boatSpeed;
  const heelAbs = Math.abs(sim.result.state.heel);
  const windIntensity = clamp((ui.windSpeed - 4) / 21, 0, 1);
  const speedIntensity = clamp(boatSpeed / 8, 0, 1);
  const mainVisualScale = REEF_VISUAL[ui.reefLevel];
  const hasMain = ui.sailsRaised !== 'jib';
  const hasJib = ui.sailsRaised !== 'main' && ui.jibFurlPct > 10;
  const jibOpacity = clamp(ui.jibFurlPct / 100, 0.2, 1);

  // Mild side-on rock from heel. Keep it subtle - this is not the rear view
  // where heel is the hero. Side view reads best when the horizon stays
  // anchored and the boat gets a gentle lean so it feels like it's working.
  const sideRock = finite(heelAbs * 0.35, 0);

  // Boom swing in the side view. The boom's angle off centerline only
  // reads as a small vertical bounce when seen from port - we project it:
  // when the boom is straight aft (ui.mainAngle = 0), we look straight at
  // the end. When the boom is swung out 60 deg, the projection shows
  // ~60% of the length and the end is lower due to gravity / vang.
  const mainOff = finite(ui.mainAngle, 45);
  const boomProj = Math.abs(Math.cos((mainOff * Math.PI) / 180));
  const boomLen = 180;
  const boomEndX = cx + boomLen * boomProj;
  const boomEndY = waterY - 90;

  const sailColor = sim.result.diag.mainStalled ? '#ffd7d7' : '#ffffff';
  const jibColor = sim.result.diag.jibStalled ? '#ffe3d2' : '#f7fbff';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-full">
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a2040" />
          <stop offset={`${((waterY - 120) / height) * 100}%`} stopColor="#13355a" />
          <stop offset={`${(waterY / height) * 100}%`} stopColor="#0e2847" />
          <stop offset={`${(waterY / height) * 100 + 0.5}%`} stopColor="#07192e" />
          <stop offset="100%" stopColor="#040e1e" />
        </linearGradient>
        <linearGradient id={hullId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e8f0f6" />
          <stop offset="100%" stopColor="#9fb4c4" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill={`url(#${skyId})`} />

      {/* Horizon */}
      <line
        x1="0"
        x2={width}
        y1={waterY}
        y2={waterY}
        stroke="rgba(0, 212, 255, 0.32)"
        strokeDasharray="10 8"
        strokeWidth={1}
      />

      {/* Small distant coast - just a faint ridge so the eye has distance */}
      <path
        d={`M 0 ${waterY - 6} Q 140 ${waterY - 14} 260 ${waterY - 8} T 520 ${waterY - 10} T ${width} ${waterY - 6} L ${width} ${waterY} L 0 ${waterY} Z`}
        fill="rgba(40, 70, 100, 0.55)"
      />

      {/* Animated water surface ripples under the boat */}
      <g opacity={0.6}>
        {Array.from({ length: 5 }).map((_, i) => {
          const y = waterY + 12 + i * 14;
          const amp = 2 + windIntensity * 3;
          return (
            <path
              key={i}
              d={`M 0 ${y} Q 160 ${y - amp} 320 ${y} T 640 ${y} T ${width} ${y}`}
              fill="none"
              stroke="rgba(130, 200, 255, 0.18)"
              strokeWidth={1}
            >
              <animate
                attributeName="d"
                dur={`${6 + i * 0.4}s`}
                repeatCount="indefinite"
                values={[
                  `M 0 ${y} Q 160 ${y - amp} 320 ${y} T 640 ${y} T ${width} ${y}`,
                  `M 0 ${y} Q 160 ${y + amp} 320 ${y} T 640 ${y} T ${width} ${y}`,
                  `M 0 ${y} Q 160 ${y - amp} 320 ${y} T 640 ${y} T ${width} ${y}`,
                ].join(';')}
              />
            </path>
          );
        })}
      </g>

      {/* Apparent wind ribbon at top - short animated dashes flowing right
          to left or left to right depending on whether AWA is forward of
          beam (close-hauled = from forward) or aft (broad = from behind). */}
      <g opacity={0.45}>
        <text
          x={24}
          y={36}
          fill="rgba(130, 200, 255, 0.75)"
          fontSize="10"
          fontWeight="700"
          style={{ letterSpacing: '0.12em' }}
        >
          AW {Math.round(Math.abs(finite(sim.result.diag.awa)))}°
        </text>
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={i}
            x1={40 + i * 64}
            x2={40 + i * 64 + 24}
            y1={48}
            y2={48}
            stroke="rgba(130, 200, 255, 0.45)"
            strokeWidth={1.4}
            strokeLinecap="round"
          >
            <animate
              attributeName="x1"
              from={-40 + i * 64}
              to={width + 40 + i * 64}
              dur={`${6 - windIntensity * 2.5}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              from={-16 + i * 64}
              to={width + 64 + i * 64}
              dur={`${6 - windIntensity * 2.5}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}
      </g>

      {/* Bow wave crest - crescent of foam in front of the hull when moving */}
      {speedIntensity > 0.15 && (
        <g opacity={speedIntensity * 0.75}>
          <path
            d={`M ${cx - 150} ${waterY + 4} Q ${cx - 120} ${waterY - 10 - speedIntensity * 8} ${cx - 90} ${waterY + 2}`}
            fill="none"
            stroke="rgba(220, 240, 255, 0.85)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - 180} ${waterY + 12} Q ${cx - 140} ${waterY - 2} ${cx - 100} ${waterY + 8}`}
            fill="none"
            stroke="rgba(180, 220, 255, 0.5)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Stern wake: a trailing streak receding behind the boat */}
      {speedIntensity > 0.15 && (
        <g opacity={speedIntensity * 0.6}>
          <path
            d={`M ${cx + 140} ${waterY + 4} L ${Math.min(width, cx + 140 + speedIntensity * 220)} ${waterY + 18}`}
            stroke="rgba(200, 230, 255, 0.6)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <path
            d={`M ${cx + 140} ${waterY + 10} L ${Math.min(width, cx + 140 + speedIntensity * 180)} ${waterY + 26}`}
            stroke="rgba(180, 220, 255, 0.35)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Boat + rig as a group that banks slightly for heel.
          Pivot: middle of the waterline. */}
      <g transform={`translate(${cx} ${waterY}) rotate(${sideRock})`}>
        {/* Underwater: keel fin + bulb + rudder. Darker so they read as
            submerged silhouette, not hull paint. */}
        <path
          d="M -10 0 L -6 72 Q -2 80 0 80 L 0 84 Q 2 80 6 72 L 10 0 Z"
          fill="rgba(10, 20, 35, 0.85)"
        />
        <ellipse cx="0" cy="86" rx="16" ry="4" fill="rgba(10, 20, 35, 0.9)" />
        {/* Rudder aft */}
        <path
          d="M 118 0 L 122 52 L 126 52 L 124 0 Z"
          fill="rgba(10, 20, 35, 0.85)"
        />

        {/* Hull profile. Bow right (positive x), stern left, curved sheer
            line. */}
        <path
          d="M -150 0 L -152 -14 Q -100 -28 0 -32 Q 80 -34 130 -24 Q 152 -18 150 0 Z"
          fill={`url(#${hullId})`}
          stroke="#6f8ba0"
          strokeWidth={2}
        />
        {/* Deck shadow line */}
        <path
          d="M -150 0 L -152 -14 Q -100 -28 0 -32 Q 80 -34 130 -24 Q 152 -18 150 0"
          fill="none"
          stroke="rgba(111, 139, 160, 0.35)"
          strokeWidth={1}
        />
        {/* Waterline stripe */}
        <line
          x1="-150"
          x2="150"
          y1="-4"
          y2="-4"
          stroke="rgba(30, 50, 75, 0.6)"
          strokeWidth={1}
        />

        {/* Cabin hump - roof with small windows so the boat doesn't look
            like a flat banana. */}
        <rect x="-60" y="-56" width="120" height="24" rx="6" fill="#dde7ee" stroke="#6f8ba0" strokeWidth={1.2} />
        <rect x="-52" y="-50" width="18" height="10" rx="2" fill="rgba(50, 90, 130, 0.8)" />
        <rect x="-28" y="-50" width="18" height="10" rx="2" fill="rgba(50, 90, 130, 0.8)" />
        <rect x="-4" y="-50" width="18" height="10" rx="2" fill="rgba(50, 90, 130, 0.8)" />
        <rect x="20" y="-50" width="18" height="10" rx="2" fill="rgba(50, 90, 130, 0.8)" />

        {/* Bow pulpit */}
        <path
          d="M 140 -24 L 148 -40 L 152 -22"
          fill="none"
          stroke="#6f8ba0"
          strokeWidth={1.5}
        />

        {/* Mast: vertical line from deck up. Tiny lean from heel already
            applied by the parent rotate, so the mast stays perpendicular
            to the deck in boat frame, which is what you'd see from port. */}
        <rect x="-3" y="-240" width="6" height="212" rx="3" fill="#d0d8e0" />
        {/* Mast cap + backstay + forestay hints */}
        <circle cx="0" cy="-240" r="4" fill="#d0d8e0" />
        <line x1="0" y1="-240" x2="150" y2="-32" stroke="rgba(208, 216, 224, 0.45)" strokeWidth={1} />
        <line x1="0" y1="-240" x2="-150" y2="-14" stroke="rgba(208, 216, 224, 0.45)" strokeWidth={1} />
        {/* Shroud */}
        <line x1="0" y1="-180" x2="-40" y2="-28" stroke="rgba(208, 216, 224, 0.35)" strokeWidth={1} />
        <line x1="0" y1="-180" x2="40" y2="-28" stroke="rgba(208, 216, 224, 0.35)" strokeWidth={1} />

        {/* Boom: from mast at deck level, swinging back + slightly down
            toward the end. The projection collapses when the boom swings
            far out of the side-view plane (close-hauled) so the visible
            length shrinks naturally. */}
        {hasMain && (
          <>
            <line
              x1={0}
              y1={-28}
              x2={boomEndX - cx}
              y2={boomEndY - waterY}
              stroke="#3a4656"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Mainsail: triangle from mast top, around the belly, back to
                the clew. Two Q curves give the belly leeward; we flatten
                at high wind. Reef scales the whole sail vertically. */}
            <g transform={`scale(1 ${mainVisualScale})`}>
              <path
                d={`M 0 -232 Q ${(boomEndX - cx) * 0.42} ${-160 - 22 * (1 - windIntensity)} ${(boomEndX - cx) * 0.85} ${-90 - 14 * (1 - windIntensity)} L ${boomEndX - cx} ${boomEndY - waterY} L 0 -28 Z`}
                fill={sailColor}
                stroke="#ffffff"
                strokeWidth={2}
                strokeLinejoin="round"
                opacity={0.92}
              />
              {/* Battens: three horizontal stripes */}
              {[-180, -130, -80].map((y) => {
                const xAtY = ((y + 232) / 204) * (boomEndX - cx) * 0.9;
                return (
                  <line
                    key={y}
                    x1={0}
                    y1={y}
                    x2={xAtY}
                    y2={y + 2}
                    stroke="rgba(160, 185, 205, 0.55)"
                    strokeWidth={0.8}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Telltale at leech */}
              <line
                x1={(boomEndX - cx) * 0.85}
                y1={-90}
                x2={(boomEndX - cx) * 0.85 + (sim.result.diag.mainStalled ? 26 : 10)}
                y2={sim.result.diag.mainStalled ? -96 : -82}
                stroke={sim.result.diag.mainStalled ? '#ff8e6a' : '#8fffc2'}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </g>
          </>
        )}

        {/* Jib: smaller triangle forward of mast, from mast top-ish down
            to the bow, with a belly forward. */}
        {hasJib && (
          <g opacity={jibOpacity}>
            <path
              d={`M 0 -208 Q ${60 + 30 * (1 - windIntensity)} ${-150} ${130} ${-28} L 0 -28 Z`}
              fill={jibColor}
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinejoin="round"
              opacity={0.9}
            />
            {/* Forestay line behind the jib */}
            <line
              x1={0}
              y1={-208}
              x2={148}
              y2={-28}
              stroke="rgba(208, 216, 224, 0.3)"
              strokeWidth={0.8}
            />
            {/* Telltale on jib leech */}
            <line
              x1={80}
              y1={-120}
              x2={80 + (sim.result.diag.jibStalled ? 20 : 8)}
              y2={sim.result.diag.jibStalled ? -126 : -114}
              stroke={sim.result.diag.jibStalled ? '#ff9a7a' : '#8fffc2'}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          </g>
        )}
      </g>

      {/* Top-left label */}
      <g transform="translate(24 80)">
        <text
          x="0"
          y="0"
          fill="#e8f4f8"
          fontSize="16"
          fontWeight="800"
          style={{ letterSpacing: '0.02em' }}
        >
          {tp('ВИД СБОКУ', 'SIDE VIEW', 'WIDOK Z BOKU')}
        </text>
        <text x="0" y="18" fill="rgba(139, 167, 184, 0.75)" fontSize="11">
          {tp(
            'профиль корпуса и рангоута',
            'hull and rig profile',
            'profil kadluba i olinowania',
          )}
        </text>
      </g>

      {/* Bottom-right heel + speed readout pair */}
      <g transform={`translate(${width - 40} ${height - 50})`}>
        <text
          x="0"
          y="0"
          fill="var(--accent-cyan)"
          fontSize="36"
          fontWeight="900"
          textAnchor="end"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          {boatSpeed.toFixed(1)}
        </text>
        <text
          x="0"
          y="-38"
          fill="rgba(139, 167, 184, 0.8)"
          fontSize="9"
          fontWeight="700"
          textAnchor="end"
          style={{ letterSpacing: '0.15em' }}
        >
          {tp('СКОРОСТЬ', 'SPEED', 'PREDKOSC')} kts
        </text>
      </g>
    </svg>
  );
}
