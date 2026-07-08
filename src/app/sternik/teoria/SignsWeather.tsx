'use client';

import type { ReactNode } from 'react';

// ============================================================================
// Visual reference libraries for the theory page: real navigation marks (IALA
// buoys + Polish inland tablice) and weather phenomena, drawn as accurate,
// theme-aware SVG so they render crisp on mobile and need no external images.
// ============================================================================

const BLACK = '#14181d';
const YELLOW = '#ffd23a';
const RED = '#e33b3b';
const GREEN = '#22bb55';
const WHITE = '#f6f9fc';
const BLUE = '#1f6fe0';
const OUTLINE = 'rgba(128,128,128,0.5)';

function Tile({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl p-3 text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex h-24 items-end justify-center">{children}</div>
      <div className="mt-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

// ---------------------------------------------------------------------------
// Buoy primitives
// ---------------------------------------------------------------------------

function ConeTop({ x, y, up = true }: { x: number; y: number; up?: boolean }) {
  return up
    ? <polygon points={`${x - 9},${y + 9} ${x + 9},${y + 9} ${x},${y - 8}`} fill={BLACK} stroke={WHITE} strokeWidth="0.6" />
    : <polygon points={`${x - 9},${y - 8} ${x + 9},${y - 8} ${x},${y + 9}`} fill={BLACK} stroke={WHITE} strokeWidth="0.6" />;
}
function Ball({ x, y, fill = BLACK }: { x: number; y: number; fill?: string }) {
  return <circle cx={x} cy={y} r={7.5} fill={fill} stroke={WHITE} strokeWidth="0.6" />;
}

/** Can (cylinder) buoy - lateral port in region A. */
function CanBuoy({ stripes }: { stripes: { fill: string; frac: number }[] }) {
  const x = 40, top = 34, w = 30, h = 46;
  let acc = 0;
  return (
    <svg viewBox="0 0 80 100" className="h-24 w-auto">
      {stripes.map((s, i) => { const yy = top + acc * h; acc += s.frac; return (
        <rect key={i} x={x - w / 2} y={yy} width={w} height={s.frac * h + 0.5} fill={s.fill} stroke={OUTLINE} strokeWidth="0.5" />
      ); })}
      <rect x={x - 2} y={top + h} width={4} height={12} fill={OUTLINE} />
      <line x1="14" y1={top + h + 12} x2="66" y2={top + h + 12} stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
    </svg>
  );
}
/** Cone buoy - lateral starboard in region A. */
function ConeBuoy({ stripes }: { stripes: { fill: string; frac: number }[] }) {
  const x = 40, top = 34, h = 46;
  // draw as a triangle split into horizontal color bands
  let acc = 0;
  const halfAt = (yy: number) => 15 * (1 - (yy - top) / h); // half-width shrinks to apex
  return (
    <svg viewBox="0 0 80 100" className="h-24 w-auto">
      {stripes.map((s, i) => {
        const y0 = top + acc * h; acc += s.frac; const y1 = top + acc * h;
        const w0 = halfAt(y0), w1 = halfAt(y1);
        return <polygon key={i} points={`${x - w0},${y0} ${x + w0},${y0} ${x + w1},${y1} ${x - w1},${y1}`} fill={s.fill} stroke={OUTLINE} strokeWidth="0.5" />;
      })}
      <rect x={x - 2} y={top + h} width={4} height={12} fill={OUTLINE} />
      <line x1="14" y1={top + h + 12} x2="66" y2={top + h + 12} stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
    </svg>
  );
}
/** Pillar/spar buoy with stripe stack + topmark, for cardinals/danger/safe. */
function Pillar({ stripes, top }: { stripes: { fill: string; frac: number }[]; top: ReactNode }) {
  const x = 40, y0 = 40, h = 44, w = 20;
  let acc = 0;
  return (
    <svg viewBox="0 0 80 100" className="h-24 w-auto">
      {top}
      {stripes.map((s, i) => { const yy = y0 + acc * h; acc += s.frac; return (
        <rect key={i} x={x - w / 2} y={yy} width={w} height={s.frac * h + 0.5} fill={s.fill} stroke={OUTLINE} strokeWidth="0.5" />
      ); })}
      <rect x={x - 2} y={y0 + h} width={4} height={10} fill={OUTLINE} />
      <line x1="14" y1={y0 + h + 10} x2="66" y2={y0 + h + 10} stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Inland tablica primitive
// ---------------------------------------------------------------------------

function Tablica({ kind, children }: { kind: 'zakaz' | 'nakaz' | 'ograniczenie' | 'info'; children: ReactNode }) {
  // zakaz/nakaz/ograniczenie = white ground + red border; info = blue ground.
  const blue = kind === 'info';
  return (
    <svg viewBox="0 0 90 90" className="h-24 w-auto">
      <rect x="10" y="10" width="70" height="70" rx="4" fill={blue ? BLUE : WHITE} stroke={blue ? OUTLINE : RED} strokeWidth={blue ? 2 : 6} />
      {children}
      {kind === 'zakaz' && <line x1="16" y1="74" x2="74" y2="16" stroke={RED} strokeWidth="5" />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// IALA marks gallery
// ---------------------------------------------------------------------------

export function IalaGallery() {
  return (
    <Grid>
      <Tile title="Lewa (port)" subtitle="czerwony walec / левая кромка">
        <CanBuoy stripes={[{ fill: RED, frac: 1 }]} />
      </Tile>
      <Tile title="Prawa (starboard)" subtitle="zielony stozek / правая кромка">
        <ConeBuoy stripes={[{ fill: GREEN, frac: 1 }]} />
      </Tile>
      <Tile title="Kardynalny N" subtitle="czarny/zolty, 2 stozki w gore">
        <Pillar stripes={[{ fill: BLACK, frac: 0.5 }, { fill: YELLOW, frac: 0.5 }]} top={<><ConeTop x={40} y={22} up /><ConeTop x={40} y={34} up /></>} />
      </Tile>
      <Tile title="Kardynalny E" subtitle="czarny-zolty-czarny, podstawami">
        <Pillar stripes={[{ fill: BLACK, frac: 0.34 }, { fill: YELLOW, frac: 0.32 }, { fill: BLACK, frac: 0.34 }]} top={<><ConeTop x={40} y={22} up /><ConeTop x={40} y={34} up={false} /></>} />
      </Tile>
      <Tile title="Kardynalny S" subtitle="zolty/czarny, 2 stozki w dol">
        <Pillar stripes={[{ fill: YELLOW, frac: 0.5 }, { fill: BLACK, frac: 0.5 }]} top={<><ConeTop x={40} y={22} up={false} /><ConeTop x={40} y={34} up={false} /></>} />
      </Tile>
      <Tile title="Kardynalny W" subtitle="zolty-czarny-zolty, wierzcholkami">
        <Pillar stripes={[{ fill: YELLOW, frac: 0.34 }, { fill: BLACK, frac: 0.32 }, { fill: YELLOW, frac: 0.34 }]} top={<><ConeTop x={40} y={22} up={false} /><ConeTop x={40} y={34} up /></>} />
      </Tile>
      <Tile title="Odosobnione niebezp." subtitle="czarno-czerwony, 2 czarne kule">
        <Pillar stripes={[{ fill: BLACK, frac: 0.38 }, { fill: RED, frac: 0.24 }, { fill: BLACK, frac: 0.38 }]} top={<><Ball x={40} y={22} /><Ball x={40} y={36} /></>} />
      </Tile>
      <Tile title="Bezpieczna woda" subtitle="czerwono-biale pasy, czerwona kula">
        <Pillar stripes={[{ fill: RED, frac: 0.25 }, { fill: WHITE, frac: 0.25 }, { fill: RED, frac: 0.25 }, { fill: WHITE, frac: 0.25 }]} top={<Ball x={40} y={30} fill={RED} />} />
      </Tile>
      <Tile title="Znak specjalny" subtitle="zolty, zolty krzyz X">
        <Pillar stripes={[{ fill: YELLOW, frac: 1 }]} top={<g><line x1="33" y1="23" x2="47" y2="37" stroke={YELLOW} strokeWidth="3" /><line x1="47" y1="23" x2="33" y2="37" stroke={YELLOW} strokeWidth="3" /><circle cx="40" cy="30" r="9" fill="none" stroke={YELLOW} strokeWidth="0.5" /></g>} />
      </Tile>
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Inland tablice gallery (real signs)
// ---------------------------------------------------------------------------

export function InlandSignsGallery() {
  return (
    <Grid>
      <Tile title="A.1 zakaz przejscia" subtitle="проход запрещён">
        <Tablica kind="zakaz"><rect x="24" y="40" width="42" height="10" fill={RED} /></Tablica>
      </Tile>
      <Tile title="A.5 zakaz postoju" subtitle="стоянка запрещена">
        <Tablica kind="zakaz"><text x="45" y="52" textAnchor="middle" fontSize="26" fontWeight="700" fill={RED}>P</text></Tablica>
      </Tile>
      <Tile title="A.6 zakaz kotwiczenia" subtitle="якорь запрещён">
        <Tablica kind="zakaz"><g stroke={RED} strokeWidth="3.5" fill="none"><line x1="45" y1="26" x2="45" y2="60" /><path d="M30 52 Q45 66 60 52" /><line x1="37" y1="33" x2="53" y2="33" /></g></Tablica>
      </Tile>
      <Tile title="A.9 zakaz falowania" subtitle="не создавать волну">
        <Tablica kind="zakaz"><g stroke={RED} strokeWidth="3" fill="none"><path d="M26 42 Q33 34 40 42 T54 42" /><path d="M26 54 Q33 46 40 54 T54 54" /></g></Tablica>
      </Tile>
      <Tile title="B.1 nakaz w prawo" subtitle="держись правой">
        <Tablica kind="nakaz"><path d="M30 45 L52 45 M46 38 L54 45 L46 52" stroke={BLACK} strokeWidth="4" fill="none" /></Tablica>
      </Tile>
      <Tile title="C.1 ograniczenie glebok." subtitle="ограничение (число)">
        <Tablica kind="ograniczenie"><g><path d="M28 34 L62 34" stroke={BLACK} strokeWidth="3" /><path d="M45 34 L45 48 M39 42 L45 48 L51 42" stroke={BLACK} strokeWidth="2.5" fill="none" /><text x="45" y="66" textAnchor="middle" fontSize="14" fontWeight="700" fill={BLACK}>2,0m</text></g></Tablica>
      </Tile>
      <Tile title="C.3 ograniczenie predk." subtitle="ограничение скорости">
        <Tablica kind="ograniczenie"><text x="45" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill={BLACK}>6</text></Tablica>
      </Tile>
      <Tile title="E.5 dozwolony postoj" subtitle="стоянка разрешена (синий)">
        <Tablica kind="info"><text x="45" y="55" textAnchor="middle" fontSize="26" fontWeight="700" fill={WHITE}>P</text></Tablica>
      </Tile>
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Weather gallery
// ---------------------------------------------------------------------------

function CloudBase({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 120 100" className="h-24 w-auto">{children}</svg>;
}

export function CloudsGallery() {
  return (
    <Grid>
      <Tile title="Cumulus" subtitle="куч. хорошей погоды">
        <CloudBase>
          <g fill="var(--text-secondary)" opacity="0.85">
            <circle cx="45" cy="55" r="16" /><circle cx="62" cy="48" r="20" /><circle cx="80" cy="56" r="15" />
            <rect x="43" y="55" width="40" height="16" />
          </g>
          <line x1="20" y1="82" x2="100" y2="82" stroke="var(--border-subtle)" strokeWidth="1.5" />
        </CloudBase>
      </Tile>
      <Tile title="Cumulonimbus" subtitle="гроза, шквалы, ливень">
        <CloudBase>
          <g fill="var(--text-secondary)" opacity="0.9">
            <path d="M30 30 Q40 14 60 20 Q66 8 84 16 Q100 18 96 34 L92 34 Q94 24 82 24 Q78 16 66 22 Q54 14 44 26 Q34 26 34 34 Z" />
            <rect x="46" y="30" width="30" height="42" />
            <circle cx="46" cy="60" r="14" /><circle cx="76" cy="60" r="14" />
          </g>
          <g stroke={YELLOW} strokeWidth="2.5" fill="none"><path d="M60 46 L54 60 L62 60 L56 74" /></g>
          <line x1="15" y1="84" x2="105" y2="84" stroke="var(--border-subtle)" strokeWidth="1.5" />
        </CloudBase>
      </Tile>
      <Tile title="Cirrus" subtitle="перистые, тёплый фронт идёт">
        <CloudBase>
          <g stroke="var(--text-secondary)" strokeWidth="2.5" fill="none" opacity="0.8" strokeLinecap="round">
            <path d="M24 34 Q50 26 72 32 Q60 34 78 40" /><path d="M34 50 Q58 42 84 48 Q72 50 90 56" /><path d="M28 66 Q52 60 74 64" />
          </g>
        </CloudBase>
      </Tile>
      <Tile title="Stratus / Nimbostratus" subtitle="слоистые, обложной дождь">
        <CloudBase>
          <g fill="var(--text-secondary)" opacity="0.75"><rect x="18" y="34" width="84" height="14" rx="7" /><rect x="24" y="50" width="72" height="12" rx="6" /></g>
          <g stroke={BLUE} strokeWidth="2" opacity="0.7"><line x1="34" y1="66" x2="30" y2="80" /><line x1="52" y1="66" x2="48" y2="80" /><line x1="70" y1="66" x2="66" y2="80" /><line x1="88" y1="66" x2="84" y2="80" /></g>
        </CloudBase>
      </Tile>
    </Grid>
  );
}

export function FrontsPressureGallery() {
  return (
    <Grid>
      <Tile title="Front cieply" subtitle="тёплый фронт (медленно)">
        <svg viewBox="0 0 120 90" className="h-24 w-auto">
          <path d="M18 60 Q50 40 102 54" fill="none" stroke={RED} strokeWidth="3" />
          <g fill={RED}><path d="M34 50 a6 6 0 0 1 12 1" /><path d="M58 46 a6 6 0 0 1 12 1" /><path d="M82 48 a6 6 0 0 1 12 1" /></g>
        </svg>
      </Tile>
      <Tile title="Front chlodny" subtitle="холодный фронт (шквалы)">
        <svg viewBox="0 0 120 90" className="h-24 w-auto">
          <path d="M18 60 Q50 40 102 54" fill="none" stroke={BLUE} strokeWidth="3" />
          <g fill={BLUE}><polygon points="34,49 40,39 46,50" /><polygon points="58,45 64,35 70,46" /><polygon points="82,47 88,37 94,48" /></g>
        </svg>
      </Tile>
      <Tile title="Wyz (H)" subtitle="антициклон, ясно, сухо">
        <svg viewBox="0 0 100 90" className="h-24 w-auto">
          <circle cx="50" cy="46" r="30" fill="none" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="3,3" />
          <text x="50" y="54" textAnchor="middle" fontSize="30" fontWeight="800" fill={BLUE}>W</text>
          <g stroke={BLUE} strokeWidth="1.5" fill="none" opacity="0.7"><path d="M50 12 A34 34 0 0 1 84 46" markerEnd="url(#hArr)" /></g>
          <defs><marker id="hArr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill={BLUE} /></marker></defs>
        </svg>
      </Tile>
      <Tile title="Niz (L)" subtitle="циклон, ветер, осадки">
        <svg viewBox="0 0 100 90" className="h-24 w-auto">
          <circle cx="50" cy="46" r="30" fill="none" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="3,3" />
          <text x="50" y="54" textAnchor="middle" fontSize="30" fontWeight="800" fill={RED}>N</text>
          <g stroke={RED} strokeWidth="1.5" fill="none" opacity="0.7"><path d="M84 46 A34 34 0 0 1 50 12" markerEnd="url(#lArr)" /></g>
          <defs><marker id="lArr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill={RED} /></marker></defs>
        </svg>
      </Tile>
    </Grid>
  );
}

export function BreezeGallery() {
  const Scene = ({ day }: { day: boolean }) => (
    <svg viewBox="0 0 140 90" className="h-24 w-auto">
      {/* sun/moon */}
      <circle cx={day ? 30 : 110} cy="20" r="9" fill={day ? YELLOW : 'var(--text-muted)'} />
      {/* land + water */}
      <rect x="0" y="60" width="70" height="30" fill="rgba(180,140,60,0.35)" />
      <rect x="70" y="60" width="70" height="30" fill="rgba(40,120,200,0.35)" />
      <text x="35" y="80" textAnchor="middle" fontSize="9" fill="var(--text-muted)">lad</text>
      <text x="105" y="80" textAnchor="middle" fontSize="9" fill="var(--text-muted)">woda</text>
      {/* breeze arrow: day water->land, night land->water */}
      <defs><marker id={day ? 'bd' : 'bn'} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><polygon points="0,0 7,3.5 0,7" fill="var(--accent-cyan)" /></marker></defs>
      {day
        ? <line x1="110" y1="46" x2="40" y2="46" stroke="var(--accent-cyan)" strokeWidth="2.5" markerEnd="url(#bd)" />
        : <line x1="40" y1="46" x2="110" y2="46" stroke="var(--accent-cyan)" strokeWidth="2.5" markerEnd="url(#bn)" />}
    </svg>
  );
  return (
    <Grid>
      <Tile title="Bryza dzienna" subtitle="день: с воды на сушу"><Scene day /></Tile>
      <Tile title="Bryza nocna" subtitle="ночь: с суши на воду"><Scene day={false} /></Tile>
    </Grid>
  );
}
