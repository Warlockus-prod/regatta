import { describe, expect, it } from "vitest";
import { handleLine, lineBenchComplete, lineBenchInvariant, newLineBench, type LineAction, type LineBench } from "./line-handling";
import { benchCommands, lineBenchHint, lineBenchReadout } from "./line-bench-guide";
import { lineBenchSvg } from "./line-bench-diagram";
import { lineActions, lineCopy, lineReasons } from "../../../data/sailing-lab/line-bench-copy";

const apply = (s: LineBench, ...actions: LineAction[]) => actions.reduce(handleLine, s);
const prepare: LineAction[] = [{ type: "wraps", count: 3, direction: "clockwise" }, { type: "tail", held: true }, { type: "handle", inserted: true }, { type: "take-load" }];
const release: LineAction[] = [{ type: "lever", position: "first-stage" }, { type: "lever", position: "open" }, { type: "handle", inserted: false }, { type: "ease" }];
describe("line handling training interlocks", () => {
  it("guides the learner through real state transitions, with shared diagrams and seven-language explanations", () => {
    let state = newLineBench(), steps = 0;
    const before = lineBenchSvg(state);
    while (!lineBenchComplete(state) && steps++ < 25) {
      const hint = lineBenchHint(state)!;
      state = handleLine(state, hint.action);
      expect(state.fault).toBeNull();
    }
    expect(steps).toBe(11);
    expect(lineBenchComplete(state)).toBe(true);
    expect(state.paidOut).toBe(.1);
    expect(lineBenchHint(state)).toBeNull();
    expect(lineBenchSvg(state)).not.toBe(before);
    expect(lineBenchReadout(state, "en")).toContain("Clutch closed");
    for (const label of [...Object.values(lineActions), ...Object.values(lineReasons), ...Object.values(lineCopy)]) {
      for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
        expect(label[lang].length).toBeGreaterThan(2);
        expect(label[lang]).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });
  it("models load transfer, controlled easing and checking the clutch before freeing the winch", () => {
    let s = newLineBench();
    expect(handleLine(s, { type: "lever", position: "open" }).fault).toBe("take-load");
    s = apply(s, ...prepare);
    expect(s.owner).toBe("winch");
    s = apply(s, ...release);
    expect(s.paidOut).toBe(.1);
    expect(lineBenchComplete(s)).toBe(false);
    s = apply(s, { type: "lever", position: "closed" });
    expect(s.owner).toBe("winch");
    s = apply(s, { type: "transfer-to-clutch" });
    expect(s.owner).toBe("clutch");
    s = apply(s, { type: "wraps", count: 0, direction: "clockwise" });
    expect(lineBenchComplete(s)).toBe(true);
  });
  it("does not confuse the first lever stage, self-tailer and clutch", () => {
    let s = apply(newLineBench(), ...prepare, { type: "self-tail", engaged: true }, { type: "tail", held: false });
    expect(handleLine(s, { type: "self-tail", engaged: false }).fault).toBe("tail");
    s = apply(s, { type: "lever", position: "first-stage" });
    expect(s.owner).toBe("winch");
    expect(handleLine(s, { type: "ease" }).fault).toBe("clutch-open");
    s = apply(s, { type: "lever", position: "open" }, { type: "tail", held: true }, { type: "handle", inserted: false });
    expect(handleLine(s, { type: "ease" }).fault).toBe("self-tailer");
    s = apply(s, { type: "self-tail", engaged: false }, { type: "ease" });
    expect(s.paidOut).toBe(.1);
  });
  it("requires appropriate wraps and never rewards wrong winding or uncontrolled release", () => {
    expect(apply(newLineBench("high"), ...prepare).owner).toBe("clutch");
    let s = apply(newLineBench(), { type: "wraps", count: 3, direction: "counterclockwise" }, ...prepare.slice(1));
    expect(s.fault).toBe("wraps");
    expect(s.owner).toBe("clutch");
    s = apply(newLineBench(), ...prepare);
    expect(handleLine(s, { type: "tail", held: false }).fault).toBe("tail");
    expect(handleLine(s, { type: "wraps", count: 0, direction: "clockwise" }).fault).toBe("loaded-wraps");
    expect(s.paidOut).toBe(0);
  });
  it("preserves load ownership for long arbitrary action sequences", () => {
    const actions: LineAction[] = [
      ...prepare, ...release, { type: "tail", held: false }, { type: "self-tail", engaged: true },
      { type: "self-tail", engaged: false }, { type: "lever", position: "closed" }, { type: "transfer-to-clutch" },
      { type: "wraps", count: 0, direction: "clockwise" }, { type: "wraps", count: 4, direction: "clockwise" },
      { type: "wraps", count: 3, direction: "counterclockwise" }, { type: "wraps", count: Number.NaN, direction: "clockwise" },
    ];
    for (const load of ["working", "high"] as const) {
      let state = newLineBench(load), seed = 8472;
      for (let i = 0; i < 10_000; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        state = handleLine(state, actions[seed % actions.length]);
        expect(lineBenchInvariant(state)).toBe(true);
      }
    }
  });
  it("recovers its guidance after arbitrary safe and unsafe exploration", () => {
    const commands = Object.values(benchCommands);
    let state = newLineBench(), seed = 7481;
    for (let trial = 0; trial < 200; trial++) {
      for (let i = 0; i < 15; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        state = handleLine(state, commands[seed % commands.length]);
      }
      let recovery = { ...state };
      for (let i = 0; i < 25 && !lineBenchComplete(recovery); i++) {
        recovery = handleLine(recovery, lineBenchHint(recovery)!.action);
        expect(recovery.fault).toBeNull();
      }
      expect(lineBenchComplete(recovery)).toBe(true);
    }
  });
});
