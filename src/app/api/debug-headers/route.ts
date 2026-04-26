import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// TEMPORARY debug endpoint - dumps incoming request headers to help diagnose
// why /api/log was recording 127.0.0.1 for all visitors. DELETE this file
// after the IP-detection fix is verified.
export async function GET(req: Request) {
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  return NextResponse.json({
    headers,
    parsed: {
      'x-forwarded-for': req.headers.get('x-forwarded-for'),
      'x-real-ip': req.headers.get('x-real-ip'),
      'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
    },
  });
}
