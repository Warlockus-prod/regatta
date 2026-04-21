'use client';

import { DEFAULT_COURSE, type Vec2 } from '../race/course';

// ---------------------------------------------------------------------------
// Minimap - north-up tactical inset showing boat, wind, and course geometry.
// The course is always drawn centered roughly on the boat but framed to
// include the next mark, so the chart stays useful on both legs.
// ---------------------------------------------------------------------------

export function Minimap({
  heading,
  trueWindDir,
  boatPos,
  nextMarkIndex,
  raceActive,
}: {
  heading: number;
  trueWindDir: number;
  boatPos?: Vec2;
  nextMarkIndex?: number;
  raceActive?: boolean;
}) {
  const size = 128;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  const bp: Vec2 = boatPos ?? { x: 0, z: 0 };
  const course = DEFAULT_COURSE;
  const showCourse = raceActive ?? false;

  // Pick a view radius that fits boat + all marks + start line with some
  // padding. The chart is always centered on the boat.
  const points: Vec2[] = [bp, course.startLine.a, course.startLine.b, ...course.marks.map((m) => m.pos)];
  const maxRadius = Math.max(
    40,
    ...points.map((p) => Math.hypot(p.x - bp.x, p.z - bp.z) * 1.15),
  );
  const scale = r / maxRadius;

  const toMap = (p: Vec2) => ({
    x: cx + (p.x - bp.x) * scale,
    y: cy + (p.z - bp.z) * scale,
  });

  const windRad = (trueWindDir * Math.PI) / 180;
  const windTailX = cx + Math.sin(windRad) * r;
  const windTailY = cy - Math.cos(windRad) * r;
  const windHeadX = cx + Math.sin(windRad) * (r - 14);
  const windHeadY = cy - Math.cos(windRad) * (r - 14);

  const activeMarkIdx = Math.min(nextMarkIndex ?? 0, course.marks.length - 1);

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
        <text x={cx} y={12} fontSize={9} fill="var(--accent-cyan)" textAnchor="middle" fontWeight={700}>N</text>

        {/* Course geometry */}
        {showCourse && (() => {
          const a = toMap(course.startLine.a);
          const b = toMap(course.startLine.b);
          return (
            <g>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="rgba(255, 255, 255, 0.55)" strokeWidth={1.2} strokeDasharray="3 2" />
              <circle cx={a.x} cy={a.y} r={2} fill="#ff4455" />
              <circle cx={b.x} cy={b.y} r={2} fill="#ff4455" />
              {course.marks.map((m, i) => {
                const p = toMap(m.pos);
                const active = i === activeMarkIdx;
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y}
                            r={active ? 4 : 3}
                            fill={active ? '#ffaa00' : '#ff4455'}
                            stroke="rgba(5, 11, 24, 0.7)" strokeWidth={0.7} />
                  </g>
                );
              })}
              {/* Path from boat to next mark */}
              {course.marks[activeMarkIdx] && (() => {
                const mk = toMap(course.marks[activeMarkIdx].pos);
                return (
                  <line x1={cx} y1={cy} x2={mk.x} y2={mk.y}
                        stroke="rgba(0, 212, 255, 0.45)" strokeWidth={1} strokeDasharray="2 2" />
                );
              })()}
            </g>
          );
        })()}

        {/* Wind source */}
        <line x1={windTailX} y1={windTailY} x2={windHeadX} y2={windHeadY}
              stroke="#ffaa00" strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={windHeadX} cy={windHeadY} r={2.6} fill="#ffaa00" />

        {/* Boat marker (always centered, oriented by heading) */}
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
