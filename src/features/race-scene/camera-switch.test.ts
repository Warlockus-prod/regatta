import { describe, expect, it } from "vitest";
import {
  CHASE_RETURN_DELAY, CHASE_START, DOUBLE_TAP_MS, RACE_CAMERA_CYCLE, RACE_TUNE, TAP_MAX_MS, TAP_SLOP_PX,
  chaseStep, createTapTracker, nextRaceCamera, turnToward, type ChaseState,
} from "./camera";
import { sceneTapHandlers } from "./camera-tap";

// M2-1 contracts, package 8 (R-9): the default camera is the race view; a
// tap steps race -> around the boat -> behind -> above -> race, and a double
// tap brings back the race view; a drag or a pinch that starts like a tap
// never switches; the chase camera follows the course, leaves the camera to
// the player while they orbit and comes back after a short delay, with one
// cut instead of a swoop under reduced motion.

describe("camera cycle", () => {
  it("starts at the race view and steps race, around the boat, behind, above, then race again", () => {
    expect(RACE_CAMERA_CYCLE[0]).toBe("race");
    expect(nextRaceCamera("race")).toBe("orbit");
    expect(nextRaceCamera("orbit")).toBe("stern");
    expect(nextRaceCamera("stern")).toBe("high");
    expect(nextRaceCamera("high")).toBe("race");
  });

  it("visits every camera once per lap and restarts an unknown value at the default", () => {
    const seen = new Set<string>();
    let camera: string = "race";
    for (let i = 0; i < RACE_CAMERA_CYCLE.length; i++) { seen.add(camera); camera = nextRaceCamera(camera); }
    expect(camera).toBe("race");
    expect(seen.size).toBe(4);
    expect(nextRaceCamera("bogus")).toBe("race");
  });
});

