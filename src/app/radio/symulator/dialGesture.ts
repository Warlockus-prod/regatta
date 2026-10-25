import type { RadioEvent } from "./radioModel";
import type { DiagnosticInput, DiagnosticReason } from "@/lib/diagnostics";

export const DIAL_HOLD_MS = 1000;
export const DIAL_DETENT_DEG = 15;
export const DIAL_DRAG_PX = 6;
const HUB_FRACTION = .28;
const CENTER_GRAB_FRACTION = .5;
const INTENT_PX = 5;
const MAX_DETENTS_PER_MOVE = 24;
type Point = { x: number; y: number };
export type DialBounds = { left: number; top: number; width: number; height: number };
export interface DialGesture {
  id: number;
  mode: "horizontal" | "angular";
  center: Point;
  hub: number;
  start: Point;
  last: Point;
  angle: number | null;
  remainder: number;
  travel: number;
  moved: boolean;
}
const finitePoint = (point: Point) => Number.isFinite(point.x) && Number.isFinite(point.y);
const degrees = (point: Point, center: Point) => Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function beginDialGesture(id: number, point: Point, bounds: DialBounds): DialGesture | null {
  if (!Number.isFinite(id) || !finitePoint(point) || ![bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) return null;
  const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  const radius = Math.min(bounds.width, bounds.height) / 2;
  const hub = radius * HUB_FRACTION;
  // Match the visible inner grip, not a tiny mathematical point at its center.
  const mode = distance(point, center) <= radius * CENTER_GRAB_FRACTION ? "horizontal" : "angular";
  return { id, mode, center, hub, start: point, last: point, angle: mode === "angular" ? degrees(point, center) : null, remainder: 0, travel: 0, moved: false };
}

/** A center grab stays horizontal; an outer grab stays angular across the seam.
 * Crossing the hub rebases angle instead of manufacturing a half-turn. */
export function moveDialGesture(gesture: DialGesture, point: Point): { gesture: DialGesture; steps: number; visualDegrees: number } {
  if (!finitePoint(point)) return { gesture, steps: 0, visualDegrees: 0 };
  const next = { ...gesture, last: point, moved: gesture.moved || distance(point, gesture.start) >= INTENT_PX };
  const unit = gesture.mode === "horizontal" ? DIAL_DRAG_PX : DIAL_DETENT_DEG;
  let delta = 0;
  if (gesture.mode === "horizontal") delta = point.x - gesture.last.x;
  else if (distance(point, gesture.center) < gesture.hub) {
    next.angle = null;
    next.remainder = 0;
  } else {
    next.angle = degrees(point, gesture.center);
    if (gesture.angle !== null) {
      delta = (next.angle - gesture.angle) % 360;
      if (delta > 180) delta -= 360;
      if (delta <= -180) delta += 360;
    }
  }
  delta = Math.max(-unit * MAX_DETENTS_PER_MOVE, Math.min(unit * MAX_DETENTS_PER_MOVE, delta));
  next.remainder += delta;
  next.travel += delta;
  if (!next.moved) return { gesture: next, steps: 0, visualDegrees: 0 };
  const steps = Math.trunc((Math.abs(next.remainder) + 1e-9) / unit) * Math.sign(next.remainder) || 0;
  next.remainder -= steps * unit;
  if (Math.abs(next.remainder) < 1e-9) next.remainder = 0;
  return { gesture: next, steps, visualDegrees: (gesture.moved ? delta : next.travel) / unit * DIAL_DETENT_DEG };
}

type DialEvent = Extract<RadioEvent, { type: "dial-push" | "dial-hold" | "dial-rotate" }>;
export type DialNotice = Omit<Extract<DiagnosticInput, { type: "radio.gesture" }>, "type" | "surface" | "control">;
type Active = { kind: "pointer"; gesture: DialGesture; held: boolean } | { kind: "key"; key: string; held: boolean };
const activation = (key: string) => key === " " || key === "Enter";
const ARROW_STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 1, ArrowDown: -1 };
export const DIAL_KEY_SHORTCUTS = Object.keys(ARROW_STEPS).join(" ");
const arrowStep = (key: string) => ARROW_STEPS[key] ?? 0;

/** One input owner and one timer. DOM adapters and fake-timer tests share this
 * arbitration, including click-only assistive activation after cancellation. */
