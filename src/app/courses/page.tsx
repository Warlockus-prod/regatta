'use client';

import { useState, useMemo, useCallback } from 'react';
import { pointsOfSail, type PointOfSail } from '@/data/sailing-data';
import { useI18n } from '@/lib/i18n';

// Pick the point-of-sail display fields for the current language. EN stays as
// the international anchor shown beneath the primary label in non-EN modes.
function posName(p: PointOfSail, lang: 'ru' | 'en' | 'pl'): string {
  return lang === 'pl' ? p.namePl : lang === 'en' ? p.nameEn : p.nameRu;
}
function posDescription(p: PointOfSail, lang: 'ru' | 'en' | 'pl'): string {
  return lang === 'pl' ? p.descriptionPl : lang === 'en' ? p.descriptionEn : p.description;
}
function posSailWork(p: PointOfSail, lang: 'ru' | 'en' | 'pl'): string {
  return lang === 'pl' ? p.sailWorkPl : lang === 'en' ? p.sailWorkEn : p.sailWork;
}

// --- Geometry helpers ---
const DEG = Math.PI / 180;
const polarToCart = (cx: number, cy: number, r: number, deg: number) => ({
  x: Math.round((cx + r * Math.sin(deg * DEG)) * 100) / 100,
  y: Math.round((cy - r * Math.cos(deg * DEG)) * 100) / 100,
});
const arcPath = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) => {
  const s = polarToCart(cx, cy, r, startDeg);
  const e = polarToCart(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y} Z`;
};

// --- Small yacht SVG at a given position in the diagram ---
function YachtIcon({
  cx,
  cy,
  angle,
  sailAngle,
  color,
  size = 18,
  mirror = false,
}: {
  cx: number;
  cy: number;
  angle: number;
  sailAngle: number;
  color: string;
  size?: number;
  mirror?: boolean;
}) {
  const effectiveSail = mirror ? -sailAngle : sailAngle;
  const jibFactor = Math.abs(sailAngle) < 45 ? 0.75 : 0.55;
  const jibSail = effectiveSail * jibFactor;
  const mastTop = -size * 0.55;
  const boomEndX = Math.sin(effectiveSail * DEG) * size * 0.45;
  const boomEndY = mastTop + Math.cos(effectiveSail * DEG) * size * 0.4;
  const forestayY = -size * 0.6;
  const jibClewX = Math.sin(jibSail * DEG) * size * 0.28;
  const jibClewY = forestayY + Math.cos(jibSail * DEG) * size * 0.35;
  // Wing-on-wing: at running / broad-reach the jib is set on the OPPOSITE side of the
  // main to catch wind that the mainsail would otherwise blanket.
  const wingOnWing = Math.abs(sailAngle) >= 75;
  const wowJibX = -jibClewX;
  const wowJibY = jibClewY;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
      {/* Hull with a bow triangle marker so orientation is unambiguous */}
      <ellipse
        rx={size * 0.22}
        ry={size * 0.7}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.9}
      />
      <polygon
        points={`${-size * 0.12},${-size * 0.66} ${size * 0.12},${-size * 0.66} 0,${-size * 0.78}`}
        fill={color}
        opacity={0.7}
      />
      {/* Mast */}
      <line x1={0} y1={-size * 0.15} x2={0} y2={mastTop} stroke="#fff" strokeWidth={1.2} />
      {/* Jib (стаксель) - triangle forward of mast (OR on opposite side when wing-on-wing) */}
      {wingOnWing ? (
        <path
          d={`M 0 ${forestayY} L ${wowJibX} ${wowJibY} L 0 ${wowJibY} Z`}
          fill={color}
          fillOpacity={0.22}
          stroke={color}
          strokeWidth={1.1}
          strokeLinejoin="round"
          strokeDasharray="2 1.5"
          opacity={0.85}
        />
      ) : (
        <path
          d={`M 0 ${forestayY} L ${jibClewX} ${jibClewY} L 0 ${jibClewY} Z`}
          fill={color}
          fillOpacity={0.22}
          stroke={color}
          strokeWidth={1.2}
          strokeLinejoin="round"
          opacity={0.9}
        />
      )}
      {/* Mainsail (грот) - triangle aft of mast */}
      <path
        d={`M 0 ${mastTop} L ${boomEndX} ${boomEndY} L 0 ${boomEndY} Z`}
        fill={color}
        fillOpacity={0.35}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        opacity={0.95}
      />
    </g>
  );
}

// --- Wind arrow pointing downward at the top of the diagram ---
function WindArrow({ cx, topY }: { cx: number; topY: number }) {
  const arrowLen = 48;
  const y0 = topY - 2;
  return (
    <g>
      {/* Animated streaks */}
      {[-12, 0, 12].map((dx, i) => (
        <line
          key={i}
          x1={cx + dx}
          y1={y0}
          x2={cx + dx}
          y2={y0 + arrowLen * 0.55}
          stroke="var(--wind-color)"
          strokeWidth={1.2}
          opacity={0.35}
          strokeDasharray="4 6"
        >
          <animate
            attributeName="y1"
            values={`${y0 - 6};${y0 + 6};${y0 - 6}`}
            dur={`${1.6 + i * 0.2}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="y2"
            values={`${y0 + arrowLen * 0.55 - 6};${y0 + arrowLen * 0.55 + 6};${y0 + arrowLen * 0.55 - 6}`}
            dur={`${1.6 + i * 0.2}s`}
            repeatCount="indefinite"
          />
        </line>
      ))}
      {/* Main arrow shaft */}
      <line
        x1={cx}
        y1={y0}
        x2={cx}
        y2={y0 + arrowLen}
        stroke="var(--wind-color)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <polygon
        points={`${cx},${y0 + arrowLen + 4} ${cx - 7},${y0 + arrowLen - 6} ${cx + 7},${y0 + arrowLen - 6}`}
        fill="var(--wind-color)"
      />
      {/* Label */}
      <text
        x={cx}
        y={y0 - 8}
        textAnchor="middle"
        fill="var(--wind-color)"
        fontSize={11}
        fontWeight={700}
        letterSpacing={1.5}
      >
        ВЕТЕР / WIND
      </text>
    </g>
  );
}

