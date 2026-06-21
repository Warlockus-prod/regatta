export type SailState = 'luff' | 'stall' | 'overtrim' | 'good' | 'idle';

export interface SailFeedbackInput {
  /** Apparent wind angle from bow, signed degrees. */
  awaDeg: number;
  /** True wind angle from bow, signed degrees. */
  twaDeg: number;
  /** User sheet position 0..1 (0 = eased, 1 = hard). */
  sheet: number;
  /** Stall flag from VPP diagnostics. */
  stalled: boolean;
}

export interface SailFeedback {
  main: SailState;
  jib: SailState;
}

/** Optimal sheet position for a given TWA. Hard sheeted upwind, progressively
 *  eased as the boat bears away. Returns a value in [0, 1]. */
export function optimalSheetFor(twaDeg: number): number {
  const a = Math.abs(twaDeg);
  if (a < 50) return 0.85;
  if (a < 100) return 0.55;
  if (a < 150) return 0.30;
  return 0.15;
}

/** Derive a sail-state badge for one sail. Pure function of physics state +
 *  the user's sheet position. Thresholds tuned with the engine in
 *  `physics/aero.ts` (stall onset ~20 deg AoA). */
export function deriveSailState(input: SailFeedbackInput): SailState {
  const awa = Math.abs(input.awaDeg);
  if (awa < 28) return 'luff';
  if (input.stalled) return 'stall';
  const opt = optimalSheetFor(input.twaDeg);
  const delta = input.sheet - opt;
  // On a reach (TWA 60..150) excess sheet without a stall = overtrim.
  const a = Math.abs(input.twaDeg);
  if (a >= 60 && a <= 150 && delta > 0.18) return 'overtrim';
  if (Math.abs(delta) <= 0.10) return 'good';
  // Slightly off but not enough to flag as overtrim/stall: keep it cyan-good.
  return 'good';
}

export function deriveSailFeedback(args: {
  awaDeg: number;
  twaDeg: number;
  mainSheet: number;
  jibSheet: number;
  mainStalled: boolean;
  jibStalled: boolean;
  spinnaker: boolean;
}): SailFeedback {
  if (args.spinnaker) {
    // Spinnaker mode: use the same thresholds but only show feedback if the
    // boat is actually in the no-go zone (rare downwind). Other states are
    // muted because the manual-trim sliders do not drive the spinnaker.
    const awa = Math.abs(args.awaDeg);
    const state: SailState = awa < 28 ? 'luff' : 'good';
    return { main: state, jib: state };
  }
  return {
    main: deriveSailState({
      awaDeg: args.awaDeg,
      twaDeg: args.twaDeg,
      sheet: args.mainSheet,
      stalled: args.mainStalled,
    }),
    jib: deriveSailState({
      awaDeg: args.awaDeg,
      twaDeg: args.twaDeg,
      sheet: args.jibSheet,
      stalled: args.jibStalled,
    }),
  };
}
