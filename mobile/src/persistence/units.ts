/**
 * User unit preferences (speed / wind speed / distance).
 *
 * Storage shape:
 *   key   = `regatta.units.v1`
 *   value = JSON-encoded `UnitsState`. Missing or malformed rows fall
 *           back to defaults (knots / knots / nm).
 *
 * Defaults match the simulator and game HUDs the rest of the app
 * already speaks (knots + nautical miles). The hook exposes setters
 * AND a tap-to-cycle helper so the Settings rows stay one-tap.
 *
 * Consumers should call `useUnits()` and switch on the returned token,
 * e.g. `units.speed === 'kt' ? '5.2 kt' : '2.7 m/s'`. Value formatters
 * (`formatSpeed`, `formatDistance`, `formatWindSpeed`) are colocated to
 * keep the conversion math in one place.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.units.v1';

export type SpeedUnit = 'kt' | 'mps';
export type WindSpeedUnit = 'kt' | 'mps' | 'beaufort';
export type DistanceUnit = 'nm' | 'km';

export interface UnitsState {
  speed: SpeedUnit;
  windSpeed: WindSpeedUnit;
  distance: DistanceUnit;
}

const DEFAULT_UNITS: UnitsState = {
  speed: 'kt',
  windSpeed: 'kt',
  distance: 'nm',
};

const SPEED_CYCLE: SpeedUnit[] = ['kt', 'mps'];
const WIND_SPEED_CYCLE: WindSpeedUnit[] = ['kt', 'mps', 'beaufort'];
const DISTANCE_CYCLE: DistanceUnit[] = ['nm', 'km'];

function isSpeedUnit(v: unknown): v is SpeedUnit {
  return v === 'kt' || v === 'mps';
}
function isWindSpeedUnit(v: unknown): v is WindSpeedUnit {
  return v === 'kt' || v === 'mps' || v === 'beaufort';
}
function isDistanceUnit(v: unknown): v is DistanceUnit {
  return v === 'nm' || v === 'km';
}

function coerce(raw: unknown): UnitsState {
  if (!raw || typeof raw !== 'object') return DEFAULT_UNITS;
  const r = raw as Record<string, unknown>;
  return {
    speed: isSpeedUnit(r.speed) ? r.speed : DEFAULT_UNITS.speed,
    windSpeed: isWindSpeedUnit(r.windSpeed) ? r.windSpeed : DEFAULT_UNITS.windSpeed,
    distance: isDistanceUnit(r.distance) ? r.distance : DEFAULT_UNITS.distance,
  };
}

async function readUnits(): Promise<UnitsState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_UNITS;
    return coerce(JSON.parse(raw));
  } catch {
    return DEFAULT_UNITS;
  }
}

async function writeUnits(state: UnitsState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore - keep in-memory state */
  }
}

export interface UseUnits {
  units: UnitsState;
  /** True after the storage read finishes. */
  ready: boolean;
  setSpeedUnit: (u: SpeedUnit) => void;
  setWindSpeedUnit: (u: WindSpeedUnit) => void;
  setDistanceUnit: (u: DistanceUnit) => void;
  /** Cycle to the next available value for that field; wraps around. */
  cycleSpeed: () => void;
  cycleWindSpeed: () => void;
  cycleDistance: () => void;
}

function nextInCycle<T>(list: T[], current: T): T {
  const idx = list.indexOf(current);
  if (idx < 0) return list[0]!;
  return list[(idx + 1) % list.length]!;
}

/**
 * Hook for the user's unit preferences. Hydrates once on mount, then
 * keeps an in-memory mirror so consumers re-render off of the live
 * value. Writes are fire-and-forget; if persistence fails the rest of
 * the session still respects the in-memory choice.
 */
export function useUnits(): UseUnits {
  const [units, setUnits] = useState<UnitsState>(DEFAULT_UNITS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readUnits().then((state) => {
      if (cancelled) return;
      setUnits(state);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<UnitsState>) => {
    setUnits((prev) => {
      const next = { ...prev, ...patch };
      void writeUnits(next);
      return next;
    });
  }, []);

  const setSpeedUnit = useCallback(
    (u: SpeedUnit) => update({ speed: u }),
    [update],
  );
  const setWindSpeedUnit = useCallback(
    (u: WindSpeedUnit) => update({ windSpeed: u }),
    [update],
  );
  const setDistanceUnit = useCallback(
    (u: DistanceUnit) => update({ distance: u }),
    [update],
  );

  const cycleSpeed = useCallback(() => {
    setUnits((prev) => {
      const next = { ...prev, speed: nextInCycle(SPEED_CYCLE, prev.speed) };
      void writeUnits(next);
      return next;
    });
  }, []);
  const cycleWindSpeed = useCallback(() => {
    setUnits((prev) => {
      const next = {
        ...prev,
        windSpeed: nextInCycle(WIND_SPEED_CYCLE, prev.windSpeed),
      };
      void writeUnits(next);
      return next;
    });
  }, []);
  const cycleDistance = useCallback(() => {
    setUnits((prev) => {
      const next = {
        ...prev,
        distance: nextInCycle(DISTANCE_CYCLE, prev.distance),
      };
      void writeUnits(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      units,
      ready,
      setSpeedUnit,
      setWindSpeedUnit,
      setDistanceUnit,
      cycleSpeed,
      cycleWindSpeed,
      cycleDistance,
    }),
    [
      units,
      ready,
      setSpeedUnit,
      setWindSpeedUnit,
      setDistanceUnit,
      cycleSpeed,
      cycleWindSpeed,
      cycleDistance,
    ],
  );
}

// ---------- value formatters ----------

/** Knots -> m/s conversion factor (1 kt = 0.514444 m/s). */
const KT_TO_MPS = 0.5144444;
/** Nautical miles -> km (1 nm = 1.852 km). */
const NM_TO_KM = 1.852;

/**
 * Beaufort scale lookup (knots upper bound for each force, 0..12).
 * Source: WMO Beaufort scale. The function returns the highest force
 * whose lower bound is at or below the input.
 */
const BEAUFORT_KT_UPPER: ReadonlyArray<number> = [
  1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63, Infinity,
];

export function knotsToBeaufort(kt: number): number {
  for (let i = 0; i < BEAUFORT_KT_UPPER.length; i += 1) {
    if (kt <= BEAUFORT_KT_UPPER[i]!) return i;
  }
  return BEAUFORT_KT_UPPER.length - 1;
}

/** Format a speed value (always given in knots) for display. */
export function formatSpeed(kt: number, unit: SpeedUnit, digits = 1): string {
  if (unit === 'mps') return (kt * KT_TO_MPS).toFixed(digits);
  return kt.toFixed(digits);
}

export function speedUnitLabel(unit: SpeedUnit): string {
  return unit === 'mps' ? 'm/s' : 'kt';
}

/** Format a wind speed value (always given in knots) for display. */
export function formatWindSpeed(kt: number, unit: WindSpeedUnit): string {
  if (unit === 'mps') return (kt * KT_TO_MPS).toFixed(1);
  if (unit === 'beaufort') return `F${knotsToBeaufort(kt)}`;
  return kt.toFixed(1);
}

export function windSpeedUnitLabel(unit: WindSpeedUnit): string {
  if (unit === 'mps') return 'm/s';
  if (unit === 'beaufort') return 'Bft';
  return 'kt';
}

/** Format a distance value (always given in nautical miles) for display. */
export function formatDistance(nm: number, unit: DistanceUnit, digits = 2): string {
  if (unit === 'km') return (nm * NM_TO_KM).toFixed(digits);
  return nm.toFixed(digits);
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === 'km' ? 'km' : 'nm';
}
