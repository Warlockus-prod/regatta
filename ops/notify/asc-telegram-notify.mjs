#!/usr/bin/env node
// Apple App Store review-status -> Telegram notifier for "Week to Regatta".
//
// Polls App Store Connect for the iOS App Store version state and sends a
// Telegram message (via the existing @gtframe_bot) whenever it changes.
//
// SECRETS ARE NOT STORED IN THIS FILE:
//   - the ASC signing key is read from ~/.appstoreconnect/private_keys
//   - the Telegram bot token + chat id are read at runtime from the existing
//     gtframe .env.production (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).
//
// Usage:
//   node asc-telegram-notify.mjs           run once, notify only on change
//   node asc-telegram-notify.mjs --test    send a one-off confirmation message
//
// Runs every 15 min via the launchd job com.regatta.asc-notify.

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APP_ID = process.env.ASC_APP_ID || '6768134329';
const ISSUER_ID = process.env.ASC_ISSUER_ID || 'c646a296-d7f1-418a-ac78-4ede7aacd995';
const STATE_FILE = join(homedir(), '.regatta-asc-state');
const GTFRAME_ENV = process.env.GTFRAME_ENV || '/Users/Andrey/App/gtframe/.env.production';
const TEST = process.argv.includes('--test');

// ---- ASC signing key ----
const KEYDIR = join(homedir(), '.appstoreconnect', 'private_keys');
let KEY_ID = process.env.ASC_KEY_ID || 'QBF5228DP3';
let KEY_PATH = process.env.ASC_KEY_PATH || join(KEYDIR, `AuthKey_${KEY_ID}.p8`);
if (!existsSync(KEY_PATH) && existsSync(KEYDIR)) {
  const f = readdirSync(KEYDIR).find((x) => /^AuthKey_.*\.p8$/.test(x));
  if (f) { KEY_PATH = join(KEYDIR, f); KEY_ID = f.replace(/^AuthKey_/, '').replace(/\.p8$/, ''); }
}

function jwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const input =
    b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }) + '.' +
    b64({ iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' });
  const sig = createSign('SHA256')
    .update(input)
    .sign({ key: createPrivateKey(readFileSync(KEY_PATH)), dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return input + '.' + sig;
}

async function getState() {
  const url =
    `https://api.appstoreconnect.apple.com/v1/apps/${APP_ID}/appStoreVersions` +
    `?limit=3&fields[appStoreVersions]=versionString,appStoreState,createdDate`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + jwt() } });
  if (!r.ok) throw new Error('ASC HTTP ' + r.status);
  const j = await r.json();
  const v = (j.data || [])
    .map((x) => ({ v: x.attributes.versionString, s: x.attributes.appStoreState, c: x.attributes.createdDate }))
    .sort((a, b) => (Date.parse(b.c || '') || 0) - (Date.parse(a.c || '') || 0))[0];
  return v ? `${v.v} ${v.s}` : 'unknown';
}

// ---- Telegram (creds read from the existing gtframe env at runtime) ----
function telegramCreds() {
  const env = readFileSync(GTFRAME_ENV, 'utf8');
  const get = (k) => {
    const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
    return m ? m[1].replace(/^["']|["']$/g, '').trim() : null;
  };
  return { token: get('TELEGRAM_BOT_TOKEN'), chat: get('TELEGRAM_CHAT_ID') };
}

async function tg(text) {
  const { token, chat } = telegramCreds();
  if (!token || !chat) throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not found in ' + GTFRAME_ENV);
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error('Telegram HTTP ' + r.status + ' ' + (await r.text()).slice(0, 160));
}

const LABELS = {
  PREPARE_FOR_SUBMISSION: 'черновик (не отправлено)',
  WAITING_FOR_REVIEW: 'в очереди на ревью',
  IN_REVIEW: 'на проверке у ревьюера',
  PENDING_DEVELOPER_RELEASE: 'одобрено, ждёт релиза',
  PROCESSING_FOR_APP_STORE: 'публикуется',
  READY_FOR_SALE: 'ОПУБЛИКОВАНО в App Store',
  REJECTED: 'ОТКЛОНЕНО (см. Resolution Center)',
  METADATA_REJECTED: 'отклонена метадата',
  INVALID_BINARY: 'невалидный билд',
  DEVELOPER_REJECTED: 'снято разработчиком',
};

(async () => {
  const cur = await getState();
  const prev = existsSync(STATE_FILE) ? readFileSync(STATE_FILE, 'utf8').trim() : '';

  if (TEST) {
    await tg(
      `✅ <b>Week to Regatta</b> - монитор статуса Apple включён.\n` +
      `Текущий статус: <b>${cur}</b>\n` +
      `Буду писать сюда при каждой смене (проверка каждые 15 мин).`,
    );
    writeFileSync(STATE_FILE, cur);
    console.log('test message sent; state=' + cur);
    return;
  }

  if (prev && cur !== prev) {
    const curCode = cur.split(' ')[1] || cur;
    const note = LABELS[curCode] ? '\n(' + LABELS[curCode] + ')' : '';
    await tg(`🔔 <b>Week to Regatta</b> - статус Apple изменился:\n<b>${prev}</b>  ->  <b>${cur}</b>${note}`);
    console.log('change notified: ' + prev + ' -> ' + cur);
  } else {
    console.log('no change; state=' + cur);
  }
  writeFileSync(STATE_FILE, cur);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
