'use client';

// ---------------------------------------------------------------------------
// ActionButtons - tactical controls for race mode.
//
// Tack / Gybe: temporal. Click starts a maneuver; the button shows a radial
// progress ring while it runs; conflicting buttons are disabled. At the end
// the tack flips (physics handles the actual boat turn via target heading).
//
// Ease / Trim: instant per-click adjustment to the trim offset, which is
// applied in uiToControls on top of the auto-trim for the current TWA.
// ---------------------------------------------------------------------------

export type ManeuverKind = 'tack' | 'gybe';

export interface ActiveManeuver {
  kind: ManeuverKind;
  startedAtMs: number;
  durationMs: number;
}

export function ActionButtons({
  maneuver,
  onTack,
  onGybe,
  onEase,
  onTrim,
  trimOffsetPct,
  tp,
}: {
  maneuver: ActiveManeuver | null;
  onTack: () => void;
  onGybe: () => void;
  onEase: () => void;
  onTrim: () => void;
  trimOffsetPct: number;
  tp: (ru: string, en: string, pl: string) => string;
}) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const progress = maneuver
    ? Math.min(1, (now - maneuver.startedAtMs) / maneuver.durationMs)
    : 0;
  const remainingSec = maneuver
    ? Math.max(0, (maneuver.durationMs - (now - maneuver.startedAtMs)) / 1000)
    : 0;

  const isTacking = maneuver?.kind === 'tack';
  const isGybing = maneuver?.kind === 'gybe';
  const locked = !!maneuver;

  return (
    <div
      className="rounded-xl p-2 flex flex-col gap-1.5 min-w-[170px]"
      style={{
        background: 'rgba(5, 11, 24, 0.72)',
        border: '1px solid rgba(0, 212, 255, 0.22)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
      }}
    >
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold px-1">
        {tp('ДЕЙСТВИЯ', 'ACTIONS', 'AKCJE')}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <ActionSlot
          label={tp('ПОВОРОТ', 'TACK', 'ZWROT')}
          onClick={onTack}
          disabled={locked}
          active={isTacking}
          progress={isTacking ? progress : 0}
          remainingSec={isTacking ? remainingSec : 0}
        />
        <ActionSlot
          label={tp('ФОРДЕВИНД', 'GYBE', 'FORDEWIND')}
          onClick={onGybe}
          disabled={locked}
          active={isGybing}
          progress={isGybing ? progress : 0}
          remainingSec={isGybing ? remainingSec : 0}
        />
        <ActionSlot
          label={tp('ОТДАТЬ', 'EASE', 'LUZUJ')}
          onClick={onEase}
          disabled={locked || trimOffsetPct >= 30}
          size="small"
        />
        <ActionSlot
          label={tp('ВЫБРАТЬ', 'TRIM', 'BIERZ')}
          onClick={onTrim}
          disabled={locked || trimOffsetPct <= -30}
          size="small"
        />
      </div>
      {trimOffsetPct !== 0 && (
        <div className="text-[9px] text-center font-mono tabular-nums"
             style={{ color: trimOffsetPct > 0 ? 'var(--warning)' : 'var(--accent-cyan)' }}>
          {trimOffsetPct > 0 ? '+' : ''}{trimOffsetPct}% {tp('трим', 'trim', 'trim')}
        </div>
      )}
    </div>
  );
}

function ActionSlot({
  label,
  onClick,
  disabled,
  active = false,
  progress = 0,
  remainingSec = 0,
  size = 'normal',
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  active?: boolean;
  progress?: number;
  remainingSec?: number;
  size?: 'normal' | 'small';
}) {
  const height = size === 'small' ? 'py-2' : 'py-3';
  const borderColor = active
    ? 'var(--accent-cyan)'
    : disabled
    ? 'rgba(139, 167, 184, 0.12)'
    : 'rgba(0, 212, 255, 0.35)';
  const bg = active
    ? 'rgba(0, 212, 255, 0.22)'
    : disabled
    ? 'rgba(139, 167, 184, 0.05)'
    : 'rgba(0, 212, 255, 0.08)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${height} rounded-lg border font-bold uppercase tracking-wider text-[10px] transition disabled:cursor-not-allowed`}
      style={{
        borderColor,
        background: bg,
        color: active ? 'var(--accent-cyan)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
      }}
    >
      {/* Progress bar along the bottom when active */}
      {active && (
        <span
          className="absolute bottom-0 left-0 h-0.5 rounded-b-lg"
          style={{ width: `${progress * 100}%`, background: 'var(--accent-cyan)' }}
        />
      )}
      <span className="block">{label}</span>
      {active && remainingSec > 0.1 && (
        <span className="block text-[9px] font-mono tabular-nums" style={{ color: 'var(--accent-cyan)' }}>
          {remainingSec.toFixed(1)}s
        </span>
      )}
    </button>
  );
}
