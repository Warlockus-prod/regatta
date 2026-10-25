import { describe, expect, it } from "vitest";
import { advanceSailingHeading, COURSE_ASSIST_TURN_RATE_DEG_PER_S, HELM_TURN_RATE_DEG_PER_S, KNOT_METRES_PER_SECOND, sailingDisplacement } from "./sailing-kinematics";

describe("shared trainer movement units and steering", () => {
  it("advances one knot for one minute by30.86664 metres, with compass and leeway signs", () => {
    expect(KNOT_METRES_PER_SECOND).toBe(.514444);
    const distance = 30.86664;
    for (const [heading, east, north] of [[0, 0, distance], [90, distance, 0], [180, 0, -distance], [270, -distance, 0]]) {
      const movement = sailingDisplacement(heading, 0, 1, 60);
      expect(movement.east).toBeCloseTo(east, 12);
      expect(movement.north).toBeCloseTo(north, 12);
    }
    expect(sailingDisplacement(0, 10, 6, 10).east).toBeGreaterThan(0);
    expect(sailingDisplacement(0, -10, 6, 10).east).toBeLessThan(0);
    expect(sailingDisplacement(0, 0, 6, 10).north).toBeCloseTo(distance, 12);
    expect(sailingDisplacement(65, 4, 0, 10)).toEqual({ east: 0, north: 0 });
  });

  it("keeps the22deg/s helm law and explicit low-speed assist, not the race40deg/s response", () => {
    expect(HELM_TURN_RATE_DEG_PER_S).toBe(22);
    const helm = (speed: number, rudder: number, lowSpeedAssist = false) => advanceSailingHeading(90, speed, { mode: "helm", rudder, lowSpeedAssist }, 1);
    expect(helm(0, 1)).toBe(90);
    expect(helm(0, 1, true)).toBeCloseTo(92.64, 12);
    expect(helm(1, 1)).toBeCloseTo(97.33333333333333, 12);
    expect(helm(.1, 1)).toBeCloseTo(90.73333333333333, 12);
    expect(helm(.1, 1, true)).toBeCloseTo(92.64, 12);
    expect(helm(1, 1, true)).toBe(helm(1, 1));
    for (const speed of [3, 6, 8]) {
      expect(helm(speed, 1)).toBe(112);
      expect(helm(speed, 1, true)).toBe(112);
      expect(helm(speed, -.5)).toBe(79);
      expect(helm(speed, 0)).toBe(90);
    }
    expect(advanceSailingHeading(359, 6, { mode: "helm", rudder: 1, lowSpeedAssist: false }, .1)).toBeCloseTo(1.2, 12);
  });

  it("uses shortest-course approach capped45deg/s without overshoot", () => {
    expect(COURSE_ASSIST_TURN_RATE_DEG_PER_S).toBe(45);
    expect(advanceSailingHeading(0, 0, { mode: "course-assist", heading: 90 }, 1)).toBe(45);
    expect(advanceSailingHeading(359, 0, { mode: "course-assist", heading: 1 }, 1 / 30)).toBe(.5);
    expect(advanceSailingHeading(.5, 8, { mode: "course-assist", heading: 1 }, 1 / 30)).toBe(1);
    expect(advanceSailingHeading(1, 5, { mode: "course-assist", heading: 359 }, 1 / 30)).toBe(359.5);
    // The existing trainer chooses the negative direction for an exact180deg tie.
    expect(advanceSailingHeading(0, 3, { mode: "course-assist", heading: 180 }, 1)).toBe(315);
    expect(advanceSailingHeading(180, 3, { mode: "course-assist", heading: 0 }, 1)).toBe(135);
  });
});
