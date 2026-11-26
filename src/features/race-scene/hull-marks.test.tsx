import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three/webgpu";
import { VENUE_LOOKS, sceneColors } from "@/data/venues/look";
import type { SailingHull } from "./environment-state";
import { waterUniforms } from "./materials";

// M3-6 contract: when the wake material changes during a race (the quality
// governor switches the glow off, another venue look), every boat keeps one
// wake and one shadow on the water, the wakes take the new material and the
// shadow stays drawable. The hooks run as React runs them: memos and effects
// keyed on their dependencies, cleanups before the new effects, no WebGL.
type Deps = readonly unknown[] | undefined;
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  pending: [] as (() => void)[],
  frame: null as null | ((state: unknown) => void),
}));
const changed = (a: Deps, b: Deps) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useMemo: (make: () => unknown, deps: Deps) => {
    const slot = hooks.cursor++;
    const prev = hooks.slots[slot] as { deps: Deps; value: unknown } | undefined;
    if (!prev || changed(prev.deps, deps)) hooks.slots[slot] = { deps, value: make() };
    return (hooks.slots[slot] as { value: unknown }).value;
  },
  useEffect: (effect: () => (() => void) | void, deps: Deps) => {
    const slot = hooks.cursor++;
    const prev = hooks.slots[slot] as { deps: Deps; cleanup?: () => void } | undefined;
    if (prev && !changed(prev.deps, deps)) return;
    const entry: { deps: Deps; cleanup?: () => void } = { deps };
    hooks.slots[slot] = entry;
    hooks.pending.push(() => { prev?.cleanup?.(); entry.cleanup = effect() ?? undefined; });
  },
}));
vi.mock("@react-three/fiber", () => ({ useFrame: (frame: (state: unknown) => void) => { hooks.frame = frame; } }));
import { HullMarks } from "./SailingEnvironment";

const boats: SailingHull[] = [
  { id: "me", travel: { x: 0, z: 0 }, heading: 20, speedKn: 6 },
  { id: "rival", travel: { x: 40, z: -30 }, heading: 340, speedKn: 5.5 },
] as SailingHull[];

function mount() {
  hooks.cursor = 0; hooks.slots = []; hooks.pending = []; hooks.frame = null;
  const group = new THREE.Group();
  const uniforms = waterUniforms();
  const base = { readBoats: () => boats, originRef: { current: { x: 0, z: 0 } }, travel: uniforms.travel, sunDir: new THREE.Vector3(0.5, 0.7, 0.2).normalize() };
  let clock = 0;
  const render = (props: { colors: ReturnType<typeof sceneColors>; glow?: { value: number } }) => {
    hooks.cursor = 0;
    const tree = HullMarks({ ...base, ...props }) as ReactElement<{ ref: { current: THREE.Group | null } }>;
    tree.props.ref.current = group;
    // React runs every cleanup of the commit before the new effects.
    const pending = hooks.pending.splice(0);
    pending.forEach((run) => run());
  };
  const frames = (n: number) => { for (let i = 0; i < n; i++) { clock += 1 / 30; hooks.frame?.({ clock: { elapsedTime: clock } }); } };
  return { group, uniforms, render, frames };
}

const meshes = (group: THREE.Group) => group.children as THREE.Mesh[];
const wakes = (group: THREE.Group) => meshes(group).filter((m) => m.geometry.type === "BufferGeometry");
const shadows = (group: THREE.Group) => meshes(group).filter((m) => m.geometry.type === "PlaneGeometry");

describe("HullMarks across a change of the wake material", () => {
  it("keeps one wake and one shadow per boat and swaps the material onto the wakes on the water", () => {
    const { group, uniforms, render, frames } = mount();
    const gocek = sceneColors(VENUE_LOOKS.gocek);
    render({ colors: gocek, glow: uniforms.glow });
    frames(20);
    expect(wakes(group)).toHaveLength(2);
    expect(shadows(group)).toHaveLength(2);
    const before = wakes(group)[0].material as THREE.Material;
    const shadowMaterial = shadows(group)[0].material as THREE.Material;
    const shadowGeometry = shadows(group)[0].geometry;
    const disposed: string[] = [];
    before.addEventListener("dispose", () => disposed.push("old wake"));
    shadowMaterial.addEventListener("dispose", () => disposed.push("shadow material"));
    shadowGeometry.addEventListener("dispose", () => disposed.push("shadow plane"));

    // The governor steps medium -> low: the glow is switched off.
    render({ colors: gocek });
    frames(20);
    expect(group.children).toHaveLength(4);
    expect(wakes(group)).toHaveLength(2);
    expect(shadows(group)).toHaveLength(2);
    const after = wakes(group)[0].material;
    expect(after).not.toBe(before);
    for (const w of wakes(group)) expect(w.material).toBe(after);
    expect(disposed).toEqual(["old wake"]);

    // Another venue look: still the same marks, one new material.
    render({ colors: sceneColors(VENUE_LOOKS.solent) });
    frames(5);
    expect(group.children).toHaveLength(4);
    expect(new Set(wakes(group).map((w) => w.material)).size).toBe(1);
    expect(wakes(group)[0].material).not.toBe(after);
  });

  it("keeps the same wake material while only the glow strength changes (high to medium)", () => {
    const { group, uniforms, render, frames } = mount();
    const colors = sceneColors(VENUE_LOOKS.split);
    render({ colors, glow: uniforms.glow });
    frames(3);
    const first = wakes(group)[0].material;
    uniforms.glow.value = 0.6;
    render({ colors, glow: uniforms.glow });
    frames(3);
    expect(wakes(group)[0].material).toBe(first);
    expect(group.children).toHaveLength(4);
  });
});
