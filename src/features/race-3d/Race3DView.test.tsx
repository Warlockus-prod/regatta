import { readFileSync } from "node:fs";
import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findVenue } from "@/data/venues/venues";
import { toWorld, type Race3DCourse } from "./pose";

// Exercise the World component's tree and frame subscription without WebGL.
// Hook slots retain their values across the explicit component rerenders.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], frames: [] as (() => void)[], updates: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[slot], (value: unknown) => { hooks.slots[slot] = value; hooks.updates++; }];
  },
}));
vi.mock("@react-three/fiber", () => ({ Canvas: () => null, useFrame: (frame: () => void) => hooks.frames.push(frame) }));
vi.mock("@react-three/drei", () => ({ Environment: () => null, Html: () => null, Lightformer: () => null }));
vi.mock("@/features/simulator-3d/Yacht", () => ({ Yacht: () => null }));
vi.mock("@/features/simulator-3d/ocean/Ocean", () => ({ Ocean: () => null }));
vi.mock("@/features/simulator-3d/ocean/Wake", () => ({ Wake: () => null }));
vi.mock("@/features/simulator-3d/ocean/Backdrop", () => ({ terrainGeometry: () => null }));
import { GUIDANCE_COLOR, LOADING_COLOR, STANDARD_COURSE, World } from "./Race3DView";

const customCourse = (): Race3DCourse => ({
  marks: [{ pos: { x: 91, y: 30 }, type: "start" }, { pos: { x: 131, y: 30 }, type: "start" }, { pos: { x: 75, y: -330 }, type: "windward" }],
  startLine: { a: { x: 91, y: 30 }, b: { x: 131, y: 30 } },
  finishLine: { a: { x: 60, y: 55 }, b: { x: 105, y: 55 } },
});
function renderWorld(courseRef: { current: Race3DCourse }) {
  hooks.cursor = 0; hooks.frames = [];
  const tree = World({ venue: findVenue("gocek"), courseRef, boatsRef: { current: [] }, originRef: { current: { x: 0, z: 0 } }, targetLabel: "", land: false });
  return Children.toArray(tree.props.children).filter(isValidElement) as ReactElement<Record<string, unknown>>[];
}
function geometry(tree: ReturnType<typeof renderWorld>) {
  return {
    marks: tree.filter(node => typeof node.props.x === "number").map(node => ({ x: node.props.x, z: node.props.z })),
    lines: tree.filter(node => node.props.a && node.props.b).map(node => ({ a: node.props.a, b: node.props.b })),
  };
}

beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.frames = []; hooks.updates = 0; });

describe("live course world geometry", () => {
  it("renders saved custom marks and both line locations instead of the standard course", () => {
    const course = customCourse();
    const courseRef = { current: course };
    expect(geometry(renderWorld(courseRef)).marks).toEqual([]);
    hooks.frames[0]();
    const result = geometry(renderWorld(courseRef));
    expect(result.marks).toEqual(course.marks.map(mark => toWorld(mark.pos)));
    expect(result.marks).not.toEqual(STANDARD_COURSE.marks.map(mark => toWorld(mark.pos)));
    expect(result.lines).toEqual([course.startLine, course.finishLine].map(line => ({ a: toWorld(line.a), b: toWorld(line.b) })));
    hooks.frames[0]();
    expect(hooks.updates).toBe(1);
  });

  it("refreshes geometry after course ref replacement and avoids frame-by-frame rerenders", () => {
    const courseRef = { current: STANDARD_COURSE };
    renderWorld(courseRef);
    hooks.frames[0]();
    renderWorld(courseRef);
    const replacement = customCourse();
    replacement.finishLine = replacement.startLine;
    courseRef.current = replacement;
    hooks.frames[0](); hooks.frames[0]();
    expect(hooks.updates).toBe(2);
    const result = geometry(renderWorld(courseRef));
    expect(result.marks).toEqual(replacement.marks.map(mark => toWorld(mark.pos)));
    expect(result.lines).toEqual([{ a: toWorld(replacement.startLine.a), b: toWorld(replacement.startLine.b) }]);
    hooks.frames[0]();
    expect(hooks.updates).toBe(2);
    const nextRef = { current: customCourse() };
    renderWorld(nextRef);
    hooks.frames[0]();
    expect(geometry(renderWorld(nextRef)).lines).toHaveLength(2);
    expect(hooks.updates).toBe(3);
  });
});

// M1-7: cyan marks actions only; the next-mark pointer and the loading ring are guidance.
describe("race 3D colours", () => {
  it("draws the next-mark pointer and the loading ring without the action cyan", () => {
    const source = readFileSync(new URL("./Race3DView.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/#00d4ff|0, ?212, ?255/i);
    expect(GUIDANCE_COLOR).toBe("#76c9e9");
    expect(LOADING_COLOR.toLowerCase()).not.toBe("#00d4ff");
  });
});
