// Client-IP helpers shared by API routes and the analytics store.
//
// IPs are truncated before storage for privacy (IPv4 last octet zeroed; IPv6
// kept to its first 3 hextets, the /48 prefix) so /stats and log files never
// surface a full visitor IP. insertEvent() and insertFeedback() in db.ts apply
// truncateIp() to every row, so a route cannot store a full IP by mistake.
// Header-based country detection is unaffected - it reads the raw header, not
// the stored/truncated value.

const IPV4_MAPPED_PREFIX = /^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i;

/**
 * Expands an IPv6 address to its 8 hextets ("2001:db8::1" -> 2001, db8, 0, 0,
 * 0, 0, 0, 1). A trailing dotted IPv4 part counts as two hextets. Returns null
 * when the text is not a well-formed IPv6 address.
 */
function ipv6Hextets(ip: string): string[] | null {
  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const groups = (part: string) => (part ? part.split(':') : []);
  const width = (gs: string[]) => gs.reduce((n, g) => n + (g.includes('.') ? 2 : 1), 0);
  const head = groups(halves[0]);
  if (halves.length === 1) return width(head) === 8 ? head : null;
  const tail = groups(halves[1]);
  const missing = 8 - width(head) - width(tail);
  if (missing < 1) return null;
  return [...head, ...Array<string>(missing).fill('0'), ...tail];
}

export function truncateIp(ip: string): string {
  if (!ip || ip === 'unknown') return ip;
  // An IPv4 client seen through a dual-stack socket arrives as ::ffff:1.2.3.4.
  // Without this it took the IPv6 branch and kept the full IPv4 address.
  const plain = ip.replace(IPV4_MAPPED_PREFIX, '');
  if (plain.includes('.') && !plain.includes(':')) {
    // IPv4: zero the last octet (1.2.3.4 -> 1.2.3.0).
    const parts = plain.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    return plain;
  }
  if (plain.includes(':')) {
    // IPv6: keep the first 3 hextets (2001:db8:1:2::5 -> 2001:db8:1::).
    // Positions come from the expanded form, so a "::" early in the address
    // cannot pull a host hextet into the kept prefix.
    const hextets = ipv6Hextets(plain.split('%')[0]);
    if (hextets) return `${hextets.slice(0, 3).map((h) => h.toLowerCase()).join(':')}::`;
    return plain;
  }
  return plain;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
