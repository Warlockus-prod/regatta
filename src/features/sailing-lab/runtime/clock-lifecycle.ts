import type { createFixedClock } from "./fixed-clock";

/** Visibility can change while no animation frame or timer is running.
 * Anchor that boundary explicitly, so a short background interval cannot
 * become accepted foreground elapsed time on the next frame. */
export function bindClockLifecycle(clock: Pick<ReturnType<typeof createFixedClock>, "synchronize">, options: {
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  active: () => boolean;
  now: () => number;
}) {
  const synchronize = () => clock.synchronize(options.now(), options.active());
  options.target.addEventListener("visibilitychange", synchronize);
  synchronize();
  return () => {
    options.target.removeEventListener("visibilitychange", synchronize);
    clock.synchronize(options.now(), false);
  };
}
