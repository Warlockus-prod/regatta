import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { applySailingCameraPose, createSailingOrbitControls } from "./orbit-controls";

class TestCanvas extends EventTarget {
  ownerDocument = new EventTarget();
  style = { touchAction: "", cursor: "" };
  clientWidth = 600;
  clientHeight = 400;
  releasePointerCapture() {}
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}
const pointer = (type: string, id: number, x: number, y: number) => Object.assign(new Event(type, { cancelable: true }), {
  pointerType: "touch", pointerId: id, pageX: x, pageY: y, clientX: x, clientY: y, button: 0,
});
function fixture() {
  const canvas = new TestCanvas();
  const camera = new PerspectiveCamera(42, 1.5, .5, 4200);
  camera.position.set(30, 20, 35);
  const binding = createSailingOrbitControls(camera, canvas as unknown as HTMLElement);
  const controls = binding.controls;
  controls.enableDamping = false; controls.minDistance = 9; controls.maxDistance = 240;
  controls.target.set(0, 10, 0); controls.update();
  return { canvas, camera, controls, dispose: binding.dispose };
}

describe("actual canvas orbit gestures", () => {
  it("rotates the perspective camera with one finger and keeps that view over later frames", () => {
    const { canvas, camera, controls, dispose } = fixture();
    const before = camera.position.clone();
    canvas.dispatchEvent(pointer("pointerdown", 1, 150, 100));
    canvas.ownerDocument.dispatchEvent(pointer("pointermove", 1, 250, 130));
    expect(camera.position.distanceTo(before)).toBeGreaterThan(10);
    canvas.ownerDocument.dispatchEvent(pointer("pointerup", 1, 250, 130));
    const adjusted = camera.position.clone();
    for (let frame = 0; frame < 90; frame++) controls.update();
    expect(camera.position.distanceTo(adjusted)).toBeLessThan(1e-9);
    expect(controls.target.toArray()).toEqual([0, 10, 0]);
    dispose();
  });

  it("pinches with two canvas fingers to zoom without panning the boat away", () => {
    const { canvas, camera, controls, dispose } = fixture();
    const distance = camera.position.distanceTo(controls.target);
    canvas.dispatchEvent(pointer("pointerdown", 1, 200, 100));
    canvas.dispatchEvent(pointer("pointerdown", 2, 300, 100));
    canvas.ownerDocument.dispatchEvent(pointer("pointermove", 2, 400, 100));
    expect(camera.position.distanceTo(controls.target)).toBeLessThan(distance * .7);
    expect(controls.target.toArray()).toEqual([0, 10, 0]);
    canvas.ownerDocument.dispatchEvent(pointer("pointerup", 1, 200, 100));
    canvas.ownerDocument.dispatchEvent(pointer("pointerup", 2, 400, 100));
    dispose();
  });

  it("ignores wheel/dock pointers even while another finger is orbiting the scene", () => {
    const { canvas, camera, dispose } = fixture();
    canvas.dispatchEvent(pointer("pointerdown", 1, 200, 100));
    const before = camera.position.clone();
    // A second finger begins on a separate helm wheel, not the canvas.
    canvas.ownerDocument.dispatchEvent(pointer("pointermove", 2, 550, 350));
    canvas.ownerDocument.dispatchEvent(pointer("pointerup", 2, 550, 350));
    expect(camera.position.toArray()).toEqual(before.toArray());
    // Its release must not stop the still-active canvas finger.
    canvas.ownerDocument.dispatchEvent(pointer("pointermove", 1, 280, 120));
    expect(camera.position.distanceTo(before)).toBeGreaterThan(10);
    canvas.ownerDocument.dispatchEvent(pointer("pointerup", 1, 280, 120));
    dispose();
  });

  it("resets the fitted pose exactly after damped dragging and removes all document handlers", () => {
    const { canvas, camera, controls, dispose } = fixture();
    controls.enableDamping = true;
    canvas.dispatchEvent(pointer("pointerdown", 1, 100, 100));
    canvas.ownerDocument.dispatchEvent(pointer("pointermove", 1, 280, 160));
    const pose = { position: new Vector3(30, 20, 35), target: new Vector3(0, 10, 0), fov: 42 };
    applySailingCameraPose(camera, controls, pose);
    expect(camera.position.distanceTo(pose.position)).toBeLessThan(1e-9);
    for (let frame = 0; frame < 20; frame++) controls.update();
    expect(camera.position.distanceTo(pose.position)).toBeLessThan(1e-9);
    dispose();
    const before = camera.position.clone();
    canvas.ownerDocument.dispatchEvent(pointer("pointermove", 1, 400, 200));
    expect(camera.position.toArray()).toEqual(before.toArray());
  });
});
