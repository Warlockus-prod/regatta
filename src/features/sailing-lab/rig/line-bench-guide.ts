import { lineActions, lineCopy, lineReasons } from "../../../data/sailing-lab/line-bench-copy";
import type { Language } from "../../../lib/product/catalog";
import { lineBenchComplete, requiredWraps, type LineAction, type LineBench, type LineFault } from "./line-handling";

type ActionId = keyof typeof lineActions;
type ReasonId = keyof typeof lineReasons;
export const benchCommands: Record<ActionId, LineAction> = {
  wrap: { type: "wraps", count: 3, direction: "clockwise" },
  wrapHeavy: { type: "wraps", count: 4, direction: "clockwise" },
  wrapWrong: { type: "wraps", count: 3, direction: "counterclockwise" },
  unwrap: { type: "wraps", count: 0, direction: "clockwise" },
  hold: { type: "tail", held: true }, letGo: { type: "tail", held: false },
  insert: { type: "handle", inserted: true }, remove: { type: "handle", inserted: false },
  take: { type: "take-load" }, first: { type: "lever", position: "first-stage" },
  open: { type: "lever", position: "open" }, close: { type: "lever", position: "closed" },
  selfIn: { type: "self-tail", engaged: true }, selfOut: { type: "self-tail", engaged: false },
  ease: { type: "ease" }, transfer: { type: "transfer-to-clutch" },
};
export const benchFaultReason: Record<LineFault, ReasonId> = {
  wraps: "wraps", tail: "tail", handle: "handle", "loaded-wraps": "unwrap", "take-load": "take",
  "clutch-open": "open", "self-tailer": "self", "lever-stage": "first", limit: "limit",
};
const hint = (id: ActionId, why: ReasonId) => ({ id, action: benchCommands[id], label: lineActions[id], reason: lineReasons[why] });

/** State-derived guidance recovers after exploration; there is no click counter. */
export function lineBenchHint(s: LineBench) {
  if (lineBenchComplete(s)) return null;
  if (s.secured && s.owner === "clutch") {
    if (s.lever !== "closed") return hint("close", "close");
    if (s.selfTailed) return hint("selfOut", "self");
    if (s.handleInserted) return hint("remove", "handle");
    return hint("unwrap", "unwrap");
  }
  if (s.owner === "clutch") {
    if (s.wraps < requiredWraps(s) || s.direction !== "clockwise") return hint(s.load === "high" ? "wrapHeavy" : "wrap", "wraps");
    if (!s.tailHeld) return hint("hold", "tail");
    if (!s.handleInserted) return hint("insert", "handle");
    return hint("take", "take");
  }
  if (!s.tailHeld) return hint("hold", "tail");
  if (s.handleInserted) return hint("remove", "handle");
  if (s.selfTailed) return hint("selfOut", "self");
  if (s.eased) {
    if (s.lever !== "closed") return hint("close", "close");
    return hint("transfer", "close");
  }
  if (s.lever === "closed") return hint("first", "first");
  if (s.lever === "first-stage") return hint("open", "first");
  return hint("ease", "ease");
}

export function lineBenchOptions(s: LineBench): ActionId[] {
  return ["wrap", "wrapHeavy", "wrapWrong", "unwrap", s.tailHeld ? "letGo" : "hold", s.handleInserted ? "remove" : "insert", "take", "first", "open", "close", s.selfTailed ? "selfOut" : "selfIn", "ease", "transfer"];
}

export function lineBenchReadout(s: LineBench, lang: Language) {
  return [
    lineCopy[s.lever === "first-stage" ? "first" : s.lever][lang],
    `${lineCopy.wraps[lang]}: ${s.wraps}${s.wraps ? ` (${lineCopy[s.direction][lang]})` : ""}`,
    s.selfTailed ? lineCopy.selfTailed[lang] : lineCopy[s.tailHeld ? "handHeld" : "freeTail"][lang],
  ].join(" · ");
}
