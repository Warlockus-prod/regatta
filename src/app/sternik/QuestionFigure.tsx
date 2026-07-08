'use client';

import type { SternikFigureId } from '@/data/sternik';

// ============================================================================
// Small self-contained mark figures for picture questions ("Co to za znak?").
// Deliberately label-free - the whole point is recognition.
// ============================================================================

/** Real photo shown above a weather question. File in /public/sternik/clouds. */
export function QuestionPhoto({ photo, alt }: { photo: string; alt?: string }) {
  return (
    <div
      className="mb-3 overflow-hidden rounded-xl"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      {/* plain img: served same-origin from public/, lazy, fixed aspect */}
      <img
        src={`/sternik/clouds/${photo}.jpg`}
        alt={alt || 'photo'}
        loading="lazy"
        className="block h-44 w-full object-cover sm:h-56"
      />
    </div>
  );
}

const BLACK = '#101418';
const YELLOW = '#ffd24a';
const RED = '#e33';
const GREEN = '#2c5';
const WHITE = '#f4f8fc';
const OUTLINE = 'rgba(127,127,127,0.55)';

function Pole({ stripes, topmarks }: { stripes: { fill: string; frac: number }[]; topmarks: ('up' | 'down')[] }) {
  const x = 60;
  const w = 20;
  const y0 = 46;
  const h = 58;
  let acc = 0;
  const cone = (dir: 'up' | 'down', cy: number) =>
    dir === 'up'
      ? `${x - 10},${cy + 8} ${x + 10},${cy + 8} ${x},${cy - 7}`
      : `${x - 10},${cy - 7} ${x + 10},${cy - 7} ${x},${cy + 8}`;
  return (
    <svg viewBox="0 0 120 130" className="h-28 w-auto">
      {/* waterline */}
      <line x1="8" y1="112" x2="112" y2="112" stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
      {stripes.map((s, i) => {
        const yy = y0 + acc * h;
        acc += s.frac;
        return <rect key={i} x={x - w / 2} y={yy} width={w} height={s.frac * h + 0.5} fill={s.fill} stroke={OUTLINE} strokeWidth="0.5" />;
      })}
      {topmarks.map((t, i) => (
        <polygon key={i} points={cone(t, 20 + i * 14)} fill={BLACK} stroke={WHITE} strokeWidth="0.8" />
      ))}
      <rect x={x - 1.5} y={104} width={3} height={8} fill={OUTLINE} />
    </svg>
  );
}

function BallsPole({ stripes, balls }: { stripes: { fill: string; frac: number }[]; balls: number }) {
  const x = 60;
  return (
    <svg viewBox="0 0 120 130" className="h-28 w-auto">
      <line x1="8" y1="112" x2="112" y2="112" stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
      {stripes.map((s, i) => {
        const h = 58;
        const y0 = 46;
        const acc = stripes.slice(0, i).reduce((a, ss) => a + ss.frac, 0);
        return <rect key={i} x={x - 10} y={y0 + acc * h} width={20} height={s.frac * h + 0.5} fill={s.fill} stroke={OUTLINE} strokeWidth="0.5" />;
      })}
      {Array.from({ length: balls }).map((_, i) => (
        <circle key={i} cx={x} cy={36 - i * 15} r={6.5} fill={balls === 1 ? RED : BLACK} stroke={WHITE} strokeWidth="0.8" />
      ))}
      <rect x={x - 1.5} y={104} width={3} height={8} fill={OUTLINE} />
    </svg>
  );
}

export default function QuestionFigure({ id }: { id: SternikFigureId }) {
  let inner: React.ReactNode = null;
  switch (id) {
    case 'cardinal-n':
      inner = <Pole stripes={[{ fill: BLACK, frac: 0.5 }, { fill: YELLOW, frac: 0.5 }]} topmarks={['up', 'up']} />;
      break;
    case 'cardinal-s':
      inner = <Pole stripes={[{ fill: YELLOW, frac: 0.5 }, { fill: BLACK, frac: 0.5 }]} topmarks={['down', 'down']} />;
      break;
    case 'cardinal-e':
      inner = <Pole stripes={[{ fill: BLACK, frac: 0.34 }, { fill: YELLOW, frac: 0.32 }, { fill: BLACK, frac: 0.34 }]} topmarks={['up', 'down']} />;
      break;
    case 'cardinal-w':
      inner = <Pole stripes={[{ fill: YELLOW, frac: 0.34 }, { fill: BLACK, frac: 0.32 }, { fill: YELLOW, frac: 0.34 }]} topmarks={['down', 'up']} />;
      break;
    case 'isolated-danger':
      inner = <BallsPole stripes={[{ fill: BLACK, frac: 0.35 }, { fill: RED, frac: 0.3 }, { fill: BLACK, frac: 0.35 }]} balls={2} />;
      break;
    case 'safe-water':
      inner = (
        <svg viewBox="0 0 120 130" className="h-28 w-auto">
          <line x1="8" y1="112" x2="112" y2="112" stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={50 + i * 5} y={46} width={5} height={58} fill={i % 2 === 0 ? RED : WHITE} stroke={OUTLINE} strokeWidth="0.4" />
          ))}
          <circle cx={60} cy={36} r={7} fill={RED} stroke={WHITE} strokeWidth="0.8" />
          <rect x={58.5} y={104} width={3} height={8} fill={OUTLINE} />
        </svg>
      );
      break;
    case 'lateral-red':
      inner = (
        <svg viewBox="0 0 120 130" className="h-28 w-auto">
          <line x1="8" y1="112" x2="112" y2="112" stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
          <rect x={42} y={58} width={36} height={34} rx={3} fill={RED} stroke={OUTLINE} strokeWidth="0.8" />
          <rect x={57} y={92} width={6} height={20} fill={OUTLINE} />
        </svg>
      );
      break;
    case 'lateral-green':
      inner = (
        <svg viewBox="0 0 120 130" className="h-28 w-auto">
          <line x1="8" y1="112" x2="112" y2="112" stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
          <polygon points="60,52 84,92 36,92" fill={GREEN} stroke={OUTLINE} strokeWidth="0.8" />
          <rect x={57} y={92} width={6} height={20} fill={OUTLINE} />
        </svg>
      );
      break;
    case 'flag-a':
      inner = (
        <svg viewBox="0 0 120 130" className="h-28 w-auto">
          <rect x={30} y={24} width={4} height={88} fill={OUTLINE} />
          {/* swallowtail: white hoist half, blue fly half with notch */}
          <polygon points="34,28 62,28 62,76 34,76" fill={WHITE} stroke={OUTLINE} strokeWidth="0.8" />
          <polygon points="62,28 94,28 80,52 94,76 62,76" fill="#1560d4" stroke={OUTLINE} strokeWidth="0.8" />
        </svg>
      );
      break;
  }
  return (
    <div
      className="mb-3 flex justify-center rounded-xl py-2"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      {inner}
    </div>
  );
}
