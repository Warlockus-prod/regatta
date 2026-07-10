'use client';

import { useI18n } from '@/lib/i18n';

// ============================================================================
// SVG diagrams for the sternik theory page. Labels are PL + RU by design
// (exam-content language policy), theme-aware via CSS vars. Language policy:
// the RU halves render only when the site language is 'ru'.
// ============================================================================

const GREEN = '#44ff88';
const RED = '#ff5566';
const YELLOW = '#ffd24a';
const BLACK = '#101418';
const WHITE = '#f4f8fc';
const CYAN = 'var(--accent-cyan)';
const TXT = 'var(--text-secondary)';
const TXT2 = 'var(--text-muted)';

function Boat({
  x, y, rot = 0, color = GREEN, scale = 1,
}: { x: number; y: number; rot?: number; color?: string; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${scale})`}>
      <path
        d="M0,-16 C7,-9 8,4 5,13 L-5,13 C-8,4 -7,-9 0,-16 Z"
        fill={color}
        opacity="0.92"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.8"
      />
      <path d="M-3.5,-2 L3.5,-2 L2.5,4 L-2.5,4 Z" fill="rgba(0,0,0,0.3)" />
    </g>
  );
}

function ArrowDef({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
      <polygon points="0,0 7,3.5 0,7" fill={color} />
    </marker>
  );
}

// --------------------------------------------------------------- Przepisy ---

export function CrossingDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 220 170" className="h-auto w-full">
      <defs>
        <ArrowDef id="cx-g" color={GREEN} />
        <ArrowDef id="cx-r" color={RED} />
      </defs>
      <text x="110" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Kursy przecinajace sie</text>
      {/* give-way boat: heading east, sees the other to starboard */}
      <Boat x={45} y={95} rot={90} color={RED} />
      <line x1="60" y1="95" x2="110" y2="95" stroke={RED} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#cx-r)" />
      <text x="45" y="125" textAnchor="middle" fontSize="9" fill={RED}>USTEPUJE</text>
      <text x="45" y="136" textAnchor="middle" fontSize="8" fill={TXT2}>masz go z PRAWEJ</text>
      {ruOn && (
        <text x="45" y="146" textAnchor="middle" fontSize="8" fill={TXT2}>уступаешь</text>
      )}
      {/* stand-on boat: heading north */}
      <Boat x={150} y={120} rot={0} color={GREEN} />
      <line x1="150" y1="103" x2="150" y2="60" stroke={GREEN} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#cx-g)" />
      <text x="150" y="150" textAnchor="middle" fontSize="9" fill={GREEN}>PIERWSZENSTWO</text>
      {ruOn && (
        <text x="150" y="160" textAnchor="middle" fontSize="8" fill={TXT2}>приоритет</text>
      )}
      <circle cx="150" cy="95" r="4" fill="none" stroke={YELLOW} strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  );
}

export function HeadOnDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 220 170" className="h-auto w-full">
      <defs><ArrowDef id="ho" color={CYAN as string} /></defs>
      <text x="110" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Kurs wprost na siebie</text>
      <Boat x={80} y={135} rot={0} color={GREEN} />
      <path d="M 80 118 C 80 90 100 80 112 70" fill="none" stroke={GREEN} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#ho)" />
      <Boat x={140} y={50} rot={180} color={GREEN} />
      <path d="M 140 67 C 140 95 120 105 108 115" fill="none" stroke={GREEN} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#ho)" />
      <text x="110" y="152" textAnchor="middle" fontSize="9" fill={TXT}>oba w PRAWO - mijanie lewymi burtami</text>
      {ruOn && (
        <text x="110" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>оба вправо, расходятся левыми бортами</text>
      )}
    </svg>
  );
}

export function OvertakingDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 220 170" className="h-auto w-full">
      <defs><ArrowDef id="ov" color={RED} /></defs>
      <text x="110" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Wyprzedzanie</text>
      <Boat x={120} y={55} rot={0} color={GREEN} />
      <text x="158" y="58" fontSize="9" fill={GREEN}>wyprzedzany</text>
      {ruOn && (
        <text x="158" y="69" fontSize="8" fill={TXT2}>приоритет</text>
      )}
      <Boat x={95} y={125} rot={0} color={RED} />
      <path d="M 95 108 C 95 90 80 78 85 62" fill="none" stroke={RED} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#ov)" />
      <text x="110" y="152" textAnchor="middle" fontSize="9" fill={RED}>wyprzedzajacy ustepuje</text>
      {ruOn && (
        <text x="110" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>обгоняющий держится в стороне</text>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------- Swiatla ---

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  // 0 deg = bow (up), positive clockwise
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function Sector({
  cx, cy, r, from, to, fill, opacity = 0.3,
}: { cx: number; cy: number; r: number; from: number; to: number; fill: string; opacity?: number }) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return (
    <path
      d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
      fill={fill}
      opacity={opacity}
      stroke={fill}
      strokeWidth="0.6"
    />
  );
}

export function LightSectorsDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  const cx = 150; const cy = 120; const r = 92;
  return (
    <svg viewBox="0 0 300 240" className="h-auto w-full">
      {/* starboard green 112.5 from bow clockwise */}
      <Sector cx={cx} cy={cy} r={r} from={0} to={112.5} fill={GREEN} />
      {/* port red 112.5 counterclockwise */}
      <Sector cx={cx} cy={cy} r={r} from={-112.5} to={0} fill={RED} />
      {/* stern white 135 */}
      <Sector cx={cx} cy={cy} r={r * 0.62} from={112.5} to={247.5} fill={WHITE} opacity={0.22} />
      <Boat x={cx} y={cy} rot={0} color="#8ba7b8" scale={1.6} />
      <text x={cx} y={16} textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>DZIOB (nos) - widok z gory</text>
      <text x={cx + 78} y={70} textAnchor="middle" fontSize="9" fill={GREEN}>zielone 112,5</text>
      <text x={cx + 78} y={81} textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'sterburta / прав. борт' : 'sterburta'}</text>
      <text x={cx - 78} y={70} textAnchor="middle" fontSize="9" fill={RED}>czerwone 112,5</text>
      <text x={cx - 78} y={81} textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'bakburta / лев. борт' : 'bakburta'}</text>
      <text x={cx} y={cy + 78} textAnchor="middle" fontSize="9" fill={TXT}>rufowe biale 135</text>
      {ruOn && (
        <text x={cx} y={cy + 90} textAnchor="middle" fontSize="8" fill={TXT2}>кормовой белый</text>
      )}
      <text x={cx} y={230} textAnchor="middle" fontSize="8.5" fill={TXT2}>masztowe (topowe) biale 225 = 2 x 112,5 z przodu · 112,5 + 112,5 + 135 = 360</text>
    </svg>
  );
}

// ------------------------------------------------------------------- Znaki ---

export function LateralMarksDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 300 200" className="h-auto w-full">
      <defs><ArrowDef id="lat" color={CYAN as string} /></defs>
      {/* fairway */}
      <path d="M 90 190 L 120 20" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="6,5" fill="none" />
      <path d="M 210 190 L 180 20" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="6,5" fill="none" />
      <line x1="150" y1="165" x2="150" y2="45" stroke={CYAN} strokeWidth="1.2" strokeDasharray="3,4" markerEnd="url(#lat)" />
      <text x="150" y="34" textAnchor="middle" fontSize="9" fill={CYAN}>{ruOn ? 'kierunek od morza / вход с моря' : 'kierunek od morza'}</text>
      {/* red can - left */}
      <rect x="88" y="96" width="22" height="22" rx="2" fill={RED} stroke="rgba(0,0,0,0.35)" />
      <line x1="99" y1="118" x2="99" y2="132" stroke={TXT2} strokeWidth="1" />
      <text x="99" y="148" textAnchor="middle" fontSize="9" fontWeight="700" fill={RED}>LEWA</text>
      <text x="99" y="159" textAnchor="middle" fontSize="8" fill={TXT2}>czerwony walec</text>
      {ruOn && (
        <text x="99" y="169" textAnchor="middle" fontSize="8" fill={TXT2}>красная «банка»</text>
      )}
      {/* green cone - right */}
      <polygon points="201,96 213,120 189,120" fill={GREEN} stroke="rgba(0,0,0,0.35)" />
      <line x1="201" y1="120" x2="201" y2="132" stroke={TXT2} strokeWidth="1" />
      <text x="201" y="148" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN}>PRAWA</text>
      <text x="201" y="159" textAnchor="middle" fontSize="8" fill={TXT2}>zielony stozek</text>
      {ruOn && (
        <text x="201" y="169" textAnchor="middle" fontSize="8" fill={TXT2}>зелёный конус</text>
      )}
      <Boat x={150} y={180} rot={0} color="#8ba7b8" />
      <text x="150" y="196" textAnchor="middle" fontSize="8.5" fill={TXT2}>{ruOn ? 'tor wodny / фарватер · IALA region A' : 'tor wodny · IALA region A'}</text>
    </svg>
  );
}

function CardinalPole({
  x, y, type,
}: { x: number; y: number; type: 'N' | 'E' | 'S' | 'W' }) {
  // stripe stacks per IALA + topmark cones
  const w = 12; const h = 34;
  const stripes: { fill: string; frac: number }[] =
    type === 'N' ? [{ fill: BLACK, frac: 0.5 }, { fill: YELLOW, frac: 0.5 }]
    : type === 'S' ? [{ fill: YELLOW, frac: 0.5 }, { fill: BLACK, frac: 0.5 }]
    : type === 'E' ? [{ fill: BLACK, frac: 0.34 }, { fill: YELLOW, frac: 0.32 }, { fill: BLACK, frac: 0.34 }]
    : [{ fill: YELLOW, frac: 0.34 }, { fill: BLACK, frac: 0.32 }, { fill: YELLOW, frac: 0.34 }];
  let acc = 0;
  const up = (cy: number) => `${x - 6},${cy + 5} ${x + 6},${cy + 5} ${x},${cy - 4}`;
  const down = (cy: number) => `${x - 6},${cy - 4} ${x + 6},${cy - 4} ${x},${cy + 5}`;
  return (
    <g>
      {stripes.map((s, i) => {
        const yy = y + acc * h;
        acc += s.frac;
        return (
          <rect key={i} x={x - w / 2} y={yy} width={w} height={s.frac * h + 0.5} fill={s.fill}
            stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        );
      })}
      {/* topmarks */}
      {type === 'N' && (<><polygon points={up(y - 20)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /><polygon points={up(y - 8)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /></>)}
      {type === 'S' && (<><polygon points={down(y - 20)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /><polygon points={down(y - 8)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /></>)}
      {type === 'E' && (<><polygon points={up(y - 20)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /><polygon points={down(y - 8)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /></>)}
      {type === 'W' && (<><polygon points={down(y - 20)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /><polygon points={up(y - 8)} fill={BLACK} stroke={WHITE} strokeWidth="0.5" /></>)}
    </g>
  );
}

/**
 * One cardinal station stacked vertically from a top y:
 * label (outer) -> topmark cones -> striped pole -> light rhythm caption.
 * labelBelow flips the label under the pole (used for the S station so its
 * text points outward, downward).
 */
function CardinalStation({
  cx, top, type, label, rhythm, labelBelow = false,
}: { cx: number; top: number; type: 'N' | 'E' | 'S' | 'W'; label: string; rhythm: string; labelBelow?: boolean }) {
  const poleY = top + (labelBelow ? 4 : 30);      // where the striped pole begins
  const poleBottom = poleY + 34;
  return (
    <g>
      {!labelBelow && (
        <text x={cx} y={top} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)">{label}</text>
      )}
      <CardinalPole x={cx} y={poleY} type={type} />
      {labelBelow ? (
        <>
          <text x={cx} y={poleBottom + 16} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)">{label}</text>
          <text x={cx} y={poleBottom + 30} textAnchor="middle" fontSize="8.5" fill={TXT2}>{rhythm}</text>
        </>
      ) : (
        <text x={cx} y={poleBottom + 14} textAnchor="middle" fontSize="8.5" fill={TXT2}>{rhythm}</text>
      )}
    </g>
  );
}

export function CardinalClockDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  const CX = 180, CY = 190, R = 30;
  return (
    <svg viewBox="0 0 360 380" className="h-auto w-full" style={{ maxWidth: 440, margin: '0 auto', display: 'block' }}>
      <defs><ArrowDef id="card" color={GREEN} /></defs>
      {/* safe-water arrows in the 4 diagonal gaps, pointing outward (away from danger) */}
      <path d={`M ${CX + 22} ${CY - 22} L ${CX + 66} ${CY - 66}`} stroke={GREEN} strokeWidth="2" markerEnd="url(#card)" opacity="0.7" />
      <path d={`M ${CX + 22} ${CY + 22} L ${CX + 66} ${CY + 66}`} stroke={GREEN} strokeWidth="2" markerEnd="url(#card)" opacity="0.7" />
      <path d={`M ${CX - 22} ${CY + 22} L ${CX - 66} ${CY + 66}`} stroke={GREEN} strokeWidth="2" markerEnd="url(#card)" opacity="0.7" />
      <path d={`M ${CX - 22} ${CY - 22} L ${CX - 66} ${CY - 66}`} stroke={GREEN} strokeWidth="2" markerEnd="url(#card)" opacity="0.7" />
      {/* danger in the middle */}
      <circle cx={CX} cy={CY} r={R} fill="rgba(255,85,102,0.18)" stroke={RED} strokeWidth="1.2" strokeDasharray="4,3" />
      <text x={CX} y={CY - 3} textAnchor="middle" fontSize="9.5" fill={RED}>mielizna</text>
      {ruOn && (
        <text x={CX} y={CY + 9} textAnchor="middle" fontSize="8.5" fill={RED}>опасность</text>
      )}
      {/* stations */}
      <CardinalStation cx={CX} top={20} type="N" label="N · 12:00" rhythm={ruOn ? 'Q ciagle / непрерывно' : 'Q ciagle'} />
      <CardinalStation cx={320} top={128} type="E" label="E · 3:00" rhythm="VQ(3) - 3 blyski" />
      <CardinalStation cx={40} top={128} type="W" label="W · 9:00" rhythm="VQ(9) - 9 blyskow" />
      <CardinalStation cx={CX} top={262} type="S" label="S · 6:00" rhythm="VQ(6) + 1 dlugi" labelBelow />
    </svg>
  );
}

export function NabieznikDiagram() {
  return (
    <svg viewBox="0 0 320 180" className="h-auto w-full">
      <defs><ArrowDef id="nab" color={YELLOW} /></defs>
      {/* left: on axis */}
      <text x="80" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill={GREEN}>Na osi ✓</text>
      <polygon points="80,32 74,44 86,44" fill={RED} />
      <rect x="78.5" y="44" width="3" height="14" fill={TXT2} />
      <polygon points="80,60 75,70 85,70" fill={RED} />
      <rect x="79" y="70" width="2" height="10" fill={TXT2} />
      <line x1="80" y1="84" x2="80" y2="150" stroke={GREEN} strokeWidth="1" strokeDasharray="3,3" />
      <Boat x={80} y={150} rot={0} color={GREEN} />
      <text x="80" y="174" textAnchor="middle" fontSize="8" fill={TXT2}>znaki w jednej linii = na osi</text>
      {/* right: off axis */}
      <text x="240" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill={YELLOW}>Zejscie z osi</text>
      <polygon points="256,32 250,44 262,44" fill={RED} />
      <rect x="254.5" y="44" width="3" height="14" fill={TXT2} />
      <polygon points="228,60 223,70 233,70" fill={RED} />
      <rect x="227" y="70" width="2" height="10" fill={TXT2} />
      <Boat x={222} y={150} rot={12} color={YELLOW} />
      <path d="M 218 134 Q 224 100 228 82" fill="none" stroke={YELLOW} strokeWidth="1.3" strokeDasharray="4,3" markerEnd="url(#nab)" />
      <text x="240" y="174" textAnchor="middle" fontSize="8" fill={TXT2}>znaki rozjechane - wyrownaj (wyzszy nad nizszym)</text>
    </svg>
  );
}

export function RiverDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 320 190" className="h-auto w-full">
      <defs>
        <ArrowDef id="riv-c" color={CYAN as string} />
        <ArrowDef id="riv-g" color={GREEN} />
        <ArrowDef id="riv-r" color="#8ba7b8" />
      </defs>
      {/* banks */}
      <path d="M 20 40 C 100 20 220 60 300 38" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
      <path d="M 20 150 C 100 130 220 170 300 148" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
      {/* current */}
      <line x1="60" y1="95" x2="130" y2="95" stroke={CYAN} strokeWidth="1.4" markerEnd="url(#riv-c)" />
      <text x="95" y="86" textAnchor="middle" fontSize="9" fill={CYAN}>{ruOn ? 'prad / течение' : 'prad'}</text>
      {/* downstream boat */}
      <Boat x={200} y={70} rot={95} color={GREEN} />
      <line x1="216" y1="72" x2="258" y2="76" stroke={GREEN} strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#riv-g)" />
      <text x="228" y="56" textAnchor="middle" fontSize="9" fill={GREEN}>z pradem = PIERWSZENSTWO</text>
      {/* upstream boat */}
      <Boat x={200} y={125} rot={-85} color="#8ba7b8" />
      <line x1="184" y1="123" x2="142" y2="119" stroke="#8ba7b8" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#riv-r)" />
      <text x="196" y="148" textAnchor="middle" fontSize="9" fill={TXT}>pod prad - ustepuje</text>
      <text x="160" y="172" textAnchor="middle" fontSize="8.5" fill={TXT2}>{ruOn ? 'trzymaj sie PRAWEJ strony szlaku · mijanie lewymi burtami · идущий вниз имеет приоритет' : 'trzymaj sie PRAWEJ strony szlaku · mijanie lewymi burtami'}</text>
    </svg>
  );
}

export function RiverBendDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full">
      <defs>
        <ArrowDef id="rb-c" color={CYAN as string} />
        <ArrowDef id="rb-g" color={GREEN} />
        <pattern id="rb-sand" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="3" y1="0" x2="3" y2="6" stroke={YELLOW} strokeWidth="1" opacity="0.55" />
        </pattern>
      </defs>
      <text x="160" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>{ruOn ? 'Zakret rzeki / поворот реки' : 'Zakret rzeki'}</text>
      {/* water channel between the two banks */}
      <path d="M 20 62 C 120 62 160 122 300 122 L 300 168 C 150 168 110 108 20 108 Z" fill="rgba(93,170,210,0.14)" />
      {/* inner (convex) bank - top: shallow, deposits */}
      <path d="M 20 62 C 120 62 160 122 300 122" fill="none" stroke="var(--border-subtle)" strokeWidth="2" />
      {/* outer (concave) bank - bottom: deep, fast current */}
      <path d="M 20 108 C 110 108 150 168 300 168" fill="none" stroke="var(--border-subtle)" strokeWidth="2" />
      {/* sandbar hugging the inner bank */}
      <path d="M 118 72 C 152 74 172 102 214 110 C 172 118 140 100 116 90 Z" fill="url(#rb-sand)" stroke={YELLOW} strokeWidth="0.6" opacity="0.9" />
      <text x="150" y="98" textAnchor="middle" fontSize="8" fill={YELLOW}>{ruOn ? 'plycizna / отмель' : 'plycizna'}</text>
      {/* current: stronger, concentrated near the outer bank */}
      <path d="M 55 94 C 130 94 150 150 252 150" fill="none" stroke={CYAN} strokeWidth="1.7" markerEnd="url(#rb-c)" />
      <path d="M 62 82 C 128 82 150 132 236 132" fill="none" stroke={CYAN} strokeWidth="0.9" opacity="0.55" markerEnd="url(#rb-c)" />
      <text x="92" y="126" textAnchor="middle" fontSize="8" fill={CYAN}>{ruOn ? 'prad / течение' : 'prad'}</text>
      {/* boat holding the fairway */}
      <Boat x={205} y={140} rot={80} color={GREEN} scale={0.9} />
      <line x1="220" y1="143" x2="260" y2="146" stroke={GREEN} strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#rb-g)" />
      <text x="118" y="52" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'brzeg wypukly - plytko / выпуклый' : 'brzeg wypukly - plytko'}</text>
      <text x="250" y="188" textAnchor="middle" fontSize="8" fill={TXT2}>brzeg wklesly - gleboko, szybki prad</text>
    </svg>
  );
}

export function BridgeClearanceDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 340 210" className="h-auto w-full">
      <defs>
        <ArrowDef id="bc-h" color={YELLOW} />
        <ArrowDef id="bc-w" color={CYAN as string} />
      </defs>
      <text x="170" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Most - wysokosc i szerokosc przejscia</text>

      {/* bridge structure */}
      <rect x="34" y="48" width="272" height="18" rx="4" fill="var(--bg-secondary)" stroke="var(--border-subtle)" />
      <rect x="48" y="66" width="26" height="96" fill="var(--bg-secondary)" stroke="var(--border-subtle)" />
      <rect x="266" y="66" width="26" height="96" fill="var(--bg-secondary)" stroke="var(--border-subtle)" />
      <path d="M 84 66 C 120 92 220 92 256 66" fill="none" stroke="var(--border-subtle)" strokeWidth="2" />
      <rect x="20" y="162" width="300" height="28" rx="8" fill="rgba(93,170,210,0.18)" />
      <line x1="20" y1="162" x2="320" y2="162" stroke={CYAN} strokeWidth="1.2" />

      {/* boat and clearances */}
      <Boat x={170} y={164} rot={90} color={GREEN} scale={0.9} />
      <line x1="248" y1="156" x2="248" y2="70" stroke={YELLOW} strokeWidth="1.5" markerStart="url(#bc-h)" markerEnd="url(#bc-h)" />
      <text x="258" y="118" fontSize="9" fontWeight="700" fill={YELLOW}>3,0 m</text>
      <line x1="84" y1="142" x2="256" y2="142" stroke={CYAN} strokeWidth="1.4" markerStart="url(#bc-w)" markerEnd="url(#bc-w)" />
      <text x="170" y="135" textAnchor="middle" fontSize="8.5" fill={CYAN}>{ruOn ? 'szerokosc toru / ширина прохода' : 'szerokosc toru'}</text>

      {/* inland restriction signs */}
      <rect x="48" y="24" width="38" height="38" rx="3" fill={WHITE} stroke={RED} strokeWidth="3" />
      <g fill={BLACK}>
        <polygon points="62,30 72,30 67,38" />
        <polygon points="62,50 72,50 67,41" />
      </g>
      <text x="67" y="61" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={BLACK}>C.2</text>
      <rect x="254" y="24" width="38" height="38" rx="3" fill={WHITE} stroke={RED} strokeWidth="3" />
      <g fill={BLACK}>
        <polygon points="260,36 260,50 270,43" />
        <polygon points="286,36 286,50 276,43" />
      </g>
      <text x="273" y="61" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={BLACK}>C.4</text>

      <text x="170" y="202" textAnchor="middle" fontSize="8.5" fill={TXT2}>{ruOn ? 'sprawdz zanurzenie, wysokosc anteny i stan wody · не гадай на глаз' : 'sprawdz zanurzenie, wysokosc anteny i stan wody'}</text>
    </svg>
  );
}

export function DredgerPassDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 340 220" className="h-auto w-full">
      <defs>
        <ArrowDef id="dg-route" color={GREEN} />
        <ArrowDef id="dg-current" color={CYAN as string} />
      </defs>
      <text x="170" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Poglebiarka / przeszkoda w torze</text>

      {/* waterway */}
      <path d="M 28 34 C 90 50 250 50 312 34" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
      <path d="M 28 196 C 90 180 250 180 312 196" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
      <rect x="28" y="42" width="284" height="146" rx="18" fill="rgba(93,170,210,0.13)" />
      <line x1="54" y1="116" x2="102" y2="116" stroke={CYAN} strokeWidth="1.1" opacity="0.65" markerEnd="url(#dg-current)" />
      <text x="78" y="106" textAnchor="middle" fontSize="8" fill={CYAN}>prad</text>

      {/* dredger hull */}
      <rect x="136" y="76" width="68" height="56" rx="5" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="1.4" />
      <rect x="150" y="61" width="40" height="16" rx="3" fill="var(--bg-card)" stroke="var(--border-subtle)" />
      <line x1="132" y1="84" x2="104" y2="60" stroke="var(--text-muted)" strokeWidth="1.3" strokeDasharray="4,3" />
      <line x1="204" y1="84" x2="236" y2="62" stroke="var(--text-muted)" strokeWidth="1.3" strokeDasharray="4,3" />
      <text x="170" y="104" textAnchor="middle" fontSize="8.5" fill={TXT}>poglebiarka</text>
      {ruOn && (
        <text x="170" y="116" textAnchor="middle" fontSize="7.5" fill={TXT2}>земснаряд</text>
      )}

      {/* closed side */}
      <g fill={RED} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8">
        <circle cx="118" cy="70" r="7" />
        <circle cx="118" cy="138" r="7" />
      </g>
      <path d="M 86 70 L 126 138" stroke={RED} strokeWidth="2.2" opacity="0.8" />
      <text x="92" y="158" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={RED}>NIE MIJAJ</text>
      {ruOn && (
        <text x="92" y="170" textAnchor="middle" fontSize="8" fill={TXT2}>красная сторона закрыта</text>
      )}

      {/* open side */}
      <g fill={GREEN} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8">
        <polygon points="226,63 235,72 226,81 217,72" />
        <polygon points="226,128 235,137 226,146 217,137" />
      </g>
      <text x="258" y="75" fontSize="8.5" fontWeight="700" fill={GREEN}>2 zielone</text>
      <text x="258" y="88" fontSize="8" fill={TXT2}>mijaj ta strona</text>

      {/* safe route */}
      <Boat x={260} y={180} rot={0} color={GREEN} scale={0.9} />
      <path d="M 260 164 C 258 130 264 102 244 72" fill="none" stroke={GREEN} strokeWidth="1.6" strokeDasharray="5,4" markerEnd="url(#dg-route)" />
      <text x="170" y="210" textAnchor="middle" fontSize="8.5" fill={TXT2}>egzamin: przejscie jest po stronie dwoch zielonych swiatel albo rombow</text>
    </svg>
  );
}

export function CableFerryDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 340 210" className="h-auto w-full">
      <defs>
        <ArrowDef id="cf-route" color={YELLOW} />
        <ArrowDef id="cf-current" color={CYAN as string} />
      </defs>
      <text x="170" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Prom linowy - lina pod woda</text>

      {/* river */}
      <path d="M 22 40 C 90 54 250 54 318 40" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
      <path d="M 22 174 C 90 160 250 160 318 174" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
      <rect x="22" y="48" width="296" height="118" rx="18" fill="rgba(93,170,210,0.14)" />
      <line x1="48" y1="106" x2="94" y2="106" stroke={CYAN} strokeWidth="1.2" markerEnd="url(#cf-current)" opacity="0.7" />
      <text x="72" y="96" textAnchor="middle" fontSize="8" fill={CYAN}>prad</text>

      {/* ferry and cable */}
      <line x1="72" y1="44" x2="268" y2="166" stroke={RED} strokeWidth="2" strokeDasharray="7,5" opacity="0.75" />
      <rect x="148" y="92" width="54" height="28" rx="4" fill="var(--bg-secondary)" stroke="var(--border-subtle)" />
      <rect x="160" y="83" width="30" height="10" rx="2" fill="var(--bg-card)" stroke="var(--border-subtle)" />
      <text x="175" y="111" textAnchor="middle" fontSize="8.5" fill={TXT}>prom</text>
      <circle cx="149" cy="92" r="4" fill={RED} />
      <circle cx="202" cy="120" r="4" fill={RED} />

      {/* motorboat route stopping before cable */}
      <Boat x={86} y={154} rot={42} color={YELLOW} scale={0.9} />
      <path d="M 96 144 C 124 126 132 112 142 96" fill="none" stroke={YELLOW} strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#cf-route)" />
      <line x1="112" y1="122" x2="132" y2="146" stroke={RED} strokeWidth="3" strokeLinecap="round" />
      <line x1="132" y1="122" x2="112" y2="146" stroke={RED} strokeWidth="3" strokeLinecap="round" />

      <text x="242" y="74" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={RED}>nie przechodz nad lina</text>
      <text x="242" y="87" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'przepusc prom / пропусти' : 'przepusc prom'}</text>
      <text x="170" y="200" textAnchor="middle" fontSize="8.5" fill={TXT2}>czekaj az prom zwolni tor, lina moze byc napieta pod powierzchnia</text>
    </svg>
  );
}

export function LockDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 340 200" className="h-auto w-full">
      <defs>
        <ArrowDef id="lk-up" color={YELLOW} />
        <ArrowDef id="lk-in" color={GREEN} />
      </defs>
      <text x="170" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>{ruOn ? 'Sluza - przekroj / шлюз в разрезе' : 'Sluza - przekroj'}</text>
      {/* upper pound (left, high water) */}
      <rect x="20" y="60" width="102" height="110" fill="rgba(93,170,210,0.18)" />
      {/* chamber (mid level) */}
      <rect x="126" y="86" width="122" height="84" fill="rgba(93,170,210,0.28)" />
      {/* lower pound (right, low water) */}
      <rect x="254" y="118" width="66" height="52" fill="rgba(93,170,210,0.18)" />
      {/* floor */}
      <line x1="20" y1="170" x2="320" y2="170" stroke="var(--border-subtle)" strokeWidth="2" />
      {/* gates */}
      <line x1="123" y1="50" x2="123" y2="170" stroke="var(--text-muted)" strokeWidth="4" />
      <line x1="250" y1="60" x2="250" y2="170" stroke="var(--text-muted)" strokeWidth="4" />
      {/* water surfaces */}
      <line x1="20" y1="60" x2="120" y2="60" stroke={CYAN} strokeWidth="1" />
      <line x1="126" y1="86" x2="248" y2="86" stroke={CYAN} strokeWidth="1" />
      <line x1="254" y1="118" x2="320" y2="118" stroke={CYAN} strokeWidth="1" />
      {/* level-change arrow inside the chamber */}
      <line x1="205" y1="140" x2="205" y2="96" stroke={YELLOW} strokeWidth="1.5" markerStart="url(#lk-up)" markerEnd="url(#lk-up)" />
      <text x="215" y="120" fontSize="7.5" fill={YELLOW}>poziom</text>
      {/* boat floating in the chamber, tied to the wall */}
      <Boat x={165} y={80} rot={90} color={GREEN} scale={0.85} />
      <path d="M 178 76 Q 196 66 208 78" fill="none" stroke={TXT} strokeWidth="1" strokeDasharray="2,2" />
      {/* traffic light by the lower gate: green = enter */}
      <rect x="258" y="68" width="10" height="24" rx="2" fill={BLACK} stroke="rgba(255,255,255,0.3)" />
      <circle cx="263" cy="75" r="2.8" fill={RED} opacity="0.35" />
      <circle cx="263" cy="85" r="2.8" fill={GREEN} />
      <text x="263" y="104" textAnchor="middle" fontSize="7.5" fill={GREEN}>zielone = wejscie</text>
      {/* labels */}
      <text x="68" y="54" textAnchor="middle" fontSize="8.5" fill={TXT2}>{ruOn ? 'gorna woda / верхний бьеф' : 'gorna woda'}</text>
      <text x="288" y="136" textAnchor="middle" fontSize="8.5" fill={TXT2}>{ruOn ? 'dolna woda / нижний' : 'dolna woda'}</text>
      <text x="186" y="164" textAnchor="middle" fontSize="8.5" fill={TXT}>{ruOn ? 'komora / камера' : 'komora'}</text>
      <text x="123" y="46" textAnchor="middle" fontSize="8" fill={TXT2}>wrota</text>
      <text x="250" y="56" textAnchor="middle" fontSize="8" fill={TXT2}>wrota</text>
      <text x="170" y="190" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'cumy luzno, nie na glucho · bez kotwicy · концы не крепить наглухо' : 'cumy luzno, nie na glucho · bez kotwicy'}</text>
    </svg>
  );
}

export function OpenWaterDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full">
      <defs>
        <ArrowDef id="ow-g" color={GREEN} />
      </defs>
      <ellipse cx="160" cy="105" rx="52" ry="26" fill="rgba(255,85,102,0.16)" stroke={RED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="160" y="102" textAnchor="middle" fontSize="9" fill={RED}>mielizna</text>
      {ruOn && (
        <text x="160" y="113" textAnchor="middle" fontSize="8" fill={RED}>мель / камни</text>
      )}
      <CardinalPole x={160} y={26} type="N" />
      <text x="196" y="42" fontSize="9" fill="var(--text-primary)">N - mijaj od polnocy</text>
      <CardinalPole x={160} y={140} type="S" />
      <text x="196" y="158" fontSize="9" fill="var(--text-primary)">S - mijaj od poludnia</text>
      {/* safe tracks */}
      <path d="M 30 30 C 90 16 230 16 292 30" fill="none" stroke={GREEN} strokeWidth="1.6" strokeDasharray="6,4" markerEnd="url(#ow-g)" />
      <path d="M 30 186 C 90 200 230 200 292 186" fill="none" stroke={GREEN} strokeWidth="1.6" strokeDasharray="6,4" markerEnd="url(#ow-g)" />
      <text x="160" y="196" textAnchor="middle" fontSize="8" fill={TXT2} />
    </svg>
  );
}

export function PortEntryDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 320 210" className="h-auto w-full">
      <defs><ArrowDef id="pe" color={CYAN as string} /></defs>
      {/* piers */}
      <path d="M 40 40 L 40 120 L 120 150" stroke="var(--border-subtle)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M 280 40 L 280 120 L 200 150" stroke="var(--border-subtle)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <text x="160" y="52" textAnchor="middle" fontSize="10" fill={TXT}>{ruOn ? 'basen portu / акватория' : 'basen portu'}</text>
      {/* entrance marks: entering from sea (bottom) - red LEFT, green RIGHT */}
      <rect x="112" y="140" width="16" height="16" rx="2" fill={RED} stroke="rgba(0,0,0,0.4)" />
      <text x="120" y="172" textAnchor="middle" fontSize="8.5" fill={RED}>CZERWONY = LEWA</text>
      <polygon points="208,140 216,156 200,156" fill={GREEN} stroke="rgba(0,0,0,0.4)" />
      <text x="208" y="172" textAnchor="middle" fontSize="8.5" fill={GREEN}>ZIELONY = PRAWA</text>
      {/* boat path keeping right */}
      <Boat x={172} y={196} rot={-8} color={GREEN} />
      <path d="M 174 180 C 178 150 176 120 168 96" fill="none" stroke={CYAN} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#pe)" />
      <text x="252" y="196" textAnchor="middle" fontSize="8.5" fill={TXT2}>mala predkosc · trzymaj prawej</text>
    </svg>
  );
}

// ------------------------------------------------------------------ Budowa ---

export function BoatTopDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 320 190" className="h-auto w-full">
      {/* hull top view: bow up */}
      <path
        d="M160,20 C205,45 212,110 200,158 L120,158 C108,110 115,45 160,20 Z"
        fill="var(--bg-secondary)"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
      />
      {/* port stripe red / starboard green */}
      <path d="M160,24 C124,46 116,105 122,152 L130,152 C124,105 132,50 160,26 Z" fill={RED} opacity="0.7" />
      <path d="M160,24 C196,46 204,105 198,152 L190,152 C196,105 188,50 160,26 Z" fill={GREEN} opacity="0.7" />
      {/* cockpit + console */}
      <rect x="138" y="96" width="44" height="46" rx="6" fill="var(--bg-card)" stroke="var(--border-subtle)" />
      <text x="160" y="122" textAnchor="middle" fontSize="8.5" fill={TXT}>kokpit</text>
      <rect x="146" y="70" width="28" height="14" rx="3" fill="var(--bg-card)" stroke="var(--border-subtle)" />
      {/* engine on transom */}
      <rect x="150" y="158" width="20" height="16" rx="3" fill={BLACK} stroke="rgba(255,255,255,0.3)" />
      <text x="160" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>{ruOn ? 'DZIOB / нос' : 'DZIOB'}</text>
      <text x="74" y="90" textAnchor="middle" fontSize="9" fontWeight="700" fill={RED}>BAKBURTA</text>
      <text x="74" y="101" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'lewa / красный' : 'lewa'}</text>
      <text x="248" y="90" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN}>STERBURTA</text>
      <text x="248" y="101" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'prawa / зелёный' : 'prawa'}</text>
      <text x="160" y="186" textAnchor="middle" fontSize="9" fill={TXT}>{ruOn ? 'RUFA · PAWEZ (транец) + silnik' : 'RUFA · PAWEZ + silnik'}</text>
    </svg>
  );
}

export function BoatSideDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 340 170" className="h-auto w-full">
      {/* hull side: bow right */}
      <path
        d="M30,70 L280,70 C300,70 314,84 318,96 L306,120 C280,132 80,132 52,120 L36,96 Z"
        fill="var(--bg-secondary)"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
      />
      {/* waterline */}
      <line x1="16" y1="104" x2="330" y2="104" stroke={CYAN} strokeWidth="1" strokeDasharray="5,4" />
      <text x="322" y="98" textAnchor="end" fontSize="8" fill={CYAN}>linia wody</text>
      {/* compartments */}
      <line x1="270" y1="70" x2="266" y2="126" stroke="var(--border-subtle)" strokeWidth="1" />
      <line x1="190" y1="70" x2="188" y2="130" stroke="var(--border-subtle)" strokeWidth="1" />
      <line x1="110" y1="70" x2="108" y2="130" stroke="var(--border-subtle)" strokeWidth="1" />
      <text x="292" y="88" textAnchor="middle" fontSize="8.5" fill={TXT}>forpik</text>
      <text x="230" y="88" textAnchor="middle" fontSize="8.5" fill={TXT}>kabina: mesa · koja</text>
      <text x="150" y="88" textAnchor="middle" fontSize="8.5" fill={TXT}>kokpit</text>
      <text x="72" y="88" textAnchor="middle" fontSize="8.5" fill={TXT}>achterpik</text>
      {/* zeza lowest point */}
      <circle cx="188" cy="126" r="3" fill={YELLOW} />
      <text x="188" y="146" textAnchor="middle" fontSize="8.5" fill={YELLOW}>{ruOn ? 'zeza (najnizej) / льяло' : 'zeza (najnizej)'}</text>
      {/* keel */}
      <text x="120" y="158" textAnchor="middle" fontSize="8.5" fill={TXT2}>{ruOn ? 'kil / stepka - киль' : 'kil / stepka'}</text>
      {/* engine on transom (left = stern) */}
      <rect x="16" y="76" width="16" height="34" rx="3" fill={BLACK} stroke="rgba(255,255,255,0.3)" />
      <text x="24" y="126" textAnchor="middle" fontSize="8" fill={TXT2}>silnik</text>
      <text x="24" y="62" textAnchor="middle" fontSize="9" fontWeight="700" fill={TXT}>RUFA</text>
      <text x="316" y="62" textAnchor="middle" fontSize="9" fontWeight="700" fill={TXT}>DZIOB</text>
    </svg>
  );
}

// ----------------------------------------------------------------- Silniki ---

export function FuelSystemDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 340 208" className="h-auto w-full">
      <defs>
        <ArrowDef id="fs-c" color={CYAN as string} />
        <ArrowDef id="fs-g" color={GREEN} />
      </defs>
      <text x="170" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>{ruOn ? 'Uklad paliwowy przed startem / топливо перед стартом' : 'Uklad paliwowy przed startem'}</text>

      {/* 1. air vent on the tank cap - must be opened */}
      <text x="52" y="30" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN}>1. odpowietrznik</text>
      <text x="52" y="41" textAnchor="middle" fontSize="8" fill={GREEN}>{ruOn ? 'ODKRECIC / открути' : 'ODKRECIC'}</text>
      <path d="M 57 58 A 7 7 0 1 1 71 60" fill="none" stroke={GREEN} strokeWidth="1.4" markerEnd="url(#fs-g)" />
      <rect x="50" y="66" width="26" height="10" rx="2" fill="var(--bg-card)" stroke="var(--border-subtle)" />
      <circle cx="63" cy="65" r="3.4" fill={YELLOW} stroke="rgba(0,0,0,0.35)" />

      {/* portable fuel tank */}
      <rect x="24" y="76" width="90" height="80" rx="7" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <rect x="30" y="106" width="78" height="46" rx="3" fill={YELLOW} opacity="0.22" />
      <text x="70" y="130" textAnchor="middle" fontSize="9" fill={TXT}>zbiornik</text>
      <text x="70" y="142" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'бак · paliwo' : 'paliwo'}</text>

      {/* fuel hose to the engine, with flow arrows */}
      <path d="M 114 150 L 286 150" stroke="var(--border-subtle)" strokeWidth="3" fill="none" />
      <line x1="120" y1="150" x2="144" y2="150" stroke={CYAN} strokeWidth="1.3" opacity="0.85" markerEnd="url(#fs-c)" />
      <line x1="186" y1="150" x2="222" y2="150" stroke={CYAN} strokeWidth="1.3" opacity="0.85" markerEnd="url(#fs-c)" />
      <line x1="252" y1="150" x2="282" y2="150" stroke={CYAN} strokeWidth="1.3" opacity="0.85" markerEnd="url(#fs-c)" />

      {/* 2. primer bulb - pump until firm */}
      <ellipse cx="165" cy="150" rx="17" ry="11" fill="var(--bg-card)" stroke={GREEN} strokeWidth="1.4" />
      <path d="M 157 143 q -4 7 0 14 M 173 143 q 4 7 0 14" fill="none" stroke={GREEN} strokeWidth="1" opacity="0.7" />
      <text x="150" y="180" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN}>{ruOn ? '2. gruszka / груша' : '2. gruszka'}</text>
      <text x="150" y="191" textAnchor="middle" fontSize="8" fill={GREEN}>{ruOn ? 'NAPOMPUJ do twardosci / до твёрдости' : 'NAPOMPUJ do twardosci'}</text>

      {/* 3. fuel valve - open */}
      <text x="240" y="118" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN}>{ruOn ? '3. zawor / кран' : '3. zawor'}</text>
      <text x="240" y="129" textAnchor="middle" fontSize="8" fill={GREEN}>{ruOn ? 'OTWORZ / открой' : 'OTWORZ'}</text>
      <g fill="var(--bg-card)" stroke={TXT} strokeWidth="1">
        <polygon points="232,143 232,157 240,150" />
        <polygon points="248,143 248,157 240,150" />
      </g>
      <line x1="240" y1="150" x2="240" y2="136" stroke={GREEN} strokeWidth="2" />
      <line x1="233" y1="136" x2="247" y2="136" stroke={GREEN} strokeWidth="2" />

      {/* outboard engine */}
      <rect x="286" y="122" width="32" height="38" rx="4" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="1.4" />
      <rect x="297" y="160" width="10" height="24" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="1.2" />
      <path d="M 296 184 L 308 184 L 312 194 L 292 194 Z" fill="var(--bg-card)" stroke="var(--border-subtle)" />
      <text x="302" y="138" textAnchor="middle" fontSize="8" fill={TXT}>silnik</text>

      <text x="170" y="205" textAnchor="middle" fontSize="8" fill={TXT2}>4. luz (neutral) + linka na reke · 5. sruba w wodzie -&gt; start</text>
    </svg>
  );
}

// ----------------------------------------------------------------- Manewry ---

export function PropWalkDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 320 170" className="h-auto w-full">
      <defs>
        <ArrowDef id="pw-l" color={YELLOW} />
        <ArrowDef id="pw-r" color={YELLOW} />
      </defs>
      {/* left panel: right-handed prop */}
      <text x="80" y="18" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Sruba prawoskretna</text>
      <text x="80" y="30" textAnchor="middle" fontSize="8.5" fill={TXT2}>bieg WSTECZ (widok od rufy)</text>
      <path d="M50,52 L110,52 L104,96 L56,96 Z" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="1.2" />
      <circle cx="80" cy="112" r="13" fill="none" stroke={TXT} strokeWidth="1.5" />
      <path d="M 80 99 A 13 13 0 0 0 67 112" fill="none" stroke={RED} strokeWidth="2" />
      <line x1="64" y1="132" x2="34" y2="132" stroke={YELLOW} strokeWidth="1.8" markerEnd="url(#pw-l)" />
      <text x="80" y="152" textAnchor="middle" fontSize="9" fontWeight="700" fill={YELLOW}>rufa w LEWO</text>
      {ruOn && (
        <text x="80" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>корма влево</text>
      )}
      {/* right panel: left-handed prop */}
      <text x="240" y="18" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Sruba lewoskretna</text>
      <text x="240" y="30" textAnchor="middle" fontSize="8.5" fill={TXT2}>bieg WSTECZ (widok od rufy)</text>
      <path d="M210,52 L270,52 L264,96 L216,96 Z" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="1.2" />
      <circle cx="240" cy="112" r="13" fill="none" stroke={TXT} strokeWidth="1.5" />
      <path d="M 240 99 A 13 13 0 0 1 253 112" fill="none" stroke={RED} strokeWidth="2" />
      <line x1="256" y1="132" x2="286" y2="132" stroke={YELLOW} strokeWidth="1.8" markerEnd="url(#pw-r)" />
      <text x="240" y="152" textAnchor="middle" fontSize="9" fontWeight="700" fill={YELLOW}>rufa w PRAWO</text>
      {ruOn && (
        <text x="240" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>корма вправо</text>
      )}
    </svg>
  );
}

// ------------------------------------------------------------- Ratownictwo ---

export function MobDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full">
      <defs>
        <ArrowDef id="mob-w" color={CYAN as string} />
        <ArrowDef id="mob-p" color={GREEN} />
      </defs>
      {/* wind */}
      <line x1="160" y1="14" x2="160" y2="44" stroke={CYAN} strokeWidth="1.6" markerEnd="url(#mob-w)" />
      <text x="196" y="26" textAnchor="middle" fontSize="9" fill={CYAN}>{ruOn ? 'wiatr / ветер' : 'wiatr'}</text>
      {/* person */}
      <circle cx="160" cy="92" r="9" fill="none" stroke={RED} strokeWidth="2" />
      <circle cx="160" cy="88" r="2.6" fill={RED} />
      <text x="186" y="90" fontSize="9" fontWeight="700" fill={RED}>MOB</text>
      {/* boat path: circle around and approach upwind from downwind side */}
      <Boat x={70} y={70} rot={90} color={GREEN} />
      <path
        d="M 86 72 C 130 66 200 56 236 84 C 258 102 246 138 212 148 C 186 156 170 134 163 110"
        fill="none" stroke={GREEN} strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#mob-p)"
      />
      <text x="160" y="176" textAnchor="middle" fontSize="8.5" fill={TXT}>1. alarm + rzuc kolo · 2. obserwator nie spuszcza z oka</text>
      <text x="160" y="190" textAnchor="middle" fontSize="8.5" fill={TXT}>3. podejscie POD WIATR, wolno · przy osobie silnik na luz/stop</text>
    </svg>
  );
}
