'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./TrainerControls.module.css";
import { Wheel } from "./Wheel";
import type { ControlLabels } from "./labels";
import type { ControlPrefs } from "./prefs";
import {
  COURSE_TICK_DEG, RUDDER_DISPLAY_MAX_DEG, RUDDER_TICK_DEG, RUDDER_WHEEL_LOCK_DEG, SHEET_TICK,
  clamp, rudderToWheelAngle, ticksCrossed, wheelAngleToRudder, wheelToCourseDelta, wheelToEaseDelta,
} from "./mapping";
import { playTick, type TickKind } from "./sound";

// The wheel mode: a big helm wheel in the middle, the jib sheet and the
// mainsheet small at the sides. Tapping a small sheet wheel swaps it with
// the helm (the sheet goes big in the middle, the helm shrinks into that
// corner and stays usable); tapping the helm swaps back; after 4 s without
// a turn the sheet goes back by itself.

export interface HelmTarget {
  mapping: "course" | "rudder";
  /** Shown under the wheel and spoken, e.g. "113°" plus the unit text. */
  value: string;
  unit: string;
  ariaNow: number;
  ariaMin: number;
  ariaMax: number;
  /** Course mapping: degrees of course, positive = bow to starboard. Returns "tack"/"gybe" when the turn crossed the wind. */
  onCourseDelta?: (deg: number) => "tack" | "gybe" | null | void;
  /** Rudder mapping: the session rudder -1..1. */
  rudder?: number;
  setRudder?: (value: number) => void;
}

export interface SheetTarget {
  /** 0 = sheeted in, 1 = fully eased. */
  ease: number;
  setEase: (value: number) => void;
  /** Sail angle to the centerline, shown in brackets. */
  angleDeg?: number;
  /** A physical line can show metres while keeping normalized wheel travel. */
  valueText?: string;
  ariaNow?: number;
  ariaMin?: number;
  ariaMax?: number;
  /** Optional normalized step for physical-line keyboard/VoiceOver precision. */
  stepEase?: number;
}

type Slot = "helm" | "main" | "jib";
const HINT_KEY = "regatta.controls.wheelHint";
/** Room under a wheel for its two-line caption. */
const CAPTION_H = 40;
type Box = [cx: number, cy: number, d: number];

