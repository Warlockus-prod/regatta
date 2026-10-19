// Pure helpers for server.js (limits, log-safe IPs, nickname and room rules,
// the leaderboard body), kept apart so vitest can import them without
// starting the WebSocket server (src/lib/ws-limits.test.ts and
// src/app/api/race-result/route.test.ts). No new file here: the
// ws-server/Dockerfile COPY list names every module.

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

/**
 * An IP for log lines: IPv4 with the last octet zeroed, IPv6 cut to its
 * first three hextets (the rule of src/lib/net.ts truncateIp), so the
 * container logs never hold a full visitor address.
 */
export function maskIp(ip) {
  if (typeof ip !== 'string' || !ip) return 'unknown';
  const addr = ip.startsWith('::ffff:') && ip.includes('.') ? ip.slice(7) : ip;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(addr)) return addr.replace(/\.\d{1,3}$/, '.0');
  if (addr.includes(':')) {
    const hextets = addr.split(':').filter((h) => h.length > 0);
    return hextets.length >= 3 ? `${hextets[0]}:${hextets[1]}:${hextets[2]}::` : 'unknown';
  }
  return 'unknown';
}

// ------------------------------ Race settings -----------------------------

export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const WINDS = ['light', 'medium', 'heavy'];

// Mirror of src/data/missions.ts constraints that the SERVER can verify.
// Lives here (not in server.js) so the leaderboard-body test can run every
// mission through /api/race-result.
export const MISSIONS = [
  { id: 'clean-laps',     difficulty: 'easy',   wind: 'medium', constraints: [{ type: 'no-no-go' }] },
  { id: 'sub-90',         difficulty: 'medium', wind: 'heavy',  constraints: [{ type: 'finish-under-sec', value: 90 }] },
  { id: 'minimal-tacks',  difficulty: 'medium', wind: 'medium', constraints: [{ type: 'max-tacks', value: 4 }] },
  { id: 'light-wind-master', difficulty: 'easy', wind: 'light', constraints: [] },
];

// ------------------------------ Players -----------------------------------

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;
export const NICKNAME_FALLBACK = 'Player';

/**
 * The nickname rule of src/lib/race-submission.ts sanitizeNickname() (letters
 * of any alphabet, digits, `-`, `_`, space and `.`, 2-20 chars), with
 * 'Player' instead of null. /api/race-result refuses a nickname that rule
 * rejects, so an old client sending 'A' or an emoji would otherwise lose its
 * leaderboard row without a word.
 */
export function safeNickname(raw) {
  if (typeof raw !== 'string') return NICKNAME_FALLBACK;
  const clean = raw.trim().replace(/[^\p{L}\p{N}\-_ .]/gu, '').slice(0, NICKNAME_MAX).trim();
  return clean.length >= NICKNAME_MIN ? clean : NICKNAME_FALLBACK;
}

/**
 * Removes player `pid` from `room` (on leave and when the reconnect grace
 * runs out). Returns 'destroy' when no human is left: bots alone cannot
 * start, rematch or leave, so the room is dead. Otherwise returns 'keep',
 * after handing the host role to a remaining human (a connected one first)
 * if the host was the one who left; a room whose hostId points at a deleted
 * player could never start again.
 */
export function dropPlayer(room, pid) {
  room.players.delete(pid);
  if (room.players.size === 0) return 'destroy';
  if (!room.players.has(room.hostId)) {
    const humans = [...room.players.values()];
    const connected = humans.find((p) => p.ws && p.ws.readyState === 1);
    room.hostId = (connected ?? humans[0]).id;
  }
  return 'keep';
}

/**
 * Body for POST /api/race-result for one finished human player, or null
 * when there is nothing valid to submit. A pure function here so
 * src/app/api/race-result/route.test.ts can feed finished-room fixtures
 * through the real route and catch drift from its validation.
 */
export function buildRaceResultBody(room, player) {
  const b = player?.boat;
  if (!b || typeof b.finishTime !== 'number' || !Number.isFinite(b.finishTime)) return null;
  if (!DIFFICULTIES.includes(room.difficulty) || !WINDS.includes(room.windStrength)) return null;
  const stats = room.stats?.get(player.id) || {};
  const results = Array.isArray(room.results) ? room.results : [];
  const position = results.findIndex((r) => r.id === player.id) + 1;
  return {
    difficulty: room.difficulty,
    windStrength: room.windStrength,
    missionId: room.missionId ?? null,
    finishTimeSec: b.finishTime,
    position: position || null,
    totalBoats: results.length || null,
    tacks: stats.tacks ?? null,
    noGoEntries: stats.noGoEntries ?? null,
    topSpeed: Math.round((stats.topSpeed ?? 0) * 10) / 10,
    score: null,
    nicknameFallback: safeNickname(player.nickname),
  };
}
