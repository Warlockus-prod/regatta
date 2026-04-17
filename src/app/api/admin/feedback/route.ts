import { NextResponse } from 'next/server';
import { updateFeedbackStatus } from '@/lib/db';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = ['new', 'in_progress', 'fixed', 'ignored'];

export async function POST(req: Request) {
  let body: { id?: number; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.id !== 'number' || !body.status || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const ok = updateFeedbackStatus(body.id, body.status);
  return NextResponse.json({ ok });
}
