import type { Controls } from "../../../lib/sailing-physics/types";

/** Normalized travel/setting, never an assertion about line tension in newtons. */
export function unitFraction(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("Sail control must be finite");
  return Math.min(1, Math.max(0, value));
}
export function sheetEaseToEngine(ease: number): number { return 1 - unitFraction(ease); }
export function openPercentToFurl(openPercent: number): number { return 1 - unitFraction(openPercent / 100); }

export function engineTrimFromEase(input: {
  mainEase: number; jibEase: number; reef: number;
  mainTwist?: number; jibTwist?: number; jibFurl?: number;
}): Controls {
  return {
    mainSheet: sheetEaseToEngine(input.mainEase),
    jibSheet: sheetEaseToEngine(input.jibEase),
    reef: unitFraction(input.reef),
    mainTwist: unitFraction(input.mainTwist ?? 0.35),
    jibTwist: unitFraction(input.jibTwist ?? 0.4),
    jibFurl: unitFraction(input.jibFurl ?? 0),
    jibSide: 1,
  };
}
