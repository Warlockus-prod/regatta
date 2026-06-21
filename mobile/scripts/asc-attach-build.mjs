// Attach a processed TestFlight build to a beta group so it actually reaches
// testers. This is the step that was silently missing: builds 14-19 uploaded
// fine but were never attached to the internal "Self" group, so the phone
// stayed stuck on an old build (0.13.0). Run this after every upload.
//
// Usage: node scripts/asc-attach-build.mjs <buildNumber> [groupName=Self]
// Auth: same JWT(ES256) + .p8 pattern as the other asc-*.mjs scripts.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APP_ID = process.env.ASC_APP_ID || '6768134329';
const ISSUER = process.env.ASC_ISSUER_ID || 'c646a296-d7f1-418a-ac78-4ede7aacd995';
let KEY_ID = process.env.ASC_KEY_ID || 'QBF5228DP3';
const KEYDIR = join(homedir(), '.appstoreconnect', 'private_keys');
let KEY_PATH = process.env.ASC_KEY_PATH || join(KEYDIR, `AuthKey_${KEY_ID}.p8`);
if (!existsSync(KEY_PATH) && existsSync(KEYDIR)) {
  const f = readdirSync(KEYDIR).find((x) => /^AuthKey_.*\.p8$/.test(x));
  if (f) { KEY_PATH = join(KEYDIR, f); KEY_ID = f.replace(/^AuthKey_/, '').replace(/\.p8$/, ''); }
}

const buildNumber = process.argv[2];
const groupName = process.argv[3] || 'Self';
if (!buildNumber) {
  console.error('usage: node scripts/asc-attach-build.mjs <buildNumber> [groupName=Self]');
  process.exit(1);
}

function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const input = `${b({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b({ iss: ISSUER, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })}`;
  return `${input}.${createSign('SHA256').update(input).sign({ key: createPrivateKey(readFileSync(KEY_PATH)), dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
const api = async (m, p, body) => {
  const r = await fetch('https://api.appstoreconnect.apple.com' + p, {
    method: m,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok && r.status !== 204) throw new Error(`${m} ${p} -> ${r.status}\n${t}`);
  return t ? JSON.parse(t) : null;
};

const groups = await api('GET', `/v1/betaGroups?filter[app]=${APP_ID}&limit=20&fields[betaGroups]=name`);
const group = (groups.data || []).find((x) => x.attributes.name === groupName) || (groups.data || [])[0];
if (!group) { console.error('no beta group found'); process.exit(2); }

const builds = await api('GET', `/v1/builds?filter[app]=${APP_ID}&filter[version]=${buildNumber}&fields[builds]=version,processingState`);
const build = (builds.data || [])[0];
if (!build) { console.error(`build ${buildNumber} not found (still processing?). Retry in a minute.`); process.exit(3); }
if (build.attributes.processingState !== 'VALID') {
  console.error(`build ${buildNumber} state=${build.attributes.processingState} (not VALID yet). Retry when VALID.`);
  process.exit(4);
}

await api('POST', `/v1/betaGroups/${group.id}/relationships/builds`, { data: [{ type: 'builds', id: build.id }] });
const verify = await api('GET', `/v1/builds?filter[app]=${APP_ID}&filter[betaGroups]=${group.id}&limit=5&fields[builds]=version`);
const ok = (verify.data || []).some((x) => x.attributes.version === String(buildNumber));
console.log(ok
  ? `OK: build ${buildNumber} attached to "${group.attributes.name}" group (testers can now update).`
  : `WARN: attach POST accepted but build ${buildNumber} not yet listed in the group.`);
