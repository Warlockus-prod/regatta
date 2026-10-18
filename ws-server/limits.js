// Pure limit helpers for server.js, kept apart so vitest can import them
// without starting the WebSocket server (src/lib/ws-limits.test.ts).

// Room caps. Every room holds a 20 Hz tick and its boats in memory, so the
// total is bounded; the per-IP cap stops one source from taking every slot.
// A household or club behind one NAT rarely runs more than a couple of rooms.
export const MAX_ROOMS = 500;
export const MAX_ROOMS_PER_IP = 10;

/**
 * Client IP for rate limiting. nginx APPENDS the peer address to whatever
 * X-Forwarded-For the client sent, so the FIRST entry is client-controlled
 * and rotating it used to dodge every per-IP limit. The LAST entry is the
 * address our nginx saw (it restores the real peer from PROXY protocol, see
 * src/lib/rate-limit.ts). Without the header (local dev), use the socket.
 */
export function clientIpFrom(xff, remoteAddress) {
  const raw = Array.isArray(xff) ? xff.join(',') : xff;
  if (typeof raw === 'string') {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return remoteAddress || 'unknown';
}

/**
 * Whether `ip` may open one more room. Returns null when allowed, else the
 * error code sent to the client.
 */
export function roomCreateBlock(rooms, ip, maxRooms = MAX_ROOMS, maxPerIp = MAX_ROOMS_PER_IP) {
  if (rooms.size >= maxRooms) return 'server-full';
  let mine = 0;
  for (const r of rooms.values()) {
    if (r.creatorIp === ip && ++mine >= maxPerIp) return 'too-many-rooms';
  }
  return null;
}
