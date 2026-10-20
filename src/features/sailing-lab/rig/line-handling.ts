/** A qualitative training bench, not a rated winch or a friction solver.
 * One already-loaded line runs from rig -> clutch -> winch -> controlled tail.
 * The conservative training interlock requires taking the load on the winch
 * before the clutch's release stage. It is not a claim that every real clutch
 * is physically incapable of opening under load.
 * References: Harken Radial user manual; Spinlock XTS 2026 instructions 3R1080A.
 */
export type ClutchLever = "closed" | "first-stage" | "open";
export type LineFault = "wraps" | "tail" | "handle" | "loaded-wraps" | "take-load" | "lever-stage" | "clutch-open" | "self-tailer" | "limit";
export interface LineBench {
  load: "working" | "high";
  owner: "clutch" | "winch";
  lever: ClutchLever;
  wraps: number;
  direction: "clockwise" | "counterclockwise";
  tailHeld: boolean;
  selfTailed: boolean;
  handleInserted: boolean;
  paidOut: number;
  transferred: boolean;
  eased: boolean;
  secured: boolean;
  fault: LineFault | null;
}
export type LineAction =
  | { type: "wraps"; count: number; direction: LineBench["direction"] }
  | { type: "tail"; held: boolean }
  | { type: "self-tail"; engaged: boolean }
  | { type: "handle"; inserted: boolean }
  | { type: "take-load" }
  | { type: "lever"; position: ClutchLever }
  | { type: "ease" }
  | { type: "transfer-to-clutch" };

export const newLineBench = (load: LineBench["load"] = "working"): LineBench => ({
  load, owner: "clutch", lever: "closed", wraps: 0, direction: "clockwise", tailHeld: false,
  selfTailed: false, handleInserted: false, paidOut: 0, transferred: false, eased: false, secured: false, fault: null,
});
export const requiredWraps = (state: LineBench) => state.load === "high" ? 4 : 3;
const wrapped = (state: LineBench) => state.wraps >= requiredWraps(state) && state.direction === "clockwise";
const tailed = (state: LineBench) => state.tailHeld || state.selfTailed;

export function lineBenchInvariant(state: LineBench): boolean {
  return Number.isInteger(state.wraps) && state.wraps >= 0 && state.wraps <= 4
    && state.paidOut >= 0 && state.paidOut <= .5
    && (!state.selfTailed || wrapped(state))
    && (state.owner !== "clutch" || state.lever !== "open")
    && (state.owner !== "winch" || (wrapped(state) && tailed(state)));
}

/** Unsafe requests are rejected without secretly releasing a loaded line.
 * UI must say they are training interlocks, not harmless actions on a yacht.
 */
export function handleLine(state: LineBench, action: LineAction): LineBench {
  const fail = (fault: LineFault): LineBench => ({ ...state, fault });
  const next = { ...state, fault: null };
  switch (action.type) {
    case "wraps":
      if (!Number.isInteger(action.count) || action.count < 0 || action.count > 4) return fail("wraps");
      if (state.owner === "winch" || state.selfTailed) return fail("loaded-wraps");
      next.wraps = action.count; next.direction = action.direction;
      break;
    case "tail":
      if (!action.held && state.owner === "winch" && !state.selfTailed) return fail("tail");
      next.tailHeld = action.held;
      break;
    case "self-tail":
      if (action.engaged && (!wrapped(state) || !state.tailHeld)) return fail(!wrapped(state) ? "wraps" : "tail");
      if (!action.engaged && state.owner === "winch" && !state.tailHeld) return fail("tail");
      next.selfTailed = action.engaged;
      break;
    case "handle":
      next.handleInserted = action.inserted;
      break;
    case "take-load":
      if (!wrapped(state)) return fail("wraps");
      if (!tailed(state)) return fail("tail");
      if (!state.handleInserted) return fail("handle");
      next.owner = "winch"; next.transferred = true; next.secured = false;
      break;
    case "lever":
      if (action.position === "open" && state.owner !== "winch") return fail("take-load");
      if (action.position === "open" && state.lever === "closed") return fail("lever-stage");
      next.lever = action.position;
      break;
    case "ease":
      if (state.owner !== "winch") return fail("take-load");
      if (state.lever !== "open") return fail("clutch-open");
      if (!state.tailHeld) return fail("tail");
      if (state.selfTailed) return fail("self-tailer");
      if (state.handleInserted) return fail("handle");
      if (state.paidOut >= .5) return fail("limit");
      next.paidOut = Math.min(.5, Math.round((state.paidOut + .1) * 10) / 10);
      next.eased = true; next.secured = false;
      break;
    case "transfer-to-clutch":
      if (state.lever !== "closed") return fail("clutch-open");
      if (state.owner !== "winch") return fail("take-load");
      if (!state.tailHeld) return fail("tail");
      if (state.selfTailed) return fail("self-tailer");
      if (state.handleInserted) return fail("handle");
      next.owner = "clutch"; next.secured = state.eased;
      break;
  }
  if (!lineBenchInvariant(next)) throw new Error("Line bench invariant violated");
  return next;
}

export function lineBenchComplete(state: LineBench) {
  return state.transferred && state.eased && state.secured && state.owner === "clutch"
    && state.lever === "closed" && state.wraps === 0 && !state.handleInserted && !state.selfTailed;
}
