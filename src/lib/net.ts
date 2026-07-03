// Client-IP helpers shared by API routes.
//
// IPs are truncated at ingest for privacy (IPv4 last octet zeroed; IPv6 kept
// to the first 3 hextets) so /stats and log files never surface a full
// visitor IP. Header-based country detection is unaffected - it reads the raw
// header, not the stored/truncated value.

export function truncateIp(ip: string): string {
  if (!ip || ip === 'unknown') return ip;
  if (ip.includes('.') && !ip.includes(':')) {
    // IPv4: zero the last octet (1.2.3.4 -> 1.2.3.0).
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    return ip;
  }
  if (ip.includes(':')) {
    // IPv6: keep the first 3 hextets, collapse the rest.
    const hextets = ip.split(':').filter((h) => h.length > 0);
    if (hextets.length >= 3) return `${hextets[0]}:${hextets[1]}:${hextets[2]}::`;
    return ip;
  }
  return ip;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
