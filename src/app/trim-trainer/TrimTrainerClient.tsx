'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

// ============================================================================
// Sail-trim trainer
// Three-column UI: controls (left) / boat view (center) / effects (right).
// Physics is a learning model, NOT simulator-grade: trim efficiency 0..100%
// drives effective sail force, heel, speed and "advice text" rules.
// ============================================================================

type Course = 'close-hauled' | 'beam' | 'broad';
type Wind = 'light' | 'medium' | 'heavy';
type SailMode = 'both' | 'main-only' | 'jib-only';
type View = 'top' | 'side' | 'airflow';

const COURSE_TWA: Record<Course, number> = { 'close-hauled': 45, 'beam': 90, 'broad': 135 };
const WIND_MUL: Record<Wind, number> = { light: 0.65, medium: 1.0, heavy: 1.3 };
const COURSE_LABELS: Record<Course, { ru: string; en: string }> = {
  'close-hauled': { ru: 'Бейдевинд', en: 'Close-hauled' },
  'beam':         { ru: 'Галфвинд',   en: 'Beam reach' },
  'broad':        { ru: 'Бакштаг',    en: 'Broad reach' },
};

/**
 * Optimal main angle (deg from centerline) for a given course.
 * Roughly what a trimmer would set.
 */
function optimalMainAngle(course: Course): number {
  return course === 'close-hauled' ? 10 : course === 'beam' ? 45 : 75;
}
function optimalJibAngle(course: Course): number {
  return course === 'close-hauled' ? 8 : course === 'beam' ? 35 : 55;
}

/**
 * Trim efficiency for one sail: 1.0 when angle = optimal, drops as you deviate.
 * Falls to 0 at ~35 deg off-optimal.
 */
function trimEfficiency(angle: number, optimal: number): number {
  const dev = Math.abs(angle - optimal);
  if (dev >= 35) return 0;
  return Math.max(0, 1 - (dev / 35) ** 1.4);
}

interface TrimState {
  course: Course;
  wind: Wind;
  mainAngle: number;
  jibAngle: number;
  reef: 0 | 1 | 2;
  jibFurl: number; // 0..100  (100 = fully out)
  sailMode: SailMode;
}

interface TrimResult {
  speed: number;          // 0..~8 kts (heuristic)
  heel: number;           // 0..30 deg
  balance: number;        // -1..+1 (weather helm < 0 < lee helm)
  trimEff: number;        // 0..1 overall
  mainEff: number;        // 0..1
  jibEff: number;         // 0..1
  comments: string[];
}

