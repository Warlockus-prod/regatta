'use client';

import { useId } from 'react';
import {
  clamp,
  polarPoint,
  REEF_VISUAL,
  sectorPath,
  type SimulationModel,
  type UiState,
} from './shared';

// ---------------------------------------------------------------------------
// Scene: top view with all layered overlays
// ---------------------------------------------------------------------------

export function SceneTop({
  ui,
  sim,
  lang,
}: {
  ui: UiState;
  sim: SimulationModel;
  lang: 'ru' | 'en' | 'pl';
}) {
  // Unique prefix per instance. SceneTop is rendered twice (desktop + mobile
  // layouts; Tailwind's hidden keeps both in the DOM) so SVG def IDs must not
  // collide across instances - duplicate IDs break aria-labelledby + screen
  // readers, and browser console warnings surface them.
  const uid = useId();
  const glowId = `v3-scene-glow-${uid}`;
  const nogoId = `v3-nogo-grad-${uid}`;
  const arrowGlowId = `v3-arrow-glow-${uid}`;
  const boatShadowId = `v3-boat-shadow-${uid}`;

  const width = 760;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  const sceneRadius = Math.min(width, height) * 0.42;
  const boatRotation = -sim.signedTwa;
  const sailSide: 1 | -1 = sim.signedTwa >= 0 ? -1 : 1;

  // Wind direction in scene coords: TW comes from the top in the world frame,
  // which in boat frame rotates by boatRotation. Visually, we KEEP the boat
  // rotating instead of the wind - but we draw the wind FROM north (top) and
  // let the sectors rotate with the boat.
  const awAngleInBoat = sim.result.diag.awa;

  // Drive and side magnitudes scaled to visible arrow length
  const driveScale = clamp(sim.result.diag.drive / 2000, 0.15, 1);
  const sideScale = clamp(Math.abs(sim.result.diag.side) / 2000, 0.1, 1);

  // Points for arrows (in world / scene frame, where top is "true wind comes from")
  const tw = {
    start: { x: cx, y: cy - sceneRadius * 1.02 },
    end: { x: cx, y: cy - sceneRadius * 0.72 },
  };
  // Apparent wind in scene frame: rotate AWA by boatRotation (boat is rotated)
  const awWorldAngle = boatRotation + awAngleInBoat;
  const awStart = polarPoint(cx, cy, sceneRadius * 0.92, awWorldAngle);
  const awEnd = polarPoint(cx, cy, sceneRadius * 0.48, awWorldAngle);

  // Drive forward (in boat frame is 0 deg; in scene frame is boatRotation)
  const driveEnd = polarPoint(cx, cy, 34 + driveScale * 110, boatRotation);
  const sideSignAngle = sim.result.diag.side >= 0 ? 90 : -90;
  const sideEnd = polarPoint(cx, cy, 26 + sideScale * 70, boatRotation + sideSignAngle);

  // Sector angles in world frame
  // No-go: 60 deg centered on north (wind from direction)
  const noGoPath = sectorPath(cx, cy, sceneRadius * 0.58, sceneRadius * 0.98, -30, 30);
  // Wind from sector 120 deg at top
  const windFromPath = sectorPath(cx, cy, sceneRadius * 0.58, sceneRadius * 0.98, -60, 60);

  // Main working sector in boat frame: behind mast, on leeward side
  // In world frame: rotate by boatRotation
  const mainStart = sailSide < 0 ? 95 : -180;
  const mainEnd = sailSide < 0 ? 180 : -95;
  const mainWorkingPath = sectorPath(
    cx,
    cy,
    sceneRadius * 0.3,
    sceneRadius * 0.68,
    boatRotation + mainStart,
    boatRotation + mainEnd,
  );

  // Jib working sector: forward of mast on leeward
  const jibStart = sailSide < 0 ? 5 : -55;
  const jibEnd = sailSide < 0 ? 55 : -5;
  const jibWorkingPath = sectorPath(
    cx,
    cy,
    sceneRadius * 0.3,
    sceneRadius * 0.65,
    boatRotation + jibStart,
    boatRotation + jibEnd,
  );

  const hasMain = ui.sailsRaised !== 'jib';
  const hasJib = ui.sailsRaised !== 'main' && ui.jibFurlPct > 10;
  const mainVisualScale = REEF_VISUAL[ui.reefLevel];
  const jibVisualOpacity = clamp(ui.jibFurlPct / 100, 0.18, 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-full">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="42%" r="68%">
          <stop offset="0%" stopColor="rgba(0, 212, 255, 0.14)" />
          <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
        </radialGradient>
        <radialGradient id={nogoId} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="rgba(255, 82, 82, 0.22)" />
          <stop offset="100%" stopColor="rgba(255, 82, 82, 0.05)" />
        </radialGradient>
        <filter id={arrowGlowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={boatShadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
          <feOffset dx="0" dy="4" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Scene glow */}
      <rect x="0" y="0" width={width} height={height} fill={`url(#${glowId})`} />

      {/* Water wave bands */}
      <g className="sim-waves" opacity="0.35">
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            x2={width}
            y1={60 + i * 54}
            y2={60 + i * 54}
            stroke="rgba(0, 212, 255, 0.05)"
            strokeWidth={1}
          />
        ))}
      </g>

      {/* Layer 2: compass ring */}
      <circle
        cx={cx}
        cy={cy}
        r={sceneRadius * 0.92}
        fill="none"
        stroke="rgba(0, 212, 255, 0.16)"
        strokeWidth={1}
        strokeDasharray="2 6"
      />
      {['N', 'E', 'S', 'W'].map((label, i) => {
        const p = polarPoint(cx, cy, sceneRadius * 0.96, i * 90);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(139, 167, 184, 0.55)"
            fontSize="10"
            fontWeight="700"
            style={{ letterSpacing: '0.1em' }}
          >
            {label}
          </text>
        );
      })}

      {/* Layer 3: no-go cone */}
      <path
        d={noGoPath}
        fill={`url(#${nogoId})`}
        stroke="rgba(255, 82, 82, 0.3)"
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      <text
        x={cx}
        y={cy - sceneRadius * 0.88}
        textAnchor="middle"
        fill="rgba(255, 82, 82, 0.65)"
        fontSize="10"
        fontWeight="700"
        style={{ letterSpacing: '0.15em' }}
      >
        NO-GO
      </text>

      {/* Layer 4: wind arc (wider, fainter, includes the no-go - the actual wind
          comes from within these 120 deg at the top) */}
      <path d={windFromPath} fill="rgba(0, 212, 255, 0.05)" stroke="none" />

      {/* Layer 5: main working sector */}
      {hasMain && (
        <path
          d={mainWorkingPath}
          fill="rgba(82, 255, 142, 0.09)"
          stroke="rgba(82, 255, 142, 0.3)"
          strokeDasharray="3 5"
          strokeWidth={1}
        />
      )}

      {/* Layer 6: jib working sector */}
      {hasJib && (
        <path
          d={jibWorkingPath}
          fill="rgba(246, 183, 60, 0.09)"
          stroke="rgba(246, 183, 60, 0.3)"
          strokeDasharray="3 5"
          strokeWidth={1}
        />
      )}

      {/* Layer 7: ghost optimal.
          Rotation sign: the boom pivots around the mast. To keep the sail on
          the leeward side after rotation, we rotate by `angle * -sailSide`.
          Rotating by `angle * +sailSide` (the pre-2026-04 code) swept the
          sail across the deck onto the windward side, which is physically
          impossible and looked wrong from any boat-familiar viewer. */}
      {ui.showOptimal && (
        <g transform={`translate(${cx} ${cy}) rotate(${boatRotation})`} opacity="0.42">
          {hasMain && (
            <g transform={`rotate(${-sim.optimal.mainAngle * sailSide}) scale(1 ${mainVisualScale})`}>
              <path
                d="M 0 -30 Q -32 48 -10 150 L 0 150 Z"
                fill="none"
                stroke="#52ff8e"
                strokeWidth={3}
                strokeDasharray="6 6"
                transform={`scale(${sailSide < 0 ? 1 : -1} 1)`}
              />
            </g>
          )}
          {hasJib && (
            <g transform={`translate(0 -52) rotate(${-sim.optimal.jibAngle * sailSide})`}>
              <path
                d="M 0 0 Q -18 42 -6 96 L 0 96 Z"
                fill="none"
                stroke="#52ff8e"
                strokeWidth={3}
                strokeDasharray="6 6"
                transform={`scale(${sailSide < 0 ? 1 : -1} 1)`}
              />
            </g>
          )}
        </g>
      )}

      {/* Layer 8-9: boat and current sails */}
      <g transform={`translate(${cx} ${cy}) rotate(${boatRotation})`} filter={`url(#${boatShadowId})`}>
        <BoatTop
          ui={ui}
          sailSide={sailSide}
          hasMain={hasMain}
          hasJib={hasJib}
          jibOpacity={jibVisualOpacity}
          mainVisualScale={mainVisualScale}
        />
      </g>

      {/* Layer 10: force vectors + wind arrows */}
      <g filter={`url(#${arrowGlowId})`}>
        <Arrow
          from={tw.start}
          to={tw.end}
          color="#00d4ff"
          width={2.8}
          label={`TW ${ui.windSpeed} kts`}
          labelPos={{ x: cx, y: cy - sceneRadius * 1.06 }}
          labelAnchor="middle"
        />
        <Arrow
          from={awStart}
          to={awEnd}
          color="#6fe4ff"
          width={2.4}
          label={`AW ${Math.round(Math.abs(sim.result.diag.awa))}°`}
          labelPos={{ x: awStart.x + 8, y: awStart.y - 8 }}
          labelAnchor="start"
        />
        <Arrow
          from={{ x: cx, y: cy }}
          to={driveEnd}
          color="#52ff8e"
          width={2.8}
          label={lang === 'ru' ? 'тяга' : lang === 'pl' ? 'ciag' : 'drive'}
          labelPos={{ x: driveEnd.x + 10, y: driveEnd.y - 4 }}
          labelAnchor="start"
        />
        <Arrow
          from={{ x: cx, y: cy }}
          to={sideEnd}
          color="#f6b73c"
          width={2.2}
          label={lang === 'ru' ? 'бок' : lang === 'pl' ? 'bok' : 'side'}
          labelPos={{
            x: sideEnd.x + (sim.result.diag.side >= 0 ? 10 : -10),
            y: sideEnd.y - 4,
          }}
          labelAnchor={sim.result.diag.side >= 0 ? 'start' : 'end'}
        />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Boat top-down drawing (bigger than V1/V2, rounder)
