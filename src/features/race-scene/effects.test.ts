import { describe, expect, it } from "vitest";
import { QUALITY_PROFILES } from "./quality";
import {
  SHAKE, SPRAY_CAPACITY, beginShakenFrame, createCameraShake, createSceneShake, endShakenFrame, createShakeEvents, createSprayField, shakeEnvelope, sprayIntensity,
} from "./effects";

// M3-5 contract: the bow throws spray that grows with speed and heel and none
// while drifting, never on the low profile or with reduced motion; the camera
// shakes only after a contact or the start gun and is still again within the
// shake's duration.

const { high, medium, low } = QUALITY_PROFILES;

describe("sprayIntensity", () => {
  const drifting = { speed: 0.6, heel: 1 };
  const reachingFast = { speed: 7.5, heel: 12 };
  const beatingHeeled = { speed: 5.5, heel: 22 };

  it("is zero while drifting, strong on a fast reach, clear on a heeled beat", () => {
    expect(sprayIntensity(drifting.speed, drifting.heel, high, false)).toBe(0);
    const reach = sprayIntensity(reachingFast.speed, reachingFast.heel, high, false);
    const beat = sprayIntensity(beatingHeeled.speed, beatingHeeled.heel, high, false);
    expect(reach).toBeGreaterThan(0.6);
    expect(reach).toBeLessThanOrEqual(1);
    expect(beat).toBeGreaterThan(0.4);
    expect(beat).toBeLessThan(reach);
  });

  it("grows with speed and with heel", () => {
    expect(sprayIntensity(4, 10, high, false)).toBeLessThan(sprayIntensity(6, 10, high, false));
    expect(sprayIntensity(5.5, 0, high, false)).toBeLessThan(sprayIntensity(5.5, 22, high, false));
    // Heel to port buries the bow as much as heel to starboard.
    expect(sprayIntensity(5.5, -22, high, false)).toBeCloseTo(sprayIntensity(5.5, 22, high, false), 10);
  });

  it("is less on medium and none on the low profile or with reduced motion", () => {
    const { speed, heel } = reachingFast;
    expect(sprayIntensity(speed, heel, medium, false)).toBeGreaterThan(0);
    expect(sprayIntensity(speed, heel, medium, false)).toBeLessThan(sprayIntensity(speed, heel, high, false));
    for (const input of [drifting, reachingFast, beatingHeeled]) {
      expect(sprayIntensity(input.speed, input.heel, low, false)).toBe(0);
      expect(sprayIntensity(input.speed, input.heel, high, true)).toBe(0);
    }
  });

  it("gives zero for broken inputs", () => {
    expect(sprayIntensity(Number.NaN, 10, high, false)).toBe(0);
    expect(sprayIntensity(Infinity, 10, high, false)).toBe(0);
    expect(sprayIntensity(7, Number.NaN, high, false)).toBeGreaterThan(0);
  });
});

describe("spray particles", () => {
  const run = (field: ReturnType<typeof createSprayField>, seconds: number, intensity: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) field.step(1 / 60, intensity);
    return field.live;
  };

  it("throws nothing at zero intensity", () => {
    expect(run(createSprayField(), 2, 0)).toBe(0);
  });

  it("throws more at a higher intensity, never past the pool, and keeps its arrays", () => {
    const field = createSprayField();
    const arrays = [field.x, field.y, field.z, field.size];
    const strong = run(field, 0.5, 1);
    expect(strong).toBeGreaterThan(10);
    expect(strong).toBeLessThanOrEqual(SPRAY_CAPACITY);
    expect(run(createSprayField(), 0.5, 0.3)).toBeLessThan(strong);
    expect([field.x, field.y, field.z, field.size]).toEqual(arrays);
    for (let i = 0; i < field.live; i++) {
      expect(Number.isFinite(field.x[i] + field.y[i] + field.z[i])).toBe(true);
      expect(field.size[i]).toBeGreaterThan(0);
    }
  });

  it("is gone within a second after the spray stops", () => {
    const field = createSprayField();
    run(field, 0.5, 1);
    expect(run(field, 1, 0)).toBe(0);
  });

  it("clears at once when switched off", () => {
    const field = createSprayField();
    run(field, 0.3, 1);
    field.clear();
    expect(field.live).toBe(0);
    expect(field.step(1 / 60, 0)).toBe(0);
  });
});