export class RadioDialInput {
  private active: Active | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressClick = false;
  constructor(private emit: (event: DialEvent) => void, private rotate: (degrees: number) => void, private notice: (event: DialNotice) => void = () => {}) {}
  setEmit(emit: (event: DialEvent) => void) { this.emit = emit; }
  private report(event: DialNotice) { try { this.notice(event); } catch { /* diagnostics never own the control */ } }
  get pointerId() { return this.active?.kind === "pointer" ? this.active.gesture.id : null; }
  private clearHold() { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; }
  private suppressCompatibilityClick() {
    this.suppressClick = true;
    if (this.clickTimer !== null) clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => { this.suppressClick = false; this.clickTimer = null; }, 0);
  }
  private startHold(owner: Active) {
    this.clearHold();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.active !== owner || owner.held || (owner.kind === "pointer" && owner.gesture.moved)) return;
      owner.held = true;
      this.emit({ type: "dial-hold" });
      this.report({ action: "hold", outcome: "accepted", source: owner.kind === "pointer" ? "pointer" : "keyboard" });
    }, DIAL_HOLD_MS);
  }
  pointerDown(id: number, point: Point, bounds: DialBounds): boolean {
    if (this.active) { this.report({ action: "ignored", outcome: "rejected", source: "pointer", reason: "secondary-pointer" }); return false; }
    const gesture = beginDialGesture(id, point, bounds);
    if (!gesture) return false;
    const owner: Active = { kind: "pointer", gesture, held: false };
    this.active = owner;
    this.startHold(owner);
    this.report({ action: "start", outcome: "accepted", source: "pointer" });
    return true;
  }
  pointerMove(id: number, point: Point) {
    const owner = this.active;
    if (owner?.kind !== "pointer" || owner.gesture.id !== id || owner.held) return;
    const motion = moveDialGesture(owner.gesture, point);
    owner.gesture = motion.gesture;
    if (motion.gesture.moved) this.clearHold();
    if (motion.visualDegrees) this.rotate(motion.visualDegrees);
    for (let count = 0; count < Math.abs(motion.steps); count++) this.emit({ type: "dial-rotate", dir: motion.steps > 0 ? 1 : -1 });
    if (motion.visualDegrees) this.report({ action: "rotate", outcome: motion.steps ? "accepted" : "noop", source: "pointer", steps: motion.steps });
  }
  pointerUp(id: number) {
    const owner = this.active;
    if (owner?.kind !== "pointer" || owner.gesture.id !== id) return;
    this.clearHold(); this.active = null; this.suppressCompatibilityClick();
    if (!owner.held && !owner.gesture.moved) {
      this.emit({ type: "dial-push" }); this.report({ action: "tap", outcome: "accepted", source: "pointer" });
    }
  }
  pointerCancel(id: number, reason: DiagnosticReason = "pointer-cancel") { if (this.pointerId === id) this.cancel(reason, "pointer"); }
  step(dir: 1 | -1, source: "arrow" | "keyboard" = "arrow") {
    if (this.active) { this.report({ action: "ignored", outcome: "rejected", source, reason: "disabled" }); return; }
    this.rotate(dir * DIAL_DETENT_DEG);
    this.emit({ type: "dial-rotate", dir });
    this.report({ action: "rotate", outcome: "accepted", source, steps: dir });
  }
  keyDown(key: string, repeat = false): boolean {
    const direction = arrowStep(key);
    if (direction) { this.step(direction > 0 ? 1 : -1, "keyboard"); return true; }
    if (!activation(key)) return false;
    if (!repeat && !this.active) {
      const owner: Active = { kind: "key", key, held: false };
      this.active = owner; this.startHold(owner);
      this.report({ action: "start", outcome: "accepted", source: "keyboard" });
    }
    return true;
  }
  keyUp(key: string): boolean {
    if (!activation(key)) return false;
    const owner = this.active;
    if (owner?.kind === "key" && owner.key === key) {
      this.clearHold(); this.active = null; this.suppressCompatibilityClick();
      if (!owner.held) { this.emit({ type: "dial-push" }); this.report({ action: "tap", outcome: "accepted", source: "keyboard" }); }
    }
    return true;
  }
  click(detail: number, pointerType?: string) {
    if (detail > 0 || pointerType || this.active || this.suppressClick) return;
    this.emit({ type: "dial-push" });
    this.report({ action: "tap", outcome: "accepted", source: "assistive" });
  }
  cancel(reason: DiagnosticReason = "cancelled", source: DialNotice["source"] = "system") {
    const hadOwner = this.active !== null;
    if (hadOwner) this.report({ action: "cancel", outcome: "rejected", reason, source });
    this.clearHold(); this.active = null;
    if (hadOwner) this.suppressCompatibilityClick();
  }
  dispose() {
    if (this.active) this.report({ action: "cancel", outcome: "rejected", reason: "unmount", source: "system" });
    this.clearHold();
    if (this.clickTimer !== null) clearTimeout(this.clickTimer);
    this.clickTimer = null; this.suppressClick = false; this.active = null;
  }
}
