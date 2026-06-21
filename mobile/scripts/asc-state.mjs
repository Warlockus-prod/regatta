// One-shot ASC App Store version state poller.
// Prints "<versionString> <appStoreState>" for the most recent version,
// or NO_KEY / API_ERR / NO_VERSION on problems.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APP_ID = process.env.ASC_APP_ID || '6768134329';
const ISSUER_ID = process.env.ASC_ISSUER_ID || 'c646a296-d7f1-418a-ac78-4ede7aacd995';
let KEY_ID = process.env.ASC_KEY_ID || 'QBF5228DP3';
const KEYDIR = join(homedir(), '.appstoreconnect', 'private_keys');
let KEY_PATH = process.env.ASC_KEY_PATH || join(KEYDIR, `AuthKey_${KEY_ID}.p8`);

if (!existsSync(KEY_PATH) && existsSync(KEYDIR)) {
  const found = readdirSync(KEYDIR).find((f) => /^AuthKey_.*\.p8$/.test(f));
  if (found) {
    KEY_PATH = join(KEYDIR, found);
    KEY_ID = found.replace(/^AuthKey_/, '').replace(/\.p8$/, '');
  }
}
if (!existsSync(KEY_PATH)) {
  console.log('NO_KEY ' + KEY_PATH);
  process.exit(2);
}

function jwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const input = `${b64(header)}.${b64(payload)}`;
  const key = createPrivateKey(readFileSync(KEY_PATH));
  const sig = createSign('SHA256')
    .update(input)
    .sign({ key, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${input}.${sig}`;
}

const url =
  `https://api.appstoreconnect.apple.com/v1/apps/${APP_ID}/appStoreVersions` +
  `?limit=20&fields[appStoreVersions]=versionString,appStoreState,createdDate`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt()}` } });
if (!res.ok) {
  console.log(`API_ERR ${res.status} ${(await res.text()).slice(0, 200)}`);
  process.exit(3);
}
const data = await res.json();
const vers = (data.data || []).map((v) => ({
  v: v.attributes.versionString,
  s: v.attributes.appStoreState,
  c: v.attributes.createdDate,
}));
vers.sort((a, b) => (Date.parse(b.c || '') || 0) - (Date.parse(a.c || '') || 0));
const top = vers[0];
console.log(top ? `${top.v} ${top.s}` : 'NO_VERSION');
