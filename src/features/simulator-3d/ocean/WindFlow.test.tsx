import * as React from "react";
import * as THREE from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NEUTRAL_YACHT } from "../types";
import { WindFlow } from "./WindFlow";

const harness = vi.hoisted(() => ({ frames: [] as ((state: unknown, dt: number) => void)[], cleanup: [] as (() => void)[] }));
vi.mock("@react-three/fiber", () => ({ useFrame: (callback: (state: unknown, dt: number) => void) => harness.frames.push(callback) }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useMemo: (factory: () => unknown) => factory(), useRef: (value: unknown) => ({ current: value }),
  useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanup.push(cleanup); },
}));
beforeEach(() => { vi.stubGlobal("React", React); harness.frames = []; harness.cleanup = []; });
afterEach(() => { for (const cleanup of harness.cleanup) cleanup(); vi.unstubAllGlobals(); });

function mount(readWind?: () => { from: number; knots: number } | null) {
  const stateRef = { current: { ...NEUTRAL_YACHT, wind: { from: 0, knots: 12 }, apparentWind: undefined } };
  const tree = WindFlow({ stateRef, readWind });
  const nodes = React.Children.toArray(tree.props.children) as React.ReactElement<{ object: THREE.InstancedMesh; ref: { current: THREE.InstancedMesh | null } }>[];
  for (const node of nodes) node.props.ref.current = node.props.object;
  return { shafts: nodes[0].props.object, heads: nodes[1].props.object, frame: () => harness.frames[0]({}, 1 / 60) };
}

it("draws the supplied race air direction instead of the pose's legacy wind", () => {
  const flow = mount(() => ({ from: 90, knots: 13 }));
  flow.frame();
  expect(flow.shafts.visible).toBe(true); expect(flow.heads.visible).toBe(true);
  const matrix = new THREE.Matrix4(); flow.shafts.getMatrixAt(0, matrix);
  const direction = new THREE.Vector3(0, 1, 0).transformDirection(matrix);
  expect(direction.x).toBeCloseTo(-1); expect(direction.z).toBeCloseTo(0);
  expect([...matrix.elements].every(Number.isFinite)).toBe(true);
});

it("hides an unknown or invalid race wind without falling back to an invented12kn", () => {
  let wind: { from: number; knots: number } | null = null;
  const flow = mount(() => wind); flow.frame();
  expect(flow.shafts.visible).toBe(false); expect(flow.heads.visible).toBe(false);
  wind = { from: 0, knots: Infinity }; flow.frame(); expect(flow.heads.visible).toBe(false);
  wind = { from: 180, knots: 7 }; flow.frame(); expect(flow.heads.visible).toBe(true);
});

it("preserves the existing trainer state source when no race reader is supplied", () => {
  const flow = mount(); flow.frame(); expect(flow.shafts.visible).toBe(true);
  const matrix = new THREE.Matrix4(); flow.shafts.getMatrixAt(0, matrix);
  const direction = new THREE.Vector3(0, 1, 0).transformDirection(matrix);
  expect(direction.x).toBeCloseTo(0); expect(direction.z).toBeCloseTo(1);
});
