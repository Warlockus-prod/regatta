/**
 * Per-device recent multiplayer rooms.
 *
 * Persists the last few room codes the user has hosted or joined so
 * the lobby screen can offer one-tap rejoin without forcing the user
 * to retype the code. Capped at `MAX_RECENT_ROOMS` (5) entries; the
 * list is dedup'd by code so re-hosting / re-joining the same room
 * just bumps it to the front instead of adding a duplicate.
 *
 * Storage shape:
 *   key   = `regatta.multiplayer.recent-rooms.v1`
 *   value = JSON-encoded RecentRoom[]
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidRoomCode } from '../multiplayer/room-code';

const STORAGE_KEY = 'regatta.multiplayer.recent-rooms.v1';
export const MAX_RECENT_ROOMS = 5;

export type RecentRoomRole = 'host' | 'join';

export interface RecentRoom {
  /** 4-char room code, validated via `isValidRoomCode`. */
  code: string;
  /** Was the user the host for this session, or did they join via code. */
  role: RecentRoomRole;
  /** ms-since-epoch the user last entered this room. */
  visitedAt: number;
}

async function readRooms(): Promise<RecentRoom[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Array<Partial<RecentRoom>>)
      .filter(
        (r): r is RecentRoom =>
          !!r &&
          typeof r === 'object' &&
          typeof r.code === 'string' &&
          isValidRoomCode(r.code) &&
          (r.role === 'host' || r.role === 'join') &&
          typeof r.visitedAt === 'number',
      )
      .slice(0, MAX_RECENT_ROOMS);
  } catch {
    return [];
  }
}

async function writeRooms(list: RecentRoom[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore - keep in-memory state */
  }
}

export interface UseRecentRooms {
  rooms: RecentRoom[];
  ready: boolean;
  /** Push a room to the front. De-dupes by code, caps the list. */
  push: (input: { code: string; role: RecentRoomRole }) => Promise<void>;
  /** Wipe the list. Used by Settings reset (later) and tests. */
  clear: () => Promise<void>;
}

/**
 * Hook for the recent-rooms list. Hydrates once on mount, then keeps
 * an in-memory mirror so the UI re-renders off of the live value.
 * Writes are fire-and-forget via the AsyncStorage helpers so the UI
 * never blocks on a disk round-trip.
 *
 * Mirrors the `useRaceHistory` pattern (see
 * `src/persistence/race-history.ts`) deliberately: keeps the mental
 * model uniform across persistence hooks so a new screen author can
 * read either file as the template.
 */
export function useRecentRooms(): UseRecentRooms {
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [ready, setReady] = useState(false);
  const roomsRef = useRef<RecentRoom[]>([]);

  useEffect(() => {
    let cancelled = false;
    readRooms().then((list) => {
      if (cancelled) return;
      roomsRef.current = list;
      setRooms(list);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const push = useCallback(
    async ({ code, role }: { code: string; role: RecentRoomRole }) => {
      if (!isValidRoomCode(code)) return;
      const visitedAt = Date.now();
      const next: RecentRoom = { code, role, visitedAt };
      // De-dupe by code (newest entry wins) and cap at MAX_RECENT_ROOMS.
      const merged = [
        next,
        ...roomsRef.current.filter((r) => r.code !== code),
      ].slice(0, MAX_RECENT_ROOMS);
      roomsRef.current = merged;
      setRooms(merged);
      await writeRooms(merged);
    },
    [],
  );

  const clear = useCallback(async () => {
    roomsRef.current = [];
    setRooms([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return useMemo(
    () => ({ rooms, ready, push, clear }),
    [rooms, ready, push, clear],
  );
}
