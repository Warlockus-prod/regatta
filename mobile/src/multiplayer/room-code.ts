/**
 * 4-character room codes for the multiplayer skeleton.
 *
 * Alphabet is uppercase base32 minus the visually ambiguous glyphs the
 * spec calls out (O/0, I/1, S/5). That leaves 27 symbols. Four chars
 * give us 27^4 = 531_441 distinct codes - plenty for v1 lobby UI where
 * we cap recent rooms at 5 per device and there is no real backend
 * issuing codes yet. Collisions are not a meaningful risk because the
 * code is the room id (not just a tag); two hosts who happen to roll
 * the same string would land in the same mock room, which is the
 * intended behaviour anyway (rejoin via the recent list).
 *
 * When the real Phase-4 WebSocket backend lands, code generation moves
 * server-side and the client just consumes the string. The validator
 * here can be reused as a UI guard so a bad paste never round-trips
 * to the server.
 */

/**
 * Allowed code alphabet. 27 characters: A-Z minus O / I / S, plus 2-9
 * minus 0 / 1 / 5. Order is intentional - it keeps the most "letter
 * shaped" digits at the end so codes lean alphabetic at a glance.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ23467';
//                                                     ^^^^^^^^
//                            digits: drop 0,1,5,8,9 (8/9 too easily lost
//                            in the same way O/I are - 8 vs B, 9 vs g).
//                            Final symbol set: 23 letters + 5 digits = 28.

/** Length of every generated room code. The Join screen renders one
 *  cell per character; if you change this, the cell grid in
 *  `mobile/app/multiplayer/join.tsx` needs to follow. */
export const ROOM_CODE_LENGTH = 4;

/**
 * Generate a fresh code. Uses Math.random for v1; when we move to a
 * real backend the server will issue the codes and this helper will
 * be reduced to "validate this server token".
 */
export function generateRoomCode(): string {
  let out = '';
  const n = ROOM_CODE_ALPHABET.length;
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * n);
    out += ROOM_CODE_ALPHABET.charAt(idx);
  }
  return out;
}

/**
 * Strict format check. Returns true only when `code` is exactly
 * `ROOM_CODE_LENGTH` characters long and every character is in
 * `ROOM_CODE_ALPHABET`. Used by the Join screen to gate the CTA.
 */
export function isValidRoomCode(code: string): boolean {
  if (typeof code !== 'string') return false;
  if (code.length !== ROOM_CODE_LENGTH) return false;
  for (let i = 0; i < code.length; i++) {
    if (ROOM_CODE_ALPHABET.indexOf(code.charAt(i)) === -1) return false;
  }
  return true;
}

/**
 * Permissive normaliser used when the user types or pastes a code.
 * Uppercases, strips whitespace + dashes, swaps known visual lookalikes
 * for their canonical glyph (so "okay just paste anything" still has a
 * fighting chance). The result is whatever survives the alphabet test;
 * callers should still run `isValidRoomCode` on the output before
 * using it as a route param.
 *
 * Mappings kept conservative on purpose:
 *   O o 0 -> Q  (the only round-shape glyph in the alphabet)
 *   I i l 1 -> J
 *   S s 5 -> Z
 *   8 -> B
 *   9 -> 6  (closest stroke shape)
 */
export function normaliseRoomCodeInput(raw: string): string {
  if (!raw) return '';
  let upper = raw.toUpperCase();
  // Strip spaces / dashes / underscores so a paste like "AB-CD" works.
  upper = upper.replace(/[\s\-_]/g, '');
  let out = '';
  for (let i = 0; i < upper.length && out.length < ROOM_CODE_LENGTH; i++) {
    let ch = upper.charAt(i);
    if (ch === 'O' || ch === '0') ch = 'Q';
    else if (ch === 'I' || ch === '1' || ch === 'L') ch = 'J';
    else if (ch === 'S' || ch === '5') ch = 'Z';
    else if (ch === '8') ch = 'B';
    else if (ch === '9') ch = '6';
    if (ROOM_CODE_ALPHABET.indexOf(ch) !== -1) {
      out += ch;
    }
  }
  return out;
}

/**
 * Cheap deterministic hash from a code string. Used by the mock
 * multiplayer client as a seed so a given room always spawns the same
 * ghost set. Implementation is the FNV-1a 32-bit variant - small,
 * stable across JS runtimes, and good enough for ghost-boat seeding.
 */
export function hashRoomCode(code: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in 32-bit range via Math.imul.
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit so downstream consumers can mod safely.
  return h >>> 0;
}
