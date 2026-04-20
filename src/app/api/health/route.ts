/**
 * Lightweight liveness + readiness endpoint for Docker healthcheck, nginx
 * upstream-check, load-balancer probe, or an external uptime monitor.
 *
 * Intentionally does NOT render any pages, does NOT hit the DB, does NOT
 * call external services. Goal: confirm the Node process is responsive and
 * the Next runtime is serving. If this returns 200, the container is alive.
 * If it stops returning, Docker healthcheck flips the container to
 * `unhealthy` and restart policy kicks in.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: Date.now(),
      uptime: Math.round(process.uptime()),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
