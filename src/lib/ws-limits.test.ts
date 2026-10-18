// Contract for ws-server/limits.js: the multiplayer server keys per-IP
// limits on the address our nginx appended (last X-Forwarded-For hop), and
// room creation is capped in total and per IP.

import { describe, it, expect } from 'vitest';
import { clientIpFrom, roomCreateBlock, MAX_ROOMS, MAX_ROOMS_PER_IP } from '../../ws-server/limits.js';

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
