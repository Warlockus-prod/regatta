'use client';

// F5 race intro (race-intro.ts): a modal sheet of four small cards, each a
// schematic picture of the race HUD and a few sentences. Before the first
// race the header offers Skip and the last card has Start race as its one
// primary action; opened on request the header says Close and the last card
// Got it. Keyboard: Esc skips or closes, the arrows move between cards, Tab
// stays inside the sheet, and every key stays out of the race underneath
// (Esc there would resume the paused race). Focus starts on the primary
// action, follows it from card to card and goes back to the opener on close.
// The pictures are inline SVG on their own fixed dark water like the
// briefing's course chart (no asset, CSP), drawn from the race's own parts:
// the wind dial's geometry (wind-dial.ts) and the race icons. They are hidden
// from screen readers: the card text says the same. No animation.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { RACE_INTRO_COPY, raceIntroStepLabel } from "@/data/race-intro-copy";
import { RACE_INTRO_CARDS, raceIntroMove, type RaceIntroCard, type RaceIntroEnd, type RaceIntroOpen } from "./race-intro";
import { bowRelativeWind } from "./wind-dial";
import { ExpandIcon, HintIcon } from "./RaceIcons";
import styles from "./RaceIntro.module.css";

export interface RaceIntroProps {
  open: Exclude<RaceIntroOpen, "closed">;
  /** Pro: the steering card shows the sheets as the player's own. */
  pro: boolean;
  onEnd: (end: RaceIntroEnd) => void;
  /** Package 7: the solo race's best VMG angle to windward (raceUpwind), where
   * the wind card's sector ends; online it is the hint's planner angle. */
  upwindTwa?: number;
}

export function RaceIntro({ open, pro, onEnd, upwindTwa }: RaceIntroProps) {
  const { tl, lang } = useI18n();
  const [index, setIndex] = useState(0);
  const first = open === "first";
  const online = open === "multiplayer";
  const card = RACE_INTRO_CARDS[index];
  const last = index === RACE_INTRO_CARDS.length - 1;
  const copy = RACE_INTRO_COPY.cards[card];
  const titleId = useId(), bodyId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const move = (to: "next" | "back") => setIndex(i => raceIntroMove(i, to));
  const dismiss = () => onEnd(first ? "skip" : "close");
  const primary = () => { if (last) onEnd(first ? "start" : "done"); else move("next"); };
  // The key handler of this render, called by the one window listener below.
  const onKey = (e: globalThis.KeyboardEvent) => {
    e.stopImmediatePropagation();
    if (e.key === "Escape") { e.preventDefault(); dismiss(); return; }
    if (e.key === "ArrowRight" && !last) { e.preventDefault(); move("next"); return; }
    if (e.key === "ArrowLeft" && index > 0) { e.preventDefault(); move("back"); return; }
    if (e.key !== "Tab") return;
    const items = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    if (!items.length) return;
    const active = document.activeElement;
    const head = items[0], tail = items[items.length - 1];
    if (!active || !sheetRef.current?.contains(active) || active === sheetRef.current) { e.preventDefault(); (e.shiftKey ? tail : head).focus(); }
    else if (e.shiftKey && active === head) { e.preventDefault(); tail.focus(); }
    else if (!e.shiftKey && active === tail) { e.preventDefault(); head.focus(); }
  };
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    // Back to the opener (the lobby link, the settings button) when the sheet goes.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Capture on the window: the first listener of every key, wherever the focus is.
    const listener = (e: globalThis.KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", listener, true);
    const restore = layerRef.current ? inertOutside(layerRef.current) : () => {};
    return () => {
      window.removeEventListener("keydown", listener, true);
      restore();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => { primaryRef.current?.focus({ preventScroll: true }); }, [index]);
  const primaryLabel = !last ? tl(RACE_INTRO_COPY.next) : first ? tl(RACE_INTRO_COPY.start) : tl(RACE_INTRO_COPY.done);
  const extra = card === "steer" ? RACE_INTRO_COPY.cards.steer[online ? "online" : pro ? "pro" : "simple"]
    : card === "hud" && !online ? RACE_INTRO_COPY.cards.hud.hintLog : null;
  return <div ref={layerRef} className={styles.layer} data-testid="race-intro" data-open={open}>
    <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} data-card={card} tabIndex={-1}>
      <div className={styles.head}>
        <span className={styles.step} data-testid="race-intro-step">{raceIntroStepLabel(lang, index + 1, RACE_INTRO_CARDS.length)}</span>
        <button type="button" className={styles.secondary} onClick={dismiss} data-testid="race-intro-skip">
          {first ? tl(RACE_INTRO_COPY.skip) : tl(RACE_INTRO_COPY.close)}
        </button>
      </div>
      <div className={styles.picture} aria-hidden="true"><IntroPicture card={card} pro={pro && !online} online={online} upwindTwa={upwindTwa} /></div>
      <div className={styles.text} aria-live="polite">
        <h2 id={titleId}>{tl(card === "steer" && online ? RACE_INTRO_COPY.cards.steer.titleOnline : copy.title)}</h2>
        <p id={bodyId}>{tl(copy.body)}{extra && ` ${tl(extra)}`}</p>
      </div>
      <ol className={styles.dots} aria-hidden="true">
        {RACE_INTRO_CARDS.map((c, i) => <li key={c} data-current={i === index || undefined} />)}
      </ol>
      <div className={styles.actions}>
        {index > 0 && <button type="button" className={styles.secondary} onClick={() => move("back")} data-testid="race-intro-back">{tl(RACE_INTRO_COPY.back)}</button>}
        <button ref={primaryRef} type="button" className={styles.primary} onClick={primary}
          data-testid={!last ? "race-intro-next" : first ? "race-intro-start" : "race-intro-done"}>{primaryLabel}</button>
      </div>
    </div>
  </div>;
}

