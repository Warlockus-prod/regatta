import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as THREE from "three/webgpu";
import { METRES_PER_UNIT, type Race3DBoat } from "@/features/race-3d/pose";
import { sampleWave } from "@/features/simulator-3d/ocean/waves";
import { QUALITY_PROFILES, type SceneQuality } from "./quality";

// M3-5 contract on the drawn spray: one instanced mesh that sprays droplets
// at the player's bow while sailing fast, and is hidden on the low profile
// and with reduced motion. The frame runs without WebGL: hooks are slots.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], frames: [] as ((state: unknown, dt: number) => void)[], reduced: false }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useMemo: (make: () => unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = make();
    return hooks.slots[slot];
  },
  useEffect: (effect: () => unknown) => { effect(); },
}));
vi.mock("@react-three/fiber", () => ({ useFrame: (frame: (state: unknown, dt: number) => void) => hooks.frames.push(frame) }));
vi.mock("@/features/race-hud/feedback", () => ({ prefersReducedMotion: () => hooks.reduced }));
import { BowSpray } from "./BowSpray";

const boat = (speed: number, heel: number): Race3DBoat => ({
  id: "me", color: "#fff", pos: { x: 100, y: 200 }, heading: 45, speed, lapDone: 0, isPlayer: true,
  physics: { heel } as Race3DBoat["physics"],
});

/** Moves the boat along its heading at its speed, as the race loop does each frame. */
const sailOn = (b: Race3DBoat, dt: number) => { b.pos = { x: b.pos.x + b.speed * dt * 0.01, y: b.pos.y }; };

function mount(profile: SceneQuality, boats: Race3DBoat[]) {
  hooks.cursor = 0; hooks.slots = []; hooks.frames = [];
  const boatsRef = { current: boats };
  const tree = BowSpray({ boatsRef, profileRef: { current: profile } }) as ReactElement<{ object: THREE.Group }>;
  const mesh = tree.props.object.children[0] as THREE.InstancedMesh;
  let clock = 0, last = 0;
  const run = (seconds: number, step: (dt: number) => void = () => {}) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      step(1 / 60);
      for (const frame of hooks.frames) frame({ clock: { elapsedTime: clock } }, 1 / 60);
      last = clock;
      clock += 1 / 60;
    }
  };
  return { mesh, boatsRef, run, lastFrameAt: () => last };
}

function sail(profile: SceneQuality, player: Race3DBoat, seconds = 0.5) {
  const { mesh, run } = mount(profile, [player]);
  run(seconds, dt => sailOn(player, dt));
  return mesh;
}

beforeEach(() => { hooks.reduced = false; });

describe("BowSpray", () => {
  it("throws droplets at the bow on a fast reach, turned with the yacht", () => {
    const mesh = sail(QUALITY_PROFILES.high, boat(7.5, 12));
    expect(mesh.visible).toBe(true);
    expect(mesh.count).toBeGreaterThan(10);
    expect(mesh.parent!.rotation.y).toBeCloseTo((45 * Math.PI) / 180, 6);
  });

  it("keeps one empty droplet while drifting, so nothing shows", () => {
    const mesh = sail(QUALITY_PROFILES.high, boat(0.5, 1));
    expect(mesh.count).toBe(1);
    // Its matrix scales it to nothing.
    expect(mesh.instanceMatrix.array[0]).toBe(0);
  });

  it("throws no new spray from a boat that stopped moving (paused race or replay), whatever its stored speed", () => {
    const player = boat(7.5, 12);
    const { mesh, run } = mount(QUALITY_PROFILES.high, [player]);
    run(0.5, dt => sailOn(player, dt));
    expect(mesh.count).toBeGreaterThan(10);
    // Paused: the boat keeps speed 7.5 but its position is frozen.
    run(2);
    expect(mesh.count).toBe(1);
    expect(mesh.instanceMatrix.array[0]).toBe(0);
    // Sailing again throws spray again.
    run(0.5, dt => sailOn(player, dt));
    expect(mesh.count).toBeGreaterThan(10);
  });

  it("leaves no droplets hanging while the player's boat is missing from the frame", () => {
    const player = boat(7.5, 12);
    const { mesh, boatsRef, run } = mount(QUALITY_PROFILES.high, [player]);
    run(0.5, dt => sailOn(player, dt));
    expect(mesh.count).toBeGreaterThan(10);
    boatsRef.current = [{ ...player, id: "rival", isPlayer: false }];
    run(1 / 60);
    expect(mesh.count).toBe(1);
    expect(mesh.instanceMatrix.array[0]).toBe(0);
  });

  it("pitches with the swell like the hull, so the spray starts at the stem", () => {
    const player = boat(7.5, 12);
    const { mesh, run, lastFrameAt } = mount(QUALITY_PROFILES.high, [player]);
    run(0.3, dt => sailOn(player, dt));
    const group = mesh.parent!;
    const t = lastFrameAt();
    const yaw = (45 * Math.PI) / 180;
    const x = player.pos.x * METRES_PER_UNIT, z = player.pos.y * METRES_PER_UNIT;
    const at = (lx: number) => sampleWave(lx * Math.cos(yaw) + x, -lx * Math.sin(yaw) + z, t).y;
    expect(Math.abs(group.rotation.z)).toBeGreaterThan(1e-4);
    expect(group.rotation.z).toBeCloseTo(Math.atan2(at(5.8) - at(-5.8), 11.6) * 0.6, 6);
  });

  it("is hidden on the low profile and with reduced motion", () => {
    expect(sail(QUALITY_PROFILES.low, boat(7.5, 12)).visible).toBe(false);
    hooks.reduced = true;
    expect(sail(QUALITY_PROFILES.high, boat(7.5, 12)).visible).toBe(false);
  });
});
