'use client';

import { useId } from 'react';
import type { Lang } from '@/lib/languages';
import { NO_GO_HALF_DEG } from '@/lib/sailing-physics';
import {
  clamp,
  finite,
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
  lang: Lang;
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
  // `finite` on rotations: an initial-hydration stale snapshot can briefly
  // produce NaN in derived angles; React then logs per-attribute warnings
  // even though the next frame writes valid numbers. Guarding here keeps
  // the SSR/CSR boundary clean.
  const boatRotation = finite(-sim.signedTwa);
  const sailSide: 1 | -1 = finite(sim.signedTwa) >= 0 ? -1 : 1;

  // Scene decoration drivers. windIntensity=0 at the 4-kt lower slider bound
  // and =1 at the 25-kt upper bound; it shapes wave amplitude, streak count
  // and speed, and sail belly flatness. speedIntensity scales the wake so
  // a stopped boat has no foam while a hull-speed boat leaves a strong
  // trail.
  const windIntensity = clamp((ui.windSpeed - 4) / 21, 0, 1);
  const speedIntensity = clamp(sim.result.state.boatSpeed / 8, 0, 1);

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
  // No-go: 2 * NO_GO_HALF_DEG centered on north (wind from direction).
  // Shared constant so every simulator surface teaches the same cone.
  const noGoPath = sectorPath(
    cx,
    cy,
    sceneRadius * 0.58,
    sceneRadius * 0.98,
    -NO_GO_HALF_DEG,
    NO_GO_HALF_DEG,
  );
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

  // Wind-shadow factor from main onto jib. On broad reach (TWA > 130) the
  // main sheets out wide and physically blocks wind reaching the jib if
  // both sails are leeward. Past TWA 175 the shadow is full. Visual only -
  // the engine's slot model already handles the physics; this just tells
  // the eye "the jib is in dead air now".
  const absTwaForShadow = Math.abs(finite(sim.signedTwa));
  const mainShadowOnJib = hasMain
    ? clamp((absTwaForShadow - 130) / 45, 0, 1)
    : 0;
  const jibVisualOpacityShadowed = jibVisualOpacity * (1 - mainShadowOnJib * 0.55);

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

      {/* Animated water sparkles. ~36 deterministic dots scattered over
          the scene, each bobbing with a unique phase + speed - same idea
          as V1's WaveDot loop but expressed as SVG circles with SMIL
          translate animations. They give the surface a "living" feel
          before any structural overlays sit on top. */}
      <g opacity={0.5}>
        {Array.from({ length: 36 }).map((_, i) => {
          // Deterministic position from index so SSR + CSR agree
          const dx = ((i * 79) % width);
          const dy = ((i * 53 + 23) % (height - 60)) + 30;
          const r = 0.6 + (i % 5) * 0.35;
          const phaseSec = (i * 0.27) % 4.2;
          const dur = (3.4 + (i % 4) * 0.45 - windIntensity * 0.6).toFixed(2);
          const drift = 4 + (i % 3) * 1.5 + windIntensity * 3;
          const sign = i % 2 === 0 ? 1 : -1;
          return (
            <circle key={i} cx={dx} cy={dy} r={r} fill="rgba(120, 190, 230, 0.55)">
              <animate
                attributeName="cx"
                values={`${dx};${dx + sign * drift};${dx};${dx - sign * drift};${dx}`}
                dur={`${dur}s`}
                begin={`-${phaseSec.toFixed(2)}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`${dy};${dy + drift * 0.6};${dy};${dy - drift * 0.5};${dy}`}
                dur={`${(Number(dur) * 1.3).toFixed(2)}s`}
                begin={`-${phaseSec.toFixed(2)}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.2;0.6;0.2"
                dur={`${(Number(dur) * 0.8).toFixed(2)}s`}
                begin={`-${phaseSec.toFixed(2)}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}
      </g>

      {/* Water surface - undulating bands that actually look like swell,
          drifting at a rate scaled by wind intensity. The amplitude of the
          undulation also grows with wind so calm days read flat and blows
          read choppy. Uses SMIL which is native to SVG and avoids a JS
          animation loop for the static decoration. */}
      <g>
        {Array.from({ length: 9 }).map((_, i) => {
          const y = 80 + i * 60;
          const amp = 2 + windIntensity * 5 + (i % 2) * 1.5;
          const period = 7 + i * 0.4 - windIntensity * 2.5;
          return (
            <path
              key={i}
              d={`M 0 ${y} Q 120 ${y - amp} 240 ${y} T 480 ${y} T ${width} ${y}`}
              fill="none"
              stroke="rgba(0, 212, 255, 0.07)"
              strokeWidth={1}
            >
              <animate
                attributeName="d"
                dur={`${period}s`}
                repeatCount="indefinite"
                values={[
                  `M 0 ${y} Q 120 ${y - amp} 240 ${y} T 480 ${y} T ${width} ${y}`,
                  `M 0 ${y} Q 120 ${y + amp} 240 ${y} T 480 ${y} T ${width} ${y}`,
                  `M 0 ${y} Q 120 ${y - amp} 240 ${y} T 480 ${y} T ${width} ${y}`,
                ].join(';')}
              />
            </path>
          );
        })}
      </g>

      {/* Wind streaks - faint dashes falling from the wind source (top of
          scene). Count + speed scale with TWS: dead calm shows almost none,
          25 kts shows a steady rain of streaks. Pure decoration; ignored by
          the physics. */}
      <g opacity={0.15 + 0.35 * windIntensity}>
        {Array.from({ length: 14 }).map((_, i) => {
          const streakX = 40 + i * 52;
          const phase = i * 0.37;
          const travelDur = 2.4 - windIntensity * 1.4 + (i % 3) * 0.35;
          return (
            <line
              key={i}
              x1={streakX}
              x2={streakX}
              y1={0}
              y2={16 + windIntensity * 10}
              stroke="rgba(130, 210, 255, 0.55)"
              strokeWidth={1}
              strokeLinecap="round"
            >
              <animate
                attributeName="transform"
                attributeType="XML"
                type="translate"
                values={`0 -40; 0 ${height + 30}`}
                dur={`${travelDur.toFixed(2)}s`}
                begin={`-${phase.toFixed(2)}s`}
                repeatCount="indefinite"
              />
            </line>
          );
        })}
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
            <g transform={`rotate(${-finite(sim.ghostAngles.mainAngle) * sailSide}) scale(1 ${mainVisualScale})`}>
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
            <g transform={`translate(0 -52) rotate(${-finite(sim.ghostAngles.jibAngle) * sailSide})`}>
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

      {/* Wake trail - aft of the boat, drawn under the hull so the shadow
          filter on the boat group lies on top and keeps depth order right.
          Length and opacity scale with boat speed; the two diverging streaks
          mimic the V-wake of a displacement hull. */}
      {speedIntensity > 0.05 && (
        <g transform={`translate(${cx} ${cy}) rotate(${boatRotation})`} opacity={speedIntensity * 0.75}>
          <defs>
            <linearGradient id={`v3-wake-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(180, 220, 255, 0.55)" />
              <stop offset="100%" stopColor="rgba(180, 220, 255, 0)" />
            </linearGradient>
          </defs>
          {(() => {
            const wakeLen = 80 + speedIntensity * 220;
            const spread = 18 + speedIntensity * 42;
            return (
              <>
                <path
                  d={`M -8 160 Q ${-spread * 0.4} ${160 + wakeLen * 0.5} ${-spread} ${160 + wakeLen} L 0 ${160 + wakeLen * 0.2} Z`}
                  fill={`url(#v3-wake-grad-${uid})`}
                />
                <path
                  d={`M 8 160 Q ${spread * 0.4} ${160 + wakeLen * 0.5} ${spread} ${160 + wakeLen} L 0 ${160 + wakeLen * 0.2} Z`}
                  fill={`url(#v3-wake-grad-${uid})`}
                />
                {/* Stern foam: a soft ellipse at the transom */}
                <ellipse
                  cx={0}
                  cy={162}
                  rx={20 + speedIntensity * 10}
                  ry={5 + speedIntensity * 3}
                  fill="rgba(220, 240, 255, 0.35)"
                />
              </>
            );
          })()}
        </g>
      )}

      {/* Layer 8-9: boat and current sails. Sail rotations use the runtime's
          LIVE angles (sim.liveMainAngle / sim.liveJibAngle) so the drawn sail
          eases at winch speed like the physics, instead of snapping to the
          slider target. */}
      <g transform={`translate(${cx} ${cy}) rotate(${boatRotation})`} filter={`url(#${boatShadowId})`}>
        <BoatTop
          mainAngleDeg={finite(sim.liveMainAngle, ui.mainAngle)}
          jibAngleDeg={finite(sim.liveJibAngle, ui.jibAngle)}
          sailSide={sailSide}
          hasMain={hasMain}
          hasJib={hasJib}
          jibOpacity={jibVisualOpacityShadowed}
          mainShadowOnJib={mainShadowOnJib}
          mainVisualScale={mainVisualScale}
          windIntensity={windIntensity}
          mainStalled={sim.result.diag.mainStalled}
          jibStalled={sim.result.diag.jibStalled}
        />
      </g>

      {/* Layer 10: force vectors + wind arrows */}
      <g filter={`url(#${arrowGlowId})`}>
        <Arrow
          from={tw.start}
          to={tw.end}
          color="#00d4ff"
          width={2.8}
          label={`TW ${ui.windSpeed} ${lang === 'ru' ? 'уз' : 'kts'}`}
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
// Boat top-down drawing.
//
// Two sails drawn to read distinctly:
// - MAIN: visible boom line, 3 horizontal battens, aft of the mast, attached
//   to the mast via luff + boom via foot. Belly flattens with wind intensity
//   and is further reduced by reef (mainVisualScale).
// - JIB: smaller, forward of the mast, no boom, a smoother single-curve
//   crescent. Different accent stroke and belly profile so the eye never
//   mistakes it for a shrunk main.
//
// Wind-responsive belly: at calm air sails billow (control points swing far
// to leeward); at 25 kts + reef the control points flatten toward the mast-
// clew chord, giving the "tight canvas" look the user expects on a blow.
// ---------------------------------------------------------------------------

function BoatTop(args: {
  /** LIVE main sheet angle (deg) from the runtime - eases like the physics. */
  mainAngleDeg: number;
  /** LIVE jib sheet angle (deg) from the runtime. */
  jibAngleDeg: number;
  sailSide: 1 | -1;
  hasMain: boolean;
  hasJib: boolean;
  jibOpacity: number;
  /** 0..1 - amount of wind blanketed by the main onto the jib. Used to
   *  paint a "dead air" haze around the jib at broad reach / run. */
  mainShadowOnJib: number;
  mainVisualScale: number;
  windIntensity: number;
  mainStalled: boolean;
  jibStalled: boolean;
}) {
  const {
    mainAngleDeg,
    jibAngleDeg,
    sailSide,
    hasMain,
    hasJib,
    jibOpacity,
    mainShadowOnJib,
    mainVisualScale,
    windIntensity,
    mainStalled,
    jibStalled,
  } = args;
  // Unique prefix so jib/main gradient IDs don't collide across the twin
  // SceneTop instances (desktop + mobile layouts both sit in the DOM).
  const uid = useId();

  // Belly factors in [0.4, 1]. windIntensity=0 (calm): 1.0 (full billow).
  // windIntensity=1 (25 kts): 0.5 (flatter). mainVisualScale drops the main
  // further when reefed. Main reads flatter than jib at any wind because
  // a boom-set sail tensions flatter than a loose-luff jib.
  // finite() keeps the belly finite even if a transient derived number
  // somewhere upstream briefly goes NaN during hydration.
  const mainBelly = finite((1 - 0.5 * windIntensity) * mainVisualScale, 1);
  const jibBelly = finite(1 - 0.4 * windIntensity, 1);

  // Color tint per sail so the user reads them apart at a glance: main is
  // a warm white (slightly cream), jib is a cool white (slightly icy).
  // When stalled, both shift toward red/orange - the eye catches the warm
  // tone and that prompts a "this sail is in trouble" check.
  const mainTint = mainStalled ? '#ffc8b0' : '#fffaee';
  const jibTint = jibStalled ? '#ffd7c0' : '#eaf3fb';
  const mainAccent = mainStalled ? 'rgba(255, 140, 110, 0.65)' : 'rgba(255, 235, 200, 0.65)';
  const jibAccent = jibStalled ? 'rgba(255, 160, 120, 0.6)' : 'rgba(150, 220, 255, 0.6)';

  return (
    <>
      {/* Hull shadow on the water (blurred ellipse beneath the boat) */}
      <ellipse cx="0" cy="60" rx="38" ry="12" fill="rgba(0,0,0,0.28)" />

      {/* HULL silhouette - real Bavaria 46 deck-plan proportions.
          Extracted from the Bavaria 46 lowpoly OBJ (length 13.9 m,
          beam 4.35 m, scale 18.42 px/m) so the deck shape matches a
          real cruising sloop instead of a generic crescent: fine bow,
          widest at ~30% from the stern, then a near-vertical transom
          across the back. */}
      <path
        d="M -14.0 160.0 L -28.4 152.2 L -34.8 129.0 L -38.3 97.9 L -40.1 66.9 L -40.1 28.1 L -39.0 12.6 L -34.3 -34.3 L -14.3 -78.5 L -0.6 -96.0 L 0.6 -96.0 L 14.3 -78.5 L 34.3 -34.3 L 39.0 12.6 L 40.1 28.1 L 40.1 66.9 L 38.3 97.9 L 34.8 129.0 L 28.4 152.2 L 14.0 160.0 Z"
        fill="#e8f0f6"
        stroke="#6f8ba0"
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* Inner deck outline (slightly inset from the hull stroke) so
          the eye reads "the deck edge has a lip", not just paint. */}
      <path
        d="M -12.0 156.0 L -25.5 148.0 L -31.5 126.0 L -34.5 96.0 L -36.0 65.0 L -36.0 30.0 L -34.5 12.0 L -30.5 -34.0 L -12.5 -76.0 L 0 -90.0 L 12.5 -76.0 L 30.5 -34.0 L 34.5 12.0 L 36.0 30.0 L 36.0 65.0 L 34.5 96.0 L 31.5 126.0 L 25.5 148.0 L 12.0 156.0 Z"
        fill="none"
        stroke="rgba(111, 139, 160, 0.45)"
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {/* Deck planks - faint thin lines from bow to stern. They follow the
          hull's curvature, so we draw a few near-parallel paths. */}
      {[-18, -10, -4, 4, 10, 18].map((x) => (
        <path
          key={x}
          d={`M ${x * 0.6} -88 Q ${x * 1.05} 0 ${x * 0.85} 144`}
          fill="none"
          stroke="rgba(160, 180, 200, 0.18)"
          strokeWidth={0.6}
        />
      ))}

      {/* Forward hatch (companionway) - rectangle just forward of mast */}
      <rect
        x="-9"
        y="-50"
        width="18"
        height="22"
        rx="2"
        fill="rgba(50, 80, 110, 0.55)"
        stroke="rgba(111, 139, 160, 0.45)"
        strokeWidth={0.8}
      />
      {/* Hatch slit */}
      <line
        x1="0"
        y1="-50"
        x2="0"
        y2="-28"
        stroke="rgba(207, 216, 224, 0.35)"
        strokeWidth={0.6}
      />

      {/* Cockpit pit aft of the mast - bigger, oval, with a darker recess. */}
      <ellipse cx="0" cy="40" rx="14" ry="24" fill="rgba(0, 0, 0, 0.25)" />
      <ellipse
        cx="0"
        cy="40"
        rx="12"
        ry="22"
        fill="none"
        stroke="rgba(111, 139, 160, 0.35)"
        strokeWidth={0.6}
      />

      {/* HELM WHEEL inside the cockpit. A circle with cross-spokes - what
          the helmsman steers with. Sits aft inside the cockpit. */}
      <g transform="translate(0 52)">
        <circle r="6.5" fill="rgba(8, 22, 40, 0.5)" stroke="rgba(160, 185, 210, 0.85)" strokeWidth={1.2} />
        <line x1="-6.5" y1="0" x2="6.5" y2="0" stroke="rgba(160, 185, 210, 0.85)" strokeWidth={0.9} />
        <line x1="0" y1="-6.5" x2="0" y2="6.5" stroke="rgba(160, 185, 210, 0.85)" strokeWidth={0.9} />
        <line x1="-4.6" y1="-4.6" x2="4.6" y2="4.6" stroke="rgba(160, 185, 210, 0.85)" strokeWidth={0.7} />
        <line x1="-4.6" y1="4.6" x2="4.6" y2="-4.6" stroke="rgba(160, 185, 210, 0.85)" strokeWidth={0.7} />
        <circle r="1.5" fill="rgba(160, 185, 210, 0.95)" />
      </g>

      {/* CLEATS - small dark dots on the deck where lines secure. Give
          the deck "boat hardware" texture. */}
      <circle cx="-22" cy="-28" r="1.6" fill="rgba(40, 60, 80, 0.8)" />
      <circle cx="22" cy="-28" r="1.6" fill="rgba(40, 60, 80, 0.8)" />
      <circle cx="-20" cy="118" r="1.6" fill="rgba(40, 60, 80, 0.8)" />
      <circle cx="20" cy="118" r="1.6" fill="rgba(40, 60, 80, 0.8)" />

      {/* RUDDER - a tapered fin extending aft from the transom. This is
          the single best "which end is the back?" signal in a top-down
          view. Drawn just below the hull's stern. */}
      <g>
        {/* Rudder shadow on water */}
        <ellipse cx="0" cy="178" rx="5" ry="2" fill="rgba(0, 0, 0, 0.3)" />
        <path
          d="M -3 160 L -4 174 Q -2 180 0 180 L 0 184 Q 2 180 4 174 L 3 160 Z"
          fill="rgba(40, 60, 80, 0.92)"
          stroke="rgba(207, 216, 224, 0.4)"
          strokeWidth={0.6}
        />
      </g>

      {/* Mast base (circle) at deck center - where the mast meets deck. */}
      <circle cx="0" cy="0" r="5" fill="#0a1628" stroke="#2a4060" strokeWidth={1.5} />
      {/* Tiny halyard cluster around the mast base */}
      <circle cx="0" cy="0" r="2" fill="rgba(207, 216, 224, 0.6)" />

      {/* ==============================================================
          JIB - forward of mast. Drawn BEFORE main so the main sits over
          it in z-order (real slot behavior: main overlaps jib's lee). */}
      {hasJib && (
        <g
          transform={`translate(0 -58) rotate(${-jibAngleDeg * sailSide})`}
          opacity={jibOpacity}
        >
          <defs>
            <linearGradient
              id={`v3-jib-grad-${sailSide}-${uid}`}
              x1="0"
              y1="0"
              x2={sailSide > 0 ? '1' : '0'}
              y2="0"
            >
              <stop offset="0%" stopColor="#c8d9e4" />
              <stop offset="55%" stopColor={jibTint} />
              <stop offset="100%" stopColor="#a4b8c5" />
            </linearGradient>
          </defs>
          {/* Jib silhouette: single smooth curve (looser than main). The
              luff line (from tack at 0,0 down the foredeck) is implicit
              via the closing Z; the leech curves out to the clew and
              back in toward the foot. When stalled, the leech control
              points oscillate so the trailing edge visibly flaps. */}
          {jibStalled ? (
            <path
              d={`M 0 0 Q ${sailSide * 32 * jibBelly} ${35} ${sailSide * 28 * jibBelly} ${70} Q ${sailSide * 22 * jibBelly} ${98} ${sailSide * 6} ${106} L 0 106 Z`}
              fill={`url(#v3-jib-grad-${sailSide}-${uid})`}
              stroke="#ffffff"
              strokeWidth={2.2}
              strokeLinejoin="round"
            >
              <animate
                attributeName="d"
                dur="0.55s"
                repeatCount="indefinite"
                values={[
                  `M 0 0 Q ${sailSide * 30 * jibBelly} ${35} ${sailSide * 28 * jibBelly} ${70} Q ${sailSide * 18 * jibBelly} ${98} ${sailSide * 4} ${106} L 0 106 Z`,
                  `M 0 0 Q ${sailSide * 36 * jibBelly} ${35} ${sailSide * 22 * jibBelly} ${70} Q ${sailSide * 28 * jibBelly} ${98} ${sailSide * 8} ${106} L 0 106 Z`,
                  `M 0 0 Q ${sailSide * 28 * jibBelly} ${35} ${sailSide * 32 * jibBelly} ${70} Q ${sailSide * 16 * jibBelly} ${98} ${sailSide * 4} ${106} L 0 106 Z`,
                  `M 0 0 Q ${sailSide * 34 * jibBelly} ${35} ${sailSide * 26 * jibBelly} ${70} Q ${sailSide * 24 * jibBelly} ${98} ${sailSide * 6} ${106} L 0 106 Z`,
                  `M 0 0 Q ${sailSide * 30 * jibBelly} ${35} ${sailSide * 28 * jibBelly} ${70} Q ${sailSide * 18 * jibBelly} ${98} ${sailSide * 4} ${106} L 0 106 Z`,
                ].join(';')}
              />
            </path>
          ) : (
            <path
              d={`M 0 0 Q ${sailSide * 32 * jibBelly} ${35} ${sailSide * 28 * jibBelly} ${70} Q ${sailSide * 22 * jibBelly} ${98} ${sailSide * 6} ${106} L 0 106 Z`}
              fill={`url(#v3-jib-grad-${sailSide}-${uid})`}
              stroke="#ffffff"
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
          )}
          {/* Airflow streamlines - 3 short curves on the leeward face that
              show air sliding along the sail. When the sail is stalled,
              the flow detaches and these vanish so the eye sees "no flow
              = no drive". Animation is a soft pulse so the lines feel
              alive without distracting. */}
          {!jibStalled && (
            <g opacity={0.7}>
              {[24, 50, 80].map((y, i) => {
                const reach = sailSide * (16 + (y / 100) * 8) * jibBelly;
                return (
                  <path
                    key={i}
                    d={`M 0 ${y} Q ${reach * 0.5} ${y - 1} ${reach} ${y + 1}`}
                    stroke={jibAccent}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    fill="none"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.15;0.75;0.15"
                      dur={`${1.6 + i * 0.25}s`}
                      begin={`${i * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                );
              })}
            </g>
          )}
          {/* Telltale at the leech - a short line that biases windward
              when flow is attached, flutters stall-side when detached.
              Single static draw is enough; user reads position at a
              glance. */}
          <line
            x1={sailSide * 28 * jibBelly}
            y1={64}
            x2={sailSide * (jibStalled ? 42 : 16) * jibBelly}
            y2={jibStalled ? 58 : 72}
            stroke={jibStalled ? '#ff9a7a' : '#8fffc2'}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          {/* Label with pill background so it reads on any sail tint */}
          <rect
            x={sailSide * 18 * jibBelly - 14}
            y={50}
            width={28}
            height={12}
            rx={3}
            fill="rgba(10, 22, 40, 0.78)"
          />
          <text
            x={sailSide * 18 * jibBelly}
            y={59}
            fill="#7fc8ff"
            fontSize="9"
            fontWeight="800"
            textAnchor="middle"
            style={{ letterSpacing: '0.12em' }}
          >
            JIB
          </text>
        </g>
      )}

      {/* ==============================================================
          MAIN - aft of mast. Has a visible BOOM line (aligned with the
          sail rotation so it reads as a boom piece), three horizontal
          BATTENS that span luff-to-leech at different heights, and a
          WIND-RESPONSIVE belly. Reef shrinks everything via the outer
          scale(1, mainVisualScale). */}
      {hasMain && (
        <g transform={`rotate(${-mainAngleDeg * sailSide}) scale(1 ${mainVisualScale})`}>
          <defs>
            <linearGradient
              id={`v3-main-grad-${sailSide}-${uid}`}
              x1="0"
              y1="0"
              x2={sailSide > 0 ? '1' : '0'}
              y2="0"
            >
              <stop offset="0%" stopColor="#c8d9e4" />
              <stop offset="55%" stopColor={mainTint} />
              <stop offset="100%" stopColor="#9fb4c4" />
            </linearGradient>
          </defs>
          {/* Boom shadow underneath */}
          <rect
            x={-2}
            y={145}
            width={4}
            height={2}
            fill="rgba(0,0,0,0.3)"
          />
          {/* Main silhouette - triangular crescent, head near mast top,
              clew near boom end. Belly scales with wind. When stalled,
              the leech flaps - SMIL animation oscillates the control
              points so the user sees "this sail is luffing" without
              having to read the badge. */}
          {mainStalled ? (
            <path
              d={`M 0 -34 Q ${sailSide * 42 * mainBelly} ${28} ${sailSide * 50 * mainBelly} ${84} Q ${sailSide * 44 * mainBelly} ${134} ${sailSide * 18 * mainBelly} ${150} L 0 150 Z`}
              fill={`url(#v3-main-grad-${sailSide}-${uid})`}
              stroke="#ffffff"
              strokeWidth={2.4}
              strokeLinejoin="round"
            >
              <animate
                attributeName="d"
                dur="0.6s"
                repeatCount="indefinite"
                values={[
                  `M 0 -34 Q ${sailSide * 38 * mainBelly} ${28} ${sailSide * 50 * mainBelly} ${84} Q ${sailSide * 38 * mainBelly} ${134} ${sailSide * 14 * mainBelly} ${150} L 0 150 Z`,
                  `M 0 -34 Q ${sailSide * 50 * mainBelly} ${28} ${sailSide * 42 * mainBelly} ${84} Q ${sailSide * 52 * mainBelly} ${134} ${sailSide * 22 * mainBelly} ${150} L 0 150 Z`,
                  `M 0 -34 Q ${sailSide * 36 * mainBelly} ${28} ${sailSide * 54 * mainBelly} ${84} Q ${sailSide * 36 * mainBelly} ${134} ${sailSide * 12 * mainBelly} ${150} L 0 150 Z`,
                  `M 0 -34 Q ${sailSide * 48 * mainBelly} ${28} ${sailSide * 44 * mainBelly} ${84} Q ${sailSide * 50 * mainBelly} ${134} ${sailSide * 24 * mainBelly} ${150} L 0 150 Z`,
                  `M 0 -34 Q ${sailSide * 38 * mainBelly} ${28} ${sailSide * 50 * mainBelly} ${84} Q ${sailSide * 38 * mainBelly} ${134} ${sailSide * 14 * mainBelly} ${150} L 0 150 Z`,
                ].join(';')}
              />
            </path>
          ) : (
            <path
              d={`M 0 -34 Q ${sailSide * 42 * mainBelly} ${28} ${sailSide * 50 * mainBelly} ${84} Q ${sailSide * 44 * mainBelly} ${134} ${sailSide * 18 * mainBelly} ${150} L 0 150 Z`}
              fill={`url(#v3-main-grad-${sailSide}-${uid})`}
              stroke="#ffffff"
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
          )}
          {/* Battens - three horizontal lines from mast (luff) out toward
              the leech. They arch slightly with the sail's belly to show
              the curvature the sail is actually taking. */}
          {[36, 76, 116].map((y, bi) => {
            const reach = (50 + (bi === 1 ? 6 : 0)) * mainBelly;
            return (
              <path
                key={bi}
                d={`M 0 ${y} Q ${sailSide * reach * 0.6} ${y} ${sailSide * reach} ${y}`}
                fill="none"
                stroke="rgba(160, 185, 205, 0.7)"
                strokeWidth={0.8}
                strokeLinecap="round"
              />
            );
          })}
          {/* Airflow streamlines on the main. Same idea as the jib but
              longer (the main is bigger) and aligned with the sail's
              chord. Vanish on stall to make "no drive" readable. */}
          {!mainStalled && (
            <g opacity={0.65}>
              {[20, 56, 92, 128].map((y, i) => {
                const reach = sailSide * (28 + (y / 150) * 14) * mainBelly;
                return (
                  <path
                    key={i}
                    d={`M 0 ${y} Q ${reach * 0.5} ${y - 1.5} ${reach} ${y + 2}`}
                    stroke={mainAccent}
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    fill="none"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.1;0.65;0.1"
                      dur={`${1.8 + i * 0.2}s`}
                      begin={`${i * 0.35}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                );
              })}
            </g>
          )}
          {/* Boom - thicker dark line along the foot, with a small bracket
              at the gooseneck so it visually connects to the mast. */}
          <line
            x1={0}
            y1={150}
            x2={sailSide * 56 * mainBelly}
            y2={150}
            stroke="#1a2230"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={0} cy={150} r={3.5} fill="#2a4060" stroke="#0a1628" strokeWidth={1} />
          {/* Telltale at the leech of the main */}
          <line
            x1={sailSide * 50 * mainBelly}
            y1={90}
            x2={sailSide * (mainStalled ? 78 : 30) * mainBelly}
            y2={mainStalled ? 82 : 102}
            stroke={mainStalled ? '#ff8e6a' : '#8fffc2'}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          {/* Label with pill background */}
          <rect
            x={sailSide * 34 * mainBelly - 18}
            y={86}
            width={36}
            height={14}
            rx={3}
            fill="rgba(10, 22, 40, 0.78)"
          />
          <text
            x={sailSide * 34 * mainBelly}
            y={96}
            fill="#ffd7a8"
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
