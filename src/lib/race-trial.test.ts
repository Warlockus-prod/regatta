import { describe, expect, it } from "vitest";
import { physicalTrialSteering, readPhysicalTrial } from "./race-trial";

describe("physical trial race flag", () => {
  it.each([["?race=short", "short"], ["?race=medium", "medium"], ["race=long&lang=pl", "long"]] as const)("%s opens %s", (search, profile) => {
    expect(readPhysicalTrial(search)).toBe(profile);
  });
  it.each(["", "?race=", "?race=standard", "?race=SHORT", "?race=short&race=long", "?physics=1"])("keeps the legacy race for %j", search => {
    expect(readPhysicalTrial(search)).toBeNull();
  });
  it("uses the shared helm law and lets a held rudder override course assist", () => {
    expect(physicalTrialSteering(.5, true, 90)).toEqual({ mode: "helm", rudder: .5, lowSpeedAssist: true });
    expect(physicalTrialSteering(0, true, 90)).toEqual({ mode: "course-assist", heading: 90 });
    expect(physicalTrialSteering(0, false, 90)).toEqual({ mode: "helm", rudder: 0, lowSpeedAssist: true });
    expect(physicalTrialSteering(3, false, 0)).toEqual({ mode: "helm", rudder: 1, lowSpeedAssist: true });
    expect(physicalTrialSteering(Number.NaN, true, Number.NaN)).toEqual({ mode: "helm", rudder: 0, lowSpeedAssist: true });
  });
});
