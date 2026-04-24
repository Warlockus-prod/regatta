'use client';

import { useState } from 'react';
import { legacyPick, type Lang } from '@/lib/languages';
import { racingStrategies, racingRules } from '@/data/sailing-data';
import { useI18n } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// SVG sub-components for diagrams
// ---------------------------------------------------------------------------

function WindArrow({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <defs>
        <marker id="windHead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#00e5ff" />
        </marker>
      </defs>
      <line x1={x} y1={y - 28} x2={x} y2={y + 28} stroke="#00e5ff" strokeWidth="2" markerEnd="url(#windHead)" opacity="0.8" />
      {label && (
        <text x={x + 14} y={y} fill="#00e5ff" fontSize="11" fontWeight="600" dominantBaseline="middle">
          {label}
        </text>
      )}
    </g>
  );
}

function BuoyMark({ cx, cy, label, sublabel, labelPos = 'right' }: {
  cx: number; cy: number; label: string; sublabel?: string;
  labelPos?: 'right' | 'left' | 'below' | 'above';
}) {
  const positions = {
    right: { x: cx + 14, y1: cy - 4, y2: cy + 10, anchor: 'start' as const },
    left: { x: cx - 14, y1: cy - 4, y2: cy + 10, anchor: 'end' as const },
    below: { x: cx, y1: cy + 22, y2: cy + 36, anchor: 'middle' as const },
    above: { x: cx, y1: cy - 26, y2: cy - 14, anchor: 'middle' as const },
  };
  const p = positions[labelPos];
  return (
    <g>
      <circle cx={cx} cy={cy} r="8" fill="#ffaa00" stroke="#fff" strokeWidth="1.5" />
      <text x={p.x} y={p.y1} fill="#ffaa00" fontSize="11" fontWeight="600" textAnchor={p.anchor}>{label}</text>
      {sublabel && (
        <text x={p.x} y={p.y2} fill="#8ba7b8" fontSize="9" textAnchor={p.anchor}>{sublabel}</text>
      )}
    </g>
  );
}

