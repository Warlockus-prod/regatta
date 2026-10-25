import { MOUSE, TOUCH, type Camera, type OrthographicCamera, type PerspectiveCamera, type Vector3 } from "three";
import { OrbitControls } from "three-stdlib";

export const SAILING_ORBIT_OPTIONS = {
  enablePan: false, enableRotate: true, enableZoom: true,
  enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.65, zoomSpeed: 0.8,
  minPolarAngle: 0.06, maxPolarAngle: Math.PI / 2.04,
  mouseButtons: { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE },
  touches: { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE },
};
export interface SailingCameraPose { position: Vector3; target: Vector3; fov: number }

/** OrbitControls listens on the document while dragging. Filter those callbacks
 * to pointers that began on this canvas, so a second finger on a helm/sheet
 * cannot rotate or end an active camera gesture. Other inputs keep their events. */
function scopedCanvas(canvas: HTMLElement) {
  const pointers = new Set<number>();
  const wrappers = new Map<EventListenerOrEventListenerObject, Map<string, EventListener>>();
  const remember = (event: Event) => { pointers.add((event as PointerEvent).pointerId); };
  const cancel = (event: Event) => { queueMicrotask(() => pointers.delete((event as PointerEvent).pointerId)); };
  canvas.addEventListener("pointerdown", remember, true);
  canvas.addEventListener("pointercancel", cancel, true);
  const doc = canvas.ownerDocument;
  const scopedDocument = new Proxy(doc, { get(target, key) {
    if (key === "addEventListener") return (type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
      if (type !== "pointermove" && type !== "pointerup") { target.addEventListener(type, listener, options); return; }
      const wrapped: EventListener = event => {
        const id = (event as PointerEvent).pointerId;
        if (!pointers.has(id)) return;
        if (typeof listener === "function") listener.call(doc, event); else listener.handleEvent(event);
        if (type === "pointerup") pointers.delete(id);
      };
      const types = wrappers.get(listener) ?? new Map<string, EventListener>();
      types.set(type, wrapped); wrappers.set(listener, types);
      target.addEventListener(type, wrapped, options);
    };
    if (key === "removeEventListener") return (type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => {
      const wrapped = wrappers.get(listener)?.get(type);
      target.removeEventListener(type, wrapped ?? listener, options);
      if (wrapped) wrappers.get(listener)?.delete(type);
    };
    const value = Reflect.get(target, key, target);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  return {
    element: new Proxy(canvas, { get(target, key) {
      if (key === "ownerDocument") return scopedDocument;
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    } }),
    dispose() {
      canvas.removeEventListener("pointerdown", remember, true); canvas.removeEventListener("pointercancel", cancel, true);
      for (const types of wrappers.values()) for (const [type, wrapped] of types) doc.removeEventListener(type, wrapped);
      wrappers.clear(); pointers.clear();
    },
  };
}

/** Bind only to the rendering canvas, never the scene/dock parent. */
export function createSailingOrbitControls(camera: PerspectiveCamera | OrthographicCamera, canvas: HTMLElement) {
  const scope = scopedCanvas(canvas);
  const controls = new OrbitControls(camera);
  Object.assign(controls, SAILING_ORBIT_OPTIONS);
  controls.connect(scope.element);
  return { controls, dispose() { controls.dispose(); scope.dispose(); } };
}

/** Recenter once. Flush residual drag damping before applying the fitted pose. */
export function applySailingCameraPose(camera: Camera, controls: OrbitControls, pose: SailingCameraPose) {
  const damping = controls.enableDamping;
  controls.enableDamping = false; controls.update(); controls.enableDamping = damping;
  const perspective = camera as PerspectiveCamera;
  if (perspective.isPerspectiveCamera && perspective.fov !== pose.fov) { perspective.fov = pose.fov; perspective.updateProjectionMatrix(); }
  camera.position.copy(pose.position); controls.target.copy(pose.target);
  camera.lookAt(pose.target); controls.update(); controls.saveState();
}