// --- Angle tick marks around the edge ---
function AngleTicks({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const ticks: React.ReactElement[] = [];
  for (let deg = 0; deg <= 360; deg += 10) {
    const isMajor = deg % 30 === 0;
    const inner = isMajor ? r - 10 : r - 6;
    const outer = r;
    const p1 = polarToCart(cx, cy, inner, deg);
    const p2 = polarToCart(cx, cy, outer, deg);
    ticks.push(
      <line
        key={deg}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="rgba(0,212,255,0.2)"
        strokeWidth={isMajor ? 1.2 : 0.6}
      />,
    );
    if (isMajor && deg > 0 && deg < 360) {
      const labelR = r + 14;
      const lp = polarToCart(cx, cy, labelR, deg);
      ticks.push(
        <text
          key={`l${deg}`}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-muted)"
          fontSize={8}
          fontFamily="var(--font-mono)"
        >
          {deg <= 180 ? `${deg}\u00B0` : `${360 - deg}\u00B0`}
        </text>,
      );
    }
  }
  return <g>{ticks}</g>;
}

// --- The full circular diagram ---
function WindDiagram({
  activeId,
  onSelect,
  lang,
}: {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  lang: 'ru' | 'en' | 'pl';
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const viewSize = 600;
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const mainR = 190;
  const outerR = mainR + 22;

  const effectiveId = hoveredId ?? activeId;

  // Build sectors -- each point of sail gets a mirrored pair (port/starboard)
  const sectors = useMemo(() => {
    const items: {
      point: PointOfSail;
      startDeg: number;
      endDeg: number;
      side: 'right' | 'left' | 'center';
    }[] = [];
    pointsOfSail.forEach((p) => {
      if (p.angleMax === 180) {
        // Forderwind spans full bottom
        items.push({ point: p, startDeg: p.angleMin, endDeg: p.angleMax, side: 'right' });
        items.push({ point: p, startDeg: 360 - p.angleMax, endDeg: 360 - p.angleMin, side: 'left' });
      } else if (p.angleMin === 0) {
        // In irons: symmetric top sector
        items.push({ point: p, startDeg: 360 - p.angleMax, endDeg: p.angleMax, side: 'center' });
      } else {
        // Starboard (right)
        items.push({ point: p, startDeg: p.angleMin, endDeg: p.angleMax, side: 'right' });
        // Port (left, mirrored)
        items.push({ point: p, startDeg: 360 - p.angleMax, endDeg: 360 - p.angleMin, side: 'left' });
      }
    });
    return items;
  }, []);

  // Yacht positions -- place a yacht silhouette at the midpoint of each sector
  const yachts = useMemo(() => {
    const items: {
      id: string;
      cx: number;
      cy: number;
      angle: number;
      sailAngle: number;
      color: string;
      mirror: boolean;
    }[] = [];
    const yachtR = mainR * 0.65;
    pointsOfSail.forEach((p) => {
      if (p.id === 'in-irons') {
        const pt = polarToCart(cx, cy, yachtR, 0);
        items.push({ id: p.id, cx: pt.x, cy: pt.y, angle: 0, sailAngle: p.sailAngle, color: p.color, mirror: false });
      } else {
        const midAngle = (p.angleMin + p.angleMax) / 2;
        // Starboard
        const ptR = polarToCart(cx, cy, yachtR, midAngle);
        items.push({ id: p.id, cx: ptR.x, cy: ptR.y, angle: midAngle, sailAngle: p.sailAngle, color: p.color, mirror: false });
        // Port
        const ptL = polarToCart(cx, cy, yachtR, 360 - midAngle);
        items.push({ id: p.id, cx: ptL.x, cy: ptL.y, angle: 360 - midAngle, sailAngle: p.sailAngle, color: p.color, mirror: true });
      }
    });
    return items;
  }, [cx, cy, mainR]);

  return (
    <svg
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      className="w-full max-w-[540px] mx-auto select-none"
      style={{ filter: 'drop-shadow(0 0 30px rgba(0,212,255,0.06))' }}
    >
      <defs>
        {/* Radial glow for active sector */}
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,212,255,0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="sectorGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx={cx} cy={cy} r={mainR + 1} fill="url(#centerGlow)" />
      <circle
        cx={cx}
        cy={cy}
        r={mainR}
        fill="none"
        stroke="rgba(0,212,255,0.12)"
        strokeWidth={1}
      />

      {/* Sectors */}
      {sectors.map((s, i) => {
        const isActive = effectiveId === s.point.id;
        // For in-irons wrap, handle the path differently
        let d: string;
        if (s.side === 'center') {
          // In-irons spans from (360-angleMax) through 0 to angleMax
          const start = 360 - s.point.angleMax;
          const end = s.point.angleMax;
          // Need two arcs since it crosses 0
          const p1 = polarToCart(cx, cy, mainR, start);
          const p2 = polarToCart(cx, cy, mainR, end);
          d = `M${cx},${cy} L${p1.x},${p1.y} A${mainR},${mainR} 0 0 1 ${p2.x},${p2.y} Z`;
        } else {
          d = arcPath(cx, cy, mainR, s.startDeg, s.endDeg);
        }
        return (
          <path
            key={i}
            d={d}
            fill={s.point.color}
            fillOpacity={isActive ? 0.32 : 0.12}
            stroke={s.point.color}
            strokeWidth={isActive ? 2 : 0.8}
            strokeOpacity={isActive ? 0.9 : 0.35}
            style={{
              cursor: 'pointer',
              transition: 'fill-opacity 0.25s, stroke-width 0.25s, stroke-opacity 0.25s',
              filter: isActive ? 'url(#sectorGlow)' : 'none',
            }}
            onMouseEnter={() => setHoveredId(s.point.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelect(activeId === s.point.id ? null : s.point.id)}
          />
        );
      })}

      {/* Angle ticks */}
      <AngleTicks cx={cx} cy={cy} r={mainR} />

      {/* Tack labels along the bottom of the diagram (below Fordewind sector)
          where there is no competing label. The previous layout put vertical
          "ПРАВЫЙ ГАЛС" / "ЛЕВЫЙ ГАЛС" at east/west outside the circle which
          overlapped the horizontal "Галфвинд" and "Бакштаг" labels on narrow
          viewports. Horizontal placement at bottom is always unambiguous. */}
      <text
        x={cx - mainR * 0.5}
        y={cy + mainR + 62}
        textAnchor="middle"
        fill="var(--accent-cyan)"
        fontSize={10}
        fontWeight={700}
        letterSpacing={1.5}
        opacity={0.85}
      >
        {lang === 'ru' ? 'ЛЕВЫЙ ГАЛС' : lang === 'pl' ? 'LEWY HALS' : 'PORT TACK'}
      </text>
      <text
        x={cx + mainR * 0.5}
        y={cy + mainR + 62}
        textAnchor="middle"
        fill="var(--accent-cyan)"
        fontSize={10}
        fontWeight={700}
        letterSpacing={1.5}
        opacity={0.85}
      >
        {lang === 'ru' ? 'ПРАВЫЙ ГАЛС' : lang === 'pl' ? 'PRAWY HALS' : 'STARBOARD TACK'}
      </text>

      {/* Russian labels around the circle - horizontal, mirrored on both sides */}
      {pointsOfSail.map((p) => {
        if (p.id === 'in-irons') {
          return (
            <g key={p.id}>
              <text
                x={cx}
                y={cy - mainR + 28}
                textAnchor="middle"
                fill={effectiveId === p.id ? p.color : 'var(--text-secondary)'}
                fontSize={11}
                fontWeight={600}
                style={{ transition: 'fill 0.25s' }}
              >
                {posName(p, lang)}
              </text>
            </g>
          );
        }
        // Place labels on both starboard (right) and port (left) sides, horizontal
        const midAngle = (p.angleMin + p.angleMax) / 2;
        const labelR = mainR + 32;
        const ptR = polarToCart(cx, cy, labelR, midAngle);        // starboard
        const ptL = polarToCart(cx, cy, labelR, 360 - midAngle);  // port (mirror)
        const fill = effectiveId === p.id ? p.color : 'var(--text-secondary)';
        return (
          <g key={p.id}>
            <text
              x={ptR.x}
              y={ptR.y}
              textAnchor={midAngle < 90 ? 'start' : midAngle > 90 ? 'start' : 'middle'}
              dominantBaseline="central"
              fill={fill}
              fontSize={11}
              fontWeight={600}
              style={{ transition: 'fill 0.25s' }}
            >
              {posName(p, lang)}
            </text>
            <text
              x={ptL.x}
              y={ptL.y}
              textAnchor="end"
              dominantBaseline="central"
              fill={fill}
              fontSize={11}
              fontWeight={600}
              style={{ transition: 'fill 0.25s' }}
            >
              {posName(p, lang)}
            </text>
          </g>
        );
      })}

      {/* Yacht silhouettes */}
      {yachts.map((y, i) => (
        <YachtIcon
          key={i}
          cx={y.cx}
          cy={y.cy}
          angle={y.angle}
          sailAngle={y.sailAngle}
          color={effectiveId === y.id ? y.color : 'rgba(255,255,255,0.45)'}
          size={effectiveId === y.id ? 30 : 24}
          mirror={y.mirror}
        />
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3} fill="var(--accent-cyan)" opacity={0.6} />

      {/* Wind arrow at top */}
      <WindArrow cx={cx} topY={cy - mainR - 50} />

      {/* Centerline dashed */}
      <line
        x1={cx}
        y1={cy - mainR + 2}
        x2={cx}
        y2={cy + mainR - 2}
        stroke="rgba(0,212,255,0.12)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    </svg>
  );
}

// --- Speed bar ---
function SpeedBar({ factor, color }: { factor: number; color: string }) {
  const pct = Math.round(factor * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-muted)] w-20 shrink-0">Скорость</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// --- Small sail angle illustration for detail cards ---
//
// The wind ALWAYS comes from the top of the thumbnail. What changes per point
// of sail is the BOAT orientation relative to that wind: the bow rotates by
// the course's TWA (mid of angleMin/angleMax). In-irons ~= bow pointing
// straight up; beam reach ~= bow to the right; running ~= bow pointing down.
//
// The sail always sits on the leeward side of the boat at its trimmed angle.
function SailAngleIllustration({
  sailAngle,
  color,
  speedFactor,
  twa,
}: {
  sailAngle: number;
  color: string;
  speedFactor: number;
  /** Mid-angle of the point-of-sail range in degrees (0 = into wind, 180 = running). */
  twa: number;
}) {
  const size = 64;
  const cx = size / 2;
  const cy = size / 2;
  const hullLen = 22;
  const mastTop = cy - hullLen * 0.6;
  const sailLen = 20;
  // Main sail sits on the leeward side of the boat (in boat frame: starboard
  // side when wind hits from port; we pick starboard for the illustration so
  // rotation shows it swinging naturally).
  const sailEndX = cx + Math.sin(sailAngle * DEG) * sailLen;
  const sailEndY = mastTop + Math.cos(sailAngle * DEG) * sailLen * 0.4;
  // Wing-on-wing for very deep downwind courses.
  const wingOnWing = sailAngle >= 75;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Wind indicator - always at the top, wind blows DOWN into the scene. */}
      <line x1={cx} y1={4} x2={cx} y2={14} stroke="var(--wind-color)" strokeWidth={1.2} opacity={0.5} />
      <polygon points={`${cx},16 ${cx - 3},10 ${cx + 3},10`} fill="var(--wind-color)" opacity={0.5} />

      {/* Boat + rig rotated by TWA so the relationship to the wind is visible.
          twa in [0, 180], rotated clockwise from "bow-up". */}
      <g transform={`rotate(${twa} ${cx} ${cy})`}>
        {/* Hull */}
        <ellipse
          cx={cx}
          cy={cy + 4}
          rx={5}
          ry={hullLen * 0.65}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.7}
        />
        {/* Bow marker - small dot at the bow so the user sees which end points where. */}
        <circle cx={cx} cy={cy + 4 - hullLen * 0.65} r={1.3} fill={color} />
        {/* Mast */}
        <line x1={cx} y1={cy - 2} x2={cx} y2={mastTop} stroke="#fff" strokeWidth={1.5} />
        {/* Mainsail as a small triangle so it reads as a sail, not just a stick. */}
        <path
          d={`M ${cx} ${mastTop} L ${sailEndX} ${sailEndY} L ${cx} ${sailEndY} Z`}
          fill={color}
          fillOpacity={0.35}
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        {/* Wing-on-wing jib on opposite side for running / broad reach */}
        {wingOnWing && (() => {
          const jibEndX = cx - Math.sin(sailAngle * DEG) * sailLen * 0.7;
          const jibEndY = mastTop + 4 + Math.cos(sailAngle * DEG) * sailLen * 0.4;
          return (
            <path
              d={`M ${cx} ${mastTop + 4} L ${jibEndX} ${jibEndY} L ${cx} ${jibEndY} Z`}
              fill={color}
              fillOpacity={0.18}
              stroke={color}
              strokeWidth={1.2}
              strokeLinejoin="round"
              strokeDasharray="2 1.5"
            />
          );
        })()}
      </g>

      {/* Speed indicator dots (stays in world frame so they read top-to-bottom
          consistently regardless of boat orientation) */}
      {speedFactor > 0 && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={size - 4}
              cy={size - 8 - i * 6}
              r={2}
              fill={i < Math.round(speedFactor * 5) ? color : 'rgba(255,255,255,0.1)'}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

// --- Detail card for a point of sail ---
function DetailCard({
  point,
  isActive,
  onSelect,
  lang,
}: {
  point: PointOfSail;
  isActive: boolean;
  onSelect: () => void;
  lang: 'ru' | 'en' | 'pl';
}) {
  return (
    <button
      onClick={onSelect}
      className={`card p-5 text-left w-full transition-all duration-300 ${
        isActive ? 'ring-1 scale-[1.01]' : ''
      }`}
      style={{
        borderColor: isActive ? point.color : undefined,
        boxShadow: isActive ? `0 4px 24px ${point.color}22` : undefined,
        outlineColor: isActive ? point.color : undefined,
      }}
    >
      <div className="flex gap-4">
        {/* Sail angle illustration */}
        <SailAngleIllustration
          sailAngle={point.sailAngle}
          color={point.color}
          speedFactor={point.speedFactor}
          twa={(point.angleMin + point.angleMax) / 2}
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="text-lg font-bold leading-tight" style={{ color: point.color }}>
                {posName(point, lang)}
              </h3>
              {lang !== 'en' && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{point.nameEn}</p>
              )}
            </div>
            {/* Color-coded angle badge */}
            <span
              className="badge shrink-0"
              style={{
                background: `${point.color}1a`,
                color: point.color,
                border: `1px solid ${point.color}33`,
              }}
            >
              {point.angleMin === 0 && point.angleMax === 30
                ? `0-${point.angleMax}\u00B0`
                : `${point.angleMin}-${point.angleMax}\u00B0`}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            {posDescription(point, lang)}
          </p>

          {/* Sail work */}
          <div className="flex items-center gap-2 mb-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={point.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
            <span className="text-xs" style={{ color: point.color }}>
              {posSailWork(point, lang)}
            </span>
          </div>

          {/* Speed bar */}
          <SpeedBar factor={point.speedFactor} color={point.color} />
        </div>
      </div>
    </button>
  );
}

// --- Main page component ---
export default function CoursesPage() {
  const { lang } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleSelect = useCallback(
    (id: string | null) => {
      setActiveId((prev) => (prev === id ? null : id));
    },
    [],
  );

  const activePoint = activeId
    ? pointsOfSail.find((p) => p.id === activeId) ?? null
    : null;

  return (
    <div className="page-enter">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
          style={{
            background: 'linear-gradient(135deg, var(--text-primary), var(--accent-cyan))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Курсы относительно ветра
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Points of Sail</p>
        <p className="max-w-xl mx-auto text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
          Нажми на сектор диаграммы или на карточку ниже, чтобы узнать подробности о каждом курсе.
        </p>
      </section>

      {/* Diagram */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="card p-6 sm:p-8 flex flex-col items-center">
          <WindDiagram activeId={activeId} onSelect={handleSelect} lang={lang} />

          {/* Quick info strip below diagram when a sector is active */}
          {activePoint && (
            <div
              className="mt-6 w-full max-w-md text-center rounded-lg px-4 py-3 transition-all duration-300"
              style={{
                background: `${activePoint.color}0d`,
                border: `1px solid ${activePoint.color}22`,
              }}
            >
              <p className="text-base font-bold" style={{ color: activePoint.color }}>
                {posName(activePoint, lang)}
              </p>
              {lang !== 'en' && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{activePoint.nameEn}</p>
              )}
              <p className="text-xs text-[var(--text-secondary)] mt-2">{posSailWork(activePoint, lang)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Detail cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-4">
        <h2 className="text-xl font-semibold mb-5 text-[var(--text-primary)]">
          {lang === 'ru' ? 'Все курсы' : lang === 'pl' ? 'Wszystkie kursy' : 'All courses'}
          {lang !== 'en' && (
            <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
              All courses
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pointsOfSail.map((point) => (
            <DetailCard
              key={point.id}
              point={point}
              isActive={activeId === point.id}
              onSelect={() => handleSelect(point.id)}
              lang={lang}
            />
          ))}
        </div>
      </section>

      {/* Two sails theory */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="card p-6 sm:p-8">
          <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
            Два паруса, а не один
            <span className="text-sm font-normal text-[var(--text-muted)] ml-2">Two sails, not one</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
            Обычная круизная яхта (слуп) несёт два паруса: грот и стаксель. На диаграмме
            каждый кораблик показан с обоими: треугольник за мачтой - грот, треугольник перед
            мачтой - стаксель. На реальной лодке они работают вместе, а шкотов (верёвок управления) - два.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg p-4" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                Грот / Mainsail
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Большой парус за мачтой. Главный двигатель на всех курсах кроме чистого фордевинда.
                Управляется гика-шкотом. В сильный ветер рифится (уменьшается) первым.
              </p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'rgba(255, 221, 68, 0.05)', border: '1px solid rgba(255, 221, 68, 0.15)' }}>
              <div className="text-sm font-semibold mb-1" style={{ color: '#ffdd44' }}>
                Стаксель / Jib
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Треугольный парус перед мачтой. Ускоряет воздух перед гротом (эффект щели),
                даёт дополнительную тягу на острых курсах. У него свой шкот - шкотовый.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg p-4" style={{ background: 'rgba(255, 136, 68, 0.04)', border: '1px solid rgba(255, 136, 68, 0.12)' }}>
            <div className="text-sm font-semibold mb-1" style={{ color: '#ff8844' }}>
              Эффект щели / Slot effect
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Когда стаксель и грот работают вместе, между ними образуется суживающаяся щель.
              Воздух в ней ускоряется и создаёт разрежение на подветренной стороне грота -
              парус тянет лучше, чем если бы стоял один. Именно поэтому на бейдевинде лодка
              со стакселем идёт заметно быстрее.
            </p>
          </div>

          <div className="mt-5">
            <h3 className="text-base font-semibold mb-2 text-[var(--text-primary)]">
              А что ещё бывает?
              <span className="text-xs font-normal text-[var(--text-muted)] ml-2">What else is there?</span>
            </h3>
            <div className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                <span className="font-semibold text-[var(--text-primary)]">Генуя (genoa) </span>
                - большой стаксель, чей задний край заходит за мачту. Даёт заметно больше тяги
                на бейдевинде и галфвинде, но сложнее в работе при поворотах.
              </p>
              <p>
                <span className="font-semibold text-[var(--text-primary)]">Геннакер (gennaker) </span>
                - асимметричный лёгкий парус для попутных курсов (бакштаг, фордевинд).
                Ставится вместо стакселя, надувается как шар. Проще спинакера, не требует
                спинакер-гика.
              </p>
              <p>
                <span className="font-semibold text-[var(--text-primary)]">Спинакер (spinnaker) </span>
                - симметричный пузатый парус только для чистого фордевинда. Требует отдельного
                гика и навыка. На круизёрах встречается редко.
              </p>
              <p className="text-[var(--text-muted)] pt-1">
                В симуляторе показаны только грот + стаксель - базовая конфигурация слупа.
                Остальные паруса - для продвинутых гонок.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
