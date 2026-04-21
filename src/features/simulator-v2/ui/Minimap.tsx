'use client';

// ---------------------------------------------------------------------------
// Minimap - north-up tactical inset, PR-3 placeholder version.
//
// Shows the boat's orientation in world space and the true wind source.
// Race shell (PR-4) will add start line, marks, target arrow; opponents
// (PR-5) will add enemy boat dots. For now the component renders just
// enough to anchor the top-right inset and validate the layout.
// ---------------------------------------------------------------------------

export function Minimap({
  heading,
  trueWindDir,
}: {
  heading: number;
  trueWindDir: number;
}) {
  const size = 108;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  const headingRad = (heading * Math.PI) / 180;
  const windRad = (trueWindDir * Math.PI) / 180;
  // Wind arrow: points INTO circle from where the wind comes from.
  const windTailX = cx + Math.sin(windRad) * r;
  const windTailY = cy - Math.cos(windRad) * r;
  const windHeadX = cx + Math.sin(windRad) * (r - 14);
  const windHeadY = cy - Math.cos(windRad) * (r - 14);

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
        <circle cx={cx} cy={cy} r={r} fill="rgba(4, 12, 24, 0.6)" stroke="rgba(0, 212, 255, 0.3)" strokeWidth={1} />
        {/* North label */}
        <text x={cx} y={12} fontSize={9} fill="var(--accent-cyan)" textAnchor="middle" fontWeight={700}>N</text>

        {/* Wind source indicator */}
        <line
          x1={windTailX}
          y1={windTailY}
          x2={windHeadX}
          y2={windHeadY}
          stroke="#ffaa00"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <circle cx={windHeadX} cy={windHeadY} r={2.6} fill="#ffaa00" />

        {/* Boat: tiny triangle oriented by heading */}
        <g transform={`rotate(${heading} ${cx} ${cy})`}>
          <polygon
            points={`${cx},${cy - 6} ${cx - 3.5},${cy + 4} ${cx + 3.5},${cy + 4}`}
            fill="var(--accent-cyan)"
            stroke="rgba(5, 11, 24, 0.9)"
            strokeWidth={0.8}
          />
        </g>
      </svg>
      <div className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-bold text-center mt-0.5">
        CHART
      </div>
    </div>
  );
}
