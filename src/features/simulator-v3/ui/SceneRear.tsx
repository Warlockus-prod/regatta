'use client';

import { useId } from 'react';
import {
  clamp,
  describeArc,
  finite,
  REEF_VISUAL,
  type SimulationModel,
  type TpFn,
  type UiState,
} from './shared';

// ---------------------------------------------------------------------------
// Scene: rear view - the boat as you see it from a chase boat directly
// astern.
//
// Rewritten 2026-04-25 because the previous version read more like a wide
// abstract crescent than a real transom. New rules:
// - Hull narrows toward the keel; we see a U-shape, not a wide oval.
// - The transom cap is visible at the very top of the hull (where the
//   helmsman sits). Cockpit + companionway hint inside.
// - Keel and rudder are below the waterline; rudder offset slightly
//   behind the keel.
// - Mast is a thin vertical line and stays in the rotated frame, so when
//   the whole boat heels, the mast leans like the rest.
// - Sails are drawn from BEHIND: you see the back side. Main sits aft of
//   the mast, jib forward of it; on a starboard-tack heel, both lean to
//   port (top of mast leans right of vertical from observer's POV).
// - Sail edges flap when stalled.
// - Heel is communicated with: tilted rig, asymmetric waterline foam
//   (the leeward bow goes deeper), and a dashed reference plumb line.
// ---------------------------------------------------------------------------

