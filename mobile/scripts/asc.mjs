/**
 * App Store Connect API helper.
 *
 * Authenticates with a JWT signed by the team's API key (.p8 / ES256)
 * and exposes a few high-level commands for first-time TestFlight
 * Internal Testing setup.
 *
 * Env (or hardcoded defaults that match the current Regatta team):
 *   ASC_KEY_ID            (default: QBF5228DP3)
 *   ASC_ISSUER_ID         (default: from ASC integrations page)
 *   ASC_KEY_PATH          (default: ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8)
 *   ASC_APP_ID            (default: 6768134329 = Week to Regatta)
 *   ASC_TESTER_EMAIL      (default: andrlock@gmail.com)
 *
 * Commands:
 *   node scripts/asc.mjs builds            # list latest 5 builds + status
 *   node scripts/asc.mjs setup             # full TestFlight Internal setup
 *                                          # (compliance + group + tester + build)
 */

import { readFileSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY_ID = process.env.ASC_KEY_ID || 'QBF5228DP3';
const ISSUER_ID =
  process.env.ASC_ISSUER_ID || 'c646a296-d7f1-418a-ac78-4ede7aacd995';
const KEY_PATH =
  process.env.ASC_KEY_PATH ||
  join(homedir(), '.appstoreconnect', 'private_keys', `AuthKey_${KEY_ID}.p8`);
const APP_ID = process.env.ASC_APP_ID || '6768134329';
const TESTER_EMAIL = process.env.ASC_TESTER_EMAIL || 'andrlock@gmail.com';

const API = 'https://api.appstoreconnect.apple.com';

function jwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1',
  };
  const b64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const input = `${b64(header)}.${b64(payload)}`;
  const key = createPrivateKey(readFileSync(KEY_PATH));
  const sig = createSign('SHA256')
    .update(input)
    .sign({ key, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${input}.${sig}`;
}

async function asc(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ASC ${method} ${path} -> ${res.status}\n${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function cmdBuilds() {
  const data = await asc(
    'GET',
    `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=5&include=preReleaseVersion,buildBetaDetail`,
  );
  console.log(`\n[builds for app ${APP_ID}]`);
  for (const b of data.data) {
    const a = b.attributes;
    const beta = (data.included ?? []).find(
      (i) =>
        i.type === 'buildBetaDetails' &&
        i.relationships?.build?.data?.id === b.id,
    );
    const ver = (data.included ?? []).find(
      (i) =>
        i.type === 'preReleaseVersions' &&
        i.id === b.relationships?.preReleaseVersion?.data?.id,
    );
    console.log(`  id=${b.id}`);
    console.log(`    version=${ver?.attributes?.version} (${a.version})`);
    console.log(
      `    state=${a.processingState}  uploaded=${a.uploadedDate}  expires=${a.expirationDate}`,
    );
    console.log(
      `    usesNonExemptEncryption=${a.usesNonExemptEncryption}  internalState=${beta?.attributes?.internalBuildState}  externalState=${beta?.attributes?.externalBuildState}`,
    );
  }
  return data.data;
}

async function findUser(email) {
  const data = await asc(
    'GET',
    `/v1/users?filter[username]=${encodeURIComponent(email)}`,
  );
  return data.data[0];
}

async function findOrCreateInternalGroup(name) {
  const data = await asc(
    'GET',
    `/v1/apps/${APP_ID}/betaGroups?limit=50`,
  );
  const existing = data.data.find(
    (g) => g.attributes.name === name && g.attributes.isInternalGroup === true,
  );
  if (existing) {
    console.log(`[group] reusing internal group "${name}" id=${existing.id}`);
    return existing.id;
  }
  const created = await asc('POST', '/v1/betaGroups', {
    data: {
      type: 'betaGroups',
      attributes: { name },
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
      },
    },
  });
  console.log(`[group] created group "${name}" id=${created.data.id}; internal=${created.data.attributes.isInternalGroup}`);
  return created.data.id;
}

async function addUserToGroup(groupId, userId) {
  await asc('POST', `/v1/betaGroups/${groupId}/relationships/betaTesters`, {
    data: [{ type: 'betaTesters', id: userId }],
  }).catch((err) => {
    // If the relationship already exists ASC returns 409; treat as success.
    if (!String(err).includes('409')) throw err;
    console.log(`[user] tester already in group, skipping`);
  });
}

async function setExportCompliance(buildId) {
  await asc('PATCH', `/v1/builds/${buildId}`, {
    data: {
      type: 'builds',
      id: buildId,
      attributes: { usesNonExemptEncryption: false },
    },
  });
  console.log(`[build ${buildId}] usesNonExemptEncryption=false set`);
}

async function attachBuildToGroup(buildId, groupId) {
  await asc('POST', `/v1/betaGroups/${groupId}/relationships/builds`, {
    data: [{ type: 'builds', id: buildId }],
  }).catch((err) => {
    if (!String(err).includes('409')) throw err;
    console.log(`[build] already attached to group, skipping`);
  });
}

async function findInternalBetaTester(email) {
  // Internal beta testers are auto-created when ASC users have App Manager+
  // role; we look them up by email.
  const data = await asc(
    'GET',
    `/v1/betaTesters?filter[email]=${encodeURIComponent(email)}&limit=10`,
  );
  return data.data[0];
}

async function cmdSetup() {
  const builds = await cmdBuilds();
  const latest = builds[0];
  if (!latest) {
    console.error('[setup] no builds found, upload first');
    process.exit(1);
  }
  console.log(`\n[setup] using latest build id=${latest.id}`);

  if (latest.attributes.processingState !== 'VALID') {
    console.error(
      `[setup] build still ${latest.attributes.processingState}; ASC needs to finish processing before tester invites work`,
    );
    console.error('[setup] run again in a couple minutes');
    process.exit(2);
  }

  if (latest.attributes.usesNonExemptEncryption == null) {
    await setExportCompliance(latest.id);
  } else {
    console.log(
      `[build] export compliance already set (usesNonExemptEncryption=${latest.attributes.usesNonExemptEncryption})`,
    );
  }

  const groupId = await findOrCreateInternalGroup('Self');

  const tester = await findInternalBetaTester(TESTER_EMAIL);
  if (!tester) {
    console.error(
      `[setup] no internal beta tester found for ${TESTER_EMAIL}.\n` +
        '  For internal groups the user must already exist in App Store\n' +
        "  Connect 'Users and Access' with the 'Access to Cloud Managed\n" +
        "  Developer ID Certificate' role granted. The Account Holder\n" +
        '  qualifies automatically. Check ASC -> Users and Access.',
    );
    process.exit(3);
  }
  console.log(`[user] tester id=${tester.id} email=${TESTER_EMAIL}`);

  await addUserToGroup(groupId, tester.id);
  console.log(`[group] tester added to "Self"`);

  await attachBuildToGroup(latest.id, groupId);
  console.log(`[group] build ${latest.id} attached to "Self"`);

  console.log(
    '\n[done] check email for the TestFlight invite, install TestFlight on iPhone, accept the invite.',
  );
}

const cmd = process.argv[2] || 'builds';
const handlers = { builds: cmdBuilds, setup: cmdSetup };
const handler = handlers[cmd];
if (!handler) {
  console.error(`unknown command: ${cmd}\nknown: ${Object.keys(handlers).join(', ')}`);
  process.exit(1);
}
handler().catch((err) => {
  console.error(err);
  process.exit(1);
});
