import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ADS_CAMERAS, ADS_FOVS } from "../../lib/ads-preview";
import { ADS_CAMERA_MAX_DISTANCE, adsCameraPose, rotateAdsCamera } from "./camera";
import { adsCopy } from "./copy";

describe("Ads camera inspection", () => {
  it.each(ADS_CAMERAS)("fits finite %s poses at portrait/wide aspects and each declared lens", view => {
    for (const fov of ADS_FOVS) for (const aspect of [.45, 1, 2]) {
      const pose = adsCameraPose(view, fov, aspect);
      expect(pose.fov).toBe(fov);
      expect([...pose.position.toArray(), ...pose.target.toArray()].every(Number.isFinite)).toBe(true);
      expect(pose.position.distanceTo(pose.target)).toBeGreaterThan(2);
      expect(pose.position.distanceTo(pose.target)).toBeLessThan(ADS_CAMERA_MAX_DISTANCE);
    }
  });
  it("turns left/right oppositely and retains radius/target without mutating vectors", () => {
    const position = new Vector3(10, 10, 10), target = new Vector3(0, 2, 0);
    const copy = position.clone(), center = target.clone();
    const left = rotateAdsCamera(position, target, "left"), right = rotateAdsCamera(position, target, "right");
    expect(left.x).toBeLessThan(position.x); expect(right.x).toBeGreaterThan(position.x);
    expect(left.distanceTo(target)).toBeCloseTo(position.distanceTo(target), 12);
    expect(rotateAdsCamera(left, target, "right").distanceTo(position)).toBeLessThan(1e-12);
    expect(position).toEqual(copy); expect(target).toEqual(center);
  });
  it("moves vertically and keeps repeated turns above the horizon/polar limits", () => {
    const target = new Vector3(), start = new Vector3(10, 10, 10);
    expect(rotateAdsCamera(start, target, "up").y).toBeGreaterThan(start.y);
    expect(rotateAdsCamera(start, target, "down").y).toBeLessThan(start.y);
    for (const direction of ["up", "down"] as const) {
      let position = start.clone(); for (let i = 0; i < 100; i++) position = rotateAdsCamera(position, target, direction);
      expect(position.y).toBeGreaterThan(0); expect(Number.isFinite(position.x)).toBe(true);
      expect(position.distanceTo(target)).toBeCloseTo(start.length(), 10);
    }
  });
  it("retains complete seven-language lab copy and the owner-requested Ads title", () => {
    for (const value of Object.values(adsCopy)) for (const language of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) expect(value[language].trim()).not.toBe("");
    expect(new Set(Object.values(adsCopy.title))).toEqual(new Set(["Ads"]));
  });
});