describe("camera shake", () => {
  it("is zero without an event", () => {
    expect(shakeEnvelope(null, 0)).toBe(0);
    const shake = createCameraShake();
    const out = { x: 1, y: 1, z: 1 };
    for (const now of [0, 0.1, 1, 30]) {
      expect(shake.offset(now, 30, out)).toBe(false);
      expect(out).toEqual({ x: 0, y: 0, z: 0 });
    }
  });

  it("decays to zero within its duration for each event", () => {
    for (const kind of ["contact", "gun"] as const) {
      const { duration, amplitude } = SHAKE[kind];
      expect(shakeEnvelope(kind, 0)).toBeCloseTo(amplitude, 10);
      let previous = Infinity;
      for (let t = 0; t < duration; t += duration / 20) {
        const value = shakeEnvelope(kind, t);
        expect(value).toBeLessThanOrEqual(previous);
        previous = value;
      }
      expect(shakeEnvelope(kind, duration)).toBe(0);
      expect(shakeEnvelope(kind, duration + 5)).toBe(0);
      expect(shakeEnvelope(kind, -0.1)).toBe(0);
    }
  });

  it("moves the camera after a contact, then stops and stays still", () => {
    const shake = createCameraShake();
    const out = { x: 0, y: 0, z: 0 };
    shake.trigger("contact", 10);
    let moved = false;
    for (let t = 10; t < 10 + SHAKE.contact.duration; t += 1 / 60) {
      if (shake.offset(t, 30, out)) moved = true;
      expect(Math.hypot(out.x, out.y, out.z)).toBeLessThanOrEqual(SHAKE.contact.amplitude * 30 * 1.5);
    }
    expect(moved).toBe(true);
    expect(shake.offset(10 + SHAKE.contact.duration + 0.001, 30, out)).toBe(false);
    expect(shake.offset(20, 30, out)).toBe(false);
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("keeps a running contact shake over a weaker gun", () => {
    const shake = createCameraShake();
    const out = { x: 0, y: 0, z: 0 };
    shake.trigger("contact", 0);
    shake.trigger("gun", 0.01);
    // Still running at a time the gun's shake would already be over.
    expect(shake.offset(SHAKE.contact.duration - 0.02, 30, out)).toBe(true);
  });
});

describe("shake events", () => {
  it("fires on a new contact id and on the start gun, never on the first reading", () => {
    const events = createShakeEvents();
    expect(events(undefined, false)).toBe(null);
    expect(events(undefined, false)).toBe(null);
    expect(events(undefined, true)).toBe("gun");
    expect(events(undefined, true)).toBe(null);
    expect(events(4, true)).toBe("contact");
    expect(events(4, true)).toBe(null);
    expect(events(null, true)).toBe(null);
    expect(events(4, true)).toBe(null);
    expect(events(5, true)).toBe("contact");
  });

  it("does not shake a scene mounted mid-race or mid-contact", () => {
    const events = createShakeEvents();
    expect(events(3, true)).toBe(null);
    expect(events(3, true)).toBe(null);
  });
});

describe("shaken frame", () => {
  const control = (allowed: boolean) => ({ shake: createCameraShake(), pending: null as "contact" | "gun" | null, allowed: () => allowed });

  it("offsets the camera for the drawn frame only, so the orbit never moves", () => {
    const shake = control(true);
    const position = { x: 12, y: 9, z: -20 };
    const before = { ...position };
    const offset = { x: 0, y: 0, z: 0 };
    shake.pending = "contact";
    let shook = 0;
    for (let frame = 1; frame <= 60; frame++) {
      const seconds = 5 + frame / 60;
      if (beginShakenFrame(shake, seconds, 30, position, offset)) {
        shook++;
        expect(Math.hypot(position.x - before.x, position.y - before.y, position.z - before.z)).toBeGreaterThan(0);
        endShakenFrame(position, offset);
      }
      expect(position.x).toBeCloseTo(before.x, 9);
      expect(position.y).toBeCloseTo(before.y, 9);
      expect(position.z).toBeCloseTo(before.z, 9);
    }
    expect(shake.pending).toBe(null);
    expect(shook).toBeGreaterThan(5);
    expect(shook).toBeLessThan(60 * SHAKE.contact.duration + 2);
  });

  it("drops the event when shaking is not allowed (low profile, reduced motion)", () => {
    const shake = control(false);
    const position = { x: 1, y: 2, z: 3 };
    shake.pending = "gun";
    for (let frame = 0; frame < 30; frame++) expect(beginShakenFrame(shake, frame / 60, 30, position, { x: 0, y: 0, z: 0 })).toBe(false);
    expect(position).toEqual({ x: 1, y: 2, z: 3 });
    expect(shake.pending).toBe(null);
  });

  it("never shakes during normal sailing without an event", () => {
    const shake = control(true);
    const position = { x: 1, y: 2, z: 3 };
    for (let frame = 0; frame < 600; frame++) expect(beginShakenFrame(shake, frame / 60, 30, position, { x: 0, y: 0, z: 0 })).toBe(false);
  });
});

describe("scene shake (RaceScene's control)", () => {
  const frame = (control: ReturnType<typeof createSceneShake>, seconds: number) => {
    const position = { x: 1, y: 2, z: 3 }, offset = { x: 0, y: 0, z: 0 };
    const shaken = beginShakenFrame(control, seconds, 30, position, offset);
    return { shaken, moved: Math.hypot(position.x - 1, position.y - 2, position.z - 3) };
  };
  const gunAt = (profile: typeof high, reduced: boolean) => {
    const control = createSceneShake({ current: profile }, { current: reduced });
    control.feed(null, false);
    expect(frame(control, 1).shaken).toBe(false);
    control.feed(null, true);
    return frame(control, 1.05);
  };

  it("shakes once at the start gun after the countdown on medium and high", () => {
    for (const profile of [high, medium]) {
      const at = gunAt(profile, false);
      expect(at.shaken).toBe(true);
      expect(at.moved).toBeGreaterThan(0);
    }
  });

  it("does not shake on the low profile or with reduced motion", () => {
    expect(gunAt(low, false)).toEqual({ shaken: false, moved: 0 });
    expect(gunAt(high, true)).toEqual({ shaken: false, moved: 0 });
  });

  it("reads the profile and the setting live: a step down to low drops the pending contact", () => {
    const profile = { current: high as typeof high }, reduced = { current: false };
    const control = createSceneShake(profile, reduced);
    control.feed(null, true);
    control.feed(7, true);
    profile.current = low;
    expect(frame(control, 2)).toEqual({ shaken: false, moved: 0 });
    profile.current = high;
    expect(frame(control, 2.02).shaken).toBe(false);
    // A new contact on high shakes again.
    control.feed(8, true);
    expect(frame(control, 3).shaken).toBe(true);
  });

  it("does not shake when mounted after the gun, and shakes for a new contact id", () => {
    const control = createSceneShake({ current: high }, { current: false });
    control.feed(null, true);
    expect(frame(control, 1).shaken).toBe(false);
    control.feed(4, true);
    expect(frame(control, 1.1).shaken).toBe(true);
  });
});
