import type { RaceHapticEvent } from "@/lib/race-haptics";

/**
 * M3-4: the player's own mark rounding and finish in a server 'state'
 * message (ws-server sends updateLap results as events). Other boats, a
 * no-go entry and an empty id (not joined yet) never vibrate. The server
 * reports no contact, so multiplayer has no contact vibration.
 */
export function playerHapticEvents(events: readonly { id: string; type: string }[] | undefined, myId: string): RaceHapticEvent[] {
  if (!myId || !Array.isArray(events)) return [];
  const out: RaceHapticEvent[] = [];
  for (const event of events) {
    if (event?.id !== myId) continue;
    if (event.type === "mark" || event.type === "finish") out.push(event.type);
  }
  return out;
}

export type ServerSoundEvent = "mark" | "finish" | "no-go";

/**
 * M3-3: the same race sounds the solo race plays for its own events, read
 * from the server 'state' events of the player's own boat: the mark chime,
 * the finish fanfare and the no-go dip ('no-go-entered'). Other boats and
 * events before the server assigned our id stay silent.
 */
export function playerSoundEvents(events: readonly { id: string; type: string }[] | undefined, myId: string): ServerSoundEvent[] {
  if (!myId || !Array.isArray(events)) return [];
  const out: ServerSoundEvent[] = [];
  for (const event of events) {
    if (event?.id !== myId) continue;
    if (event.type === "mark" || event.type === "finish") out.push(event.type);
    else if (event.type === "no-go-entered") out.push("no-go");
  }
  return out;
}
