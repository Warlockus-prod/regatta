/**
 * React hook that drives the Phase 2 simulator preview at 30 Hz.
 *
 * State is held in refs so the inner tick mutates without churning
 * React; a dedicated render counter forces a re-render once per tick
 * so Skia can repaint with fresh values. Phase 2 proper moves this
 * to a Reanimated worklet so the simulation runs on the UI thread
 * at 60 Hz with no JS-bridge cost. Shape of the public API stays
 * the same across that swap.
 *
 * In addition to the live `BoatState`, the hook keeps a short trail
 * (last N positions) for the Skia wake render. Trail is gated by a
 * minimum delta so very-low-speed motion does not spam tightly-packed
 * points.
 */

import { useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import { tick } from './tick';
import type { BoatState, Controls, SimParams } from './types';

const TICK_HZ = 30;
const DT = 1 / TICK_HZ;
/** How many recent positions to keep for the wake render. */
const TRAIL_MAX = 60;
/** Squared min distance between consecutive trail points (canvas px). */
const TRAIL_MIN_DIST_SQ = 4;

const DEFAULT_PARAMS: SimParams = {
  maxSpeed: 90, // canvas pixels per second
  turnRate: 0.7, // ~40 deg/s
  drag: 0.5,
};

const DEFAULT_STATE: BoatState = {
  heading: 0,
  speed: 0,
  x: 0,
  y: 0,
};

interface SimLoopOptions {
  /** Starting boat position, defaults to canvas center. */
  initialX?: number;
  initialY?: number;
  /** Width / height of the playfield. Boat wraps around the edges. */
  bounds: { width: number; height: number };
}

export interface TrailPoint {
  x: number;
  y: number;
}

export interface SimLoopHandle {
  /** Live reference to the boat. Read on every render for Skia transforms. */
  boat: BoatState;
  /** Live controls reference. Mutate via setters. */
  controls: Controls;
  /** Recent boat positions, oldest first. Drops points beyond TRAIL_MAX. */
  trail: TrailPoint[];
  /** Increments once per tick, used as a render trigger. */
  tickN: number;
  /** Set the heading target (radians). Boat turns toward it at turnRate. */
  setTargetHeading: (h: number) => void;
  /** Set throttle 0..1. */
  setThrottle: (t: number) => void;
  /** Reset boat to the initial position with zero velocity. Clears trail. */
  reset: () => void;
}

export function useSimLoop(options: SimLoopOptions): SimLoopHandle {
  const initialX = options.initialX ?? options.bounds.width / 2;
  const initialY = options.initialY ?? options.bounds.height / 2;

  const stateRef = useRef<BoatState>({
    ...DEFAULT_STATE,
    x: initialX,
    y: initialY,
  });
  const controlsRef = useRef<Controls>({
    targetHeading: 0,
    throttle: 0.7,
  });
  const trailRef = useRef<TrailPoint[]>([{ x: initialX, y: initialY }]);
  const [tickN, advance] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id !== null) return;
      id = setInterval(() => {
        const next = tick(stateRef.current, controlsRef.current, DEFAULT_PARAMS, DT);

        // Wrap around the playfield so the demo loops indefinitely
        // without the boat sailing off-screen.
        const w = options.bounds.width;
        const h = options.bounds.height;
        let { x, y } = next;
        if (x < 0) x += w;
        if (x > w) x -= w;
        if (y < 0) y += h;
        if (y > h) y -= h;

        stateRef.current = { ...next, x, y };

        // Append to trail if moved enough. Cheap squared-distance gate.
        const last = trailRef.current[trailRef.current.length - 1];
        if (!last || (x - last.x) ** 2 + (y - last.y) ** 2 >= TRAIL_MIN_DIST_SQ) {
          const nextTrail = [...trailRef.current, { x, y }];
          trailRef.current = nextTrail.length > TRAIL_MAX
            ? nextTrail.slice(nextTrail.length - TRAIL_MAX)
            : nextTrail;
        }

        advance();
      }, 1000 / TICK_HZ);
    };

    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };

    if (AppState.currentState === 'active') start();

    // Pause physics while backgrounded so we do not drain battery and
    // keep ticking against a stale wind state. Resume on foreground.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [options.bounds.width, options.bounds.height]);

  return {
    boat: stateRef.current,
    controls: controlsRef.current,
    trail: trailRef.current,
    tickN,
    setTargetHeading: (h) => {
      controlsRef.current.targetHeading = h;
    },
    setThrottle: (t) => {
      controlsRef.current.throttle = Math.max(0, Math.min(1, t));
    },
    reset: () => {
      stateRef.current = { ...DEFAULT_STATE, x: initialX, y: initialY };
      controlsRef.current = { targetHeading: 0, throttle: 0.7 };
      trailRef.current = [{ x: initialX, y: initialY }];
    },
  };
}
