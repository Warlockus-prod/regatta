import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logError, logWarn } from '@/lib/log';
import { rateLimit, clientIpKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 15;

// POST /api/support
//
// Public contact-form endpoint for the /support page (App Store Support URL).
// Submits go to Telegram (@gtframe_bot, chat from env) so the operator gets a
// push without depending on IMAP polling.
//
// Hardening:
// - Honeypot field "company": filled by bots, real users leave it empty -> 200
//   ok but silently dropped. Avoids leaking the form's existence to attackers.
// - Hard message length cap.
// - Per-session/IP rate limit: 5 submissions / hour.
// - Telegram message kept under 4096 chars (truncate body to 3500).
//
// Env (set in docker compose):
//   TELEGRAM_BOT_TOKEN   bot to send from (@gtframe_bot)
//   TELEGRAM_CHAT_ID     destination chat id
// If either is missing, the endpoint still returns 200 (so users always see
// "thanks"), but logs an error - admin will see it in docker logs.

const SUPPORT_LIMIT = 5;
const SUPPORT_WINDOW_MS = 60 * 60 * 1000;
const MAX_MESSAGE = 4000;
const MAX_CONTACT = 200;
const MAX_TG_LEN = 3500;

interface SupportPayload {
  message: string;
  contact?: string;
  company?: string; // honeypot
  path?: string;
  language?: string;
  ua?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendToTelegram(record: {
  message: string;
  contact?: string;
  language?: string;
  path?: string;
  ip: string;
  ua: string;
}): Promise<{ ok: boolean; status?: number; err?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    return { ok: false, err: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set' };
  }

  const body =
    record.message.length > MAX_TG_LEN
      ? record.message.slice(0, MAX_TG_LEN) + '\n\n[...truncated]'
      : record.message;

  const lines = [
    '🛟 <b>Новое обращение на /support (Week to Regatta)</b>',
    `🕐 ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`,
    record.contact ? `<b>Контакт:</b> ${escapeHtml(record.contact)}` : '<b>Контакт:</b> (не указан)',
    record.language ? `<b>Язык:</b> ${escapeHtml(record.language)}` : '',
    record.path ? `<b>Со страницы:</b> ${escapeHtml(record.path)}` : '',
    `<b>IP:</b> ${escapeHtml(record.ip)}`,
    '',
    escapeHtml(body),
  ].filter(Boolean);

  const text = lines.join('\n');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      const errText = (await resp.text()).slice(0, 200);
      return { ok: false, status: resp.status, err: errText };
    }
    return { ok: true, status: resp.status };
  } catch (err) {
    return { ok: false, err: err instanceof Error ? err.message : 'fetch failed' };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = clientIpKey(req); // last XFF hop - see rate-limit.ts (anti-spoofing)

  // Truncate IPv4 last octet to keep parity with /api/log privacy policy.
  const ipTrunc = ip.includes('.') ? ip.replace(/\.\d+$/, '.0') : ip;

  const rl = rateLimit('support:' + (sid ?? ipTrunc), SUPPORT_LIMIT, SUPPORT_WINDOW_MS);
  if (!rl.ok) {
    logWarn('support.rate-limited', { key: (sid ?? ipTrunc).slice(0, 12), resetMs: rl.resetMs });
    return NextResponse.json(
      { error: 'Слишком много обращений за последний час / Too many requests this hour' },
      { status: 429 },
    );
  }

  let body: SupportPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot: real users do not see/fill "company". If it's present and
  // non-empty, we silently 200 to not tip the bot off.
  if (typeof body?.company === 'string' && body.company.trim().length > 0) {
    logInfo('support.honeypot-hit', { ip: ipTrunc.slice(0, 24) });
    return NextResponse.json({ ok: true });
  }

  if (typeof body?.message !== 'string') {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }
  const message = body.message.trim();
  if (message.length < 2) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }
  const contact =
    typeof body.contact === 'string' && body.contact.trim().length > 0
      ? body.contact.trim().slice(0, MAX_CONTACT)
      : undefined;

  const ua = (req.headers.get('user-agent') || 'unknown').slice(0, 200);
  const record = {
    message,
    contact,
    language: typeof body.language === 'string' ? body.language.slice(0, 8) : undefined,
    path: typeof body.path === 'string' ? body.path.slice(0, 200) : undefined,
    ip: ipTrunc,
    ua,
  };

  logInfo('support.received', {
    messageLen: message.length,
    hasContact: !!contact,
    lang: record.language,
  });

  const tg = await sendToTelegram(record);
  if (!tg.ok) {
    logError('support.telegram-failed', { status: tg.status, err: tg.err });
    // Still return 200 to the user - we have the record in logs and they did
    // their part. Operator will see the error in docker logs.
  }

  return NextResponse.json({ ok: true });
}
