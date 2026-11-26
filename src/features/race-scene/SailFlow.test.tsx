import type { ReactElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three/webgpu";
import { METRES_PER_UNIT, type Race3DBoat } from "@/features/race-3d/pose";
import { raceWindReading } from "@/features/race-hud/navigation-model";
import type { CoachKey } from "@/features/sailing-lab/runtime/trim-coach";
import { SAIL_FLOW_COLOURS } from "./sail-flow";

// F6 contract on the drawn ribbons: at the player's yacht only, turned and
// heeled and riding the swell with it, arriving from the side and at the
// angle the APPARENT wind blows from, as strong as the apparent wind, moving
// with the air (standing still with an arrowhead under reduced motion), white
// without trim advice and telltale coloured with it, hidden as one zero-size
// instance so the shader warm-up still sees it. No WebGL: hooks are slots.
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
import { SailFlow, SAIL_FLOW_DASHES, yachtSwellAttitude } from "./SailFlow";

/** Wind from the north; heading 315 puts it 45 deg on the starboard bow, heading 45 on the port bow. */
const boat = (heading: number, windKnots: number | undefined = 12, isPlayer = true): Race3DBoat => ({
  id: isPlayer ? "me" : "rival", color: "#fff", pos: { x: 100, y: 200 }, heading, speed: 5, lapDone: 0, isPlayer,
  physics: { trueWindDir: 0, trueWindSpeed: windKnots as number, heading, boatSpeed: 5, heel: 10, leeway: 2 },
});

function mount(boats: Race3DBoat[], coach: CoachKey | null = null, ownTrim = false) {
  hooks.cursor = 0; hooks.slots = []; hooks.frames = [];
  const boatsRef = { current: boats };
  const coachRef = { current: coach };
  const tree = SailFlow({ boatsRef, windDirRef: { current: 0 }, coachRef, ownTrim }) as ReactElement<{ object: THREE.Group }>;
  const yaw = tree.props.object;
  const heel = yaw.children[0] as THREE.Group;
  const [dashes, heads] = heel.children as THREE.InstancedMesh[];
  const time = { clock: 0, last: 0 };
  /** Runs frames for `seconds`; `last` is the clock of the last frame run. */
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      for (const frame of hooks.frames) frame({ clock: { elapsedTime: time.clock } }, 1 / 60);
      time.last = time.clock;
      time.clock += 1 / 60;
    }
  };
  return { yaw, heel, dashes, heads, run, boatsRef, coachRef, time };
}

const position = (mesh: THREE.InstancedMesh, i: number) => {
  const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m);
  return new THREE.Vector3().setFromMatrixPosition(m);
};
/** The unit direction the air moves at instance i, in the yacht's frame. */
const direction = (mesh: THREE.InstancedMesh, i: number) => {
  const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m);
  const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3());
  return new THREE.Vector3(1, 0, 0).applyQuaternion(q);
};
const scaleOf = (mesh: THREE.InstancedMesh, i: number) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m.getMaxScaleOnAxis(); };
/** Nothing on screen, yet one zero-size dash and head stay renderable for the shader warm-up. */
const hidden = (flow: { yaw: THREE.Group; heel: THREE.Group; dashes: THREE.InstancedMesh; heads: THREE.InstancedMesh }) =>
  flow.yaw.visible && flow.heel.visible && flow.dashes.visible && flow.heads.visible
  && flow.dashes.count === 1 && flow.heads.count === 1 && scaleOf(flow.dashes, 0) === 0 && scaleOf(flow.heads, 0) === 0;
const colour = (mesh: THREE.InstancedMesh, i: number) => { const c = new THREE.Color(); mesh.getColorAt(i, c); return `#${c.getHexString()}`; };

beforeEach(() => { hooks.reduced = false; });

