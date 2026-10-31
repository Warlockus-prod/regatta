import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M1-1): the lobby's start opens the briefing only until this device
// has started once from it on that course; "i" always opens it; "Again" and
// "Restart" always go straight to the countdown with the same setup.

function storage() {
  const values = new Map<string, string>();
  const host = { values, getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value); }) };
  vi.stubGlobal("localStorage", host);
  return host;
}
async function load() { return import("./race-setup-flow"); }
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("one race setup flow", () => {
  it("routes each start request to the briefing or the countdown", async () => {
    const { raceEntryStep } = await load();
    expect(raceEntryStep("start", false)).toBe("briefing");
    expect(raceEntryStep("start", true)).toBe("countdown");
    expect(raceEntryStep("info", true)).toBe("briefing");
    expect(raceEntryStep("info", false)).toBe("briefing");
    expect(raceEntryStep("resume", true)).toBe("briefing");
    for (const seen of [false, true]) {
      expect(raceEntryStep("again", seen)).toBe("countdown");
      expect(raceEntryStep("restart", seen)).toBe("countdown");
    }
  });

  it("starts the save and replay upload over in every phase a new race begins, the countdown included", async () => {
    const { phaseStartsNewRace } = await load();
    for (const phase of ["menu", "briefing", "countdown"]) expect(phaseStartsNewRace(phase)).toBe(true);
    for (const phase of ["racing", "finished", "replay"]) expect(phaseStartsNewRace(phase)).toBe(false);
  });

  it("remembers a seen briefing per course on this device", async () => {
    const host = storage();
    const flow = await load();
    const classic = flow.briefingCourseId(null);
    expect(classic).toBe("classic");
    expect(flow.briefingCourseId("short")).toBe("trial-short");
    expect(flow.hasSeenBriefing(classic)).toBe(false);
    flow.markBriefingSeen(classic);
    expect(flow.hasSeenBriefing(classic)).toBe(true);
    expect(flow.hasSeenBriefing("trial-short")).toBe(false);
    expect(JSON.parse(host.values.get(flow.RACE_BRIEFING_SEEN_KEY)!)).toEqual(["classic"]);
    flow.markBriefingSeen(classic);
    expect(host.setItem).toHaveBeenCalledTimes(1);
    // A fresh page (new module) reads the same device record.
    vi.resetModules();
    expect((await load()).hasSeenBriefing(classic)).toBe(true);
  });

  it("ignores malformed rows and stays consistent when storage throws", async () => {
    const host = storage();
    host.values.set("regatta.race.briefing-seen.v1", JSON.stringify(["classic", 7, "../x", "A"]));
    let flow = await load();
    expect(flow.hasSeenBriefing("classic")).toBe(true);
    expect(flow.hasSeenBriefing("../x")).toBe(false);
    host.values.set("regatta.race.briefing-seen.v1", "{not json");
    expect(flow.hasSeenBriefing("classic")).toBe(false);
    vi.resetModules();
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    flow = await load();
    expect(() => flow.markBriefingSeen("classic")).not.toThrow();
    expect(flow.hasSeenBriefing("classic")).toBe(true);
    flow.markBriefingSeen("Not a course id");
    expect(flow.hasSeenBriefing("Not a course id")).toBe(false);
  });

  it("treats only a native race with a linked setup as a hub hand-off", async () => {
    const { hubHandsOffSetup } = await load();
    const base = { native: true, linkedSetup: true, replay: false, trial: false };
    expect(hubHandsOffSetup(base)).toBe(true);
    expect(hubHandsOffSetup({ ...base, native: false })).toBe(false);
    expect(hubHandsOffSetup({ ...base, linkedSetup: false })).toBe(false);
    expect(hubHandsOffSetup({ ...base, replay: true })).toBe(false);
    expect(hubHandsOffSetup({ ...base, trial: true })).toBe(false);
  });
});
