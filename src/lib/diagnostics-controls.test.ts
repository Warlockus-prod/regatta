import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagnosticJournal } from "./diagnostics";
import { recordWebDiagnostic } from "./diagnostics-web";
import { recordControlChange, recordDiagnostic, recordPreferenceChange } from "./diagnostics-controls";
vi.mock("./diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
beforeEach(() => { vi.mocked(recordWebDiagnostic).mockReset(); });
describe("command diagnostic boundary", () => {
  it("classifies normalized target changes and repeated requests without changing the target", () => {
    const journal = createDiagnosticJournal({ now: () => 0 });
    vi.mocked(recordWebDiagnostic).mockImplementation(event => journal.record(event));
    const target = { value: .5 };
    recordControlChange("race", "mainsheet", target.value, .4);
    recordControlChange("race", "mainsheet", target.value, .5);
    recordPreferenceChange("trainer", "helm-mapping", "rudder", "course");
    expect(target).toEqual({ value: .5 });
    expect(journal.snapshot().entries.map(entry => entry.event.outcome)).toEqual(["accepted", "noop", "accepted"]);
    expect(journal.snapshot().entries[1].event).toMatchObject({ control: "mainsheet", value: .5, previous: .5, reason: "unchanged" });
  });
  it("records a real favorites reorder as accepted even when its safe count is unchanged", () => {
    recordPreferenceChange("trainer", "favorites-count", 2, 2, true);
    expect(recordWebDiagnostic).toHaveBeenCalledWith({ type: "control.preferences", surface: "trainer", preference: "favorites-count", value: 2, previous: 2, outcome: "accepted" });
  });
  it("records closed wind styles and actual map open/close targets on the caller's surface", () => {
    const journal = createDiagnosticJournal({ now: () => 0 });
    vi.mocked(recordWebDiagnostic).mockImplementation(event => journal.record(event));
    recordPreferenceChange("multiplayer", "wind-display", "arrows", "compass");
    recordPreferenceChange("race", "wind-display", "both", "both");
    recordControlChange("race", "race-map", true, false);
    recordControlChange("race", "race-map", false, true);
    expect(recordWebDiagnostic).toHaveBeenNthCalledWith(1, { type: "control.preferences", surface: "multiplayer", preference: "wind-display", value: "arrows", previous: "compass", outcome: "accepted" });
    expect(recordWebDiagnostic).toHaveBeenNthCalledWith(2, { type: "control.preferences", surface: "race", preference: "wind-display", value: "both", previous: "both", outcome: "noop", reason: "unchanged" });
    expect(recordWebDiagnostic).toHaveBeenNthCalledWith(3, { type: "control.change", surface: "race", control: "race-map", value: true, previous: false, outcome: "accepted" });
    expect(recordWebDiagnostic).toHaveBeenNthCalledWith(4, { type: "control.change", surface: "race", control: "race-map", value: false, previous: true, outcome: "accepted" });
    expect(journal.snapshot().dropped).toBe(0);
  });
  it("cannot throw into a control, persistence or lifecycle handler when the recorder fails", () => {
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("storage blocked"); });
    let rudder = 0;
    const setRudder = (value: number) => { const previous = rudder; rudder = Math.max(-1, Math.min(1, value)); recordControlChange("race", "rudder", rudder, previous); };
    expect(() => setRudder(2)).not.toThrow();
    expect(rudder).toBe(1);
    expect(() => recordDiagnostic({ type: "race.save", surface: "race", outcome: "failed", action: "error", target: "local", reason: "storage-write" })).not.toThrow();
    expect(() => recordPreferenceChange("race", "wind-display", "off", "compass")).not.toThrow();
    expect(() => recordControlChange("race", "race-map", true, false)).not.toThrow();
    expect(recordWebDiagnostic).toHaveBeenCalledTimes(4);
  });
});
