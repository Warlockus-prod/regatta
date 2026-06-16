/**
 * App Store Connect: submit an App Store version for review.
 *
 * Uses the modern reviewSubmissions flow:
 *   1. find or create a reviewSubmission (one open per app/platform)
 *   2. add the target appStoreVersion as a reviewSubmissionItem
 *   3. PATCH submitted=true
 *
 * SAFETY: refuses to submit unless the version is in PREPARE_FOR_SUBMISSION
 * (or another editable/submittable state) AND has a build attached. Prints the
 * plan and the final state. Pass --dry to inspect without submitting.
 *
 * Usage:
 *   node scripts/asc-submit.mjs --version 1.1            # submit
 *   node scripts/asc-submit.mjs --version 1.1 --dry      # check only
 */
import { readFileSync, existsSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY_ID = process.env.ASC_KEY_ID || 'QBF5228DP3';
const ISSUER_ID = process.env.ASC_ISSUER_ID || 'c646a296-d7f1-418a-ac78-4ede7aacd995';
const KEY_PATH =
  process.env.ASC_KEY_PATH ||
  join(homedir(), '.appstoreconnect', 'private_keys', `AuthKey_${KEY_ID}.p8`);
const APP_ID = process.env.ASC_APP_ID || '6768134329';
const API = 'https://api.appstoreconnect.apple.com';

const args = process.argv.slice(2);
const val = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1] ?? null; };
const DRY = args.includes('--dry');
const VERSION = val('--version') || '1.1';

function jwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const input = `${b64(header)}.${b64(payload)}`;
  const key = createPrivateKey(readFileSync(KEY_PATH));
  const sig = createSign('SHA256').update(input).sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${input}.${sig}`;
}

async function asc(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ASC ${method} ${path} -> ${res.status}\n${text}`);
  return text ? JSON.parse(text) : null;
}

const SUBMITTABLE = new Set([
  'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY',
]);

async function main() {
  if (!existsSync(KEY_PATH)) { console.error(`[fatal] no ASC key at ${KEY_PATH}`); process.exit(1); }
  console.log(`=== ASC submit (app=${APP_ID}, version=${VERSION}) ${DRY ? '[DRY]' : '[SUBMIT]'} ===`);

  // 1. Find the version.
  const vers = await asc('GET', `/v1/apps/${APP_ID}/appStoreVersions?limit=20&fields[appStoreVersions]=versionString,appStoreState`);
  const version = (vers.data || []).find((v) => v.attributes.versionString === VERSION);
  if (!version) { console.error(`[fatal] version ${VERSION} not found`); process.exit(1); }
  console.log(`[version] ${VERSION} state=${version.attributes.appStoreState} id=${version.id}`);
  if (!SUBMITTABLE.has(version.attributes.appStoreState)) {
    console.error(`[fatal] version state ${version.attributes.appStoreState} is not submittable`);
    process.exit(1);
  }

  // 2. Guard: a build must be attached.
  const build = await asc('GET', `/v1/appStoreVersions/${version.id}/build?fields[builds]=version,processingState`);
  if (!build.data) { console.error('[fatal] no build attached - cannot submit'); process.exit(1); }
  console.log(`[build] attached: v${build.data.attributes.version} (${build.data.attributes.processingState})`);
  if (build.data.attributes.processingState !== 'VALID') {
    console.error('[fatal] attached build is not VALID yet'); process.exit(1);
  }

  if (DRY) { console.log('[dry] all preconditions met; would submit now.'); return; }

  // 3. Find an existing open reviewSubmission or create one.
  const subs = await asc('GET', `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=10&fields[reviewSubmissions]=state,platform`);
  let sub = (subs.data || []).find((s) => ['READY_FOR_REVIEW'].includes(s.attributes.state));
  if (sub) {
    console.log(`[reviewSubmission] reusing ${sub.id} (state=${sub.attributes.state})`);
  } else {
    const created = await asc('POST', '/v1/reviewSubmissions', {
      data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP_ID } } } },
    });
    sub = created.data;
    console.log(`[reviewSubmission] created ${sub.id}`);
  }

  // 4. Add the version as an item (ignore 409 if already added).
  try {
    await asc('POST', '/v1/reviewSubmissionItems', {
      data: { type: 'reviewSubmissionItems', relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
      } },
    });
    console.log('[item] appStoreVersion added to submission');
  } catch (e) {
    if (String(e).includes('409') || String(e).toLowerCase().includes('already')) {
      console.log('[item] version already in submission (ok)');
    } else throw e;
  }

  // 5. Submit.
  await asc('PATCH', `/v1/reviewSubmissions/${sub.id}`, {
    data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } },
  });
  const after = await asc('GET', `/v1/reviewSubmissions/${sub.id}?fields[reviewSubmissions]=state,submittedDate`);
  console.log(`\n=== SUBMITTED ===`);
  console.log(`  reviewSubmission ${sub.id} state=${after.data.attributes.state} submittedDate=${after.data.attributes.submittedDate}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
