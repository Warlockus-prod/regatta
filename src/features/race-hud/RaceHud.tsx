'use client';

import { useI18n } from "@/lib/i18n";
import { NO_GO_TWA } from "./target";

// The race HUD (game audit C2, 2026-10-22): what a racer reads at a glance.
// Speed against what the boat can make on this angle, the wind relative to
// the bow with the no-go sector, and the standings with the clock. Shared by
// the map and the 3D view of the race (src/app/game/GameClient.tsx).

const CARD = { backdropFilter: "blur(8px)", background: "rgba(21, 37, 64, 0.85)" } as const;

/** Speed and how much of the target speed for this angle the boat makes. */
export function SpeedCard({ speed, target, pointName, pointColor }: {
  speed: number;
  target: number;
  pointName: string;
  pointColor: string;
}) {
  const { tl } = useI18n();
  const share = target > 0.3 ? Math.min(1.2, speed / target) : 0;
  const tone = share >= 0.9 ? "var(--success, #3ddc84)" : share >= 0.7 ? "var(--warning, #ffaa00)" : "#ff6677";
  const targetLabel = tl({ ru: "цель", en: "target", pl: "cel", es: "objetivo", fr: "cible", de: "Ziel", it: "obiettivo" });
  return (
    <div className="card p-2 sm:p-3 w-[136px] sm:w-[168px]" style={CARD} data-testid="hud-speed">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-semibold tabular-nums text-[var(--text-primary)]">{speed.toFixed(1)}</span>
        <span className="text-xs text-[var(--text-muted)]">kn</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(0, 0, 0, 0.3)" }}>
        <div className="h-full" style={{ width: `${Math.min(100, share * 100)}%`, background: tone }} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-1 text-[11px] sm:text-xs">
        <span className="truncate" style={{ color: pointColor }}>{pointName}</span>
        <span className="shrink-0 tabular-nums text-[var(--text-muted)]">{targetLabel} {target > 0.3 ? target.toFixed(1) : "-"}</span>
      </div>
    </div>
  );
}

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
};

/**
 * The wind relative to the bow (bow up): where it comes from, the sector the
 * boat cannot sail into, and the true wind angle. `twa` is signed as the race
 * counts it (positive: wind over the port side).
 */
export function WindCompass({ twa }: { twa: number }) {
  const { tl } = useI18n();
  const from = -twa; // relative bearing of the wind source, clockwise from the bow
  const r = 30;
  const sector = `M 0 0 L ${polar(from - NO_GO_TWA, r)} A ${r} ${r} 0 0 1 ${polar(from + NO_GO_TWA, r)} Z`;
  const inNoGo = Math.abs(twa) < NO_GO_TWA;
  const label = tl({ ru: "Ветер относительно лодки", en: "Wind relative to the boat", pl: "Wiatr względem łódki", es: "Viento respecto al barco", fr: "Vent par rapport au bateau", de: "Wind relativ zum Boot", it: "Vento rispetto alla barca" });
  return (
    <div className="card flex flex-col items-center px-2 py-1.5" style={CARD} role="img" aria-label={`${label}: TWA ${Math.round(Math.abs(twa))}°`} data-testid="hud-wind">
      <svg width="64" height="64" viewBox="-34 -34 68 68" aria-hidden="true">
        <circle r="32" fill="rgba(10, 22, 40, 0.6)" stroke="rgba(139, 167, 184, 0.35)" strokeWidth="1" />
        <path d={sector} fill={inNoGo ? "rgba(255, 85, 102, 0.45)" : "rgba(255, 85, 102, 0.22)"} />
        {/* The boat, bow up. */}
        <path d="M 0 -13 C 5 -6 5 6 3 12 L -3 12 C -5 6 -5 -6 0 -13 Z" fill="#e8f4f8" />
        {/* Wind: from the rim toward the boat. */}
        <g transform={`rotate(${from})`}>
          <line x1="0" y1="-31" x2="0" y2="-17" stroke="#cfe6ff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M -4.5 -21 L 0 -15 L 4.5 -21" fill="none" stroke="#cfe6ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
      <span className="text-xs font-semibold tabular-nums" style={{ color: inNoGo ? "#ff8899" : "var(--text-primary)" }}>TWA {Math.round(Math.abs(twa))}°</span>
    </div>
  );
}

export interface StandingRow { id: string; name: string; color: string; isPlayer: boolean }

/** Places with the clock: the top three, and the player if lower. */
export function Standings({ rows, time }: { rows: StandingRow[]; time: string }) {
  const { tl } = useI18n();
  const you = tl({ ru: "Ты", en: "You", pl: "Ty", es: "Tú", fr: "Toi", de: "Du", it: "Tu" });
  const playerIndex = rows.findIndex((r) => r.isPlayer);
  const shown = rows.map((r, i) => ({ ...r, place: i + 1 })).filter((r, i) => i < 3 || r.isPlayer);
  const title = tl({ ru: "Места", en: "Standings", pl: "Kolejność", es: "Clasificación", fr: "Classement", de: "Platzierung", it: "Classifica" });
  return (
    <div className="card p-2 sm:p-3 w-[132px] sm:w-[160px]" style={CARD} aria-label={title} data-testid="hud-standings">
      <div className="mb-1 flex items-baseline justify-between gap-1">
        <span className="text-lg sm:text-xl font-semibold tabular-nums text-[var(--text-primary)]">{playerIndex + 1}<span className="text-xs text-[var(--text-muted)]"> / {rows.length}</span></span>
        <span className="text-xs font-mono text-[var(--text-secondary)]">{time}</span>
      </div>
      <ol className="space-y-0.5 text-[11px] sm:text-xs">
        {shown.map((r) => (
          <li key={r.id} className="flex items-center gap-1.5" style={{ color: r.isPlayer ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: r.isPlayer ? 600 : 400 }}>
            <span className="w-3 tabular-nums text-right">{r.place}</span>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="truncate">{r.isPlayer ? you : r.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type ToastTone = "good" | "bad" | "info";

/** One short race event (a tack's cost, a mark split, an overtake). */
export function RaceToast({ text, tone }: { text: string; tone: ToastTone }) {
  const color = tone === "good" ? "#3ddc84" : tone === "bad" ? "#ff8899" : "var(--text-primary)";
  return (
    <div role="status" aria-live="polite" className="card px-3 py-1.5 text-sm font-semibold whitespace-nowrap" style={{ ...CARD, color }} data-testid="hud-toast">
      {text}
    </div>
  );
}
