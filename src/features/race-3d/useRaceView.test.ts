import { describe, expect, it } from "vitest";
import { raceCameraPreference } from "./useRaceView";

describe("race camera preference", () => {
  it("opens the race view for a new installation or invalid saved camera (package 8, R-9)", () => {
    expect(raceCameraPreference(null, null)).toBe("race");
    expect(raceCameraPreference("unknown", "old-camera")).toBe("race");
  });

  it("preserves saved views while allowing a valid entry link to select every preset", () => {
    for (const camera of ["race", "orbit", "stern", "high"] as const) {
      expect(raceCameraPreference(null, camera)).toBe(camera);
      expect(raceCameraPreference("invalid", camera)).toBe(camera);
      expect(raceCameraPreference(camera, "stern")).toBe(camera);
    }
  });
});
