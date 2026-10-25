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
  it("cannot throw into a control, persistence or lifecycle handler when the recorder fails", () => {
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("storage blocked"); });
    let rudder = 0;
    const setRudder = (value: number) => { const previous = rudder; rudder = Math.max(-1, Math.min(1, value)); recordControlChange("race", "rudder", rudder, previous); };
    expect(() => setRudder(2)).not.toThrow();
    expect(rudder).toBe(1);
    expect(() => recordDiagnostic({ type: "race.save", surface: "race", outcome: "failed", action: "error", target: "local", reason: "storage-write" })).not.toThrow();
    expect(recordWebDiagnostic).toHaveBeenCalledTimes(2);
  });
});