describe("SailFlow", () => {
  it("draws five ribbons at the player's yacht, turned, heeled and riding the swell with it, the air arriving from starboard", () => {
    hooks.reduced = true;
    const flow = mount([boat(315), boat(315, 12, false)]);
    flow.run(0.2);
    expect(hidden(flow)).toBe(false);
    expect(flow.dashes.count).toBe(5 * SAIL_FLOW_DASHES);
    const yaw = (90 - 315) * Math.PI / 180;
    expect(flow.yaw.rotation.y).toBeCloseTo(yaw, 6);
    // The yacht's heel plus the swell's roll and pitch, sampled as Yacht.tsx does at the same moment.
    const swell = yachtSwellAttitude(100 * METRES_PER_UNIT, 200 * METRES_PER_UNIT, yaw, flow.time.last, { heave: 0, roll: 0, pitch: 0 });
    expect(Math.abs(swell.roll)).toBeGreaterThan(1e-3);
    expect(flow.heel.rotation.x).toBeCloseTo(10 * Math.PI / 180 + swell.roll, 6);
    expect(flow.heel.rotation.z).toBeCloseTo(swell.pitch, 6);
    expect(flow.yaw.position.y).toBeCloseTo(swell.heave, 6);
    // The first dash of every ribbon sits upwind, on the starboard side of the yacht's frame.
    for (let i = 0; i < 5; i++) expect(position(flow.dashes, i * SAIL_FLOW_DASHES).z).toBeGreaterThan(1);
    // Wind on the port bow mirrors it.
    const port = mount([boat(45)]);
    port.run(0.2);
    for (let i = 0; i < 5; i++) expect(position(port.dashes, i * SAIL_FLOW_DASHES).z).toBeLessThan(-1);
  });

  it("arrives at the apparent wind angle, not the true one", () => {
    hooks.reduced = true;
    const b = boat(315);
    const flow = mount([b]);
    flow.run(0.2);
    const reading = raceWindReading({ heading: b.heading, boatSpeedKn: b.speed, windFrom: 0, windKnots: 12, leeway: 2 })!;
    // Close hauled the apparent wind is well forward of the true wind.
    expect(reading.twaSigned - reading.awaSigned!).toBeGreaterThan(8);
    for (let i = 0; i < 5; i++) {
      const d = direction(flow.dashes, i * SAIL_FLOW_DASHES);
      const from = Math.atan2(-d.z, -d.x) * 180 / Math.PI;
      expect(Math.abs(from - reading.awaSigned!)).toBeLessThan(1);
    }
  });

  it("is stronger upwind than downwind in the same true wind: the apparent wind decides", () => {
    hooks.reduced = true;
    const upwind = mount([boat(315, 12)]); upwind.run(0.2);
    const up = (upwind.dashes.material as THREE.MeshBasicMaterial).opacity;
    const downwind = mount([boat(150, 12)]); downwind.run(0.2);
    expect(up).toBeGreaterThan((downwind.dashes.material as THREE.MeshBasicMaterial).opacity + 0.15);
  });

  it("eases the sails and the heel every frame through a tack, at the yacht's rate", () => {
    hooks.reduced = true;
    const flow = mount([boat(315)]);
    flow.run(0.2);
    const deg = Math.PI / 180;
    const startRoll = () => yachtSwellAttitude(100 * METRES_PER_UNIT, 200 * METRES_PER_UNIT, flow.yaw.rotation.y, flow.time.last, { heave: 0, roll: 0, pitch: 0 }).roll;
    flow.boatsRef.current[0].physics!.heel = -10;
    flow.run(1 / 60);
    const first = (flow.heel.rotation.x - startRoll()) / deg;
    // One frame moves the heel by dt * 8 of the way (Yacht.tsx), not 60% in a 0.1 s step.
    expect(first).toBeCloseTo(10 - 20 * (8 / 60), 4);
    flow.run(1 / 60);
    const second = (flow.heel.rotation.x - startRoll()) / deg;
    expect(second).toBeLessThan(first - 1);
    flow.run(1);
    expect((flow.heel.rotation.x - startRoll()) / deg).toBeCloseTo(-10, 1);
  });

  it("moves the dashes with the air, and with reduced motion keeps them still and shows arrowheads", () => {
    const moving = mount([boat(315)]);
    moving.run(0.2);
    const before = position(moving.dashes, 0);
    moving.run(0.3);
    expect(position(moving.dashes, 0).distanceTo(before)).toBeGreaterThan(0.5);
    expect(moving.heads.count).toBe(1);
    expect(scaleOf(moving.heads, 0)).toBe(0); // no arrowhead shown while the dashes move
    hooks.reduced = true;
    const still = mount([boat(315)]);
    still.run(0.2);
    const fixed = position(still.dashes, 0);
    still.run(0.5);
    expect(position(still.dashes, 0).distanceTo(fixed)).toBeLessThan(1e-6);
    expect(still.heads.count).toBe(5);
  });

  it("is white without trim advice and takes each sail's telltale colour from the race trim coach", () => {
    const plain = mount([boat(315)]);
    plain.run(0.2);
    expect(colour(plain.dashes, 0)).toBe(SAIL_FLOW_COLOURS.neutral);
    const coached = mount([boat(315)], "stallMain");
    coached.run(0.2);
    expect(colour(coached.dashes, 0)).toBe(SAIL_FLOW_COLOURS.stalled);
    expect(colour(coached.dashes, 3 * SAIL_FLOW_DASHES)).toBe(SAIL_FLOW_COLOURS.attached);
    coached.coachRef.current = "luffJib";
    coached.run(0.2);
    expect(colour(coached.dashes, 0)).toBe(SAIL_FLOW_COLOURS.attached);
    expect(colour(coached.dashes, 4 * SAIL_FLOW_DASHES)).toBe(SAIL_FLOW_COLOURS.luffing);
  });

  it("shows stronger air as thicker, brighter ribbons", () => {
    hooks.reduced = true;
    const light = mount([boat(315, 4)]); light.run(0.2);
    const lightOpacity = (light.dashes.material as THREE.MeshBasicMaterial).opacity;
    const strong = mount([boat(315, 18)]); strong.run(0.2);
    expect((strong.dashes.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(lightOpacity);
  });

  it("in Pro without advice shows only the air arriving at the luff, white, never a flow round the cloth", () => {
    const flow = mount([boat(315)], null, true);
    flow.run(0.2);
    expect(hidden(flow)).toBe(false);
    for (let i = 0; i < flow.dashes.count; i++) {
      expect(colour(flow.dashes, i)).toBe(SAIL_FLOW_COLOURS.neutral);
      // Wind from starboard: every dash stays on the windward (starboard) side, none on the lee face.
      expect(position(flow.dashes, i).z).toBeGreaterThan(0);
    }
  });

  it("starts hidden and hides as one zero-size instance, renderable for the shader warm-up", () => {
    const fresh = mount([boat(315)]);
    expect(hidden(fresh)).toBe(true);
    const unknown = mount([boat(315, undefined)]);
    unknown.boatsRef.current[0].physics = undefined;
    unknown.run(0.2);
    expect(hidden(unknown)).toBe(true);
    const flow = mount([boat(315)]);
    flow.run(0.2);
    expect(hidden(flow)).toBe(false);
    expect(flow.heads.count).toBe(1); // moving dashes: one zero-size head keeps its pipeline
    expect(scaleOf(flow.heads, 0)).toBe(0);
    flow.boatsRef.current = [boat(315, 12, false)];
    flow.run(1 / 60);
    expect(hidden(flow)).toBe(true);
  });
});

describe("SailFlow wiring", () => {
  const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
  it("is mounted only when switched on, in place of the 3D wind arrows, fed by the single race's setting and its Pro trim advice, never in multiplayer or replay", () => {
    const scene = source("src/features/race-scene/RaceScene.tsx");
    expect(scene).toMatch(/const windLayers = raceWindLayers\(showWind, sailFlow\);/);
    expect(scene).toMatch(/<Player boatsRef=\{boatsRef\} windDirRef=\{windDirRef\} showWind=\{windLayers\.arrows\} \/>/);
    expect(scene).toMatch(/\{windLayers\.ribbons && <SailFlow boatsRef=\{boatsRef\} windDirRef=\{windDirRef\} coachRef=\{sailFlowCoachRef\} ownTrim=\{sailFlowOwnTrim\} \/>\}/);
    const game = source("src/app/game/GameClient.tsx");
    expect(game).toMatch(/<RaceScene [^>]*sailFlow=\{playingPrefs\.sailFlow === true\} sailFlowCoachRef=\{sailFlowCoachRef\} sailFlowOwnTrim=\{playingPrefs\.mode === "pro"\}/);
    expect(game).toMatch(/sailFlowCoachRef\.current = trimCoach/);
    expect(game).toMatch(/const trimCoach = hudPlayer && playingPrefs\.mode === "pro" && playingPrefs\.trimHints \?/);
    for (const host of ["src/app/multiplayer/MultiplayerClient.tsx", "src/app/game/RaceReplay.tsx"]) expect(source(host), host).not.toMatch(/sailFlow/);
  });
});
