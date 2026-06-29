'use client';

// ============================================================================
// WindDial - a compass-style wind instrument (ported idea from the 3dnew
// handoff). Boat fixed bow-up at the center; the True wind (solid cyan) and
// Apparent wind (dashed amber) arrows point inward from the angle they blow
// FROM, relative to the bow. The shaded wedge at the top is the no-go zone.
//
// Pure SVG, no dependencies beyond React, so it travels with the module.
//
// Angle convention: 0 = wind from dead ahead (top), positive = starboard bow.
// ============================================================================

const R = 42;
const C = 50;

function rim(angleDeg: number, r = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

function WindArrow({ angle, color, dashed, label }: { angle: number; color: string; dashed?: boolean; label: string }) {
  const from = rim(angle, R);
  const to = rim(angle, 12); // stop short of the boat
  const head = rim(angle, 18);
  const left = rim(angle - 6, 24);
  const right = rim(angle + 6, 24);
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2.4} strokeDasharray={dashed ? '4 3' : undefined} strokeLinecap="round" />
      <polygon points={`${head.x},${head.y} ${left.x},${left.y} ${right.x},${right.y}`} fill={color} />
      <text x={rim(angle, R + 6).x} y={rim(angle, R + 6).y} fill={color} fontSize={9} fontWeight={700} textAnchor="middle" dominantBaseline="middle">{label}</text>
    </g>
  );
}

export function WindDial({
  twaSigned,
  awaSigned,
  noGoDeg = 42,
  size = 132,
}: {
  twaSigned: number;
  awaSigned: number;
  noGoDeg?: number;
  size?: number;
}) {
  const a = (noGoDeg * Math.PI) / 180;
  const left = rim(-noGoDeg);
  const right = rim(noGoDeg);
  const noGoPath = `M ${C} ${C} L ${left.x} ${left.y} A ${R} ${R} 0 0 1 ${right.x} ${right.y} Z`;
  void a;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Wind dial">
      <circle cx={C} cy={C} r={R} fill="rgba(4,22,30,0.7)" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
      {/* no-go wedge at the top */}
      <path d={noGoPath} fill="rgba(229,72,77,0.18)" stroke="rgba(229,72,77,0.35)" strokeWidth={0.5} />
      {/* cardinal ticks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const p1 = rim(deg, R);
        const p2 = rim(deg, R - 4);
        return <line key={deg} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />;
      })}
      {/* boat, bow up */}
      <polygon points={`${C},${C - 13} ${C - 5},${C + 11} ${C + 5},${C + 11}`} fill="rgba(231,241,247,0.92)" stroke="rgba(0,0,0,0.3)" strokeWidth={0.4} />
      <line x1={C} y1={C - 13} x2={C} y2={C + 11} stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />
      {/* wind arrows */}
      <WindArrow angle={twaSigned} color="#00d4ff" label="T" />
      <WindArrow angle={awaSigned} color="#f5a524" dashed label="A" />
    </svg>
  );
}
