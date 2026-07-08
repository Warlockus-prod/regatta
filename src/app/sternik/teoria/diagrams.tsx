'use client';

// ============================================================================
// SVG diagrams for the sternik theory page. Labels are PL + RU by design
// (exam-content language policy), theme-aware via CSS vars.
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
      <text x="45" y="146" textAnchor="middle" fontSize="8" fill={TXT2}>уступаешь</text>
      {/* stand-on boat: heading north */}
      <Boat x={150} y={120} rot={0} color={GREEN} />
      <line x1="150" y1="103" x2="150" y2="60" stroke={GREEN} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#cx-g)" />
      <text x="150" y="150" textAnchor="middle" fontSize="9" fill={GREEN}>PIERWSZENSTWO</text>
      <text x="150" y="160" textAnchor="middle" fontSize="8" fill={TXT2}>приоритет</text>
      <circle cx="150" cy="95" r="4" fill="none" stroke={YELLOW} strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  );
}

export function HeadOnDiagram() {
  return (
    <svg viewBox="0 0 220 170" className="h-auto w-full">
      <defs><ArrowDef id="ho" color={CYAN as string} /></defs>
      <text x="110" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Kurs wprost na siebie</text>
      <Boat x={80} y={135} rot={0} color={GREEN} />
      <path d="M 80 118 C 80 90 100 80 112 70" fill="none" stroke={GREEN} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#ho)" />
      <Boat x={140} y={50} rot={180} color={GREEN} />
      <path d="M 140 67 C 140 95 120 105 108 115" fill="none" stroke={GREEN} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#ho)" />
      <text x="110" y="152" textAnchor="middle" fontSize="9" fill={TXT}>oba w PRAWO - mijanie lewymi burtami</text>
      <text x="110" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>оба вправо, расходятся левыми бортами</text>
    </svg>
  );
}

export function OvertakingDiagram() {
  return (
    <svg viewBox="0 0 220 170" className="h-auto w-full">
      <defs><ArrowDef id="ov" color={RED} /></defs>
      <text x="110" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Wyprzedzanie</text>
      <Boat x={120} y={55} rot={0} color={GREEN} />
      <text x="158" y="58" fontSize="9" fill={GREEN}>wyprzedzany</text>
      <text x="158" y="69" fontSize="8" fill={TXT2}>приоритет</text>
      <Boat x={95} y={125} rot={0} color={RED} />
      <path d="M 95 108 C 95 90 80 78 85 62" fill="none" stroke={RED} strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#ov)" />
      <text x="110" y="152" textAnchor="middle" fontSize="9" fill={RED}>wyprzedzajacy ustepuje</text>
      <text x="110" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>обгоняющий держится в стороне</text>
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
      <text x={cx + 78} y={81} textAnchor="middle" fontSize="8" fill={TXT2}>sterburta / прав. борт</text>
      <text x={cx - 78} y={70} textAnchor="middle" fontSize="9" fill={RED}>czerwone 112,5</text>
      <text x={cx - 78} y={81} textAnchor="middle" fontSize="8" fill={TXT2}>bakburta / лев. борт</text>
      <text x={cx} y={cy + 78} textAnchor="middle" fontSize="9" fill={TXT}>rufowe biale 135</text>
      <text x={cx} y={cy + 90} textAnchor="middle" fontSize="8" fill={TXT2}>кормовой белый</text>
      <text x={cx} y={230} textAnchor="middle" fontSize="8.5" fill={TXT2}>masztowe (topowe) biale 225 = 2 x 112,5 z przodu · 112,5 + 112,5 + 135 = 360</text>
    </svg>
  );
}

// ------------------------------------------------------------------- Znaki ---

export function LateralMarksDiagram() {
  return (
    <svg viewBox="0 0 300 200" className="h-auto w-full">
      <defs><ArrowDef id="lat" color={CYAN as string} /></defs>
      {/* fairway */}
      <path d="M 90 190 L 120 20" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="6,5" fill="none" />
      <path d="M 210 190 L 180 20" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="6,5" fill="none" />
      <line x1="150" y1="165" x2="150" y2="45" stroke={CYAN} strokeWidth="1.2" strokeDasharray="3,4" markerEnd="url(#lat)" />
      <text x="150" y="34" textAnchor="middle" fontSize="9" fill={CYAN}>kierunek od morza / вход с моря</text>
      {/* red can - left */}
      <rect x="88" y="96" width="22" height="22" rx="2" fill={RED} stroke="rgba(0,0,0,0.35)" />
      <line x1="99" y1="118" x2="99" y2="132" stroke={TXT2} strokeWidth="1" />
      <text x="99" y="148" textAnchor="middle" fontSize="9" fontWeight="700" fill={RED}>LEWA</text>
      <text x="99" y="159" textAnchor="middle" fontSize="8" fill={TXT2}>czerwony walec</text>
      <text x="99" y="169" textAnchor="middle" fontSize="8" fill={TXT2}>красная «банка»</text>
      {/* green cone - right */}
      <polygon points="201,96 213,120 189,120" fill={GREEN} stroke="rgba(0,0,0,0.35)" />
      <line x1="201" y1="120" x2="201" y2="132" stroke={TXT2} strokeWidth="1" />
      <text x="201" y="148" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN}>PRAWA</text>
      <text x="201" y="159" textAnchor="middle" fontSize="8" fill={TXT2}>zielony stozek</text>
      <text x="201" y="169" textAnchor="middle" fontSize="8" fill={TXT2}>зелёный конус</text>
      <Boat x={150} y={180} rot={0} color="#8ba7b8" />
      <text x="150" y="196" textAnchor="middle" fontSize="8.5" fill={TXT2}>tor wodny / фарватер · IALA region A</text>
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
      <text x={CX} y={CY + 9} textAnchor="middle" fontSize="8.5" fill={RED}>опасность</text>
      {/* stations */}
      <CardinalStation cx={CX} top={20} type="N" label="N · 12:00" rhythm="Q ciagle / непрерывно" />
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
      <text x="95" y="86" textAnchor="middle" fontSize="9" fill={CYAN}>prad / течение</text>
      {/* downstream boat */}
      <Boat x={200} y={70} rot={95} color={GREEN} />
      <line x1="216" y1="72" x2="258" y2="76" stroke={GREEN} strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#riv-g)" />
      <text x="228" y="56" textAnchor="middle" fontSize="9" fill={GREEN}>z pradem = PIERWSZENSTWO</text>
      {/* upstream boat */}
      <Boat x={200} y={125} rot={-85} color="#8ba7b8" />
      <line x1="184" y1="123" x2="142" y2="119" stroke="#8ba7b8" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#riv-r)" />
      <text x="196" y="148" textAnchor="middle" fontSize="9" fill={TXT}>pod prad - ustepuje</text>
      <text x="160" y="172" textAnchor="middle" fontSize="8.5" fill={TXT2}>trzymaj sie PRAWEJ strony szlaku · mijanie lewymi burtami · идущий вниз имеет приоритет</text>
    </svg>
  );
}