function YachtIcon({ x, y, rotation, color = '#ffffff' }: { x: number; y: number; rotation: number; color?: string }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`}>
      {/* Hull */}
      <path d="M0,-10 L4,8 L-4,8 Z" fill={color} opacity="0.9" />
      {/* Sail */}
      <path d="M0,-10 L6,2 L0,2 Z" fill={color} opacity="0.5" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Race Course Diagram
// ---------------------------------------------------------------------------

function RaceCourseDiagram() {
  const { tp, lang } = useI18n();
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-1">
        {tp('Дистанция гонки', 'Race Course', 'Trasa wyscigu')}
        {lang !== 'en' && <span className="text-[var(--text-muted)] font-normal text-sm"> (Race Course)</span>}
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-5">
        {tp(
          'Типичная дистанция «туда-обратно» (windward-leeward) с верхним и нижним знаками.',
          'Typical windward-leeward course with a top mark and a bottom gate.',
          'Typowa trasa "tam i z powrotem" (windward-leeward) ze znakiem gornym i dolnym.',
        )}
      </p>

      <div className="w-full max-w-lg mx-auto">
        <svg viewBox="0 0 360 520" className="w-full h-auto" aria-label="Race course diagram">
          {/* Water background */}
          <rect x="0" y="0" width="360" height="520" rx="12" fill="#0d2847" />

          {/* Wind indication at top */}
          <g>
            <text x="180" y="24" fill="#00e5ff" fontSize="12" fontWeight="700" textAnchor="middle" letterSpacing="1">
              {tp('ВЕТЕР / WIND', 'WIND', 'WIATR / WIND')}
            </text>
            {/* Multiple wind arrows */}
            <WindArrow x={100} y={52} />
            <WindArrow x={140} y={52} />
            <WindArrow x={180} y={52} />
            <WindArrow x={220} y={52} />
            <WindArrow x={260} y={52} />
          </g>

          {/* Course center line (faint) */}
          <line x1="180" y1="110" x2="180" y2="440" stroke="#1a3a5c" strokeWidth="1" strokeDasharray="6,6" />

          {/* Windward mark */}
          <BuoyMark cx={180} cy={110} label={tp('Верхний знак', 'Windward', 'Gorny znak')} sublabel="(Windward Mark)" />

          {/* Leeward gate marks */}
          <BuoyMark cx={140} cy={440} label={tp('Знак Л', 'Gate L', 'Znak L')} sublabel="(Gate L)" labelPos="left" />
          <BuoyMark cx={220} cy={440} label={tp('Знак П', 'Gate R', 'Znak R')} sublabel="(Gate R)" labelPos="right" />

          {/* Gate line */}
          <line x1="140" y1="440" x2="220" y2="440" stroke="#ffaa00" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
          <text x="180" y="465" fill="#8ba7b8" fontSize="9" textAnchor="middle">
            {tp('Нижние знаки / Leeward Gate', 'Leeward Gate', 'Dolne znaki / Leeward Gate')}
          </text>

          {/* --- Upwind leg (tacking pattern) --- */}
          <g>
            <text x="52" y="200" fill="#00d4ff" fontSize="10" fontWeight="600" opacity="0.7" transform="rotate(-90,52,200)">
              UPWIND LEG
            </text>
            {/* Tacking zigzag */}
            <polyline
              points="170,430 120,370 230,290 130,220 210,160 180,118"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="1.5"
              strokeDasharray="6,4"
              opacity="0.8"
            />
            {/* Tack turn arrows */}
            <circle cx="120" cy="370" r="3" fill="#00d4ff" opacity="0.6" />
            <circle cx="230" cy="290" r="3" fill="#00d4ff" opacity="0.6" />
            <circle cx="130" cy="220" r="3" fill="#00d4ff" opacity="0.6" />
            <circle cx="210" cy="160" r="3" fill="#00d4ff" opacity="0.6" />

            {/* Yachts on upwind */}
            <YachtIcon x={175} y={395} rotation={-35} color="#00d4ff" />
            <YachtIcon x={170} y={310} rotation={35} color="#00d4ff" />
            <YachtIcon x={180} y={185} rotation={-30} color="#00d4ff" />
          </g>

          {/* --- Downwind leg --- */}
          <g>
            <text x="310" y="280" fill="#44ff88" fontSize="10" fontWeight="600" opacity="0.7" transform="rotate(90,310,280)">
              DOWNWIND LEG
            </text>
            {/* Broad reach zigzag */}
            <polyline
              points="185,118 250,200 140,310 240,390 195,435"
              fill="none"
              stroke="#44ff88"
              strokeWidth="1.5"
              strokeDasharray="6,4"
              opacity="0.8"
            />
            <circle cx="250" cy="200" r="3" fill="#44ff88" opacity="0.6" />
            <circle cx="140" cy="310" r="3" fill="#44ff88" opacity="0.6" />
            <circle cx="240" cy="390" r="3" fill="#44ff88" opacity="0.6" />

            {/* Yachts on downwind */}
            <YachtIcon x={220} y={200} rotation={145} color="#44ff88" />
            <YachtIcon x={185} y={340} rotation={210} color="#44ff88" />
          </g>

          {/* Mark rounding trajectories */}
          <g opacity="0.5">
            {/* Windward mark rounding */}
            <path d="M185,130 A20,20 0 0,1 175,130" fill="none" stroke="#ffaa00" strokeWidth="1.5" strokeDasharray="3,2" />
            {/* Leeward mark rounding */}
            <path d="M160,435 A15,15 0 0,0 155,430" fill="none" stroke="#ffaa00" strokeWidth="1.5" strokeDasharray="3,2" />
          </g>

          {/* Laylines from windward mark */}
          <line x1="180" y1="110" x2="80" y2="280" stroke="#ff4444" strokeWidth="1" strokeDasharray="3,5" opacity="0.35" />
          <line x1="180" y1="110" x2="280" y2="280" stroke="#ff4444" strokeWidth="1" strokeDasharray="3,5" opacity="0.35" />
          <text x="68" y="265" fill="#ff4444" fontSize="9" opacity="0.5">{tp('Лейлайн', 'Layline', 'Layline')}</text>
          <text x="255" y="265" fill="#ff4444" fontSize="9" opacity="0.5">{tp('Лейлайн', 'Layline', 'Layline')}</text>

          {/* Legend */}
          <g transform="translate(16, 475)">
            <line x1="0" y1="5" x2="20" y2="5" stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="26" y="9" fill="#8ba7b8" fontSize="9">{tp('Лавировка (Upwind)', 'Upwind', 'Halsowanie (Upwind)')}</text>
            <line x1="140" y1="5" x2="160" y2="5" stroke="#44ff88" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="166" y="9" fill="#8ba7b8" fontSize="9">{tp('Полный курс (Downwind)', 'Downwind', 'Kurs pelny (Downwind)')}</text>
          </g>

          {/* Subtle pulse on marks */}
          <circle cx="180" cy="110" r="14" fill="none" stroke="#ffaa00" strokeWidth="0.5" opacity="0.3">
            <animate attributeName="r" values="14;22;14" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Strategy Cards
// ---------------------------------------------------------------------------

function UpwindDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 130" className="w-full h-auto" aria-label="Upwind tacking strategy">
      <rect width="200" height="130" rx="8" fill="#0d2847" />
      <text x="100" y="14" fill="#00e5ff" fontSize="9" textAnchor="middle" fontWeight="600">{tp('ВЕТЕР', 'WIND', 'WIATR')}</text>
      <line x1="90" y1="18" x2="90" y2="32" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.6" />
      <line x1="110" y1="18" x2="110" y2="32" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.6" />
      {/* Target point */}
      <circle cx="100" cy="40" r="4" fill="#ffaa00" stroke="#fff" strokeWidth="1" />
      {/* Zigzag tacks */}
      <polyline
        points="100,120 65,90 135,60 80,40 100,40"
        fill="none" stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="4,3"
      />
      {/* ~45 degree indicators */}
      <text x="60" y="108" fill="#8ba7b8" fontSize="8">~45°</text>
      <text x="115" y="78" fill="#8ba7b8" fontSize="8">~45°</text>
      <YachtIcon x={100} y={105} rotation={-40} color="#00d4ff" />
      <YachtIcon x={100} y={70} rotation={40} color="#00d4ff" />
    </svg>
  );
}

function DownwindDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 130" className="w-full h-auto" aria-label="Downwind VMG strategy">
      <rect width="200" height="130" rx="8" fill="#0d2847" />
      <text x="100" y="14" fill="#00e5ff" fontSize="9" textAnchor="middle" fontWeight="600">{tp('ВЕТЕР', 'WIND', 'WIATR')}</text>
      <line x1="100" y1="18" x2="100" y2="30" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.6" />
      {/* Dead run line (slow) */}
      <line x1="100" y1="35" x2="100" y2="115" stroke="#ff4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      <text x="106" y="78" fill="#ff4444" fontSize="7" opacity="0.7">Dead run</text>
      <text x="106" y="88" fill="#ff4444" fontSize="7" opacity="0.7">(slow)</text>
      {/* Broad reach zigzag (faster VMG) */}
      <polyline
        points="100,35 145,65 55,95 100,115"
        fill="none" stroke="#44ff88" strokeWidth="1.5" strokeDasharray="4,3"
      />
      <text x="140" y="55" fill="#44ff88" fontSize="7">VMG</text>
      <text x="140" y="63" fill="#44ff88" fontSize="7">better</text>
      <YachtIcon x={125} y={50} rotation={150} color="#44ff88" />
      <YachtIcon x={80} y={82} rotation={210} color="#44ff88" />
    </svg>
  );
}

function StartDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 130" className="w-full h-auto" aria-label="Start line strategy">
      <rect width="200" height="130" rx="8" fill="#0d2847" />
      <text x="100" y="14" fill="#00e5ff" fontSize="9" textAnchor="middle" fontWeight="600">{tp('ВЕТЕР', 'WIND', 'WIATR')}</text>
      <line x1="100" y1="18" x2="100" y2="30" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.6" />
      {/* Start line */}
      <line x1="30" y1="85" x2="170" y2="85" stroke="#ffaa00" strokeWidth="2" />
      <circle cx="30" cy="85" r="5" fill="#ffaa00" stroke="#fff" strokeWidth="1" />
      <circle cx="170" cy="85" r="5" fill="#ffaa00" stroke="#fff" strokeWidth="1" />
      <text x="100" y="100" fill="#ffaa00" fontSize="8" textAnchor="middle">{tp('Стартовая линия', 'Start line', 'Linia startu')}</text>
      {/* Committee boat */}
      <rect x="163" y="77" width="14" height="8" rx="2" fill="#8ba7b8" opacity="0.6" />
      {/* Boats approaching */}
      <YachtIcon x={60} y={110} rotation={-30} color="#00d4ff" />
      <YachtIcon x={90} y={115} rotation={-25} color="#44ff88" />
      <YachtIcon x={130} y={108} rotation={-35} color="#fff" />
      {/* Movement arrows */}
      <path d="M60,106 L65,90" fill="none" stroke="#00d4ff" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
      <path d="M90,111 L93,90" fill="none" stroke="#44ff88" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
      <path d="M130,104 L128,90" fill="none" stroke="#fff" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
      {/* Favored end indicator */}
      <text x="28" y="75" fill="#44ff88" fontSize="7" textAnchor="middle">{tp('Выгодный', 'Favored', 'Korzystny')}</text>
      <text x="28" y="82" fill="#44ff88" fontSize="7" textAnchor="middle">{tp('конец', 'end', 'koniec')}</text>
    </svg>
  );
}

function MarkRoundingDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 200 130" className="w-full h-auto" aria-label="Mark rounding strategy">
      <rect width="200" height="130" rx="8" fill="#0d2847" />
      <circle cx="100" cy="50" r="8" fill="#ffaa00" stroke="#fff" strokeWidth="1.5" />
      <text x="100" y="30" fill="#ffaa00" fontSize="8" textAnchor="middle">{tp('Знак', 'Mark', 'Znak')}</text>
      <circle cx="100" cy="50" r="35" fill="none" stroke="#ffaa00" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.3" />
      <text x="140" y="48" fill="#ffaa00" fontSize="7" opacity="0.5">{tp('3 корпуса', '3 hull-lengths', '3 dlugosci kadluba')}</text>
      <path
        d="M60,115 Q55,80 80,55 Q95,42 110,50 Q120,58 115,75"
        fill="none" stroke="#44ff88" strokeWidth="2" strokeDasharray="5,3"
      />
      <text x="38" y="105" fill="#44ff88" fontSize="7">{tp('Широкий', 'Wide', 'Szeroki')}</text>
      <text x="38" y="113" fill="#44ff88" fontSize="7">{tp('подход', 'approach', 'podejscie')}</text>
      <text x="120" y="72" fill="#44ff88" fontSize="7">{tp('Узкий', 'Tight', 'Waski')}</text>
      <text x="120" y="80" fill="#44ff88" fontSize="7">{tp('выход', 'exit', 'wyjscie')}</text>
      <path
        d="M85,115 Q92,80 96,58"
        fill="none" stroke="#ff4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
      />
      <text x="88" y="96" fill="#ff4444" fontSize="7" opacity="0.6">{tp('Плохо', 'Bad', 'Zle')}</text>
      {/* Yacht */}
      <YachtIcon x={65} y={100} rotation={-50} color="#44ff88" />
    </svg>
  );
}

const strategyDiagrams: Record<string, React.ReactNode> = {
  upwind: <UpwindDiagram />,
  downwind: <DownwindDiagram />,
  start: <StartDiagram />,
  'mark-rounding': <MarkRoundingDiagram />,
};

function StrategyCard({ strategy, lang }: { strategy: typeof racingStrategies[number]; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const title = legacyPick(strategy, 'title', lang);
  const desc = legacyPick(strategy, 'description', lang);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-start gap-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
          {lang !== 'en' && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{strategy.titleEn}</p>
          )}
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{desc}</p>
        </div>
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 mt-1 text-[var(--text-muted)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? '600px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="px-5 pb-5 space-y-4">
          {/* Diagram */}
          <div className="max-w-xs mx-auto">
            {strategyDiagrams[strategy.id]}
          </div>

          {/* Tips */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--accent-cyan)] uppercase tracking-wider mb-2">
              {lang === 'ru' ? 'Советы / Tips' : lang === 'pl' ? 'Wskazowki / Tips' : 'Tips'}
            </h4>
            <ul className="space-y-2">
              {strategy.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[var(--accent-cyan)] mt-0.5 shrink-0">&#9656;</span>
                  <span>
                    <span className="text-[var(--text-primary)]">
                      {lang === 'pl' ? tip.pl : lang === 'en' ? tip.en : tip.ru}
                    </span>
                    {lang !== 'en' && (
                      <>
                        <br />
                        <span className="text-[var(--text-muted)] text-xs">{tip.en}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* EN description shown as italic subtitle only in non-EN modes */}
          {lang !== 'en' && (
            <p className="text-xs text-[var(--text-muted)] italic border-t border-[rgba(0,212,255,0.08)] pt-3">
              {strategy.descriptionEn}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Right of Way Rule Diagrams
// ---------------------------------------------------------------------------

function StarboardPortDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 160 100" className="w-full h-auto" aria-label="Starboard over port rule">
      <rect width="160" height="100" rx="6" fill="#0d2847" />
      {/* Starboard tack boat (right of way) */}
      <YachtIcon x={55} y={65} rotation={-40} color="#44ff88" />
      <text x="35" y="82" fill="#44ff88" fontSize="7" fontWeight="600">{tp('Правый галс', 'Starboard', 'Prawy hals')}</text>
      <YachtIcon x={105} y={55} rotation={220} color="#ff4444" />
      <text x="90" y="82" fill="#ff4444" fontSize="7">{tp('Левый галс', 'Port', 'Lewy hals')}</text>
      {/* Collision paths */}
      <line x1="60" y1="60" x2="80" y2="48" stroke="#44ff88" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
      <line x1="100" y1="50" x2="80" y2="48" stroke="#ff4444" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
      {/* Crossing indicator */}
      <circle cx="80" cy="48" r="6" fill="none" stroke="#ffaa00" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
      {/* Wind */}
      <line x1="140" y1="10" x2="140" y2="30" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.5" />
      <text x="140" y="8" fill="#00e5ff" fontSize="7" textAnchor="middle">Wind</text>
    </svg>
  );
}

function LeewardWindwardDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 160 100" className="w-full h-auto" aria-label="Leeward over windward rule">
      <rect width="160" height="100" rx="6" fill="#0d2847" />
      <line x1="15" y1="20" x2="40" y2="20" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.5" />
      <text x="28" y="15" fill="#00e5ff" fontSize="7" textAnchor="middle">Wind</text>
      <YachtIcon x={90} y={60} rotation={-30} color="#44ff88" />
      <text x="80" y="82" fill="#44ff88" fontSize="7" fontWeight="600">{tp('Подветренная', 'Leeward', 'Zawietrzny')}</text>
      <YachtIcon x={60} y={45} rotation={-30} color="#ff4444" />
      <text x="42" y="35" fill="#ff4444" fontSize="7">{tp('Наветренная', 'Windward', 'Nawietrzny')}</text>
      {/* Wind direction arrows between boats */}
      <line x1="30" y1="50" x2="50" y2="50" stroke="#00e5ff" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.3" />
    </svg>
  );
}

function OvertakingDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 160 100" className="w-full h-auto" aria-label="Overtaking boat keeps clear rule">
      <rect width="160" height="100" rx="6" fill="#0d2847" />
      <YachtIcon x={80} y={35} rotation={0} color="#44ff88" />
      <text x="92" y="38" fill="#44ff88" fontSize="7" fontWeight="600">{tp('Впереди', 'Ahead', 'Z przodu')}</text>
      <YachtIcon x={80} y={70} rotation={-10} color="#ff4444" />
      <text x="92" y="73" fill="#ff4444" fontSize="7">{tp('Обгоняющая', 'Overtaking', 'Wyprzedzajaca')}</text>
      <line x1="80" y1="82" x2="80" y2="22" stroke="#8ba7b8" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.3" />
      <text x="100" y="90" fill="#8ba7b8" fontSize="7" opacity="0.5">{tp('Направление', 'Direction', 'Kierunek')}</text>
    </svg>
  );
}

function MarkRoomDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 160 100" className="w-full h-auto" aria-label="Mark room rule">
      <rect width="160" height="100" rx="6" fill="#0d2847" />
      <circle cx="80" cy="30" r="6" fill="#ffaa00" stroke="#fff" strokeWidth="1" />
      <circle cx="80" cy="30" r="30" fill="none" stroke="#ffaa00" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.35" />
      <text x="115" y="28" fill="#ffaa00" fontSize="6" opacity="0.6">{tp('Зона', 'Zone', 'Strefa')}</text>
      <text x="115" y="35" fill="#ffaa00" fontSize="6" opacity="0.6">{tp('3 корп.', '3 hulls', '3 kadluby')}</text>
      <YachtIcon x={65} y={60} rotation={-40} color="#44ff88" />
      <text x="42" y="78" fill="#44ff88" fontSize="7" fontWeight="600">{tp('Внутренняя', 'Inside', 'Wewnetrzny')}</text>
      <YachtIcon x={95} y={65} rotation={-35} color="#ff4444" />
      <text x="95" y="85" fill="#ff4444" fontSize="7">{tp('Внешняя', 'Outside', 'Zewnetrzny')}</text>
    </svg>
  );
}

const ruleDiagrams: Record<string, React.ReactNode> = {
  'starboard-over-port': <StarboardPortDiagram />,
  'leeward-over-windward': <LeewardWindwardDiagram />,
  overtaking: <OvertakingDiagram />,
  'mark-room': <MarkRoomDiagram />,
};

function RulePriorityBadge({ priority }: { priority: number }) {
  return (
    <span className="badge badge-warning text-[10px]">
      #{priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Key Concepts
// ---------------------------------------------------------------------------

interface KeyConcept {
  titleRu: string;
  titleEn: string;
  titlePl: string;
  description: string;
  descriptionEn: string;
  descriptionPl: string;
  diagram: React.ReactNode;
}

function LaylineDiagram() {
  return (
    <svg viewBox="0 0 140 90" className="w-full h-auto">
      <rect width="140" height="90" rx="6" fill="#0d2847" />
      {/* Mark */}
      <circle cx="70" cy="18" r="5" fill="#ffaa00" stroke="#fff" strokeWidth="1" />
      {/* Left layline */}
      <line x1="70" y1="18" x2="20" y2="80" stroke="#ff4444" strokeWidth="1.2" strokeDasharray="4,3" />
      {/* Right layline */}
      <line x1="70" y1="18" x2="120" y2="80" stroke="#ff4444" strokeWidth="1.2" strokeDasharray="4,3" />
      {/* Yacht on layline */}
      <YachtIcon x={45} y={50} rotation={-40} color="#00d4ff" />
      {/* Labels */}
      <text x="12" y="75" fill="#ff4444" fontSize="7">Layline</text>
      <text x="105" y="75" fill="#ff4444" fontSize="7">Layline</text>
    </svg>
  );
}

function VMGDiagram() {
  return (
    <svg viewBox="0 0 140 90" className="w-full h-auto">
      <rect width="140" height="90" rx="6" fill="#0d2847" />
      {/* Wind */}
      <line x1="70" y1="6" x2="70" y2="20" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.6" />
      {/* Target axis */}
      <line x1="70" y1="20" x2="70" y2="85" stroke="#8ba7b8" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.3" />
      {/* Boat speed vector (diagonal) */}
      <line x1="70" y1="40" x2="110" y2="75" stroke="#00d4ff" strokeWidth="1.5" />
      <text x="100" y="60" fill="#00d4ff" fontSize="7">V boat</text>
      {/* VMG component (vertical) */}
      <line x1="70" y1="40" x2="70" y2="75" stroke="#44ff88" strokeWidth="2" />
      <text x="40" y="62" fill="#44ff88" fontSize="7" fontWeight="600">VMG</text>
      {/* Projection line */}
      <line x1="70" y1="75" x2="110" y2="75" stroke="#8ba7b8" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
    </svg>
  );
}

function ClearAirDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 140 90" className="w-full h-auto">
      <rect width="140" height="90" rx="6" fill="#0d2847" />
      {/* Wind arrows */}
      <line x1="30" y1="8" x2="30" y2="22" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.5" />
      <line x1="60" y1="8" x2="60" y2="22" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.5" />
      <line x1="90" y1="8" x2="90" y2="22" stroke="#00e5ff" strokeWidth="1" markerEnd="url(#windHead)" opacity="0.5" />
      {/* Leading boat */}
      <YachtIcon x={55} y={40} rotation={-30} color="#44ff88" />
      <text x="65" y="38" fill="#44ff88" fontSize="7">Clean air</text>
      {/* Trailing boat in shadow */}
      <YachtIcon x={75} y={70} rotation={-30} color="#ff4444" />
      {/* Wind shadow cone */}
      <path d="M55,45 L45,85 L85,85 Z" fill="#ff4444" opacity="0.08" />
      <path d="M55,45 L45,85" stroke="#ff4444" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.3" />
      <path d="M55,45 L85,85" stroke="#ff4444" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.3" />
      <text x="55" y="83" fill="#ff4444" fontSize="7" opacity="0.7" textAnchor="middle">{tp('Тень', 'Shadow', 'Cien')}</text>
    </svg>
  );
}

function WindShadowDiagram() {
  const { tp } = useI18n();
  return (
    <svg viewBox="0 0 140 90" className="w-full h-auto">
      <rect width="140" height="90" rx="6" fill="#0d2847" />
      {/* Wind arrows */}
      {[25, 50, 75, 100, 125].map((x) => (
        <line key={x} x1={x} y1="5" x2={x} y2="18" stroke="#00e5ff" strokeWidth="0.8" markerEnd="url(#windHead)" opacity="0.4" />
      ))}
      {/* Boat creating shadow */}
      <YachtIcon x={70} y={35} rotation={-20} color="#ffffff" />
      {/* Shadow zone */}
      <path d="M70,40 L40,88 L100,88 Z" fill="#5a7a8a" opacity="0.12" />
      <path d="M70,40 L40,88" stroke="#5a7a8a" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.4" />
      <path d="M70,40 L100,88" stroke="#5a7a8a" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.4" />
      {/* Disturbed wind arrows */}
      {[55, 70, 85].map((x) => (
        <line key={x} x1={x} y1="55" x2={x} y2="62" stroke="#5a7a8a" strokeWidth="0.6" strokeDasharray="1,2" opacity="0.4" />
      ))}
      <text x="70" y="80" fill="#5a7a8a" fontSize="8" textAnchor="middle">{tp('Ветровая тень', 'Wind shadow', 'Cien wiatru')}</text>
      <text x="70" y="88" fill="#5a7a8a" fontSize="6" textAnchor="middle">(Wind Shadow)</text>
    </svg>
  );
}

const keyConcepts: KeyConcept[] = [
  {
    titleRu: 'Лейлайн',
    titleEn: 'Layline',
    titlePl: 'Layline (linia dojscia)',
    description: 'Оптимальный курс, при котором яхта может достичь знака одним галсом без дополнительных поворотов. Пересечение лейлайна означает лишние повороты.',
    descriptionEn: 'Optimal course allowing the boat to reach the mark on one tack without extra turns. Crossing the layline means extra tacks.',
    descriptionPl: 'Optymalny kurs, przy ktorym jacht moze osiagnac znak jednym halsem bez dodatkowych zwrotow. Przekroczenie layline oznacza zbedne zwroty.',
    diagram: <LaylineDiagram />,
  },
  {
    titleRu: 'VMG (Velocity Made Good)',
    titleEn: 'VMG (Velocity Made Good)',
    titlePl: 'VMG (Velocity Made Good)',
    description: 'Проекция скорости яхты на направление к цели. Даже если бакштаг быстрее фордевинда, VMG показывает реальное приближение к нижнему знаку.',
    descriptionEn: 'The projection of boat speed onto the direction toward the target. Even if a broad reach is faster than a dead run, VMG shows the real rate of approach to the leeward mark.',
    descriptionPl: 'Projekcja predkosci jachtu na kierunek do celu. Nawet jesli baksztag jest szybszy od fordewindu, VMG pokazuje rzeczywiste zblizanie do znaku zawietrznego.',
    diagram: <VMGDiagram />,
  },
  {
    titleRu: 'Свободная вода',
    titleEn: 'Clear Air',
    titlePl: 'Czyste powietrze',
    description: 'Чистый, ненарушенный воздушный поток. Яхта в ветровой тени другой получает турбулентный и ослабленный ветер, теряя скорость.',
    descriptionEn: 'Clean, undisturbed wind flow. A boat in another boat\'s wind shadow gets turbulent and weakened wind, losing speed.',
    descriptionPl: 'Czysty, niezaklocony przeplyw powietrza. Jacht w cieniu wiatru innego otrzymuje turbulentny i oslabiony wiatr, tracac predkosc.',
    diagram: <ClearAirDiagram />,
  },
  {
    titleRu: 'Ветровая тень',
    titleEn: 'Wind Shadow',
    titlePl: 'Cien wiatru',
    description: 'Зона за яхтой (по ветру), где воздушный поток ослаблен и турбулентен. Может распространяться на 3-7 корпусов позади.',
    descriptionEn: 'Zone behind a boat (downwind) where airflow is weakened and turbulent. Can extend 3-7 boat-lengths behind.',
    descriptionPl: 'Strefa za jachtem (z wiatrem), gdzie przeplyw powietrza jest oslabiony i turbulentny. Moze sie rozciagac 3-7 dlugosci kadluba za jachtem.',
    diagram: <WindShadowDiagram />,
  },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function RacingPage() {
  const { lang, tp } = useI18n();
  return (
    <div className="page-enter">
      {/* Shared SVG defs for arrow markers used across all diagrams */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <marker id="windHead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="#00e5ff" />
          </marker>
        </defs>
      </svg>

      {/* Header */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
            style={{ background: 'linear-gradient(135deg, var(--text-primary), var(--warning))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {tp('Гоночные стратегии', 'Racing Strategy', 'Strategie regatowe')}
        </h1>
        {lang !== 'en' && <p className="text-sm text-[var(--text-muted)] mb-3">Racing Strategy</p>}
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
          {tp(
            'Всё о тактике парусных гонок: дистанция, стратегии лавировки и полных курсов, правила расхождения и ключевые гоночные понятия.',
            'Everything about sailing race tactics: the course, upwind and downwind strategies, right-of-way rules, and key racing concepts.',
            'Wszystko o taktyce regat zeglarskich: trasa, strategie halsowania i kursow pelnych, przepisy drogowe i kluczowe pojecia regatowe.',
          )}
        </p>
      </section>

      {/* Section 1: Race Course */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
        <RaceCourseDiagram />
      </section>

      {/* Section 2: Racing Strategies */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: 'rgba(0, 212, 255, 0.12)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold">{tp('Стратегии', 'Strategies', 'Strategie')}</h2>
            {lang !== 'en' && <p className="text-xs text-[var(--text-muted)]">Racing Strategies</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {racingStrategies.map((s) => (
            <StrategyCard key={s.id} strategy={s} lang={lang} />
          ))}
        </div>
      </section>

      {/* Section 3: Right of Way Rules */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: 'rgba(255, 170, 0, 0.12)', border: '1px solid rgba(255, 170, 0, 0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold">{tp('Правила расхождения', 'Right of Way Rules', 'Przepisy drogowe')}</h2>
            {lang !== 'en' && <p className="text-xs text-[var(--text-muted)]">Right of Way Rules</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {racingRules
            .sort((a, b) => a.priority - b.priority)
            .map((rule) => {
              const title = legacyPick(rule, 'title', lang);
              const desc = legacyPick(rule, 'description', lang);
              return (
              <div key={rule.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold leading-snug">{title}</h3>
                    {lang !== 'en' && <p className="text-xs text-[var(--text-muted)] mt-0.5">{rule.titleEn}</p>}
                  </div>
                  <RulePriorityBadge priority={rule.priority} />
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                {lang !== 'en' && <p className="text-xs text-[var(--text-muted)] italic">{rule.descriptionEn}</p>}

                <div className="max-w-[200px]">
                  {ruleDiagrams[rule.id]}
                </div>
              </div>
              );
            })}
        </div>
      </section>

      {/* Section 4: Key Concepts */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: 'rgba(68, 255, 136, 0.12)', border: '1px solid rgba(68, 255, 136, 0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold">{tp('Ключевые понятия', 'Key Concepts', 'Kluczowe pojecia')}</h2>
            {lang !== 'en' && <p className="text-xs text-[var(--text-muted)]">Key Concepts</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {keyConcepts.map((concept) => {
            const ctitle = legacyPick(concept, 'title', lang);
            const cdesc = lang === 'pl' ? concept.descriptionPl : lang === 'en' ? concept.descriptionEn : concept.description;
            return (
            <div key={concept.titleRu} className="card p-5 space-y-3">
              <div>
                <h3 className="text-base font-semibold">{ctitle}</h3>
                {lang !== 'en' && concept.titleEn !== ctitle && (
                  <p className="text-xs text-[var(--text-muted)]">{concept.titleEn}</p>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{cdesc}</p>
              <div className="max-w-[180px]">
                {concept.diagram}
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
