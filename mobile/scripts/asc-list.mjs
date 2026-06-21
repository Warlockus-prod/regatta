// Quick listing helpers - betaGroups + internal beta testers + builds-in-group.
import { readFileSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY_ID = process.env.ASC_KEY_ID || 'QBF5228DP3';
const ISSUER_ID = process.env.ASC_ISSUER_ID || 'c646a296-d7f1-418a-ac78-4ede7aacd995';
const KEY_PATH = process.env.ASC_KEY_PATH ||
  join(homedir(), '.appstoreconnect', 'private_keys', `AuthKey_${KEY_ID}.p8`);
const APP_ID = process.env.ASC_APP_ID || '6768134329';

function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })).toString('base64url');
  const pay = Buffer.from(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })).toString('base64url');
  const input = `${head}.${pay}`;
  const sig = createSign('SHA256').update(input).sign({ key: createPrivateKey(readFileSync(KEY_PATH)), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${input}.${sig}`;
}

async function asc(method, path, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text}`);
  return text ? JSON.parse(text) : null;
}

const groups = await asc('GET', `/v1/apps/${APP_ID}/betaGroups?limit=50`);
console.log(`\n[groups for app ${APP_ID}]`);
for (const g of groups.data) {
  console.log(`  id=${g.id} name="${g.attributes.name}" internal=${g.attributes.isInternalGroup} createdDate=${g.attributes.createdDate} hasAccessToAllBuilds=${g.attributes.hasAccessToAllBuilds}`);
}

console.log('\n[users in Users and Access (filterable as beta testers via internal flow)]');
const users = await asc('GET', `/v1/users?limit=20`);
for (const u of users.data) {
  console.log(`  id=${u.id} ${u.attributes.username} role=${u.attributes.roles?.join(',')} provisioningAllowed=${u.attributes.provisioningAllowed}`);
}
