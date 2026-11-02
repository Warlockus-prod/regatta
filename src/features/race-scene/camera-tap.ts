// The race camera switch shared by the race cockpit (M2-1) and the teaching
// replay (M4-3): the button's name and the scene tap that steps to the next
// camera (features/race-scene/camera.ts nextRaceCamera). Pure, no JSX, so the
// light shared replay route (/r/[code]) does not load the race cockpit.

import { DOUBLE_TAP_MS, type TapTracker } from "./camera";

/** M2-1 camera switch copy: the camera button's name (race status row, replay toolbar). */
export const RACE_CAMERA_SWITCH = {
  ru: "Сменить камеру", en: "Switch camera", pl: "Zmień kamerę", es: "Cambiar cámara",
  fr: "Changer de caméra", de: "Kamera wechseln", it: "Cambia inquadratura",
} as const;

/**
 * M2-1: a tap on the scene steps to the next camera; a drag (orbit) or a
 * pinch (zoom) that starts the same way does not. Only pointers that land on
 * the scene's canvas count, so the HUD buttons over it never switch cameras.
 * Package 8 (R-9): a second tap within DOUBLE_TAP_MS calls `onDoubleTap`
 * instead (back to the race view); the first tap already switched, so a
 * double tap always ends in the race view without delaying a single tap.
 */
export function sceneTapHandlers(tracker: () => TapTracker, onTap: () => void, onDoubleTap?: () => void) {
  const onCanvas = (e: { target: unknown }) => typeof HTMLCanvasElement !== "undefined" && e.target instanceof HTMLCanvasElement;
  type P = { target: unknown; pointerId: number; clientX: number; clientY: number; timeStamp: number; isPrimary: boolean; button: number };
  return {
    onPointerDown: (e: P) => { if (onCanvas(e)) tracker().down(e.pointerId, e.clientX, e.clientY, e.timeStamp, e.isPrimary && e.button === 0); },
    onPointerMove: (e: P) => tracker().move(e.pointerId, e.clientX, e.clientY),
    onPointerUp: (e: P) => {
      const t = tracker();
      if (!t.up(e.pointerId, e.clientX, e.clientY, e.timeStamp) || !onCanvas(e)) return;
      // The tracker outlives a render (the handlers are rebuilt on every one), so it keeps the last tap.
      const double = onDoubleTap && e.timeStamp - t.lastTap <= DOUBLE_TAP_MS;
      t.lastTap = double ? -Infinity : e.timeStamp;
      (double ? onDoubleTap : onTap)();
    },
    onPointerCancel: (e: P) => tracker().cancel(e.pointerId),
  };
}
