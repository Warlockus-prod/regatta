/**
 * Per-device race-history persistence.
 *
 * Each saved race carries the metadata needed to render the result panel,
 * a downsampled replay (boat positions every ~1 sec) and an event list
 * suitable for the AI coach payload. The list is capped at the last
 * `MAX_RACES` entries so the AsyncStorage row never grows unbounded.
 *
 * Storage shape:
 *   key   = `regatta.race-history.v1`
 *   value = JSON-encoded RaceRecord[]
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CoachLogEvent, CoachLogSample } from '../api/coach';

const STORAGE_KEY = 'regatta.race-history.v1';
export const MAX_RACES = 20;

export interface ReplayPoint {
  /** Canvas X coordinate at sample time. */
  x: number;
  /** Canvas Y coordinate at sample time. */
  y: number;
  /** Seconds since the start signal. */
  t: number;
}

export interface RaceRecord {
  /** Stable, opaque per-race id. Used as the URL param for /coach. */
  id: string;
  courseId: string;
  /** Total race time in seconds. */
  timeSec: number;
  /** Score 0..100 derived from time vs par. */
  score: number;
  /** ms-since-epoch of finish. */
  finishedAt: number;
  /** Boat positions captured ~1Hz during the race. */
  replay: ReplayPoint[];
  /** Race events (start, tacks, mark roundings, finish). Optional - older
   *  races may not carry events; coach degrades gracefully. */
  events?: CoachLogEvent[];
  /** Coach-friendly per-tick samples (denser than `replay`, optional). */
  samples?: CoachLogSample[];
  /** Wind metadata captured at start. */
  windDirDeg?: number;
  windSpeedKn?: number;
  /** Course par time in seconds. Persisted so a later read can render the
   *  scoring delta without round-tripping through the course catalogue. */
  parSec?: number;
  /** Optional textual difficulty (mirrors web /api/race-result vocabulary). */
  difficulty?: 'easy' | 'medium' | 'hard';
  /** Optional wind bucket label, also for /api/race-result. */
  windStrength?: 'light' | 'medium' | 'heavy';
}

async function readRaces(): Promise<RaceRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Array<Partial<RaceRecord>>)
      .filter(
        (r): r is RaceRecord =>
          !!r &&
          typeof r === 'object' &&
          typeof r.id === 'string' &&
          typeof r.courseId === 'string' &&
          typeof r.timeSec === 'number' &&
          typeof r.score === 'number' &&
          typeof r.finishedAt === 'number' &&
          Array.isArray(r.replay),
      )
      .map((r) => ({
        ...r,
        replay: r.replay.filter(
          (p): p is ReplayPoint =>
            !!p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.t === 'number',
        ),
      }));
  } catch {
    return [];
  }
}

async function writeRaces(list: RaceRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore - keep in-memory state */
  }
}

export interface UseRaceHistory {
  races: RaceRecord[];
  ready: boolean;
  /** Save a race; returns the persisted record (with assigned id). */
  save: (record: Omit<RaceRecord, 'id' | 'finishedAt'> & {
    id?: string;
    finishedAt?: number;
  }) => Promise<RaceRecord>;
  /** Wipe race history. Used by Settings reset. */
  clear: () => Promise<void>;
  /** Synchronous lookup against the in-memory list. */
  findById: (id: string) => RaceRecord | undefined;
}

/**
 * Hook for the race history list. Hydrates once on mount, then keeps an
 * in-memory mirror that consumers re-render off of. Writes go through
 * `setRaces` so the UI always reflects the latest state immediately and
 * the persistence write is a fire-and-forget side effect.
 */
export function useRaceHistory(): UseRaceHistory {
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [ready, setReady] = useState(false);
  const racesRef = useRef<RaceRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    readRaces().then((list) => {
      if (cancelled) return;
      racesRef.current = list;
      setRaces(list);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (
      record: Omit<RaceRecord, 'id' | 'finishedAt'> & {
        id?: string;
        finishedAt?: number;
      },
    ): Promise<RaceRecord> => {
      const id = record.id ?? generateId();
      const finishedAt = record.finishedAt ?? Date.now();
      const next: RaceRecord = { ...record, id, finishedAt };
      const merged = [next, ...racesRef.current.filter((r) => r.id !== id)].slice(
        0,
        MAX_RACES,
      );
      racesRef.current = merged;
      setRaces(merged);
      await writeRaces(merged);
      return next;
    },
    [],
  );

  const clear = useCallback(async () => {
    racesRef.current = [];
    setRaces([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const findById = useCallback(
    (id: string) => racesRef.current.find((r) => r.id === id),
    // racesRef holds the latest list; depend on `races` so consumers
    // re-render when a save completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [races],
  );

  return { races, ready, save, clear, findById };
}

/**
 * Read a single race by id without mounting the hook. Used by the AI
 * coach screen so it can hydrate before its first paint. Returns null
 * if the id is unknown or the storage row is missing / malformed.
 */
export async function loadRaceById(id: string): Promise<RaceRecord | null> {
  const list = await readRaces();
  return list.find((r) => r.id === id) ?? null;
}

function generateId(): string {
  // 12-char base36 ID; collisions are vanishingly unlikely for
  // <= 20 races per device. Avoids pulling in a uuid dependency.
  return (
    Math.floor(Date.now() / 1000).toString(36) +
    Math.floor(Math.random() * 1e9).toString(36).padStart(6, '0').slice(0, 6)
  );
}