type InertNode = Pick<Element, "hasAttribute" | "setAttribute" | "removeAttribute"> & { parentElement: InertNode | null; children: ArrayLike<InertNode> };

/** Makes everything outside the node inert (the siblings of the node and of
 * each of its ancestors up to the body) and returns the undo, which only
 * touches what it changed. */
export function inertOutside(node: InertNode): () => void {
  const changed: InertNode[] = [];
  for (let child = node, parent = node.parentElement; parent; child = parent, parent = parent.parentElement) {
    for (const sibling of Array.from(parent.children)) {
      if (sibling === child || sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }
    if (parent === (typeof document === "undefined" ? null : document.body)) break;
  }
  return () => { for (const element of changed) element.removeAttribute("inert"); };
}

// --- The pictures --------------------------------------------------------

// Fixed inks on fixed dark water, as the briefing's course chart
// (RaceBriefing.tsx COURSE_PREVIEW_INK and its marks): wind and the boat in
// the light neutral, the upwind route a muted neutral, marks and the start
// line amber, the run home green, port red and starboard green as on the wind
// dial. Nothing here is pressed, so nothing is cyan.
export const INTRO_INK = {
  water: "#0a2233", panel: "#143a4f", wind: "#e8f4f8", route: "#b8cad6", muted: "#6f8a9c",
  mark: "#ffaa00", run: "#44ff88", port: "#e5484d", starboard: "#30a46c",
} as const;

function IntroPicture({ card, pro, online, upwindTwa }: { card: RaceIntroCard; pro: boolean; online: boolean; upwindTwa?: number }) {
  return <svg viewBox="0 0 240 150" className={styles.svg} data-testid={`race-intro-picture-${card}`} focusable="false">
    <rect width="240" height="150" rx="10" fill={INTRO_INK.water} />
    {card === "goal" ? <GoalPicture /> : card === "steer" ? <SteerPicture pro={pro} online={online} /> : card === "wind" ? <WindPicture upwindTwa={upwindTwa} /> : <HudPicture online={online} />}
  </svg>;
}

const WindArrow = ({ x, y1, y2 }: { x: number; y1: number; y2: number }) => <g stroke={INTRO_INK.wind} strokeWidth="2" strokeLinecap="round" fill="none">
  <line x1={x} y1={y1} x2={x} y2={y2} /><polyline points={`${x - 5},${y2 - 6} ${x},${y2} ${x + 5},${y2 - 6}`} />
</g>;

const Mark = ({ x, y, r = 7 }: { x: number; y: number; r?: number }) => <circle cx={x} cy={y} r={r} fill={INTRO_INK.mark} stroke="#fff" strokeWidth="1.5" />;

/** Start, the beat to the windward mark, rounding it to port, the run home. */
function GoalPicture() {
  return <g>
    <WindArrow x={28} y1={14} y2={46} />
    <line x1="110" y1="128" x2="190" y2="128" stroke={INTRO_INK.mark} strokeWidth="2" strokeDasharray="5 4" />
    <circle cx="110" cy="128" r="4" fill={INTRO_INK.mark} /><circle cx="190" cy="128" r="4" fill={INTRO_INK.mark} />
    <polyline points="152,120 128,98 174,70 164,42" fill="none" stroke={INTRO_INK.route} strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
    {/* Leave the mark to port: up its right side, over the top, down its left. */}
    <path d="M164 42 A14 14 0 0 0 136 38" fill="none" stroke={INTRO_INK.wind} strokeWidth="2.5" strokeLinecap="round" />
    <polyline points="131,32 136,40 141,33" fill="none" stroke={INTRO_INK.wind} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Mark x={150} y={36} />
    <polyline points="136,44 126,86 142,124" fill="none" stroke={INTRO_INK.run} strokeWidth="2" strokeLinejoin="round" />
    <path d="M152 112 C156 118 157 126 156 134 H148 C147 126 148 118 152 112Z" fill={INTRO_INK.wind} />
  </g>;
}

/** The scene over the dock: the Helm tab, the helm in the middle, the two sheets beside it (the player's in Pro, none online). */
function SteerPicture({ pro, online }: { pro: boolean; online: boolean }) {
  const sheet = pro ? { stroke: INTRO_INK.wind, strokeDasharray: undefined, opacity: 1 } : { stroke: INTRO_INK.muted, strokeDasharray: "3 3", opacity: .8 };
  const wheel = (x: number, r: number, style: { stroke: string; strokeDasharray?: string; opacity: number }) => <g fill="none" strokeWidth="2" strokeLinecap="round" {...style}>
    <circle cx={x} cy={128} r={r} /><circle cx={x} cy={128} r={r / 5} />
    <path d={`M${x} ${128 - r}v${r * .7}M${x} ${128 + r * .3}v${r * .7}M${x - r} 128h${r * .7}M${x + r * .3} 128h${r * .7}`} />
  </g>;
  return <g>
    <path d="M120 22 C128 33 129 50 127 66 H113 C111 50 112 33 120 22Z" fill={INTRO_INK.wind} />
    <path d="M100 44 A24 24 0 0 0 100 64" fill="none" stroke={INTRO_INK.route} strokeWidth="2" strokeLinecap="round" />
    <path d="M140 44 A24 24 0 0 1 140 64" fill="none" stroke={INTRO_INK.route} strokeWidth="2" strokeLinecap="round" />
    <rect x="0" y="84" width="240" height="66" fill={INTRO_INK.panel} />
    <rect x="8" y="90" width="52" height="12" rx="4" fill="none" stroke={INTRO_INK.wind} strokeWidth="2" />
    {[66, 124, 182].map(x => <rect key={x} x={x} y="90" width="50" height="12" rx="4" fill="none" stroke={INTRO_INK.muted} strokeWidth="1.5" />)}
    {!online && wheel(52, 12, sheet)}
    {wheel(120, 17, { stroke: INTRO_INK.wind, opacity: 1 })}
    {!online && wheel(188, 12, sheet)}
  </g>;
}

/** The online hint's beat angle (race-guidance.ts guidanceToTarget default,
 * PLANNER_CLOSE_HAULED_TWA); not imported, so the intro chunk stays light. */
const ONLINE_CLOSE_HAULED_TWA = 45;

/** The race wind dial, bow up, wind from port, the sector the boat cannot make
 * good either side of the bow; beside it, tacking up to the mark. */
function WindPicture({ upwindTwa }: { upwindTwa?: number }) {
  // Package 7: the picture states no no-go number. Its sector ends where the
  // suggested course sails on the beat: the solo race passes its best VMG
  // angle (raceUpwind, the solver the hint and the grade share); online the
  // hint beats at the planner's own angle.
  const half = useMemo(() => (upwindTwa ?? ONLINE_CLOSE_HAULED_TWA) * Math.PI / 180, [upwindTwa]);
  const wind = bowRelativeWind(-half * 180 / Math.PI - 8)!;
  const rimX = 42 * Math.sin(half), rimY = 42 * Math.cos(half);
  return <g>
    <g transform="translate(8 5) scale(1.4)">
      <path d={`M50 50 L${50 - rimX} ${50 - rimY} A42 42 0 0 1 ${50 + rimX} ${50 - rimY} Z`} fill={INTRO_INK.port} opacity=".28" />
      <circle cx="50" cy="50" r="42" fill="none" stroke={INTRO_INK.route} strokeOpacity=".6" strokeWidth="2" />
      <path d="M9.6 40A42 42 0 0 0 9.6 60" fill="none" stroke={INTRO_INK.port} strokeWidth="5" strokeLinecap="round" />
      <path d="M90.4 40A42 42 0 0 1 90.4 60" fill="none" stroke={INTRO_INK.starboard} strokeWidth="5" strokeLinecap="round" />
      <path d="M50 30C57 38 58 52 56 68H44C42 52 43 38 50 30Z" fill={INTRO_INK.route} />
      <g fill="none" stroke={INTRO_INK.wind} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={wind.tail.x} y1={wind.tail.y} x2={wind.head.x} y2={wind.head.y} />
        <polyline points={`${wind.barbs[0].x},${wind.barbs[0].y} ${wind.head.x},${wind.head.y} ${wind.barbs[1].x},${wind.barbs[1].y}`} />
      </g>
    </g>
    <WindArrow x={196} y1={6} y2={24} />
    <Mark x={196} y={36} r={5} />
    <polyline points="182,142 212,112 180,82 208,54 199,42" fill="none" stroke={INTRO_INK.route} strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
    {[[212, 112], [180, 82], [208, 54]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill={INTRO_INK.wind} />)}
  </g>;
}

/** The race screen: the wind box and the corner map, the route to the mark, the coach line with the hint log bulb (solo only). */
function HudPicture({ online }: { online: boolean }) {
  return <g>
    <rect x="8" y="8" width="66" height="40" rx="6" fill={INTRO_INK.panel} stroke={INTRO_INK.muted} />
    <circle cx="27" cy="28" r="12" fill="none" stroke={INTRO_INK.route} strokeWidth="1.5" />
    <line x1="18" y1="20" x2="25" y2="26" stroke={INTRO_INK.wind} strokeWidth="2.5" strokeLinecap="round" />
    <rect x="44" y="20" width="22" height="4" rx="2" fill={INTRO_INK.route} /><rect x="44" y="30" width="16" height="4" rx="2" fill={INTRO_INK.muted} />
    <rect x="172" y="8" width="60" height="60" rx="6" fill={INTRO_INK.panel} stroke={INTRO_INK.muted} />
    <circle cx="202" cy="20" r="3.5" fill={INTRO_INK.mark} />
    <line x1="190" y1="56" x2="214" y2="56" stroke={INTRO_INK.mark} strokeWidth="1.5" strokeDasharray="3 2" />
    <polyline points="204,54 196,40 206,28 203,23" fill="none" stroke={INTRO_INK.route} strokeWidth="1.5" strokeDasharray="2 2" />
    <circle cx="204" cy="50" r="2.5" fill={INTRO_INK.wind} />
    <ExpandIcon x={174} y={50} size={14} color={INTRO_INK.wind} />
    <Mark x={140} y={50} r={6} />
    <line x1="118" y1="98" x2="136" y2="58" stroke={INTRO_INK.route} strokeWidth="1.5" strokeDasharray="3 4" />
    {[[122, 86], [129, 72]].map(([x, y]) => <polyline key={y} points={`${x - 6},${y + 5} ${x},${y - 2} ${x + 7},${y + 3}`} fill="none" stroke={INTRO_INK.wind} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
    <path d="M114 92 C120 99 121 109 120 118 H110 C109 109 109 99 114 92Z" fill={INTRO_INK.wind} transform="rotate(24 114 106)" />
    <rect x="8" y="124" width="224" height="20" rx="6" fill={INTRO_INK.panel} stroke={INTRO_INK.muted} />
    {!online && <HintIcon x={12} y={126} size={16} color={INTRO_INK.wind} />}
    <rect x="34" y="132" width="110" height="4" rx="2" fill={INTRO_INK.route} /><rect x="152" y="132" width="44" height="4" rx="2" fill={INTRO_INK.muted} />
  </g>;
}