export function OpenWaterDiagram() {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full">
      <defs>
        <ArrowDef id="ow-g" color={GREEN} />
      </defs>
      <ellipse cx="160" cy="105" rx="52" ry="26" fill="rgba(255,85,102,0.16)" stroke={RED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="160" y="102" textAnchor="middle" fontSize="9" fill={RED}>mielizna</text>
      <text x="160" y="113" textAnchor="middle" fontSize="8" fill={RED}>мель / камни</text>
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
  return (
    <svg viewBox="0 0 320 210" className="h-auto w-full">
      <defs><ArrowDef id="pe" color={CYAN as string} /></defs>
      {/* piers */}
      <path d="M 40 40 L 40 120 L 120 150" stroke="var(--border-subtle)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M 280 40 L 280 120 L 200 150" stroke="var(--border-subtle)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <text x="160" y="52" textAnchor="middle" fontSize="10" fill={TXT}>basen portu / акватория</text>
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
      <text x="160" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>DZIOB / нос</text>
      <text x="74" y="90" textAnchor="middle" fontSize="9" fontWeight="700" fill={RED}>BAKBURTA</text>
      <text x="74" y="101" textAnchor="middle" fontSize="8" fill={TXT2}>lewa / красный</text>
      <text x="248" y="90" textAnchor="middle" fontSize="9" fontWeight="700" fill={GREEN}>STERBURTA</text>
      <text x="248" y="101" textAnchor="middle" fontSize="8" fill={TXT2}>prawa / зелёный</text>
      <text x="160" y="186" textAnchor="middle" fontSize="9" fill={TXT}>RUFA · PAWEZ (транец) + silnik</text>
    </svg>
  );
}

export function BoatSideDiagram() {
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
      <text x="188" y="146" textAnchor="middle" fontSize="8.5" fill={YELLOW}>zeza (najnizej) / льяло</text>
      {/* keel */}
      <text x="120" y="158" textAnchor="middle" fontSize="8.5" fill={TXT2}>kil / stepka - киль</text>
      {/* engine on transom (left = stern) */}
      <rect x="16" y="76" width="16" height="34" rx="3" fill={BLACK} stroke="rgba(255,255,255,0.3)" />
      <text x="24" y="126" textAnchor="middle" fontSize="8" fill={TXT2}>silnik</text>
      <text x="24" y="62" textAnchor="middle" fontSize="9" fontWeight="700" fill={TXT}>RUFA</text>
      <text x="316" y="62" textAnchor="middle" fontSize="9" fontWeight="700" fill={TXT}>DZIOB</text>
    </svg>
  );
}

// ----------------------------------------------------------------- Manewry ---

export function PropWalkDiagram() {
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
      <text x="80" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>корма влево</text>
      {/* right panel: left-handed prop */}
      <text x="240" y="18" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>Sruba lewoskretna</text>
      <text x="240" y="30" textAnchor="middle" fontSize="8.5" fill={TXT2}>bieg WSTECZ (widok od rufy)</text>
      <path d="M210,52 L270,52 L264,96 L216,96 Z" fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth="1.2" />
      <circle cx="240" cy="112" r="13" fill="none" stroke={TXT} strokeWidth="1.5" />
      <path d="M 240 99 A 13 13 0 0 1 253 112" fill="none" stroke={RED} strokeWidth="2" />
      <line x1="256" y1="132" x2="286" y2="132" stroke={YELLOW} strokeWidth="1.8" markerEnd="url(#pw-r)" />
      <text x="240" y="152" textAnchor="middle" fontSize="9" fontWeight="700" fill={YELLOW}>rufa w PRAWO</text>
      <text x="240" y="163" textAnchor="middle" fontSize="8" fill={TXT2}>корма вправо</text>
    </svg>
  );
}

// ------------------------------------------------------------- Ratownictwo ---

export function MobDiagram() {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full">
      <defs>
        <ArrowDef id="mob-w" color={CYAN as string} />
        <ArrowDef id="mob-p" color={GREEN} />
      </defs>
      {/* wind */}
      <line x1="160" y1="14" x2="160" y2="44" stroke={CYAN} strokeWidth="1.6" markerEnd="url(#mob-w)" />
      <text x="196" y="26" textAnchor="middle" fontSize="9" fill={CYAN}>wiatr / ветер</text>
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
