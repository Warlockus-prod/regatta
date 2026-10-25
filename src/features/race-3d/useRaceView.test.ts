import { describe, expect, it } from "vitest";
import { raceCameraPreference } from "./useRaceView";

describe("race camera preference", () => {
  it("opens a close orbit for a new installation or invalid saved camera", () => {
    expect(raceCameraPreference(null, null)).toBe("orbit");
    expect(raceCameraPreference("unknown", "old-camera")).toBe("orbit");
  });

  it("preserves saved views while allowing a valid entry link to select every preset", () => {
    for (const camera of ["orbit", "stern", "high"] as const) {
      expect(raceCameraPreference(null, camera)).toBe(camera);
      expect(raceCameraPreference("invalid", camera)).toBe(camera);
      expect(raceCameraPreference(camera, "stern")).toBe(camera);
    }
  });
});
