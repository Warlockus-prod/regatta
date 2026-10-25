import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { createDiagnosticJournal } from "@/lib/diagnostics";
import { useSailingSim } from "./useSailingSim";
import type { YachtState } from "../types";

const states = vi.hoisted(() => [] as { value: unknown }[]);
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useEffect: () => {}, useCallback: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => {
    const state = { value: typeof initial === "function" ? initial() : initial };
    states.push(state);
    return [state.value, (action: unknown) => { state.value = typeof action === "function" ? action(state.value) : action; }];
  },
}));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
beforeEach(() => { states.length = 0; vi.mocked(recordWebDiagnostic).mockReset(); });
describe("actual 3D sailing command handlers", () => {
  it("keeps rapid target updates and noop classification while excluding automatic helm corrections", () => {
    const journal = createDiagnosticJournal({ now: () => 0 });
    vi.mocked(recordWebDiagnostic).mockImplementation(event => journal.record(event));
    const sim = useSailingSim({ current: {} as YachtState }, true);
    sim.setControl("mainSheet", .5); sim.setControl("mainSheet", .4); sim.setControl("mainSheet", .4);
    sim.setControl("rudder", .75, false);
    sim.setWind(wind => ({ ...wind, twsKn: 15 }));
    sim.setWind(wind => ({ ...wind, fromDeg: 35 }));
    expect(states[0].value).toEqual({ rudder: .75, mainSheet: .4, jibSheet: .8, reef: 0 });
    expect(states[1].value).toEqual({ twsKn: 15, fromDeg: 35 });
    expect(journal.snapshot().entries.map(entry => entry.event.outcome)).toEqual(["accepted", "noop", "accepted", "accepted"]);
    expect(journal.snapshot().entries[0]).toMatchObject({ count: 2, event: { control: "mainsheet", previous: .6, value: .4 } });
    expect(journal.snapshot().entries.every(entry => entry.event.type !== "control.change" || entry.event.control !== "rudder")).toBe(true);
  });
  it("applies the actual controls and wind when logging throws and does not mutate caller objects", () => {
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("bridge unavailable"); });
    const sim = useSailingSim({ current: {} as YachtState }, true);
    const input = Object.freeze({ rudder: -.4, mainSheet: .2, jibSheet: .3, reef: .5 });
    expect(() => { sim.setControls(input); sim.setWind({ twsKn: 22, fromDeg: 270 }); }).not.toThrow();
    expect(states[0].value).toEqual(input);
    expect(states[1].value).toEqual({ twsKn: 22, fromDeg: 270 });
    expect(input).toEqual({ rudder: -.4, mainSheet: .2, jibSheet: .3, reef: .5 });
  });
});