describe("double tap back to the race view (R-9)", () => {
  class FakeCanvas {}
  const original = globalThis.HTMLCanvasElement;
  const fake = new FakeCanvas();
  const press = (h: ReturnType<typeof sceneTapHandlers>, id: number, t: number) => {
    const e = { target: fake, pointerId: id, clientX: 50, clientY: 50, isPrimary: true, button: 0 };
    h.onPointerDown({ ...e, timeStamp: t }); h.onPointerUp({ ...e, timeStamp: t + 60 });
  };
  it("a second tap soon after the first is a double tap; a slower one is another single tap", () => {
    (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = FakeCanvas;
    try {
      const single: number[] = [], double: number[] = [];
      const tracker = createTapTracker();
      // The handlers are rebuilt on every render; the tracker keeps the last tap.
      const handlers = () => sceneTapHandlers(() => tracker, () => single.push(1), () => double.push(1));
      press(handlers(), 1, 0);
      press(handlers(), 2, DOUBLE_TAP_MS - 10);
      expect([single.length, double.length]).toEqual([1, 1]);
      // A tap right after a double tap starts over: a single tap.
      press(handlers(), 3, 60 + DOUBLE_TAP_MS + 100);
      press(handlers(), 4, 2000);
      press(handlers(), 5, 2000 + DOUBLE_TAP_MS + 200);
      expect([single.length, double.length]).toEqual([4, 1]);
      // Without a double tap handler every tap is a single tap, as before.
      const plain: number[] = [];
      const other = createTapTracker();
      press(sceneTapHandlers(() => other, () => plain.push(1)), 7, 0);
      press(sceneTapHandlers(() => other, () => plain.push(1)), 8, 100);
      expect(plain).toHaveLength(2);
    } finally {
      (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = original;
    }
  });
});

describe("race camera follow (package 8)", () => {
  it("turns through a 90 degree tack in a few seconds, never faster than its rate limit", () => {
    let s: ChaseState = chaseStep(CHASE_START, { heading: 45, dt: 1 / 60, held: false, reducedMotion: false }, RACE_TUNE).state;
    let fastest = 0;
    let settledAt = -1;
    for (let i = 1; i <= 8 * 60; i++) {
      const before = s.yaw!;
      s = chaseStep(s, { heading: 315, dt: 1 / 60, held: false, reducedMotion: false }, RACE_TUNE).state;
      fastest = Math.max(fastest, Math.abs(((s.yaw! - before + 540) % 360) - 180) * 60);
      if (settledAt < 0 && Math.abs(((s.yaw! - 315 + 540) % 360) - 180) < 2) settledAt = i / 60;
    }
    expect(fastest).toBeLessThanOrEqual(RACE_TUNE.maxRate + 1e-6);
    expect(settledAt).toBeGreaterThan(2.5);
    expect(settledAt).toBeLessThan(7);
  });

  it("keeps the slow turn under reduced motion (no jump to the new course) but returns in one cut", () => {
    const step = chaseStep({ yaw: 0, idle: Infinity }, { heading: 90, dt: 1 / 60, held: false, reducedMotion: true }, RACE_TUNE);
    expect(step.state.yaw!).toBeLessThan(1);
    expect(step.blend).toBe(1);
    const chase = chaseStep({ yaw: 0, idle: Infinity }, { heading: 90, dt: 1 / 60, held: false, reducedMotion: true });
    expect(chase.state.yaw).toBe(90);
  });
});

describe("tap versus drag on the scene", () => {
  it("a short still press is a tap", () => {
    const t = createTapTracker();
    t.down(1, 100, 100, 0, true);
    t.move(1, 103, 102);
    expect(t.up(1, 104, 103, 120)).toBe(true);
  });

  it("a drag is not a tap, even when it comes back to where it started", () => {
    const t = createTapTracker();
    t.down(1, 100, 100, 0, true);
    t.move(1, 100 + TAP_SLOP_PX + 5, 100);
    expect(t.up(1, 100, 100, 150)).toBe(false);
    t.down(2, 50, 50, 1000, true);
    expect(t.up(2, 50 + TAP_SLOP_PX + 1, 50, 1100)).toBe(false);
  });

  it("a long press to look around is not a tap", () => {
    const t = createTapTracker();
    t.down(1, 10, 10, 0, true);
    expect(t.up(1, 10, 10, TAP_MAX_MS + 1)).toBe(false);
  });

  it("a pinch is not a tap, whichever finger lifts first", () => {
    const t = createTapTracker();
    t.down(1, 100, 100, 0, true);
    t.down(2, 200, 200, 20, false);
    expect(t.up(2, 200, 200, 80)).toBe(false);
    expect(t.up(1, 100, 100, 90)).toBe(false);
  });

  it("a secondary mouse button, a cancelled pointer or an unknown pointer never taps", () => {
    const t = createTapTracker();
    t.down(1, 0, 0, 0, false);
    expect(t.up(1, 0, 0, 50)).toBe(false);
    t.down(3, 0, 0, 0, true);
    t.cancel(3);
    expect(t.up(3, 0, 0, 50)).toBe(false);
    expect(t.up(9, 0, 0, 50)).toBe(false);
  });

  it("a new primary press after a lost release starts clean", () => {
    const t = createTapTracker();
    t.down(1, 0, 0, 0, true); // released outside the scene: no up arrives
    t.down(4, 30, 30, 5000, true);
    expect(t.up(4, 31, 30, 5100)).toBe(true);
  });
});

describe("chase camera follow and return", () => {
  const run = (state: ChaseState, frames: number, input: { heading: number; held?: boolean; reducedMotion?: boolean }, dt = 1 / 60) => {
    let s = state; let blend = 0; let share = 0;
    for (let i = 0; i < frames; i++) {
      const step = chaseStep(s, { heading: input.heading, dt, held: input.held ?? false, reducedMotion: input.reducedMotion ?? false });
      s = step.state; blend = step.blend; share = share + (1 - share) * step.blend;
    }
    return { state: s, blend, share };
  };

  it("turns the shorter way round", () => {
    expect(turnToward(350, 10, 0.5)).toBeCloseTo(0, 6);
    expect(turnToward(10, 350, 0.5)).toBeCloseTo(0, 6);
    expect(turnToward(90, 270, 1)).toBeCloseTo(270, 6);
    expect(turnToward(45, 135, 0)).toBeCloseTo(45, 6);
  });

  it("takes the boat's course on the first frame and follows a tack smoothly, not in a cut", () => {
    const first = chaseStep(CHASE_START, { heading: 40, dt: 1 / 60, held: false, reducedMotion: false });
    expect(first.state.yaw).toBe(40);
    expect(first.blend).toBeGreaterThan(0);
    const tack = run(first.state, 6, { heading: 130 }); // 0.1 s into a 90 degree tack
    expect(tack.state.yaw!).toBeGreaterThan(40);
    expect(tack.state.yaw!).toBeLessThan(85);
    const settled = run(tack.state, 360, { heading: 130 }); // 6 s later
    expect(settled.state.yaw!).toBeCloseTo(130, 1);
  });

  it("leaves the camera to the player while they orbit, then waits before heading back", () => {
    const sailing = run(CHASE_START, 30, { heading: 0 }).state;
    const orbiting = run(sailing, 60, { heading: 90, held: true });
    expect(orbiting.blend).toBe(0);
    expect(orbiting.state.idle).toBe(0);
    expect(orbiting.state.yaw!).toBeGreaterThan(45); // the course kept being followed meanwhile
    const justReleased = run(orbiting.state, Math.floor(CHASE_RETURN_DELAY * 60) - 2, { heading: 90 });
    expect(justReleased.share).toBe(0); // no movement during the delay
    const back = run(justReleased.state, 4 * 60, { heading: 90 });
    expect(back.share).toBeGreaterThan(0.95); // most of the way back within about 4 s
    expect(back.state.yaw!).toBeCloseTo(90, 1);
  });

  it("with reduced motion follows the course as it is and returns in one cut after the same delay", () => {
    const step = chaseStep({ yaw: 0, idle: 0 }, { heading: 120, dt: 1 / 60, held: false, reducedMotion: true });
    expect(step.state.yaw).toBe(120);
    expect(step.blend).toBe(0);
    const after = chaseStep({ yaw: 120, idle: CHASE_RETURN_DELAY }, { heading: 120, dt: 1 / 60, held: false, reducedMotion: true });
    expect(after.blend).toBe(1);
    const eased = chaseStep({ yaw: 120, idle: CHASE_RETURN_DELAY }, { heading: 120, dt: 1 / 60, held: false, reducedMotion: false });
    expect(eased.blend).toBeGreaterThan(0);
    expect(eased.blend).toBeLessThan(0.1);
  });
});
