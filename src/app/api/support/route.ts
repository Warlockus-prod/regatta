import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logError, logWarn } from '@/lib/log';
import { insertFeedback } from '@/lib/db';
import { truncateIp } from '@/lib/net';
import { rateLimitClient, clientIpKey, clientKeys } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 15;

// POST /api/support
//
// Public contact-form endpoint for the /support page (App Store Support URL).
// Every valid submission is first stored in the feedback table (kind
// 'feedback', category 'support', visible in /stats) and then pushed to
// Telegram (@gtframe_bot, chat from env) so the operator gets a push without
// depending on IMAP polling. The Telegram push is best-effort; the row is the
// record.
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
// "thanks") and logs an error; the message itself is in the feedback table.
// Neither the message nor the contact is ever written to stdout.

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

  // Truncated like every stored IP (IPv4 last octet, IPv6 to 3 hextets).
  const ipTrunc = ip === 'ip:unknown' ? 'unknown' : truncateIp(ip);

  const rl = rateLimitClient(clientKeys(req, sid), 'support', SUPPORT_LIMIT, SUPPORT_WINDOW_MS);
  if (!rl.ok) {
    logWarn('support.rate-limited', { resetMs: rl.resetMs, by: rl.rejectedBy });
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

  // Store first: the Telegram push below can fail or be unconfigured.
  const feedbackId = insertFeedback({
    kind: 'feedback',
    category: 'support',
    message,
    contact,
    path: record.path,
    language: record.language,
    ua,
    ip: ipTrunc === 'unknown' ? undefined : ipTrunc,
  });

  logInfo('support.received', {
    messageLen: message.length,
    hasContact: !!contact,
    lang: record.language,
    stored: feedbackId !== null,
  });
  if (feedbackId === null) logError('support.store-failed');

  const tg = await sendToTelegram(record);
  if (!tg.ok) {
    logError('support.telegram-failed', { status: tg.status, err: tg.err });
    // Still 200 for the user: they did their part, and the message is in the
    // feedback table (/stats). The operator sees this error in docker logs.
  }

  return NextResponse.json({ ok: true });
}