function compute(s: TrimState): TrimResult {
  const optMain = optimalMainAngle(s.course);
  const optJib = optimalJibAngle(s.course);

  // Per-sail efficiency at their current angle.
  const mainEff = s.sailMode === 'jib-only' ? 0 : trimEfficiency(s.mainAngle, optMain);
  const jibEff  = s.sailMode === 'main-only' ? 0 : trimEfficiency(s.jibAngle, optJib) * (s.jibFurl / 100);

  // Reefing - each reef removes ~25% sail area but lets you carry more wind
  const reefArea = 1 - s.reef * 0.22;
  const windM = WIND_MUL[s.wind];
  // Slot bonus when both sails are up AND both efficient
  const slotBonus = (mainEff > 0.55 && jibEff > 0.55) ? 0.15 : 0;

  // Combined drive
  const mainDrive = mainEff * 0.6 * reefArea;
  const jibDrive = jibEff * 0.4;
  const combined = (mainDrive + jibDrive) * (1 + slotBonus);
  const speed = Math.min(7.5, 7.5 * combined * windM);

  // Heel depends on wind force + sail-area, reduced by reefing
  const apparent = windM * (mainDrive + jibDrive);   // "force felt"
  const heelSource = s.course === 'close-hauled' ? 1.0 : s.course === 'beam' ? 0.9 : 0.55;
  const heel = Math.min(30, apparent * heelSource * 28);

  // Balance: weather-helm if main overtrimmed or jib undertrimmed, etc.
  const balance = (mainEff - jibEff) * (s.sailMode === 'both' ? 1 : 0);

  // Comments (rule-engine)
  const comments: string[] = [];
  if (s.sailMode === 'main-only') comments.push('Только грот: теряешь slot effect, скорость ниже на 15-25%.');
  if (s.sailMode === 'jib-only')  comments.push('Только стаксель: лодка идёт, но без основного двигателя. Крен меньше, скорость низкая.');

  if (s.sailMode !== 'jib-only') {
    const dev = s.mainAngle - optMain;
    if (dev > 10) comments.push(`Грот перетравлен на +${Math.round(dev)}° - теряешь тягу. Выбрать.`);
    else if (dev < -10) comments.push(`Грот зажат на ${Math.round(-dev)}° - хлопает и тормозит. Потравить.`);
  }
  if (s.sailMode !== 'main-only') {
    const dev = s.jibAngle - optJib;
    if (dev > 10) comments.push(`Стаксель открыт слишком: поток уходит не на грот, slot слабый.`);
    else if (dev < -10) comments.push(`Стаксель перетянут: закрывает грот в подветр, грот заполаскивает.`);
    if (s.jibFurl < 100 && s.jibFurl > 30)
      comments.push(`Стаксель закручен на ${100 - s.jibFurl}%: площадь меньше, тяга меньше. Нормально для сильного ветра.`);
    if (s.jibFurl <= 30) comments.push(`Стаксель почти убран - работает как фок-шторм.`);
  }
  if (s.reef > 0) {
    const pct = s.reef * 22;
    comments.push(`${s.reef} риф${s.reef === 2 ? 'а' : ''}: -${pct}% площади грота → крен меньше, управляемость лучше в сильный ветер.`);
  }
  if (s.wind === 'heavy' && s.reef === 0 && s.sailMode === 'both')
    comments.push('Сильный ветер + полный грот = перегруз. Попробуй взять 1 риф.');
  if (s.wind === 'light' && s.reef > 0)
    comments.push('Слабый ветер + рифы = ты работаешь против себя. Отдай рифы.');

  if (slotBonus > 0) comments.push('✓ Slot effect работает: между гротом и стакселем поток ускоряется, оба паруса тянут вместе.');

  const trimEff = s.sailMode === 'main-only' ? mainEff
                 : s.sailMode === 'jib-only' ? jibEff * (s.jibFurl / 100)
                 : (mainEff * 0.55 + jibEff * 0.45) * (1 + slotBonus / 2);

  if (comments.length === 0) comments.push('Настройка близка к оптимуму.');

  return { speed, heel, balance, trimEff: Math.min(1, trimEff), mainEff, jibEff, comments };
}

// ============================================================================

