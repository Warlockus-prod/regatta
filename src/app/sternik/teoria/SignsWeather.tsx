'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { usePlOnlyOrHide } from '../plOnly';

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
  // Language policy: on non-RU site versions strip the RU half of a
  // "PL / RU" subtitle; a subtitle that is Russian-only is hidden.
  const plOnly = usePlOnlyOrHide();
  const sub = plOnly(subtitle);
  return (
    <div
      className="flex flex-col items-center rounded-xl p-3 text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex h-24 items-end justify-center">{children}</div>
      <div className="mt-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</div>
      {sub && <div className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

function stripeStart(stripes: { fill: string; frac: number }[], index: number) {
  return stripes.slice(0, index).reduce((sum, stripe) => sum + stripe.frac, 0);
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
  return (
    <svg viewBox="0 0 80 100" className="h-24 w-auto">
      {stripes.map((s, i) => {
        const yy = top + stripeStart(stripes, i) * h;
        return (
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
  const halfAt = (yy: number) => 15 * (1 - (yy - top) / h); // half-width shrinks to apex
  return (
    <svg viewBox="0 0 80 100" className="h-24 w-auto">
      {stripes.map((s, i) => {
        const start = stripeStart(stripes, i);
        const y0 = top + start * h;
        const y1 = top + (start + s.frac) * h;
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
  return (
    <svg viewBox="0 0 80 100" className="h-24 w-auto">
      {top}
      {stripes.map((s, i) => {
        const yy = y0 + stripeStart(stripes, i) * h;
        return (
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

function SignalPanel({ lights }: { lights: { x: number; y: number; fill: string; active?: boolean; r?: number }[] }) {
  return (
    <svg viewBox="0 0 90 90" className="h-24 w-auto">
      <rect x="31" y="9" width="28" height="58" rx="5" fill={BLACK} stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
      {lights.map((light, index) => (
        <circle
          key={index}
          cx={light.x}
          cy={light.y}
          r={light.r ?? 7}
          fill={light.active ? light.fill : 'rgba(255,255,255,0.18)'}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.8"
          opacity={light.active ? 1 : 0.42}
        />
      ))}
      <line x1="45" y1="67" x2="45" y2="82" stroke="var(--text-muted)" strokeWidth="2" />
      <line x1="28" y1="82" x2="62" y2="82" stroke="var(--text-muted)" strokeWidth="2" />
    </svg>
  );
}

function DredgerSideSignal({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 100 90" className="h-24 w-auto">
      <rect x="23" y="27" width="54" height="22" rx="4" fill="var(--bg-secondary)" stroke="var(--border-subtle)" />
      <rect x="39" y="49" width="22" height="9" fill="var(--bg-secondary)" stroke="var(--border-subtle)" />
      <line x1="50" y1="58" x2="50" y2="77" stroke="var(--text-muted)" strokeWidth="1.6" />
      <line x1="16" y1="77" x2="84" y2="77" stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4,4" opacity="0.65" />
      {open ? (
        <g fill={GREEN} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8">
          <polygon points="50,10 58,18 50,26 42,18" />
          <polygon points="50,58 58,66 50,74 42,66" />
        </g>
      ) : (
        <g fill={RED} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8">
          <circle cx="50" cy="18" r="8" />
          <circle cx="50" cy="66" r="8" />
        </g>
      )}
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
      <Tile title="A.2 zakaz wyprzedzania" subtitle="обгон запрещён">
        <Tablica kind="zakaz"><g stroke={BLACK} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M36 62 L36 34 M31 41 L36 34 L41 41" /><path d="M54 56 L54 28 M49 35 L54 28 L59 35" /></g></Tablica>
      </Tile>
      <Tile title="B.1 nakaz w prawo" subtitle="держись правой">
        <Tablica kind="nakaz"><path d="M30 45 L52 45 M46 38 L54 45 L46 52" stroke={BLACK} strokeWidth="4" fill="none" /></Tablica>
      </Tile>
      <Tile title="B.2 nakaz w lewo" subtitle="держись левой">
        <Tablica kind="nakaz"><path d="M60 45 L38 45 M44 38 L36 45 L44 52" stroke={BLACK} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Tablica>
      </Tile>
      <Tile title="C.1 ograniczenie glebok." subtitle="ограничение (число)">
        <Tablica kind="ograniczenie"><g><path d="M28 34 L62 34" stroke={BLACK} strokeWidth="3" /><path d="M45 34 L45 48 M39 42 L45 48 L51 42" stroke={BLACK} strokeWidth="2.5" fill="none" /><text x="45" y="66" textAnchor="middle" fontSize="14" fontWeight="700" fill={BLACK}>2,0m</text></g></Tablica>
      </Tile>
      <Tile title="C.3 ograniczenie predk." subtitle="ограничение скорости">
        <Tablica kind="ograniczenie"><text x="45" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill={BLACK}>6</text></Tablica>
      </Tile>
      <Tile title="C.2 ograniczenie wysokosci" subtitle="ограничение высоты (мост)">
        <Tablica kind="ograniczenie"><g fill={BLACK}><polygon points="35,24 55,24 45,38" /><polygon points="35,54 55,54 45,40" /></g><text x="45" y="72" textAnchor="middle" fontSize="13" fontWeight="700" fill={BLACK}>3,0m</text></Tablica>
      </Tile>
      <Tile title="C.4 ograniczenie szerokosci" subtitle="ограничение ширины">
        <Tablica kind="ograniczenie"><g fill={BLACK}><polygon points="22,32 22,56 38,44" /><polygon points="68,32 68,56 52,44" /></g><text x="45" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill={BLACK}>12m</text></Tablica>
      </Tile>
      <Tile title="E.5 dozwolony postoj" subtitle="стоянка разрешена (синий)">
        <Tablica kind="info"><text x="45" y="55" textAnchor="middle" fontSize="26" fontWeight="700" fill={WHITE}>P</text></Tablica>
      </Tile>
      <Tile title="E.6 dozwolone kotwiczenie" subtitle="якорь разрешён (синий)">
        <Tablica kind="info"><g stroke={WHITE} strokeWidth="3.5" fill="none" strokeLinecap="round"><circle cx="45" cy="26" r="3.5" /><line x1="45" y1="29" x2="45" y2="60" /><path d="M30 52 Q45 66 60 52" /><line x1="37" y1="34" x2="53" y2="34" /></g></Tablica>
      </Tile>
    </Grid>
  );
}

export function InlandLightSignalsGallery() {
  return (
    <Grid>
      <Tile title="Sluza: 2 czerwone" subtitle="stop, czekaj / стой">
        <SignalPanel lights={[
          { x: 45, y: 23, fill: RED, active: true },
          { x: 45, y: 41, fill: RED, active: true },
          { x: 45, y: 59, fill: GREEN },
        ]} />
      </Tile>
      <Tile title="Sluza: czerwone + zielone" subtitle="przygotuj sie / готовься">
        <SignalPanel lights={[
          { x: 45, y: 23, fill: RED, active: true },
          { x: 45, y: 41, fill: RED },
          { x: 45, y: 59, fill: GREEN, active: true },
        ]} />
      </Tile>
      <Tile title="Sluza: zielone" subtitle="mozesz wejsc / можно входить">
        <SignalPanel lights={[
          { x: 45, y: 23, fill: RED },
          { x: 45, y: 41, fill: RED },
          { x: 45, y: 59, fill: GREEN, active: true },
        ]} />
      </Tile>
      <Tile title="Przeszkoda: 2 zielone" subtitle="mijaj ta strona / проходи здесь">
        <DredgerSideSignal open />
      </Tile>
      <Tile title="Przeszkoda: czerwone" subtitle="strona zamknieta / закрыто">
        <DredgerSideSignal open={false} />
      </Tile>
      <Tile title="Most: zielone nad torem" subtitle="droga wolna / проход свободен">
        <SignalPanel lights={[
          { x: 36, y: 25, fill: GREEN, active: true, r: 6 },
          { x: 54, y: 25, fill: GREEN, active: true, r: 6 },
          { x: 36, y: 47, fill: RED, r: 6 },
          { x: 54, y: 47, fill: RED, r: 6 },
          { x: 45, y: 62, fill: GREEN, active: true, r: 5.5 },
        ]} />
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
      <Tile title="Cumulus" subtitle="chmura ladnej pogody / куч. хорошей погоды">
        <CloudBase>
          <g fill="var(--text-secondary)" opacity="0.85">
            <circle cx="45" cy="55" r="16" /><circle cx="62" cy="48" r="20" /><circle cx="80" cy="56" r="15" />
            <rect x="43" y="55" width="40" height="16" />
          </g>
          <line x1="20" y1="82" x2="100" y2="82" stroke="var(--border-subtle)" strokeWidth="1.5" />
        </CloudBase>
      </Tile>
      <Tile title="Cumulonimbus" subtitle="burza, szkwaly, ulewa / гроза, шквалы, ливень">
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
      <Tile title="Altocumulus" subtitle="baranki - zmiana pogody / «барашки», смена погоды">
        <CloudBase>
          <g fill="var(--text-secondary)" opacity="0.82">
            {[
              [28, 40, 7], [43, 36, 8], [58, 39, 6], [73, 35, 8], [90, 40, 7],
              [35, 56, 8], [52, 54, 7], [68, 57, 8], [86, 55, 7],
              [45, 72, 6], [62, 70, 7], [78, 73, 6],
            ].map(([cx, cy, r], index) => <circle key={index} cx={cx} cy={cy} r={r} />)}
          </g>
          <line x1="18" y1="84" x2="102" y2="84" stroke="var(--border-subtle)" strokeWidth="1.5" />
        </CloudBase>
      </Tile>
      <Tile title="Altostratus" subtitle="szara warstwa przed opadami / серая пелена перед осадками">
        <CloudBase>
          <circle cx="36" cy="36" r="10" fill={YELLOW} opacity="0.45" />
          <g fill="var(--text-secondary)" opacity="0.78">
            <rect x="18" y="35" width="84" height="16" rx="8" />
            <rect x="24" y="52" width="74" height="13" rx="6.5" opacity="0.88" />
            <rect x="36" y="67" width="54" height="10" rx="5" opacity="0.74" />
          </g>
        </CloudBase>
      </Tile>
      <Tile title="Cirrus" subtitle="pierzaste - idzie front cieply / перистые, тёплый фронт идёт">
        <CloudBase>
          <g stroke="var(--text-secondary)" strokeWidth="2.5" fill="none" opacity="0.8" strokeLinecap="round">
            <path d="M24 34 Q50 26 72 32 Q60 34 78 40" /><path d="M34 50 Q58 42 84 48 Q72 50 90 56" /><path d="M28 66 Q52 60 74 64" />
          </g>
        </CloudBase>
      </Tile>
      <Tile title="Stratus / Nimbostratus" subtitle="warstwowe - ciagly deszcz / слоистые, обложной дождь">
        <CloudBase>
          <g fill="var(--text-secondary)" opacity="0.75"><rect x="18" y="34" width="84" height="14" rx="7" /><rect x="24" y="50" width="72" height="12" rx="6" /></g>
          <g stroke={BLUE} strokeWidth="2" opacity="0.7"><line x1="34" y1="66" x2="30" y2="80" /><line x1="52" y1="66" x2="48" y2="80" /><line x1="70" y1="66" x2="66" y2="80" /><line x1="88" y1="66" x2="84" y2="80" /></g>
        </CloudBase>
      </Tile>
      <Tile title="Shelf cloud" subtitle="wal szkwalowy - do brzegu / вал шквала, к берегу">
        <CloudBase>
          <defs>
            <marker id="shelf-wind" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <polygon points="0,0 7,3.5 0,7" fill={RED} />
            </marker>
          </defs>
          <path d="M18 44 C34 30 58 30 76 38 C90 44 100 48 108 46 C94 64 60 70 24 60 Z" fill="var(--text-secondary)" opacity="0.86" />
          <path d="M22 56 C44 62 78 61 104 50" fill="none" stroke="var(--bg-primary)" strokeWidth="3" opacity="0.7" />
          <g stroke={BLUE} strokeWidth="1.8" opacity="0.62"><line x1="44" y1="66" x2="36" y2="82" /><line x1="62" y1="66" x2="54" y2="82" /><line x1="80" y1="64" x2="72" y2="82" /></g>
          <line x1="102" y1="78" x2="76" y2="78" stroke={RED} strokeWidth="2.2" markerEnd="url(#shelf-wind)" />
        </CloudBase>
      </Tile>
      <Tile title="Mgla" subtitle="widzialnosc - swiatla i sygnaly / видимость, огни и сигналы">
        <CloudBase>
          <g stroke="var(--text-secondary)" strokeWidth="4" opacity="0.72" strokeLinecap="round">
            <path d="M16 34 H104" /><path d="M24 48 H96" /><path d="M14 62 H108" /><path d="M28 76 H92" />
          </g>
          <path d="M50 70 L70 70 L66 78 L54 78 Z" fill={GREEN} opacity="0.85" stroke="rgba(0,0,0,0.35)" />
          <circle cx="60" cy="66" r="2.8" fill={WHITE} opacity="0.95" />
        </CloudBase>
      </Tile>
    </Grid>
  );
}

export function FrontsPressureGallery() {
  return (
    <Grid>
      <Tile title="Front cieply" subtitle="nadchodzi powoli / тёплый фронт (медленно)">
        <svg viewBox="0 0 120 90" className="h-24 w-auto">
          <path d="M18 60 Q50 40 102 54" fill="none" stroke={RED} strokeWidth="3" />
          <g fill={RED}><path d="M34 50 a6 6 0 0 1 12 1" /><path d="M58 46 a6 6 0 0 1 12 1" /><path d="M82 48 a6 6 0 0 1 12 1" /></g>
        </svg>
      </Tile>
      <Tile title="Front chlodny" subtitle="gwaltowny, szkwaly / холодный фронт (шквалы)">
        <svg viewBox="0 0 120 90" className="h-24 w-auto">
          <path d="M18 60 Q50 40 102 54" fill="none" stroke={BLUE} strokeWidth="3" />
          <g fill={BLUE}><polygon points="34,49 40,39 46,50" /><polygon points="58,45 64,35 70,46" /><polygon points="82,47 88,37 94,48" /></g>
        </svg>
      </Tile>
      <Tile title="Wyz (H)" subtitle="pogodnie i sucho / антициклон, ясно, сухо">
        <svg viewBox="0 0 100 90" className="h-24 w-auto">
          <circle cx="50" cy="46" r="30" fill="none" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="3,3" />
          <text x="50" y="54" textAnchor="middle" fontSize="30" fontWeight="800" fill={BLUE}>W</text>
          <g stroke={BLUE} strokeWidth="1.5" fill="none" opacity="0.7"><path d="M50 12 A34 34 0 0 1 84 46" markerEnd="url(#hArr)" /></g>
          <defs><marker id="hArr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill={BLUE} /></marker></defs>
        </svg>
      </Tile>
      <Tile title="Niz (L)" subtitle="wiatr i opady / циклон, ветер, осадки">
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

// ---------------------------------------------------------------------------
// Real cloud photos (open licenses; credited below). Reading the sky is a
// key on-water skill and the exam shows real weather photos.
// ---------------------------------------------------------------------------

const CLOUD_PHOTOS: { file: string; pl: string; ru: string; danger?: boolean }[] = [
  { file: 'cumulus', pl: 'Cumulus - ladna pogoda', ru: 'кучевые: хорошая погода' },
  { file: 'cirrus', pl: 'Cirrus - nadchodzi front cieply', ru: 'перистые: идёт тёплый фронт' },
  { file: 'altocumulus', pl: 'Altocumulus - zmiana pogody w ciagu doby', ru: '«барашки»: смена погоды за сутки' },
  { file: 'stratus', pl: 'Stratus - mzawka, slaba widocznosc', ru: 'слоистые: морось, плохая видимость' },
  { file: 'nimbostratus', pl: 'Nimbostratus - ciagly deszcz', ru: 'слоисто-дождевые: обложной дождь' },
  { file: 'cumulonimbus', pl: 'Cumulonimbus - burza i szkwaly', ru: 'кучево-дождевые: гроза и шквалы', danger: true },
  { file: 'shelf', pl: 'Shelf cloud - nadchodzi szkwal, wracaj', ru: 'вал шквала: к берегу немедленно', danger: true },
  { file: 'fog', pl: 'Mgla - ograniczona widzialnosc', ru: 'туман: включи огни и сигналы' },
];

// ---------------------------------------------------------------------------
// Cloud tiers infographic: which clouds live at which altitude (a common exam
// question - "chmury niskiego pietra to..."). Vertical altitude scale.
// ---------------------------------------------------------------------------

function Puff({ x, y, s = 1, fill = '#e9eef4' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} fill={fill} opacity="0.95">
      <circle cx="0" cy="4" r="9" />
      <circle cx="12" cy="0" r="12" />
      <circle cx="26" cy="4" r="9" />
      <rect x="-2" y="4" width="30" height="10" rx="4" />
    </g>
  );
}

export function CloudTiers() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  const W = 360, H = 430;
  const groundY = 392;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto" style={{ minWidth: 320, maxWidth: 460, width: '100%' }}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b5c96" />
            <stop offset="0.55" stopColor="#5b8fc9" />
            <stop offset="1" stopColor="#a9cdec" />
          </linearGradient>
        </defs>
        <rect x="20" y="8" width={W - 28} height={groundY - 8} rx="8" fill="url(#sky)" />
        {/* tier boundaries */}
        <line x1="20" y1="150" x2={W - 8} y2="150" stroke="#fff" strokeWidth="1" strokeDasharray="5,4" opacity="0.6" />
        <line x1="20" y1="270" x2={W - 8} y2="270" stroke="#fff" strokeWidth="1" strokeDasharray="5,4" opacity="0.6" />
        {/* altitude axis labels (left) */}
        <text x="8" y="20" fontSize="9" fill="var(--text-muted)">km</text>
        <text x="6" y="153" fontSize="9" fill="var(--text-secondary)">6</text>
        <text x="6" y="273" fontSize="9" fill="var(--text-secondary)">2</text>
        <text x="6" y="392" fontSize="9" fill="var(--text-secondary)">0</text>

        {/* HIGH tier (>6 km) */}
        <text x="30" y="30" fontSize="11" fontWeight="700" fill="#fff">Wysokie pietro (&gt; 6 km)</text>
        {ruOn && (
          <text x="30" y="43" fontSize="9" fill="#dbe8f5">высокий ярус</text>
        )}
        <g stroke="#eef4fa" strokeWidth="2.4" fill="none" opacity="0.9" strokeLinecap="round">
          <path d="M40 66 Q70 58 96 64 Q78 66 104 72" />
          <path d="M120 60 Q150 52 178 58" />
        </g>
        <Puff x={210} y={70} s={0.5} />
        <Puff x={260} y={64} s={0.45} />
        <text x="40" y="96" fontSize="9" fill="#fff">Cirrus, Cirrostratus, Cirrocumulus</text>
        {ruOn && (
          <text x="40" y="108" fontSize="8.5" fill="#dbe8f5">перистые</text>
        )}

        {/* MID tier (2-6 km) */}
        <text x="30" y="172" fontSize="11" fontWeight="700" fill="#fff">Srednie pietro (2-6 km)</text>
        {ruOn && (
          <text x="30" y="185" fontSize="9" fill="#eef4fa">средний ярус</text>
        )}
        <Puff x={44} y={205} s={0.7} />
        <Puff x={120} y={210} s={0.7} />
        <rect x="180" y="200" width="120" height="12" rx="6" fill="#e9eef4" opacity="0.85" />
        <rect x="196" y="216" width="90" height="10" rx="5" fill="#e9eef4" opacity="0.8" />
        <text x="40" y="248" fontSize="9" fill="#fff">Altostratus, Altocumulus</text>
        {ruOn && (
          <text x="40" y="260" fontSize="8.5" fill="#eef4fa">высоко-слоистые / -кучевые</text>
        )}

        {/* LOW tier (<2 km) */}
        <text x="30" y="290" fontSize="11" fontWeight="700" fill="#fff">Niskie pietro (&lt; 2 km)</text>
        {ruOn && (
          <text x="30" y="303" fontSize="9" fill="#f6fafd">низкий ярус</text>
        )}
        <rect x="34" y="312" width="150" height="16" rx="7" fill="#cfd8e2" opacity="0.9" />
        <rect x="40" y="330" width="130" height="12" rx="6" fill="#c3cdd8" opacity="0.85" />
        <Puff x={210} y={330} s={0.7} fill="#cfd8e2" />
        <text x="34" y="360" fontSize="9" fill="#fff">Stratus, Stratocumulus, Nimbostratus</text>
        {ruOn && (
          <text x="34" y="372" fontSize="8.5" fill="#f6fafd">слоистые / слоисто-дождевые</text>
        )}

        {/* VERTICAL development - Cumulonimbus tower spanning tiers (right side) */}
        <g opacity="0.95">
          <path d="M300 70 Q330 66 344 82 L344 96 Q328 88 306 92 Z" fill="#f2f6fb" />
          <rect x="308" y="88" width="30" height="250" fill="#e3e9f0" />
          <circle cx="308" cy="330" r="16" fill="#cfd8e2" />
          <circle cx="340" cy="330" r="16" fill="#cfd8e2" />
        </g>
        <text x="352" y="210" fontSize="9" fill="#fff" transform="rotate(90 352 210)">Cumulonimbus</text>

        {/* ground / water */}
        <rect x="20" y={groundY} width={W - 28} height={H - groundY - 4} rx="6" fill="rgba(40,120,200,0.5)" />
        <text x={W / 2} y={groundY + 22} textAnchor="middle" fontSize="9" fill="#eaf3fb">{ruOn ? 'woda / вода' : 'woda'}</text>
      </svg>
    </div>
  );
}

export function CloudPhotos() {
  // Language policy: the RU caption line shows only on the RU site version.
  const plOnly = usePlOnlyOrHide();
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CLOUD_PHOTOS.map((c) => (
          <figure
            key={c.file}
            className="overflow-hidden rounded-xl"
            style={{ background: 'var(--bg-card)', border: `1px solid ${c.danger ? 'rgba(227,59,59,0.5)' : 'var(--border-subtle)'}` }}
          >
            <img
              src={`/sternik/clouds/${c.file}.jpg`}
              alt={c.pl}
              loading="lazy"
              className="block h-28 w-full object-cover sm:h-32"
            />
            <figcaption className="px-2 py-1.5">
              <div className="text-xs font-semibold" style={{ color: c.danger ? RED : 'var(--text-primary)' }}>{c.pl}</div>
              {plOnly(c.ru) && <div className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{plOnly(c.ru)}</div>}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Zdjecia: Wikimedia Commons - Kamil Nowacki, W.carter, Medium69, GerritR, Simon Eugster, A.O Mapping, Ken Lund (CC0 / CC BY / CC BY-SA).
      </p>
    </div>
  );
}

function BreezeScene({ day }: { day: boolean }) {
  return (
    <svg viewBox="0 0 140 90" className="h-24 w-auto">
      {/* sun/moon */}
      <circle cx={day ? 30 : 110} cy="20" r="9" fill={day ? YELLOW : 'var(--text-muted)'} />
      {/* land + water */}
      <rect x="0" y="60" width="70" height="30" fill="rgba(180,140,60,0.35)" />
      <rect x="70" y="60" width="70" height="30" fill="rgba(40,120,200,0.35)" />
      <text x="35" y="80" textAnchor="middle" fontSize="9" fill="var(--text-muted)">lad</text>
      <text x="105" y="80" textAnchor="middle" fontSize="9" fill="var(--text-muted)">woda</text>
      {/* breeze arrow: day water to land, night land to water */}
      <defs><marker id={day ? 'bd' : 'bn'} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><polygon points="0,0 7,3.5 0,7" fill="var(--accent-cyan)" /></marker></defs>
      {day
        ? <line x1="110" y1="46" x2="40" y2="46" stroke="var(--accent-cyan)" strokeWidth="2.5" markerEnd="url(#bd)" />
        : <line x1="40" y1="46" x2="110" y2="46" stroke="var(--accent-cyan)" strokeWidth="2.5" markerEnd="url(#bn)" />}
    </svg>
  );
}

export function BreezeGallery() {
  return (
    <Grid>
      <Tile title="Bryza dzienna" subtitle="dzien: znad wody na lad / день: с воды на сушу"><BreezeScene day /></Tile>
      <Tile title="Bryza nocna" subtitle="noc: z ladu nad wode / ночь: с суши на воду"><BreezeScene day={false} /></Tile>
    </Grid>
  );
}