export function WheelDeck(props: {
  helm: HelmTarget;
  main?: SheetTarget | null;
  jib?: SheetTarget | null;
  prefs: ControlPrefs;
  labels: ControlLabels;
  layout: "bottom" | "column";
  /** Global keys: Q/A mainsheet, W/S jib sheet; arrows steer only when the surface has no arrow keys of its own. */
  arrowKeysSteer?: boolean;
  /** A parent race can own sheet shortcuts across all of its utility tabs. */
  sheetKeysEnabled?: boolean;
  note?: string;
  hideHint?: boolean;
}) {
  const { helm, main, jib, prefs, labels, layout, arrowKeysSteer, sheetKeysEnabled = true, note, hideHint } = props;
  const sheets = Boolean(main && jib);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 340, h: 260 });
  const [expanded, setExpanded] = useState<"main" | "jib" | null>(null);
  const [courseAngle, setCourseAngle] = useState(0);
  const [rudderAngle, setRudderAngle] = useState(() => rudderToWheelAngle(helm.rudder ?? 0));
  const courseAcc = useRef(0);
  // Pointer moves can arrive faster than React re-renders, so the wheels keep
  // their own latest value and adopt a prop only when someone else changed it.
  const rudderAngleRef = useRef(rudderAngle);
  const ourRudder = useRef<number | null>(null);
  const ease = useRef({ main: main?.ease ?? 0, jib: jib?.ease ?? 0 });
  const ourEase = useRef<{ main?: number; jib?: number }>({});
  const mainEase = main?.ease;
  const jibEase = jib?.ease;
  useEffect(() => {
    for (const [k, v] of [["main", mainEase], ["jib", jibEase]] as const) {
      if (v === undefined) continue;
      const ours = ourEase.current[k];
      if (ours === undefined || Math.abs(ours - v) > 1e-6) { ease.current[k] = v; ourEase.current[k] = undefined; }
    }
  }, [mainEase, jibEase]);
  const collapse = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hydration starts with the same hint on the server and client. The saved
  // visit count is browser-only and is synchronized after the deck mounts.
  const hintCounted = useRef(false);
  const [showNote, setShowNote] = useState(true);
  useEffect(() => {
    if (hideHint || hintCounted.current) return;
    hintCounted.current = true;
    try {
      const seen = Number(window.localStorage.getItem(HINT_KEY) ?? "0");
      window.localStorage.setItem(HINT_KEY, String(seen + 1));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser-only persistence is read after identical hydration markup.
      setShowNote(seen < 3);
    } catch { /* An unavailable preference keeps the introductory hint. */ }
  }, [hideHint]);

  const tick = useCallback((kind: TickKind) => { if (prefs.sound) playTick(kind); }, [prefs.sound]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A rudder set elsewhere (hold buttons, the slider, a reset) moves the drawn wheel too.
  useEffect(() => {
    if (helm.mapping !== "rudder") return;
    const r = helm.rudder ?? 0;
    if (ourRudder.current !== null && Math.abs(ourRudder.current - r) < 1e-6) return;
    ourRudder.current = null;
    rudderAngleRef.current = rudderToWheelAngle(r);
    setRudderAngle(rudderAngleRef.current);
  }, [helm.mapping, helm.rudder]);

  useEffect(() => () => { if (collapse.current) clearTimeout(collapse.current); }, []);

  const armCollapse = useCallback(() => {
    if (collapse.current) clearTimeout(collapse.current);
    collapse.current = setTimeout(() => setExpanded(null), 4000);
  }, []);

  const turnHelm = useCallback((wheelDeg: number) => {
    if (helm.mapping === "course") {
      const d = wheelToCourseDelta(wheelDeg, prefs.sensitivity);
      const before = courseAcc.current;
      courseAcc.current += d;
      setCourseAngle((a) => a + wheelDeg);
      const crossed = helm.onCourseDelta?.(d);
      if (crossed) tick("turn");
      else if (ticksCrossed(before, courseAcc.current, COURSE_TICK_DEG)) tick("tick");
      return;
    }
    const prev = rudderAngleRef.current;
    const next = clamp(prev + wheelDeg * prefs.sensitivity, -RUDDER_WHEEL_LOCK_DEG, RUDDER_WHEEL_LOCK_DEG);
    if (next === prev) return;
    const r0 = wheelAngleToRudder(prev) * RUDDER_DISPLAY_MAX_DEG;
    const r1 = wheelAngleToRudder(next) * RUDDER_DISPLAY_MAX_DEG;
    if (Math.abs(next) === RUDDER_WHEEL_LOCK_DEG) tick("stop");
    else if (r0 !== 0 && r1 === 0) tick("center");
    else if (ticksCrossed(r0, r1, RUDDER_TICK_DEG)) tick("tick");
    rudderAngleRef.current = next;
    setRudderAngle(next);
    const rudder = wheelAngleToRudder(next);
    ourRudder.current = rudder;
    helm.setRudder?.(rudder);
  }, [helm, prefs.sensitivity, tick]);

  const releaseHelm = useCallback(() => {
    if (helm.mapping === "rudder" && prefs.helmReturnToCenter) {
      ourRudder.current = 0;
      helm.setRudder?.(0);
      rudderAngleRef.current = 0;
      setRudderAngle(0);
      tick("center");
    }
  }, [helm, prefs.helmReturnToCenter, tick]);

  const stepHelm = useCallback((steps: number) => {
    if (helm.mapping === "course") {
      const deg = Number.isFinite(steps) ? steps * COURSE_TICK_DEG : Math.sign(steps) * 45;
      turnHelm((deg * 4) / prefs.sensitivity);
      return;
    }
    const current = rudderAngleRef.current;
    const target = Number.isFinite(steps)
      ? rudderToWheelAngle(clamp(wheelAngleToRudder(current) + (steps * RUDDER_TICK_DEG) / RUDDER_DISPLAY_MAX_DEG, -1, 1))
      : Math.sign(steps) * RUDDER_WHEEL_LOCK_DEG;
    turnHelm((target - current) / prefs.sensitivity);
  }, [helm.mapping, prefs.sensitivity, turnHelm]);

  const turnSheet = useCallback((which: "main" | "jib", wheelDeg: number) => {
    const s = which === "main" ? main : jib;
    if (!s) return;
    const prev = ease.current[which];
    const next = clamp(prev + wheelToEaseDelta(wheelDeg, prefs.sensitivity), 0, 1);
    armCollapse();
    if (next === prev) return;
    if (next === 0 || next === 1) tick("stop");
    else if (ticksCrossed(prev, next, SHEET_TICK)) tick("tick");
    ease.current[which] = next;
    ourEase.current[which] = next;
    s.setEase(next);
  }, [main, jib, prefs.sensitivity, tick, armCollapse]);

  const stepSheet = useCallback((which: "main" | "jib", steps: number) => {
    const s = which === "main" ? main : jib;
    if (!s) return;
    // Keyboard and VoiceOver default to 5%; physical lines supply their resolution.
    const prev = ease.current[which];
    const next = Number.isFinite(steps)
      ? clamp(s.stepEase === undefined ? Math.round((prev + steps * SHEET_TICK) * 100) / 100 : prev + steps * s.stepEase, 0, 1)
      : steps > 0 ? 1 : 0;
    if (next === prev) return;
    ease.current[which] = next;
    ourEase.current[which] = next;
    s.setEase(next);
    tick(next === 0 || next === 1 ? "stop" : "tick");
  }, [main, jib, tick]);

  // Global keys while the wheels are on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable=true], [role=slider]"))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (arrowKeysSteer && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); stepHelm(e.key === "ArrowLeft" ? -1 : 1); return; }
      if (!sheets || !sheetKeysEnabled) return;
      if (k === "q") stepSheet("main", -1);
      else if (k === "a") stepSheet("main", 1);
      else if (k === "w") stepSheet("jib", -1);
      else if (k === "s") stepSheet("jib", 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arrowKeysSteer, sheetKeysEnabled, sheets, stepHelm, stepSheet]);

  // Geometry.
  const { w, h } = size;
  const leftK: "main" | "jib" = prefs.jibSheetSide === "left" ? "jib" : "main";
  const rightK: "main" | "jib" = leftK === "jib" ? "main" : "jib";
  const small = 64;
  // Bottom dock: helm in the middle, sheets in the lower corners. Column (desktop
  // panel): the two sheets in a row on top, the helm under them.
  const sheetRow = small + CAPTION_H + 10;
  const big = layout === "bottom"
    ? Math.max(116, Math.min(176, h - CAPTION_H - 8, w - 2 * small - 40))
    : Math.max(110, Math.min(184, h - (sheets ? sheetRow : 0) - CAPTION_H - 8, w - 40));
  const center: Box = layout === "bottom" || !sheets
    ? [w / 2, (h - CAPTION_H) / 2 + 2, big]
    : [w / 2, sheetRow + big / 2, big];
  // Keep a sheet caption (about 104 px wide) inside the box.
  const capHalf = 54;
  const colX = (x: number) => Math.min(w - capHalf, Math.max(capHalf, x));
  const left: Box = layout === "bottom" ? [small / 2 + 14, h - CAPTION_H - small / 2 - 2, small] : [colX(w / 2 - small - 24), small / 2 + 4, small];
  const right: Box = layout === "bottom" ? [w - small / 2 - 14, h - CAPTION_H - small / 2 - 2, small] : [colX(w / 2 + small + 24), small / 2 + 4, small];
  const pos: Record<Slot, Box> = { helm: center, [leftK]: left, [rightK]: right } as Record<Slot, Box>;
  if (expanded) {
    pos[expanded] = center;
    pos.helm = expanded === leftK ? left : right;
  }
  const place = ([cx, cy, d]: Box) => ({ width: d, height: d, left: cx - d / 2, top: cy - d / 2 });

  const helmRotation = helm.mapping === "course" ? courseAngle : rudderAngle;
  const sheetValue = (s: SheetTarget) => s.valueText ?? `${Math.round(s.ease * 100)}%${s.angleDeg !== undefined ? ` (${Math.round(s.angleDeg)}°)` : ""}`;
  const sheetWheel = (which: "main" | "jib") => {
    const s = which === "main" ? main! : jib!;
    const name = which === "main" ? labels.mainsheet : labels.jibsheet;
    const isSmall = expanded !== which;
    return (
      <Wheel
        key={which}
        kind="sheet"
        testId={`wheel-${which}`}
        small={isSmall}
        style={place(pos[which])}
        rotation={-(s.ease / 0.25) * 360}
        label={name}
        valueText={s.valueText ?? `${sheetValue(s)}, ${labels.eased}`}
        caption={<><b>{name}</b><span>{sheetValue(s)}</span></>}
        ariaNow={s.ariaNow ?? s.ease * 100}
        ariaMin={s.ariaMin ?? 0}
        ariaMax={s.ariaMax ?? 100}
        onActivate={() => { if (expanded !== which) setExpanded(which); armCollapse(); }}
        onTurn={(d) => turnSheet(which, d)}
        onStep={(n) => stepSheet(which, n)}
      />
    );
  };

  return (
    <div className={styles.deck} data-layout={layout}>
      {showNote && !hideHint && <p className={styles.deckNote}>{note ?? (sheets ? labels.wheelHint : labels.autoTrim)}</p>}
      <div ref={boxRef} className={styles.deckArea} data-testid="wheel-deck">
        {sheets && sheetWheel(leftK)}
        <Wheel
          kind="helm"
          testId="wheel-helm"
          small={Boolean(expanded)}
          style={place(pos.helm)}
          rotation={helmRotation}
          label={labels.helm}
          valueText={`${helm.value} ${helm.unit}`}
          caption={<><b>{labels.helm}</b><span>{helm.value}</span><small>{helm.unit}</small></>}
          ariaNow={helm.ariaNow}
          ariaMin={helm.ariaMin}
          ariaMax={helm.ariaMax}
          onActivate={() => { if (expanded) setExpanded(null); }}
          onTurn={turnHelm}
          onRelease={releaseHelm}
          onStep={stepHelm}
        />
        {sheets && sheetWheel(rightK)}
      </div>
    </div>
  );
}