// ---------------------------------------------------------------------------

function BoatTop(args: {
  ui: UiState;
  sailSide: 1 | -1;
  hasMain: boolean;
  hasJib: boolean;
  jibOpacity: number;
  mainVisualScale: number;
}) {
  const { ui, sailSide, hasMain, hasJib, jibOpacity, mainVisualScale } = args;
  // Unique prefix so jib/main gradient IDs don't collide across the twin
  // SceneTop instances (desktop + mobile layouts both sit in the DOM).
  const uid = useId();

  return (
    <>
      {/* Hull */}
      <ellipse cx="0" cy="60" rx="36" ry="10" fill="rgba(0,0,0,0.22)" />
      <path
        d="M 0 -96 Q 38 -40 28 52 Q 24 116 0 160 Q -24 116 -28 52 Q -38 -40 0 -96 Z"
        fill="#e8f0f6"
        stroke="#6f8ba0"
        strokeWidth={4}
      />
      {/* Cockpit hint */}
      <ellipse cx="0" cy="20" rx="12" ry="26" fill="rgba(0,0,0,0.18)" />

      {/* Mast at 0,0 (which is boat center) */}
      <rect x="-3" y="-56" width="6" height="132" rx="3" fill="#2a4060" />
      <circle cx="0" cy="-6" r="6" fill="#0a1628" stroke="#2a4060" strokeWidth={1.5} />

      {/* Jib (forward of mast, to leeward side).
          Drawn with an inflated belly: two Q curves on the leech that go
          out-and-back, plus a radial gradient that lightens the windward
          belly and darkens the leeward edge - reads as "canvas pillowing
          under wind pressure" not a flat flag.
          Rotation sign matches the ghost sail above: `angle * -sailSide`
          keeps the clew on the leeward side. */}
      {hasJib && (
        <g transform={`translate(0 -58) rotate(${-ui.jibAngle * sailSide})`} opacity={jibOpacity}>
          <defs>
            <linearGradient
              id={`v3-jib-grad-${sailSide}-${uid}`}
              x1="0"
              y1="0"
              x2={sailSide > 0 ? '1' : '0'}
              y2="0"
            >
              <stop offset="0%" stopColor="#dce7ee" />
              <stop offset="55%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#b9c9d4" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 0 Q ${sailSide * 28} 30 ${sailSide * 34} 60 Q ${sailSide * 30} 90 ${sailSide * 10} 104 L 0 104 Z`}
            fill={`url(#v3-jib-grad-${sailSide}-${uid})`}
            stroke="#ffffff"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <text
            x={sailSide * 22}
            y={60}
            fill="#0a1628"
            fontSize="10"
            fontWeight="800"
            textAnchor="middle"
            style={{ letterSpacing: '0.1em' }}
          >
            JIB
          </text>
        </g>
      )}

      {/* Main (aft of mast, to leeward side) - same inflated-belly treatment
          as the jib so both sails read as canvas under load, not flat shapes.
          Same rotation-sign story: `-sailSide` so the boom swings to the
          leeward side instead of across the deck. */}
      {hasMain && (
        <g transform={`rotate(${-ui.mainAngle * sailSide}) scale(1 ${mainVisualScale})`}>
          <defs>
            <linearGradient
              id={`v3-main-grad-${sailSide}-${uid}`}
              x1="0"
              y1="0"
              x2={sailSide > 0 ? '1' : '0'}
              y2="0"
            >
              <stop offset="0%" stopColor="#dce7ee" />
              <stop offset="55%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#b9c9d4" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 -30 Q ${sailSide * 38} 30 ${sailSide * 46} 80 Q ${sailSide * 40} 130 ${sailSide * 14} 150 L 0 150 Z`}
            fill={`url(#v3-main-grad-${sailSide}-${uid})`}
            stroke="#ffffff"
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <text
            x={sailSide * 38}
            y={90}
            fill="#0a1628"
            fontSize="10"
            fontWeight="800"
            textAnchor="middle"
            style={{ letterSpacing: '0.1em' }}
          >
            MAIN
          </text>
        </g>
      )}

      {/* Bow indicator triangle */}
      <polygon points="-5,-92 5,-92 0,-100" fill="#00d4ff" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Arrow helper (SVG arrow with optional label). Used only by SceneTop, kept
// colocated so callers don't need to cross-import an SVG primitive.
// ---------------------------------------------------------------------------

function Arrow(props: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width: number;
  label?: string;
  labelPos?: { x: number; y: number };
  labelAnchor?: 'start' | 'middle' | 'end';
}) {
  const { from, to, color, width, label, labelPos, labelAnchor = 'middle' } = props;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headSize = 9;
  const left = {
    x: to.x - Math.cos(angle - Math.PI / 6) * headSize,
    y: to.y - Math.sin(angle - Math.PI / 6) * headSize,
  };
  const right = {
    x: to.x - Math.cos(angle + Math.PI / 6) * headSize,
    y: to.y - Math.sin(angle + Math.PI / 6) * headSize,
  };
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <path
        d={`M ${left.x.toFixed(1)} ${left.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)} L ${right.x.toFixed(1)} ${right.y.toFixed(1)}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {label && labelPos && (
        <text
          x={labelPos.x}
          y={labelPos.y}
          textAnchor={labelAnchor}
          fill={color}
          fontSize="11"
          fontWeight="800"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