export default function TrimTrainerClient() {
  const [state, setState] = useState<TrimState>({
    course: 'close-hauled',
    wind: 'medium',
    mainAngle: 15,
    jibAngle: 12,
    reef: 0,
    jibFurl: 100,
    sailMode: 'both',
  });
  const [view, setView] = useState<View>('top');
  const [showGhost, setShowGhost] = useState(true);

  const result = useMemo(() => compute(state), [state]);
  const ghost = useMemo(() => {
    // Optimal state = same course/wind but sails at optimal angles, no reef
    const opt: TrimState = {
      ...state, sailMode: 'both', reef: 0, jibFurl: 100,
      mainAngle: optimalMainAngle(state.course),
      jibAngle: optimalJibAngle(state.course),
    };
    return compute(opt);
  }, [state]);

  const delta = {
    speed: result.speed - ghost.speed,
    heel: result.heel - ghost.heel,
    eff: result.trimEff - ghost.trimEff,
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2 text-xs font-medium"
               style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
            🎛 Тренажёр трима парусов
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Настройка грота и стакселя</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            Покрути углы парусов и посмотри, как меняется скорость, крен и баланс. Ghost-контур показывает оптимальную настройку.
          </p>
        </div>
        <Link href="/simulator" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          ← Симулятор
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr,280px] gap-4">
        {/* === CONTROLS (left) === */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">КУРС</div>
            <div className="grid grid-cols-3 gap-1">
              {(['close-hauled', 'beam', 'broad'] as Course[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setState((s) => ({ ...s, course: c, mainAngle: optimalMainAngle(c), jibAngle: optimalJibAngle(c) }))}
                  className="px-2 py-1.5 rounded text-xs font-semibold border"
                  style={{
                    borderColor: state.course === c ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: state.course === c ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    color: state.course === c ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  {COURSE_LABELS[c].ru}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">ВЕТЕР</div>
            <div className="grid grid-cols-3 gap-1">
              {(['light', 'medium', 'heavy'] as Wind[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setState((s) => ({ ...s, wind: w }))}
                  className="px-2 py-1.5 rounded text-xs font-semibold border"
                  style={{
                    borderColor: state.wind === w ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: state.wind === w ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    color: state.wind === w ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  {w === 'light' ? 'Слабый' : w === 'heavy' ? 'Сильный' : 'Средний'}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">РЕЖИМ ПАРУСОВ</div>
            <div className="grid grid-cols-3 gap-1">
              {([
                { id: 'both', label: 'Оба' },
                { id: 'main-only', label: 'Грот' },
                { id: 'jib-only', label: 'Стаксель' },
              ] as { id: SailMode; label: string }[]).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setState((s) => ({ ...s, sailMode: m.id }))}
                  className="px-2 py-1.5 rounded text-xs font-semibold border"
                  style={{
                    borderColor: state.sailMode === m.id ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: state.sailMode === m.id ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    color: state.sailMode === m.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main sail */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">ГРОТ: УГОЛ</div>
              <div className="text-xs font-mono" style={{ color: 'var(--accent-cyan)' }}>{Math.round(state.mainAngle)}°</div>
            </div>
            <input
              type="range" min={0} max={85} value={state.mainAngle}
              onChange={(e) => setState((s) => ({ ...s, mainAngle: Number(e.target.value) }))}
              className="w-full" style={{ accentColor: '#00d4ff' }}
              disabled={state.sailMode === 'jib-only'}
            />
            <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-0.5">
              <span>выбран</span><span>опт</span><span>потравлен</span>
            </div>
          </div>

          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">РИФЫ</div>
            <div className="grid grid-cols-3 gap-1">
              {[0, 1, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => setState((s) => ({ ...s, reef: r as 0 | 1 | 2 }))}
                  className="px-2 py-1.5 rounded text-xs font-semibold border"
                  style={{
                    borderColor: state.reef === r ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: state.reef === r ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    color: state.reef === r ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  {r === 0 ? 'Полный' : r === 1 ? '1 риф' : '2 рифа'}
                </button>
              ))}
            </div>
          </div>

          {/* Jib */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">СТАКСЕЛЬ: УГОЛ</div>
              <div className="text-xs font-mono" style={{ color: 'var(--accent-cyan)' }}>{Math.round(state.jibAngle)}°</div>
            </div>
            <input
              type="range" min={0} max={75} value={state.jibAngle}
              onChange={(e) => setState((s) => ({ ...s, jibAngle: Number(e.target.value) }))}
              className="w-full" style={{ accentColor: '#00d4ff' }}
              disabled={state.sailMode === 'main-only'}
            />
          </div>
          <div className="card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">СТАКСЕЛЬ: РАСКРЫТИЕ</div>
              <div className="text-xs font-mono" style={{ color: 'var(--accent-cyan)' }}>{state.jibFurl}%</div>
            </div>
            <input
              type="range" min={0} max={100} value={state.jibFurl}
              onChange={(e) => setState((s) => ({ ...s, jibFurl: Number(e.target.value) }))}
              className="w-full" style={{ accentColor: '#00d4ff' }}
              disabled={state.sailMode === 'main-only'}
            />
            <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-0.5">
              <span>убран</span><span>50%</span><span>полный</span>
            </div>
          </div>
        </div>

        {/* === BOAT VIEW (center) === */}
        <div className="space-y-3">
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(139, 167, 184, 0.08)' }}>
            {(['top', 'side', 'airflow'] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold"
                style={{
                  background: view === v ? 'var(--accent-cyan)' : 'transparent',
                  color: view === v ? '#0a1628' : 'var(--text-secondary)',
                }}>
                {v === 'top' ? 'Сверху' : v === 'side' ? 'Сбоку' : 'Потоки'}
              </button>
            ))}
          </div>
          <div className="card p-3 sm:p-4 flex justify-center">
            <BoatSVG view={view} state={state} result={result} ghost={showGhost ? ghost : null} />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2">
            <input type="checkbox" checked={showGhost} onChange={(e) => setShowGhost(e.target.checked)} />
            Показывать оптимальные углы (ghost)
          </label>
        </div>

        {/* === EFFECTS (right) === */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">ЭФФЕКТ</div>
            <Gauge label="Trim efficiency" value={Math.round(result.trimEff * 100)} suffix="%"
                   color={result.trimEff > 0.75 ? 'var(--success)' : result.trimEff > 0.5 ? 'var(--accent-cyan)' : result.trimEff > 0.25 ? 'var(--warning)' : 'var(--danger)'} />
            <Gauge label="Скорость" value={result.speed.toFixed(1)} suffix=" kts" color="var(--accent-cyan)" />
            <Gauge label="Крен" value={Math.round(result.heel)} suffix="°"
                   color={result.heel > 22 ? 'var(--danger)' : result.heel > 15 ? 'var(--warning)' : 'var(--success)'} />
            <div className="mt-3 text-[10px] text-[var(--text-muted)]">
              Грот: {Math.round(result.mainEff * 100)}% · Стаксель: {Math.round(result.jibEff * 100)}%
            </div>
          </div>

          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">VS ОПТИМАЛЬНАЯ НАСТРОЙКА</div>
            <div className="space-y-1.5 text-xs">
              <DeltaRow label="Скорость" delta={delta.speed} unit=" kts" goodIfPositive />
              <DeltaRow label="Крен" delta={delta.heel} unit="°" goodIfPositive={false} />
              <DeltaRow label="Trim eff" delta={Math.round(delta.eff * 100)} unit="%" goodIfPositive />
            </div>
          </div>

          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">КОММЕНТАРИЙ</div>
            <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              {result.comments.map((c, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="shrink-0 mt-0.5 w-1 h-1 rounded-full" style={{ background: c.startsWith('✓') ? 'var(--success)' : 'var(--accent-cyan)', alignSelf: 'flex-start' }} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 text-[10px] text-center text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
        Учебная модель: не симулятор полной физики. Фокус - научить как углы, рифы, закрутка и slot effect меняют скорость / крен. Для реалистичной гонки иди в <Link href="/simulator" className="text-[var(--accent-cyan)] hover:underline">Симулятор</Link> или <Link href="/game" className="text-[var(--accent-cyan)] hover:underline">Гонку</Link>.
      </div>
    </div>
  );
}

// ============================================================================

function DeltaRow({ label, delta, unit, goodIfPositive }: { label: string; delta: number; unit: string; goodIfPositive: boolean }) {
  const sign = delta > 0 ? '+' : '';
  const good = goodIfPositive ? delta >= -0.02 : delta <= 0.02;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono" style={{ color: good ? 'var(--success)' : 'var(--warning)' }}>
        {sign}{typeof delta === 'number' ? delta.toFixed(unit === '%' ? 0 : 1) : delta}{unit}
      </span>
    </div>
  );
}

function Gauge({ label, value, suffix, color }: { label: string; value: string | number; suffix: string; color: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
        <span>{label}</span>
        <span className="font-mono font-bold text-sm" style={{ color }}>{value}{suffix}</span>
      </div>
      {typeof value === 'number' && value <= 100 && suffix === '%' && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BoatSVG - switchable view: top, side, airflow-debug
// All three use the same state + result and overlay a ghost (optimal) when given.
// ============================================================================

function BoatSVG({ view, state, result, ghost }: {
  view: View; state: TrimState; result: TrimResult; ghost: TrimResult | null;
}) {
  const W = 340, H = 340;

  if (view === 'top') return <TopView W={W} H={H} state={state} ghost={ghost} />;
  if (view === 'side') return <SideView W={W} H={H} state={state} result={result} ghost={ghost} />;
  return <AirflowView W={W} H={H} state={state} result={result} />;
}

function TopView({ W, H, state, ghost: _ghost }: { W: number; H: number; state: TrimState; ghost: TrimResult | null }) {
  // Draw a top-down boat with main + jib at their angles.
  const cx = W / 2, cy = H / 2;
  const sign = state.course === 'close-hauled' || state.course === 'beam' || state.course === 'broad' ? 1 : 1;
  // Wind comes from top of the SVG, boat oriented at TWA from wind
  const boatRot = COURSE_TWA[state.course] * sign;   // boat heading offset from wind
  const mainDeg = state.mainAngle * sign;
  const jibDeg = state.jibAngle * sign;
  const areaMul = 1 - state.reef * 0.22;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <defs>
        <linearGradient id="tv-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#061428" /><stop offset="1" stopColor="#0a1f3d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#tv-bg)" rx="8" />

      {/* Wind from top */}
      <g stroke="#00d4ff" strokeWidth="1.2" fill="#00d4ff">
        <line x1={cx} y1="12" x2={cx} y2="40" />
        <polygon points={`${cx - 4},38 ${cx + 4},38 ${cx},44`} />
        <text x={cx} y="60" textAnchor="middle" fontSize="10" fill="#00d4ff">ветер</text>
      </g>

      <g transform={`translate(${cx} ${cy}) rotate(${boatRot})`}>
        {/* Hull */}
        <path d="M 0 -40 Q 12 0 7 35 L -7 35 Q -12 0 0 -40 Z"
              fill="#d7e8f4" stroke="#8fb4c9" strokeWidth="1" />
        {/* Mast dot */}
        <circle cx="0" cy="-10" r="2.5" fill="#333" />
        {/* Jib (in front of mast) */}
        {state.sailMode !== 'main-only' && (
          <g transform={`translate(0 -26) rotate(${jibDeg})`} opacity={state.jibFurl / 100}>
            <path d={`M 0 0 Q ${4 * (state.jibFurl / 100)} 10 ${1.5 * (state.jibFurl / 100)} 22 L 0 22 Z`}
                  fill="#f6fbff" stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {/* Main (behind mast) */}
        {state.sailMode !== 'jib-only' && (
          <g transform={`rotate(${mainDeg}) scale(1 ${areaMul})`}>
            <path d="M 0 -10 Q 10 10 2 32 L 0 32 Z"
                  fill="#f6fbff" stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}

        {/* Ghost overlay (dashed) */}
        {_ghost && state.sailMode === 'both' && (
          <>
            <g transform={`translate(0 -26) rotate(${optimalJibAngle(state.course)})`} opacity="0.35">
              <path d="M 0 0 Q 4 10 1.5 22 L 0 22 Z" fill="none" stroke="#44ff88" strokeWidth="1" strokeDasharray="2 2" />
            </g>
            <g transform={`rotate(${optimalMainAngle(state.course)})`} opacity="0.35">
              <path d="M 0 -10 Q 10 10 2 32 L 0 32 Z" fill="none" stroke="#44ff88" strokeWidth="1" strokeDasharray="2 2" />
            </g>
          </>
        )}
      </g>

      <text x="8" y={H - 10} fontSize="9" fill="#5a7a8a">
        TWA {COURSE_TWA[state.course]}° · {COURSE_LABELS[state.course].ru}
      </text>
    </svg>
  );
}

function SideView({ W, H, state, result, ghost }: { W: number; H: number; state: TrimState; result: TrimResult; ghost: TrimResult | null }) {
  const cx = W / 2, cy = H * 0.7;
  const heelDeg = result.heel * (state.course === 'close-hauled' ? -1 : -1);
  const areaMul = 1 - state.reef * 0.22;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <defs>
        <linearGradient id="sv-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#061428" /><stop offset="0.6" stopColor="#0a1f3d" /><stop offset="0.6" stopColor="#082540" /><stop offset="1" stopColor="#061428" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#sv-bg)" rx="8" />
      {/* Water line */}
      <line x1="0" y1={cy + 10} x2={W} y2={cy + 10} stroke="rgba(0, 212, 255, 0.3)" strokeDasharray="4 4" />

      <g transform={`translate(${cx} ${cy}) rotate(${heelDeg})`}>
        {/* Hull */}
        <path d="M -80 0 Q 0 -12 80 0 Q 70 14 -70 14 Z" fill="#d7e8f4" stroke="#8fb4c9" strokeWidth="1" />
        {/* Mast */}
        <line x1="0" y1="-3" x2="0" y2={-140 * areaMul} stroke="#d0d8e0" strokeWidth="2.5" />
        {/* Boom */}
        <line x1="0" y1="-10" x2="70" y2="-10" stroke="#d0d8e0" strokeWidth="2" />
        {/* Main sail */}
        {state.sailMode !== 'jib-only' && (
          <path d={`M 0 ${-140 * areaMul} Q 40 ${-70 * areaMul} 70 -10 L 0 -10 Z`}
                fill="#f6fbff" stroke="#ffffff" strokeWidth="1" />
        )}
        {/* Jib */}
        {state.sailMode !== 'main-only' && (
          <path d={`M 0 -60 Q ${30 * (state.jibFurl / 100)} -40 ${-60 * (state.jibFurl / 100)} 0 L 0 0 Z`}
                fill="#f6fbff" stroke="#ffffff" strokeWidth="1" opacity={state.jibFurl / 100} />
        )}
        {ghost && (
          <path d={`M 0 -140 Q 40 -70 70 -10 L 0 -10 Z`}
                fill="none" stroke="#44ff88" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
        )}
      </g>

      <text x="8" y={H - 10} fontSize="9" fill="#5a7a8a">
        Крен {Math.round(result.heel)}° · рифы {state.reef}
      </text>
    </svg>
  );
}

function AirflowView({ W, H, state, result }: { W: number; H: number; state: TrimState; result: TrimResult }) {
  const cx = W / 2, cy = H / 2;
  const boatRot = COURSE_TWA[state.course];
  const mainOk = result.mainEff > 0.55;
  const jibOk = result.jibEff > 0.55;
  const slotOk = mainOk && jibOk && state.sailMode === 'both';

  // Wind arrows as stream lines
  const arrows = [];
  for (let i = 0; i < 10; i++) {
    const x = 20 + i * (W - 40) / 9;
    arrows.push(
      <g key={i} stroke="#00d4ff" strokeWidth="0.9" fill="#00d4ff" opacity="0.5">
        <line x1={x} y1={8} x2={x} y2={H - 20} />
        <polygon points={`${x - 3},${H - 22} ${x + 3},${H - 22} ${x},${H - 16}`} />
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <rect x="0" y="0" width={W} height={H} fill="#061428" rx="8" />
      {arrows}
      <g transform={`translate(${cx} ${cy}) rotate(${boatRot})`}>
        {/* Hull */}
        <path d="M 0 -40 Q 12 0 7 35 L -7 35 Q -12 0 0 -40 Z" fill="#0a1628" stroke="#5a7a8a" strokeWidth="1" />
        {/* Main with efficiency color */}
        {state.sailMode !== 'jib-only' && (
          <g transform={`rotate(${state.mainAngle})`}>
            <path d="M 0 -10 Q 10 10 2 32 L 0 32 Z"
                  fill={mainOk ? 'rgba(68, 255, 136, 0.85)' : result.mainEff > 0.35 ? 'rgba(255, 221, 68, 0.85)' : 'rgba(255, 68, 68, 0.85)'}
                  stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {state.sailMode !== 'main-only' && (
          <g transform={`translate(0 -26) rotate(${state.jibAngle})`} opacity={state.jibFurl / 100}>
            <path d={`M 0 0 Q ${4 * (state.jibFurl / 100)} 10 ${1.5 * (state.jibFurl / 100)} 22 L 0 22 Z`}
                  fill={jibOk ? 'rgba(68, 255, 136, 0.85)' : result.jibEff > 0.35 ? 'rgba(255, 221, 68, 0.85)' : 'rgba(255, 68, 68, 0.85)'}
                  stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {/* Slot effect arrow between sails */}
        {slotOk && (
          <g>
            <path d="M 5 -15 Q 12 -5 6 15" fill="none" stroke="#44ff88" strokeWidth="1.2" strokeDasharray="3 2" />
            <polygon points="5,13 9,19 2,17" fill="#44ff88" />
            <text x="18" y="6" fontSize="9" fill="#44ff88" fontWeight="700">slot</text>
          </g>
        )}
      </g>
      <g fontSize="9" fill="#5a7a8a">
        <text x="8" y={H - 10}>зелёный = тянет · жёлтый = почти · красный = сорвало</text>
      </g>
    </svg>
  );
}
