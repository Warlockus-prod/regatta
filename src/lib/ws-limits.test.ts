// Contract for ws-server/limits.js: the multiplayer server keys per-IP
// limits on the address our nginx appended (last X-Forwarded-For hop), room
// creation is capped in total and per IP, log lines carry a truncated IP,
// nicknames follow the leaderboard rule ('Player' when nothing is left), and
// a room never outlives its last human or keeps a host who is gone.

import { describe, it, expect } from 'vitest';
import {
  clientIpFrom, roomCreateBlock, MAX_ROOMS, MAX_ROOMS_PER_IP,
  maskIp, safeNickname, dropPlayer, buildRaceResultBody, NICKNAME_FALLBACK,
} from '../../ws-server/limits.js';
import { sanitizeNickname } from './race-submission';

describe('clientIpFrom', () => {
  it('takes the last hop, ignoring what the client put first', () => {
    expect(clientIpFrom('6.6.6.6, 7.7.7.7, 203.0.113.5', '172.17.0.1')).toBe('203.0.113.5');
    expect(clientIpFrom(['1.1.1.1', '203.0.113.5'], '172.17.0.1')).toBe('203.0.113.5');
  });

  it('falls back to the socket address without the header', () => {
    expect(clientIpFrom(undefined, '127.0.0.1')).toBe('127.0.0.1');
    expect(clientIpFrom(' , ', undefined)).toBe('unknown');
  });
});

describe('roomCreateBlock', () => {
  const roomsOf = (ips: string[]) => new Map(ips.map((ip, i) => [String(i), { creatorIp: ip }]));

  it('allows rooms under both caps', () => {
    expect(roomCreateBlock(roomsOf(['a', 'b']), 'a')).toBeNull();
  });

  it('blocks one IP at its per-IP cap but not its neighbours', () => {
    const rooms = roomsOf(Array(MAX_ROOMS_PER_IP).fill('a'));
    expect(roomCreateBlock(rooms, 'a')).toBe('too-many-rooms');
    expect(roomCreateBlock(rooms, 'b')).toBeNull();
  });

  it('blocks everyone when the server holds MAX_ROOMS', () => {
    const rooms = roomsOf(Array.from({ length: MAX_ROOMS }, (_, i) => 'ip' + i));
    expect(roomCreateBlock(rooms, 'fresh')).toBe('server-full');
  });
});

describe('maskIp', () => {
  it('truncates IPv4, IPv4-mapped and IPv6 like src/lib/net.ts', () => {
    expect(maskIp('203.0.113.57')).toBe('203.0.113.0');
    expect(maskIp('::ffff:203.0.113.57')).toBe('203.0.113.0');
    expect(maskIp('2001:db8:1234:5678::1')).toBe('2001:db8:1234::');
    expect(maskIp('unknown')).toBe('unknown');
    expect(maskIp(undefined)).toBe('unknown');
  });
});

describe('safeNickname', () => {
  const inputs = ['Ola', '  Ola  ', 'A', '⛵', '李', '李明', 'Żaneta', '<b>x</b>', 'a'.repeat(40), '', '   ', '--', 'Ann!!', 42, null, undefined];

  it.each(inputs)('%j follows sanitizeNickname, with Player instead of null', (raw) => {
    expect(safeNickname(raw)).toBe(sanitizeNickname(raw) ?? NICKNAME_FALLBACK);
  });

  it('the fallback itself passes the leaderboard rule', () => {
    expect(sanitizeNickname(NICKNAME_FALLBACK)).toBe(NICKNAME_FALLBACK);
  });
});

describe('dropPlayer', () => {
  type P = { id: string; ws: { readyState: number } | null };
  const OPEN = { readyState: 1 };
  const roomWith = (hostId: string, players: P[], bots = 0) => ({
    hostId,
    players: new Map(players.map((p) => [p.id, p])),
    aiBots: Array.from({ length: bots }, (_, i) => ({ id: 'bot_' + i })),
  });

  it('the host alone with bots: the room is destroyed', () => {
    const room = roomWith('h', [{ id: 'h', ws: null }], 3);
    expect(dropPlayer(room, 'h')).toBe('destroy');
  });

  it('the host leaves a guest behind: the guest becomes host', () => {
    const room = roomWith('h', [{ id: 'h', ws: OPEN }, { id: 'g', ws: OPEN }], 1);
    expect(dropPlayer(room, 'h')).toBe('keep');
    expect(room.hostId).toBe('g');
    expect(room.players.has('h')).toBe(false);
  });

  it('a connected player is preferred over one inside the reconnect grace', () => {
    const room = roomWith('h', [{ id: 'h', ws: OPEN }, { id: 'away', ws: null }, { id: 'here', ws: OPEN }]);
    expect(dropPlayer(room, 'h')).toBe('keep');
    expect(room.hostId).toBe('here');
  });

  it('a guest leaves: the host stays host', () => {
    const room = roomWith('h', [{ id: 'h', ws: OPEN }, { id: 'g', ws: OPEN }]);
    expect(dropPlayer(room, 'g')).toBe('keep');
    expect(room.hostId).toBe('h');
    expect([...room.players.keys()]).toEqual(['h']);
  });
});

describe('buildRaceResultBody', () => {
  const room = (over: Record<string, unknown> = {}) => ({
    difficulty: 'medium', windStrength: 'medium', missionId: null,
    results: [{ id: 'p1' }, { id: 'bot_1' }],
    stats: new Map([['p1', { tacks: 3, noGoEntries: 1, topSpeed: 6.04 }]]),
    ...over,
  });
  const player = { id: 'p1', nickname: 'A', boat: { finishTime: 92.5 } };

  it('builds the body with a leaderboard-safe nickname', () => {
    expect(buildRaceResultBody(room(), player)).toEqual({
      difficulty: 'medium', windStrength: 'medium', missionId: null, finishTimeSec: 92.5,
      position: 1, totalBoats: 2, tacks: 3, noGoEntries: 1, topSpeed: 6, score: null,
      nicknameFallback: 'Player',
    });
  });

  it('nothing to submit for an unfinished boat or settings outside the allow-lists', () => {
    expect(buildRaceResultBody(room(), { ...player, boat: { finishTime: null } })).toBeNull();
    expect(buildRaceResultBody(room({ difficulty: 'extreme' }), player)).toBeNull();
    expect(buildRaceResultBody(room({ windStrength: '<script>' }), player)).toBeNull();
  });
});
