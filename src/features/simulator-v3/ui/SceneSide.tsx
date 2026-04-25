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
// Scene: side-on profile of the boat.
//
// Rewritten 2026-04-25 with proper sailing-yacht anatomy. Conventions:
// - Bow points RIGHT, stern LEFT.
// - Mast at ~33% of LOA back from the bow (typical sloop / cruiser).
// - Boom mounts at the gooseneck just above the cabin and runs aft over
//   the cockpit; main sail attaches mast to boom, leech curves out.
// - Jib hangs from the mast head down to the bow on the forestay.
// - Forestay is the tensioned cable from mast top to bow tip; the jib's
//   luff lives on it. Backstay runs from mast top to transom.
// - Underwater: keel descends from mid-hull, rudder hangs aft of the
//   keel, both clearly visible silhouettes.
// - Heel from astern wouldn't show in pure side view; we apply only a
//   subtle bow-up trim by speed, not heel rotation.
// - Sails flap at the leech when stalled (animated d).
//
// Coordinate system: a single rotated group anchored at the waterline
// midpoint. Positive x = forward, negative x = aft.
// ---------------------------------------------------------------------------

const HULL_LEN = 360; // total hull length in scene px (-180..+180)
const HULL_BOW = HULL_LEN * 0.5; // x of bow tip
const HULL_STERN = -HULL_LEN * 0.5; // x of stern (transom)
const FREEBOARD = 40; // height from waterline to deck at the sheer
const KEEL_LEN = 80; // depth of keel below waterline
const RUDDER_LEN = 50;
// Mast at 33% from the bow (so 16.5% from the boat center toward bow)
const MAST_X = HULL_BOW - HULL_LEN * 0.33;
const MAST_TOP = -260; // y above waterline at mast top
const BOOM_Y = -34; // boom height above waterline (above cabin top)
const BOOM_FWD = MAST_X; // boom mounts on mast (gooseneck)
const MAX_BOOM_LEN = 130;

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
  const mainSailId = `v3-side-main-${uid}`;
  const jibSailId = `v3-side-jib-${uid}`;

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
  const mainStalled = sim.result.diag.mainStalled;
  const jibStalled = sim.result.diag.jibStalled;

  // Bow trim: at speed the bow lifts a hair. Heel is hidden in pure
  // side-on view (you see it from astern); we don't rotate.
  const bowTrim = -speedIntensity * 1.5;

  // Boom geometry: in a true port-abeam view the boom rotates AROUND
  // the mast in a horizontal plane (perpendicular to our line of
  // sight). Its visible projection foreshortens to the cosine of the
  // sheet angle:
  //   mainAngle=0  (boom along centerline, sheeted in tight)  -> full
  //                length aft -> we see a long line.
  //   mainAngle=90 (boom perpendicular, fully out)            -> the
  //                boom points into/out of the page -> we see a stub
  //                at the mast.
  // This is what the user sees changing on the side view when they
  // pull the main sheet.
  const mainOffDeg = finite(ui.mainAngle, 45);
  const boomCosAngle = Math.cos((mainOffDeg * Math.PI) / 180);
  const boomVisibleLen = MAX_BOOM_LEN * Math.max(0.18, Math.abs(boomCosAngle));
  const BOOM_AFT = MAST_X - boomVisibleLen;

  // Sail belly factors. Calm air = baggier. Reef + heavy wind = flatter.
  const mainBelly = finite((1 - 0.45 * windIntensity) * mainVisualScale, 1);
  const jibBelly = finite(1 - 0.4 * windIntensity, 1);

  // Apparent-wind direction in side-view 2D. The boat moves toward the
  // bow (positive x). Wind comes FROM ahead-of-the-bow on close-hauled
  // (small AWA) and FROM astern on broad reach (AWA close to 180). We
  // angle the AW indicator at the top so it always points down-and-
  // somewhere, with the angle telling the user where the apparent
  // wind sits relative to their bow.
  const awaAbs = Math.abs(finite(sim.result.diag.awa));
  // Map AWA in [0, 180] to a visible angle in degrees:
  //   AWA 0   -> arrow points straight down toward the bow (right)
  //   AWA 90  -> arrow points straight down (perpendicular)
  //   AWA 180 -> arrow points down-and-toward-stern (left)
  // We tilt around vertical: rotation = (90 - AWA) so AWA=0 -> +90deg,
  // AWA=90 -> 0deg, AWA=180 -> -90deg.
  const awArrowRot = 90 - awaAbs;

  // Sail tints
  const mainColor = mainStalled ? '#ffc8b0' : '#fffaee';
  const jibColor = jibStalled ? '#ffd7c0' : '#eaf3fb';
  const mainAccent = mainStalled
    ? 'rgba(255, 140, 110, 0.65)'
    : 'rgba(255, 235, 200, 0.6)';
  const jibAccent = jibStalled
    ? 'rgba(255, 160, 120, 0.6)'
    : 'rgba(150, 220, 255, 0.55)';

  // Pre-compute main sail belly path. The leech curves out from mast top
  // to clew, with a Q control point pushed aft+down for billow.
  const leechCtrlX = (MAST_X + BOOM_AFT) / 2 - 32 * mainBelly;
  const leechCtrlY = MAST_TOP + (BOOM_Y - MAST_TOP) * 0.45 - 8 * mainBelly;

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
          <stop offset="0%" stopColor="#f4f8fb" />
          <stop offset="35%" stopColor="#dde7ee" />
          <stop offset="100%" stopColor="#8ea3b5" />
        </linearGradient>
        <linearGradient id={mainSailId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8eef4" />
          <stop offset="60%" stopColor={mainColor} />
          <stop offset="100%" stopColor="#c5d2dd" />
        </linearGradient>
        <linearGradient id={jibSailId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dee9f1" />
          <stop offset="60%" stopColor={jibColor} />
          <stop offset="100%" stopColor="#bdcad6" />
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

      {/* Distant coast */}
      <path
        d={`M 0 ${waterY - 5} Q 140 ${waterY - 12} 260 ${waterY - 7} T 520 ${waterY - 9} T ${width} ${waterY - 5} L ${width} ${waterY} L 0 ${waterY} Z`}
        fill="rgba(40, 70, 100, 0.55)"
      />

      {/* Animated water surface */}
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

      {/* AW direction indicator at top center. Rotates with AWA so the
          user sees where the wind hits the bow. Animated streaks
          stream in the same direction. */}
      <g transform={`translate(${cx} 90) rotate(${awArrowRot})`}>
        {/* Big arrow pointing toward the boat (downward in unrotated
            frame). The arrow body is the wind direction line. */}
        <line
          x1="0"
          y1={-44}
          x2="0"
          y2={36}
          stroke="rgba(0, 212, 255, 0.7)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <polygon points="-7,28 7,28 0,42" fill="rgba(0, 212, 255, 0.85)" />
        {/* Animated wind streaks flowing along the arrow */}
        {Array.from({ length: 5 }).map((_, i) => (
          <circle
            key={i}
            cx="0"
            cy={-44 + i * 18}
            r={1.5}
            fill="rgba(130, 220, 255, 0.6)"
          >
            <animate
              attributeName="cy"
              from={-44}
              to={42}
              dur={`${1.5 - windIntensity * 0.6}s`}
              begin={`${i * 0.18}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.7;0"
              dur={`${1.5 - windIntensity * 0.6}s`}
              begin={`${i * 0.18}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>
      {/* AW label - kept upright (NOT rotated) so it always reads */}
      <g>
        <rect
          x={cx - 38}
          y={20}
          width={76}
          height={18}
          rx={9}
          fill="rgba(8, 24, 48, 0.7)"
          stroke="rgba(0, 212, 255, 0.4)"
          strokeWidth={1}
        />
        <text
          x={cx}
          y={32}
          fill="rgba(130, 220, 255, 0.95)"
          fontSize="11"
          fontWeight="800"
          textAnchor="middle"
          style={{ letterSpacing: '0.1em' }}
        >
          AW {Math.round(awaAbs)}°
        </text>
      </g>

      {/* Boat group anchored at waterline center, slight bow-up trim */}
      <g transform={`translate(${cx} ${waterY}) rotate(${bowTrim})`}>
        {/* === UNDERWATER === */}
        {/* Keel: tapered fin descending from mid-hull. Bow at right
            means keel sits a bit forward of center. */}
        <path
          d={`
            M ${-12} 0
            L ${-14} ${KEEL_LEN * 0.85}
            Q ${-10} ${KEEL_LEN} 0 ${KEEL_LEN}
            L 0 ${KEEL_LEN + 4}
            Q 14 ${KEEL_LEN} 14 ${KEEL_LEN * 0.85}
            L 12 0
            Z
          `}
          fill="rgba(15, 28, 46, 0.92)"
        />
        {/* Bulb at keel base */}
        <ellipse cx="0" cy={KEEL_LEN + 2} rx="22" ry="5" fill="rgba(15, 28, 46, 0.95)" />

        {/* Rudder aft of keel */}
        <path
          d={`
            M ${HULL_STERN + 32} 0
            L ${HULL_STERN + 30} ${RUDDER_LEN}
            L ${HULL_STERN + 36} ${RUDDER_LEN}
            L ${HULL_STERN + 38} 0
            Z
          `}
          fill="rgba(20, 36, 56, 0.85)"
        />

        {/* === HULL profile (from waterline up) ===
            Bow on the right (positive x), stern on the left. Sheer line
            curves up gently toward both ends, more at the bow. */}
        <path
          d={`
            M ${HULL_STERN} 0
            L ${HULL_STERN - 2} -${FREEBOARD * 0.55}
            Q ${HULL_STERN + 30} -${FREEBOARD * 0.85} 0 -${FREEBOARD}
            Q ${HULL_BOW - 50} -${FREEBOARD * 1.1} ${HULL_BOW - 6} -${FREEBOARD * 1.3}
            L ${HULL_BOW + 2} -${FREEBOARD * 0.4}
            L ${HULL_BOW + 4} 0
            Q ${HULL_BOW - 30} 8 0 10
            Q ${HULL_STERN + 60} 8 ${HULL_STERN} 0
            Z
          `}
          fill={`url(#${hullId})`}
          stroke="#5e7889"
          strokeWidth={2}
        />

        {/* Boot stripe along waterline */}
        <line
          x1={HULL_STERN + 6}
          y1={-2}
          x2={HULL_BOW - 4}
          y2={-2}
          stroke="#1f3852"
          strokeWidth={1.6}
        />

        {/* Cabin: trunk roof aft of mast, with portholes */}
        <rect
          x={MAST_X - 10}
          y={-FREEBOARD - 18}
          width={MAST_X - HULL_STERN - 70}
          height={18}
          rx={5}
          fill="#dde7ee"
          stroke="#6f8ba0"
          strokeWidth={1.2}
        />
        {/* Portholes: small round windows along the cabin side */}
        {Array.from({ length: 4 }).map((_, i) => {
          const px = MAST_X - 22 - i * 28;
          if (px < HULL_STERN + 60) return null;
          return (
            <circle
              key={i}
              cx={px}
              cy={-FREEBOARD - 9}
              r={4}
              fill="rgba(40, 70, 100, 0.85)"
              stroke="rgba(207, 216, 224, 0.6)"
              strokeWidth={0.8}
            />
          );
        })}

        {/* Cockpit hint: small dip in the deck aft of the cabin */}
        <rect
          x={HULL_STERN + 28}
          y={-FREEBOARD - 2}
          width={42}
          height={4}
          rx={1}
          fill="rgba(40, 70, 100, 0.55)"
        />

        {/* Bow pulpit rail */}
        <path
          d={`
            M ${HULL_BOW - 26} -${FREEBOARD * 1.18}
            L ${HULL_BOW + 2} -${FREEBOARD * 1.45}
            L ${HULL_BOW - 4} -${FREEBOARD * 0.35}
          `}
          fill="none"
          stroke="rgba(111, 139, 160, 0.65)"
          strokeWidth={1.2}
        />

        {/* === RIG === */}
        {/* Mast: vertical from cabin top to mast head */}
        <rect
          x={MAST_X - 3}
          y={MAST_TOP}
          width={6}
          height={Math.abs(MAST_TOP) - FREEBOARD - 10}
          rx={3}
          fill="#cfd8e0"
        />
        {/* Mast head cap */}
        <circle cx={MAST_X} cy={MAST_TOP - 2} r={4} fill="#cfd8e0" />

        {/* Forestay: from mast top to bow tip - this is what the jib
            hangs on. */}
        <line
          x1={MAST_X}
          y1={MAST_TOP}
          x2={HULL_BOW}
          y2={-FREEBOARD * 1.3}
          stroke="rgba(207, 216, 224, 0.55)"
          strokeWidth={1}
        />
        {/* Backstay: from mast top to transom corner */}
        <line
          x1={MAST_X}
          y1={MAST_TOP}
          x2={HULL_STERN + 4}
          y2={-FREEBOARD * 0.55}
          stroke="rgba(207, 216, 224, 0.45)"
          strokeWidth={1}
        />
        {/* Spreader hint: small horizontal bar mid-mast */}
        <line
          x1={MAST_X - 18}
          x2={MAST_X + 18}
          y1={MAST_TOP * 0.55}
          y2={MAST_TOP * 0.55}
          stroke="#cfd8e0"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        {/* Shrouds: from spreader tips to deck */}
        <line
          x1={MAST_X - 18}
          y1={MAST_TOP * 0.55}
          x2={MAST_X - 60}
          y2={-FREEBOARD * 0.4}
          stroke="rgba(207, 216, 224, 0.4)"
          strokeWidth={0.8}
        />
        <line
          x1={MAST_X + 18}
          y1={MAST_TOP * 0.55}
          x2={MAST_X + 60}
          y2={-FREEBOARD * 0.4}
          stroke="rgba(207, 216, 224, 0.4)"
          strokeWidth={0.8}
        />

        {/* Boom: from gooseneck on mast running aft. Reef shrinks vertically. */}
        {hasMain && (
          <line
            x1={BOOM_FWD}
            y1={BOOM_Y}
            x2={BOOM_AFT}
            y2={BOOM_Y}
            stroke="#1a2230"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        {/* Gooseneck */}
        {hasMain && (
          <circle cx={MAST_X} cy={BOOM_Y} r={3.5} fill="#2a4060" stroke="#0a1628" strokeWidth={1} />
        )}

        {/* === MAIN SAIL ===
            Triangle from mast head (luff is implicit on the mast) down
            to the boom. The leech curves out aft - that's the visible
            belly of the sail. When stalled, the leech flaps. */}
        {hasMain && (() => {
          const idle = `M ${MAST_X} ${MAST_TOP} Q ${leechCtrlX} ${leechCtrlY} ${BOOM_AFT} ${BOOM_Y} L ${MAST_X} ${BOOM_Y} Z`;
          const f1 = `M ${MAST_X} ${MAST_TOP} Q ${leechCtrlX - 16} ${leechCtrlY - 4} ${BOOM_AFT - 8} ${BOOM_Y} L ${MAST_X} ${BOOM_Y} Z`;
          const f2 = `M ${MAST_X} ${MAST_TOP} Q ${leechCtrlX + 12} ${leechCtrlY + 6} ${BOOM_AFT + 6} ${BOOM_Y} L ${MAST_X} ${BOOM_Y} Z`;
          const f3 = `M ${MAST_X} ${MAST_TOP} Q ${leechCtrlX - 8} ${leechCtrlY + 2} ${BOOM_AFT - 4} ${BOOM_Y} L ${MAST_X} ${BOOM_Y} Z`;
          return (
            <g transform={`translate(0 ${(BOOM_Y * (1 - mainVisualScale))}) scale(1 ${mainVisualScale})`}>
              {mainStalled ? (
                <path
                  d={idle}
                  fill={`url(#${mainSailId})`}
                  stroke="#ffffff"
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                >
                  <animate
                    attributeName="d"
                    dur="0.6s"
                    repeatCount="indefinite"
                    values={[idle, f1, f2, f3, idle].join(';')}
                  />
                </path>
              ) : (
                <path
                  d={idle}
                  fill={`url(#${mainSailId})`}
                  stroke="#ffffff"
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                />
              )}

              {/* Battens: 4 horizontal-ish lines following the sail belly */}
              {[0.2, 0.4, 0.6, 0.8].map((t, i) => {
                const sailY = MAST_TOP + (BOOM_Y - MAST_TOP) * t;
                const reachX = MAST_X + (BOOM_AFT - MAST_X) * (t * 0.95);
                const sagY = sailY + 4 * mainBelly;
                return (
                  <path
                    key={i}
                    d={`M ${MAST_X + 2} ${sailY} Q ${(MAST_X + reachX) / 2} ${sagY} ${reachX} ${sailY + 1}`}
                    fill="none"
                    stroke="rgba(160, 185, 205, 0.55)"
                    strokeWidth={0.7}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Airflow streamlines along the main when attached */}
              {!mainStalled && (
                <g opacity={0.65}>
                  {[0.25, 0.45, 0.65, 0.85].map((t, i) => {
                    const sailY = MAST_TOP + (BOOM_Y - MAST_TOP) * t;
                    const reachX = MAST_X + (BOOM_AFT - MAST_X) * (t * 0.9);
                    return (
                      <path
                        key={i}
                        d={`M ${MAST_X + 4} ${sailY + 2} Q ${(MAST_X + reachX) / 2} ${sailY + 5 * mainBelly} ${reachX} ${sailY + 3}`}
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

              {/* Telltale at the leech */}
              <line
                x1={BOOM_AFT - 4}
                y1={leechCtrlY}
                x2={BOOM_AFT + (mainStalled ? 22 : 8)}
                y2={mainStalled ? leechCtrlY - 8 : leechCtrlY + 6}
                stroke={mainStalled ? '#ff8e6a' : '#8fffc2'}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </g>
          );
        })()}

        {/* === JIB SAIL ===
            Triangle on the forestay - tack at bow, head at mast top,
            clew aft along the deck. Smaller than the main. Belly
            curves forward (toward us / windward). */}
        {hasJib && (() => {
          const tackX = HULL_BOW - 6;
          const tackY = -FREEBOARD * 1.25;
          const headX = MAST_X;
          const headY = MAST_TOP + 26;
          const clewX = MAST_X + 80;
          const clewY = -FREEBOARD - 4;
          // Belly: control points pulled forward (positive x) from the
          // luff-leech chord.
          const luffCtrlX = (tackX + headX) / 2 + 18 * jibBelly;
          const luffCtrlY = (tackY + headY) / 2;
          const leechCtrlJibX = (headX + clewX) / 2 + 14 * jibBelly;
          const leechCtrlJibY = (headY + clewY) / 2;

          const idle = `M ${tackX} ${tackY} Q ${luffCtrlX} ${luffCtrlY} ${headX} ${headY} Q ${leechCtrlJibX} ${leechCtrlJibY} ${clewX} ${clewY} L ${tackX} ${tackY} Z`;
          const f1 = `M ${tackX} ${tackY} Q ${luffCtrlX - 12} ${luffCtrlY - 4} ${headX} ${headY} Q ${leechCtrlJibX - 10} ${leechCtrlJibY - 2} ${clewX - 6} ${clewY} L ${tackX} ${tackY} Z`;
          const f2 = `M ${tackX} ${tackY} Q ${luffCtrlX + 8} ${luffCtrlY + 4} ${headX} ${headY} Q ${leechCtrlJibX + 8} ${leechCtrlJibY + 4} ${clewX + 6} ${clewY} L ${tackX} ${tackY} Z`;
          const f3 = `M ${tackX} ${tackY} Q ${luffCtrlX - 6} ${luffCtrlY} ${headX} ${headY} Q ${leechCtrlJibX - 4} ${leechCtrlJibY + 2} ${clewX} ${clewY - 3} L ${tackX} ${tackY} Z`;

          return (
            <g opacity={jibOpacity}>
              {jibStalled ? (
                <path
                  d={idle}
                  fill={`url(#${jibSailId})`}
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeLinejoin="round"
                >
                  <animate
                    attributeName="d"
                    dur="0.55s"
                    repeatCount="indefinite"
                    values={[idle, f1, f2, f3, idle].join(';')}
                  />
                </path>
              ) : (
                <path
                  d={idle}
                  fill={`url(#${jibSailId})`}
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              )}

              {/* Airflow streamlines along the jib */}
              {!jibStalled && (
                <g opacity={0.55}>
                  {[0.3, 0.5, 0.7].map((t, i) => {
                    const yLuff = tackY + (headY - tackY) * t;
                    const yLeech = clewY + (headY - clewY) * t;
                    const xMid = tackX + (clewX - tackX) * t * 0.6;
                    return (
                      <path
                        key={i}
                        d={`M ${tackX + (luffCtrlX - tackX) * t * 0.6} ${yLuff} Q ${xMid + 6} ${(yLuff + yLeech) / 2 + 3 * jibBelly} ${clewX - (clewX - leechCtrlJibX) * (1 - t) * 0.6} ${yLeech}`}
                        stroke={jibAccent}
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        fill="none"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.1;0.55;0.1"
                          dur={`${1.6 + i * 0.2}s`}
                          begin={`${i * 0.35}s`}
                          repeatCount="indefinite"
                        />
                      </path>
                    );
                  })}
                </g>
              )}

              {/* Telltale on the jib leech */}
              <line
                x1={leechCtrlJibX}
                y1={leechCtrlJibY}
                x2={leechCtrlJibX + (jibStalled ? 18 : 6)}
                y2={leechCtrlJibY + (jibStalled ? -8 : 5)}
                stroke={jibStalled ? '#ff9a7a' : '#8fffc2'}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </g>
          );
        })()}
      </g>

      {/* Direction-of-travel banner at deck level pointing forward
          past the bow. Tells the user "this is where you're going" -
          can't always read it from a static profile. */}
      <g transform={`translate(${cx + HULL_BOW + 30} ${waterY - 30})`}>
        <line
          x1="0"
          y1="0"
          x2="40"
          y2="0"
          stroke="rgba(82, 255, 142, 0.65)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <polygon points="34,-6 48,0 34,6" fill="rgba(82, 255, 142, 0.85)" />
        <text
          x="-6"
          y="4"
          fill="rgba(150, 230, 180, 0.85)"
          fontSize="10"
          fontWeight="800"
          textAnchor="end"
          style={{ letterSpacing: '0.12em' }}
        >
          {tp('НОС', 'BOW', 'DZIOB')}
        </text>
      </g>

      {/* Bow wave - small foam crescent in front of the boat */}
      {speedIntensity > 0.15 && (
        <g transform={`translate(${cx} ${waterY})`} opacity={speedIntensity * 0.8}>
          <path
            d={`M ${HULL_BOW - 30} 4 Q ${HULL_BOW + 10} ${-2 - speedIntensity * 6} ${HULL_BOW + 36} 6`}
            fill="none"
            stroke="rgba(220, 240, 255, 0.85)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <path
            d={`M ${HULL_BOW - 60} 14 Q ${HULL_BOW - 12} 2 ${HULL_BOW + 30} 12`}
            fill="none"
            stroke="rgba(180, 220, 255, 0.5)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Stern wake */}
      {speedIntensity > 0.15 && (
        <g transform={`translate(${cx} ${waterY})`} opacity={speedIntensity * 0.6}>
          <path
            d={`M ${HULL_STERN + 8} 4 L ${HULL_STERN - 80 - speedIntensity * 160} 22`}
            stroke="rgba(200, 230, 255, 0.55)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <path
            d={`M ${HULL_STERN + 8} 12 L ${HULL_STERN - 60 - speedIntensity * 130} 30`}
            stroke="rgba(180, 220, 255, 0.32)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Heel readout - small note since heel is hard to show in pure side */}
      {heelAbs > 1 && (
        <g transform={`translate(${cx} ${waterY - 320})`}>
          <text
            x="0"
            y="0"
            fill="rgba(150, 200, 230, 0.75)"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            style={{ letterSpacing: '0.1em' }}
          >
            {tp(`КРЕН ${Math.round(heelAbs)}° (вид сзади покажет)`,
                `HEEL ${Math.round(heelAbs)} (rear view shows it)`,
                `PRZECHYL ${Math.round(heelAbs)}° (widok z tylu)`)}
          </text>
        </g>
      )}

      {/* Top-left scene label */}
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

      {/* Bottom-right speed readout */}
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