export function SceneRear({ ui, sim, tp }: { ui: UiState; sim: SimulationModel; tp: TpFn }) {
  const uid = useId();
  const skyId = `v3-rear-sky-${uid}`;
  const hullId = `v3-rear-hull-${uid}`;
  const sailMainId = `v3-rear-sail-main-${uid}`;
  const sailJibId = `v3-rear-sail-jib-${uid}`;

  const width = 760;
  const height = 600;
  const cx = width / 2;
  const horizonY = height * 0.6;
  const heelMag = sim.result.state.heel;
  // Starboard tack (signedTwa > 0) means wind from starboard; the boat
  // heels to port. From astern, port is the observer's RIGHT, so the
  // mast top tilts to the right (positive rotation in screen coords).
  const heelSign = finite(sim.signedTwa) > 0 ? -1 : 1;
  const heelVisual = finite(heelMag * heelSign);
  const heelAbs = Math.abs(heelMag);
  const mainScale = REEF_VISUAL[ui.reefLevel];
  const jibOpacity = clamp(ui.jibFurlPct / 100, 0.18, 1);
  const hasMain = ui.sailsRaised !== 'jib';
  const hasJib = ui.sailsRaised !== 'main' && ui.jibFurlPct > 10;
  const mainStalled = sim.result.diag.mainStalled;
  const jibStalled = sim.result.diag.jibStalled;
  const heelColor = heelAbs > 28 ? '#ff5252' : heelAbs > 22 ? '#f6b73c' : '#00d4ff';

  // Sail drawing helpers. Main is centered on mast at x=0; from BEHIND we
  // see its back side as a curved triangle whose foot follows the boom.
  // The boom angles slightly off centerline as ui.mainAngle grows, but
  // from directly astern that mostly looks like a foreshortened length
  // rather than a sideways swing. We model it as a small lateral offset
  // of the clew so the boom is "pointing slightly to leeward".
  const mainOffDeg = finite(ui.mainAngle, 45);
  const mainBoomLateral = (mainOffDeg / 60) * 22;  // 0..22 px sideways
  const mainBoomLong = 60 - mainOffDeg * 0.4;       // foreshortened
  // From astern: leeward side is the side the wind PUSHES the sail
  // toward. signedTwa>0 = starboard tack = leeward = port = our right.
  // In screen coords (no flip), our right = positive x. So sailLeewardX
  // is +1 for starboard tack and -1 for port.
  const sailLeewardX: 1 | -1 = finite(sim.signedTwa) > 0 ? 1 : -1;

  // Jib forward of mast - from astern most of it hides behind the main
  // when on the same tack. We render it slightly offset so the user can
  // still see "yes there is a jib".
  const jibOffsetX = sailLeewardX * 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-full">
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1f3a" />
          <stop offset={`${((horizonY - 80) / height) * 100}%`} stopColor="#16345a" />
          <stop offset={`${(horizonY / height) * 100}%`} stopColor="#0e2a4a" />
          <stop offset={`${(horizonY / height) * 100 + 0.5}%`} stopColor="#08182d" />
          <stop offset="100%" stopColor="#03101e" />
        </linearGradient>
        <linearGradient id={hullId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f5f9" />
          <stop offset="55%" stopColor="#dde7ee" />
          <stop offset="100%" stopColor="#88a0b3" />
        </linearGradient>
        {/* Sail gradients: leeward edge brighter (windward fills the
            belly), windward edge in shadow. We're looking at the BACK
            of the sail so this is reversed: the side facing the wind
            (away from observer) reads darker; the side toward us reads
            lit by the sky. */}
        <linearGradient id={sailMainId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a8b9ca" />
          <stop offset="55%" stopColor={mainStalled ? '#ffc8b0' : '#fffaee'} />
          <stop offset="100%" stopColor="#c8d6e0" />
        </linearGradient>
        <linearGradient id={sailJibId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a4b8cb" />
          <stop offset="50%" stopColor={jibStalled ? '#ffd7c0' : '#eaf3fb'} />
          <stop offset="100%" stopColor="#c2d1de" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill={`url(#${skyId})`} />

      {/* Horizon line - subtle dashed cyan */}
      <line
        x1="0"
        x2={width}
        y1={horizonY}
        y2={horizonY}
        stroke="rgba(0, 212, 255, 0.32)"
        strokeDasharray="10 8"
        strokeWidth={1}
      />

      {/* Distant coastline silhouette so the horizon has depth */}
      <path
        d={`M 0 ${horizonY - 4} Q 180 ${horizonY - 14} 340 ${horizonY - 6} T 620 ${horizonY - 10} T ${width} ${horizonY - 4} L ${width} ${horizonY} L 0 ${horizonY} Z`}
        fill="rgba(40, 70, 100, 0.5)"
      />

      {/* Animated water beyond the boat */}
      <g opacity={0.55}>
        {Array.from({ length: 6 }).map((_, i) => {
          const y = horizonY + 12 + i * 18;
          const amp = 3 + (i % 2) * 2;
          return (
            <path
              key={i}
              d={`M 0 ${y} Q 180 ${y - amp} 360 ${y} T 720 ${y} T ${width + 60} ${y}`}
              fill="none"
              stroke="rgba(150, 210, 255, 0.18)"
              strokeWidth={1}
            >
              <animate
                attributeName="d"
                dur={`${7 + i * 0.5}s`}
                repeatCount="indefinite"
                values={[
                  `M 0 ${y} Q 180 ${y - amp} 360 ${y} T 720 ${y} T ${width + 60} ${y}`,
                  `M 0 ${y} Q 180 ${y + amp} 360 ${y} T 720 ${y} T ${width + 60} ${y}`,
                  `M 0 ${y} Q 180 ${y - amp} 360 ${y} T 720 ${y} T ${width + 60} ${y}`,
                ].join(';')}
              />
            </path>
          );
        })}
      </g>

      {/* TWS arrow at top right */}
      <g transform={`translate(${width - 110} 70)`}>
        <text
          x="0"
          y="-10"
          fill="rgba(139, 167, 184, 0.7)"
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

      {/* Vertical reference plumb line - in world frame, NOT rotated by
          heel. Anchored at the boat center. Helps the eye see how far
          the rig is leaning. */}
      <line
        x1={cx}
        y1={horizonY - 280}
        x2={cx}
        y2={horizonY}
        stroke="rgba(255, 255, 255, 0.14)"
        strokeDasharray="3 6"
        strokeWidth={1}
      />

      {/* Boat + rig - rotated by heel around the waterline center */}
      <g transform={`translate(${cx} ${horizonY}) rotate(${heelVisual})`}>
        {/* HULL from behind: U-shape that narrows toward the keel and
            widens at the deck. Drawn as one closed path. */}
        <path
          d={`
            M -118 0
            L -116 -8
            Q -100 -34 -56 -42
            L 56 -42
            Q 100 -34 116 -8
            L 118 0
            Q 110 22 78 30
            L -78 30
            Q -110 22 -118 0
            Z
          `}
          fill={`url(#${hullId})`}
          stroke="#5e7889"
          strokeWidth={2}
        />
        {/* Boot stripe along the waterline */}
        <path
          d="M -118 0 Q -110 4 -78 6 L 78 6 Q 110 4 118 0"
          fill="none"
          stroke="#1f3852"
          strokeWidth={1.6}
        />

        {/* TRANSOM CAP: top edge with cockpit indent. We're seeing the
            back of the boat over the transom rail. */}
        <rect x="-46" y="-58" width="92" height="20" rx="4" fill="#ccd9e2" stroke="#6f8ba0" strokeWidth={1.2} />
        {/* Companionway slot in the middle */}
        <rect x="-12" y="-56" width="24" height="14" rx="2" fill="rgba(15, 30, 50, 0.9)" />
        {/* Helm wheel hint */}
        <circle cx="0" cy="-14" r="6" fill="none" stroke="rgba(50, 80, 110, 0.7)" strokeWidth={1.2} />
        <line x1="-6" y1="-14" x2="6" y2="-14" stroke="rgba(50, 80, 110, 0.7)" strokeWidth={1} />
        <line x1="0" y1="-20" x2="0" y2="-8" stroke="rgba(50, 80, 110, 0.7)" strokeWidth={1} />

        {/* Pulpit / pushpit rail - the safety bar at the stern */}
        <path
          d="M -50 -42 L -54 -64 L -42 -64 M 50 -42 L 54 -64 L 42 -64 M -54 -64 L 54 -64"
          fill="none"
          stroke="rgba(111, 139, 160, 0.7)"
          strokeWidth={1.2}
        />

        {/* KEEL hanging straight down below the hull */}
        <path
          d="M -8 30 L -10 100 Q -6 110 0 110 L 0 116 Q 6 110 10 100 L 8 30 Z"
          fill="rgba(15, 28, 46, 0.92)"
        />
        {/* Bulb at keel base for a fin-keel cruiser look */}
        <ellipse cx="0" cy="116" rx="20" ry="5" fill="rgba(15, 28, 46, 0.92)" />

        {/* RUDDER - a smaller fin slightly aft (which from astern reads
            as "behind" the keel). Drawn as a thin slice. */}
        <path d="M -3 30 L -4 80 L 4 80 L 3 30 Z" fill="rgba(20, 36, 56, 0.85)" />

        {/* MAST from cockpit up. Stays straight in the rotated frame. */}
        <rect x="-3" y="-242" width="6" height="200" rx="3" fill="#cfd8e0" />
        <circle cx="0" cy="-242" r="4" fill="#cfd8e0" />

        {/* Spreaders */}
        <line x1="-22" x2="22" y1="-138" y2="-138" stroke="#cfd8e0" strokeWidth={1.6} strokeLinecap="round" />

        {/* Shrouds: from spreader tips down to the deck edge. They tilt
            with the rig because they are inside the rotated group. */}
        <line x1="-22" y1="-138" x2="-78" y2="-30" stroke="rgba(207, 216, 224, 0.4)" strokeWidth={1} />
        <line x1="22" y1="-138" x2="78" y2="-30" stroke="rgba(207, 216, 224, 0.4)" strokeWidth={1} />
        {/* Backstay hint going from mast head to transom corner */}
        <line x1="0" y1="-242" x2="34" y2="-58" stroke="rgba(207, 216, 224, 0.3)" strokeWidth={0.8} />

        {/* MAIN sail from behind. Triangle from mast top through a leech
            curve to the boom clew. Reef shrinks vertically. The boom is
            mostly foreshortened - we model its lateral offset. */}
        {hasMain && (
          <g transform={`scale(1 ${mainScale})`}>
            {mainStalled ? (
              <path
                d={`
                  M 0 -242
                  Q ${sailLeewardX * 38} -160
                     ${sailLeewardX * 58 + sailLeewardX * mainBoomLateral} -42
                  L ${sailLeewardX * mainBoomLong * 0.9 + sailLeewardX * mainBoomLateral} -42
                  L 0 -42
                  Z
                `}
                fill={`url(#${sailMainId})`}
                stroke="#ffffff"
                strokeWidth={1.8}
                strokeLinejoin="round"
              >
                <animate
                  attributeName="d"
                  dur="0.65s"
                  repeatCount="indefinite"
                  values={[
                    `M 0 -242 Q ${sailLeewardX * 32} -160 ${sailLeewardX * 50 + sailLeewardX * mainBoomLateral} -42 L ${sailLeewardX * mainBoomLong * 0.85 + sailLeewardX * mainBoomLateral} -42 L 0 -42 Z`,
                    `M 0 -242 Q ${sailLeewardX * 46} -160 ${sailLeewardX * 64 + sailLeewardX * mainBoomLateral} -42 L ${sailLeewardX * mainBoomLong * 0.95 + sailLeewardX * mainBoomLateral} -42 L 0 -42 Z`,
                    `M 0 -242 Q ${sailLeewardX * 30} -160 ${sailLeewardX * 54 + sailLeewardX * mainBoomLateral} -42 L ${sailLeewardX * mainBoomLong * 0.8 + sailLeewardX * mainBoomLateral} -42 L 0 -42 Z`,
                    `M 0 -242 Q ${sailLeewardX * 42} -160 ${sailLeewardX * 60 + sailLeewardX * mainBoomLateral} -42 L ${sailLeewardX * mainBoomLong * 0.95 + sailLeewardX * mainBoomLateral} -42 L 0 -42 Z`,
                    `M 0 -242 Q ${sailLeewardX * 32} -160 ${sailLeewardX * 50 + sailLeewardX * mainBoomLateral} -42 L ${sailLeewardX * mainBoomLong * 0.85 + sailLeewardX * mainBoomLateral} -42 L 0 -42 Z`,
                  ].join(';')}
                />
              </path>
            ) : (
              <path
                d={`
                  M 0 -242
                  Q ${sailLeewardX * 38} -160
                     ${sailLeewardX * 58 + sailLeewardX * mainBoomLateral} -42
                  L ${sailLeewardX * mainBoomLong * 0.9 + sailLeewardX * mainBoomLateral} -42
                  L 0 -42
                  Z
                `}
                fill={`url(#${sailMainId})`}
                stroke="#ffffff"
                strokeWidth={1.8}
                strokeLinejoin="round"
              />
            )}
            {/* Battens: three faint lines following the sail's curvature */}
            {[-200, -150, -100].map((y) => (
              <path
                key={y}
                d={`M 0 ${y} Q ${sailLeewardX * 24} ${y + 1} ${sailLeewardX * 44} ${y + 4}`}
                fill="none"
                stroke="rgba(160, 185, 205, 0.5)"
                strokeWidth={0.7}
                strokeLinecap="round"
              />
            ))}
            {/* Boom horizontal line (foreshortened from astern) */}
            <line
              x1={0}
              y1={-42}
              x2={sailLeewardX * mainBoomLong + sailLeewardX * mainBoomLateral}
              y2={-42}
              stroke="#1a2230"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* JIB sail from behind, mostly hidden by the main when on the
            same tack. We offset it slightly so the user can see "yes
            there is a jib up there" but it doesn't fight the main. */}
        {hasJib && (
          <g opacity={jibOpacity * 0.85}>
            {jibStalled ? (
              <path
                d={`
                  M ${jibOffsetX} -218
                  Q ${jibOffsetX + sailLeewardX * 22} -150
                     ${jibOffsetX + sailLeewardX * 60} -50
                  L ${jibOffsetX} -50
                  Z
                `}
                fill={`url(#${sailJibId})`}
                stroke="#ffffff"
                strokeWidth={1.5}
                strokeLinejoin="round"
              >
                <animate
                  attributeName="d"
                  dur="0.55s"
                  repeatCount="indefinite"
                  values={[
                    `M ${jibOffsetX} -218 Q ${jibOffsetX + sailLeewardX * 18} -150 ${jibOffsetX + sailLeewardX * 56} -50 L ${jibOffsetX} -50 Z`,
                    `M ${jibOffsetX} -218 Q ${jibOffsetX + sailLeewardX * 26} -150 ${jibOffsetX + sailLeewardX * 64} -50 L ${jibOffsetX} -50 Z`,
                    `M ${jibOffsetX} -218 Q ${jibOffsetX + sailLeewardX * 16} -150 ${jibOffsetX + sailLeewardX * 58} -50 L ${jibOffsetX} -50 Z`,
                    `M ${jibOffsetX} -218 Q ${jibOffsetX + sailLeewardX * 24} -150 ${jibOffsetX + sailLeewardX * 62} -50 L ${jibOffsetX} -50 Z`,
                    `M ${jibOffsetX} -218 Q ${jibOffsetX + sailLeewardX * 18} -150 ${jibOffsetX + sailLeewardX * 56} -50 L ${jibOffsetX} -50 Z`,
                  ].join(';')}
                />
              </path>
            ) : (
              <path
                d={`
                  M ${jibOffsetX} -218
                  Q ${jibOffsetX + sailLeewardX * 22} -150
                     ${jibOffsetX + sailLeewardX * 60} -50
                  L ${jibOffsetX} -50
                  Z
                `}
                fill={`url(#${sailJibId})`}
                stroke="#ffffff"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            )}
          </g>
        )}
      </g>

      {/* Heel arc + numeric label - in WORLD frame so the arc reads
          relative to the horizon, not the rotated boat. */}
      {heelAbs > 2 && (
        <g transform={`translate(${cx} ${horizonY})`}>
          <path
            d={describeArc(0, 0, 130, -90, -90 + heelVisual)}
            fill="none"
            stroke={heelColor}
            strokeWidth={2}
            strokeDasharray="3 4"
          />
          <text
            x={(heelVisual / 90) * 50}
            y={-148}
            fill={heelColor}
            fontSize="12"
            fontWeight="800"
            textAnchor="middle"
          >
            {Math.round(heelAbs)}°
          </text>
        </g>
      )}

      {/* Bottom-right big heel readout */}
      <g transform={`translate(${width - 36} ${height - 40})`}>
        <text
          x="0"
          y="0"
          fill={heelColor}
          fontSize="56"
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
          y="-66"
          fill={heelColor}
          fontSize="9"
          fontWeight="700"
          textAnchor="end"
          style={{ letterSpacing: '0.2em', opacity: 0.75 }}
        >
          {tp('КРЕН', 'HEEL', 'PRZECHYL')}
        </text>
      </g>

      {/* Top-left scene label */}
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
          {tp('как видит соседняя яхта', 'as another boat sees you', 'jak widzi cie inny jacht')}
        </text>
      </g>
    </svg>
  );
}
