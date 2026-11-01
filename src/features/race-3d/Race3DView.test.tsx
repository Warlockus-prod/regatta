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
import { Buoy, GUIDANCE_COLOR, LOADING_COLOR, PLAIN_MARK, STANDARD_COURSE, World } from "./Race3DView";
import { MARK_HALO, VENUE_LOOKS, markHaloOpacity, raceLight } from "@/data/venues/look";

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
    expect(GUIDANCE_COLOR).toBe("#ffd23f");
    // M2-2: not a cyan-ish blue either; the hue sits well away from cyan (180-200).
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(GUIDANCE_COLOR.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const hue = max === r ? 60 * (((g - b) / (max - min)) % 6) : max === g ? 60 * ((b - r) / (max - min) + 2) : 60 * ((r - g) / (max - min) + 4);
    expect(Math.abs(((hue + 360) % 360) - 190)).toBeGreaterThan(60);
    expect(LOADING_COLOR.toLowerCase()).not.toBe("#00d4ff");
  });
});

// F4 contract: every course mark has a halo that faces the camera at a fixed
// size on screen, is drawn over the water (the swell cannot cut it) and fades
// in with the camera distance; with the softer light the buoy is larger and
// lit from within. No flat ring on the water (the swell made it shimmer).
describe("course marks: distance halo and the softer light (F4)", () => {
  type El = ReactElement<Record<string, unknown>>;
  const all = (el: El): El[] => [el, ...Children.toArray(el.props.children as never).filter(isValidElement).flatMap(child => all(child as El))];
  const drawBuoy = (look = PLAIN_MARK) => { hooks.cursor = 0; hooks.frames = []; return all(Buoy({ x: 10, z: -20, color: "#ff7a1a", flag: true, look }) as El); };

  it("passes the mark look to every buoy of the course", () => {
    hooks.cursor = 0; hooks.frames = [];
    const soft = raceLight(VENUE_LOOKS.split, true).mark;
    const tree = World({ venue: findVenue("gocek"), courseRef: { current: STANDARD_COURSE }, boatsRef: { current: [] }, originRef: { current: { x: 0, z: 0 } }, targetLabel: "", land: false, marks: soft });
    hooks.frames.forEach(frame => frame());
    hooks.cursor = 0;
    const again = World({ venue: findVenue("gocek"), courseRef: { current: STANDARD_COURSE }, boatsRef: { current: [] }, originRef: { current: { x: 0, z: 0 } }, targetLabel: "", land: false, marks: soft });
    const buoys = (Children.toArray(again.props.children).filter(isValidElement) as El[]).filter(node => node.type === Buoy);
    expect(tree).toBeDefined();
    expect(buoys.length).toBeGreaterThan(0);
    for (const buoy of buoys) expect(buoy.props.look).toBe(soft);
  });

  it("draws the halo over the water at a fixed screen size by default, and a larger lit buoy only with the softer light", () => {
    const plain = drawBuoy();
    expect(plain.some(node => node.props.name === "mark-ring")).toBe(false);
    const halo = plain.find(node => node.props.name === "mark-halo")!;
    expect(halo.type).toBe("sprite");
    expect(halo.props.scale).toEqual([MARK_HALO.size, MARK_HALO.size, 1]);
    const material = all(halo).find(node => node.type === "spriteMaterial")!;
    expect(material.props).toMatchObject({ sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true, fog: false });
    expect(plain.find(node => node.type === "group" && "scale" in node.props)!.props.scale).toBe(1);
    expect(plain.find(node => node.type === "meshStandardMaterial")!.props.emissiveIntensity).toBe(0);
    const soft = raceLight(VENUE_LOOKS.gocek, true).mark;
    const tree = drawBuoy(soft);
    expect(tree.find(node => node.props.name === "mark-halo")).toBeDefined();
    expect(tree.find(node => node.type === "group" && "scale" in node.props)!.props.scale).toBe(soft.scale);
    expect(tree.find(node => node.type === "meshStandardMaterial")!.props.emissiveIntensity).toBeGreaterThan(0);
  });

  it("fades the halo with the camera distance every frame", () => {
    const tree = drawBuoy();
    const halo = tree.find(node => node.props.name === "mark-halo")!;
    const material = { opacity: 0 };
    const sprite = { visible: false, material, getWorldPosition: (v: { set: (x: number, y: number, z: number) => unknown }) => { v.set(0, 0, 0); return v; } };
    (halo.props.ref as { current: unknown }).current = sprite;
    const frame = (distance: number) => (hooks.frames.at(-1) as unknown as (s: unknown) => void)({ clock: { elapsedTime: 0 }, camera: { position: { distanceTo: () => distance } } });
    frame(20);
    expect(sprite.visible).toBe(false);
    frame(540);
    expect(sprite.visible).toBe(true);
    expect(material.opacity).toBeCloseTo(markHaloOpacity(540));
  });
});

