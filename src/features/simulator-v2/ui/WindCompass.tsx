'use client';

// ---------------------------------------------------------------------------
// WindCompass - boat-up compact instrument for V2 HUD.
//
// Shows:
// - center triangle: the boat, always pointing up
// - outer arrow: TRUE wind source relative to the boat's bow
// - dashed ghost: where the boat is steering to (target heading)
// - wind speed label below
//
// Boat-up framing means the player reads it as "wind is here relative to
// me" which matches the way a sailor scans the sky for the puff. An
// absolute north-up version can live in a future minimap.
// ---------------------------------------------------------------------------

export function WindCompass({
  signedTwa,
  windSpeed,
  heading,
  targetHeading,
}: {
  signedTwa: number;
  windSpeed: number;
  heading: number;
  targetHeading: number;
}) {
  const size = 108;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  // Wind arrow: points INTO the circle from the direction of the wind
  // source. signedTwa is 0 at bow, positive clockwise.
  const windRad = (signedTwa * Math.PI) / 180;
  const windTailX = cx + Math.sin(windRad) * r;
  const windTailY = cy - Math.cos(windRad) * r;
  const windHeadX = cx + Math.sin(windRad) * (r - 18);
  const windHeadY = cy - Math.cos(windRad) * (r - 18);

  // Target heading ghost: rotation delta from current heading.
  let targetDelta = targetHeading - heading;
  if (targetDelta > 180) targetDelta -= 360;
  if (targetDelta < -180) targetDelta += 360;
  const showGhost = Math.abs(targetDelta) > 1.5;

  return (
    <div
      className="rounded-xl p-2"
      style={{
        background: 'rgba(5, 11, 24, 0.65)',
        border: '1px solid rgba(0, 212, 255, 0.22)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r} fill="rgba(4, 12, 24, 0.6)" stroke="rgba(0, 212, 255, 0.3)" strokeWidth={1} />
        {/* Cardinal tick marks (boat-relative: 12 o'clock = bow) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const ang = (a * Math.PI) / 180;
          const major = a % 90 === 0;
          const x1 = cx + Math.sin(ang) * (r - (major ? 7 : 4));
          const y1 = cy - Math.cos(ang) * (r - (major ? 7 : 4));
          const x2 = cx + Math.sin(ang) * r;
          const y2 = cy - Math.cos(ang) * r;
          return (
            <line
              key={a}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={major ? 'rgba(0, 212, 255, 0.55)' : 'rgba(139, 167, 184, 0.35)'}
              strokeWidth={major ? 1.3 : 0.9}
            />
          );
        })}

        {/* Target heading ghost (dashed) */}
        {showGhost && (
          <g transform={`rotate(${targetDelta} ${cx} ${cy})`}>
            <polygon
              points={`${cx},${cy - r + 10} ${cx - 5},${cy - r + 24} ${cx + 5},${cy - r + 24}`}
              fill="none"
              stroke="rgba(0, 212, 255, 0.55)"
              strokeWidth={1.4}
              strokeDasharray="2 2"
            />
          </g>
        )}

        {/* Boat arrow (center, always pointing up = bow) */}
        <polygon
          points={`${cx},${cy - 16} ${cx - 7},${cy + 9} ${cx + 7},${cy + 9}`}
          fill="var(--accent-cyan)"
        />
        <circle cx={cx} cy={cy + 1} r={1.8} fill="rgba(5, 11, 24, 0.9)" />

        {/* Wind arrow from outside pointing toward center */}
        <line
          x1={windTailX}
          y1={windTailY}
          x2={windHeadX}
          y2={windHeadY}
          stroke="#ffaa00"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <circle cx={windHeadX} cy={windHeadY} r={3.2} fill="#ffaa00" />
      </svg>
      <div className="flex items-baseline justify-between gap-2 px-1 pt-1">
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">TW</span>
        <span className="text-sm font-mono font-bold tabular-nums" style={{ color: '#ffaa00' }}>
          {windSpeed}
        </span>
        <span className="text-[9px] text-[var(--text-muted)] font-semibold">kts</span>
      </div>
    </div>
  );
}
