#!/usr/bin/env node
/**
 * Invite an EXTERNAL TestFlight tester (any email, not an ASC team member).
 *
 * Internal groups (like "Self") only accept App Store Connect users, so a
 * friend's iCloud / gmail address gets a 409 "Tester(s) cannot be assigned"
 * there. External groups accept any email but the build must pass a one-time
 * Beta App Review per version. This script wires the whole path:
 *
 *   1. Find-or-create an external group (default name "Friends").
 *   2. Create the beta tester + attach to the group (EMAIL invite).
 *   3. Attach the latest VALID build to the group.
 *   4. Submit that build for Beta App Review (if not already in review).
 *
 * Once Apple approves the beta review (usually hours), the tester gets the
 * TestFlight email automatically.
 *
 * Usage:
 *   node scripts/asc-invite-external.mjs <email> [firstName] [lastName] [groupName]
 *   node scripts/asc-invite-external.mjs Yana19946@icloud.com Yana Tester Friends
 *
 * Env / defaults match asc.mjs (ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH /
 * ASC_APP_ID).
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

const [, , EMAIL, FIRST = 'Tester', LAST = '', GROUP_NAME = 'Friends'] =
  process.argv;

if (!EMAIL) {
  console.error(
    'usage: node scripts/asc-invite-external.mjs <email> [firstName] [lastName] [groupName]',
  );
  process.exit(1);
}

const API = 'https://api.appstoreconnect.apple.com';

function jwt() {
  const head = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }),
  ).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const pay = Buffer.from(
    JSON.stringify({
      iss: ISSUER_ID,
      iat: now,
      exp: now + 1200,
      aud: 'appstoreconnect-v1',
    }),
  ).toString('base64url');
  const input = `${head}.${pay}`;
  const sig = createSign('SHA256')
    .update(input)
    .sign({
      key: createPrivateKey(readFileSync(KEY_PATH)),
      dsaEncoding: 'ieee-p1363',
    })
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
  return { status: res.status, ok: res.ok, json: text ? JSON.parse(text) : null, text };
}

async function findOrCreateExternalGroup(name) {
  const list = await asc('GET', `/v1/apps/${APP_ID}/betaGroups?limit=50`);
  const found = list.json.data.find(
    (g) => g.attributes.name === name && g.attributes.isInternalGroup === false,
  );
  if (found) {
    console.log(`[group] reusing external group "${name}" id=${found.id}`);
    return found.id;
  }
  const created = await asc('POST', '/v1/betaGroups', {
    data: {
      type: 'betaGroups',
      attributes: { name, isInternalGroup: false, hasAccessToAllBuilds: false },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  });
  if (!created.ok) throw new Error(`create group failed ${created.status}\n${created.text}`);
  console.log(`[group] created external group "${name}" id=${created.json.data.id}`);
  return created.json.data.id;
}

async function ensureTester(groupId) {
  const existing = await asc(
    'GET',
    `/v1/betaTesters?filter[email]=${encodeURIComponent(EMAIL)}&limit=5`,
  );
  if (existing.json.data.length) {
    const id = existing.json.data[0].id;
    // Make sure it's in the group.
    const add = await asc('POST', `/v1/betaGroups/${groupId}/relationships/betaTesters`, {
      data: [{ type: 'betaTesters', id }],
    });
    if (add.status === 409 || add.ok) {
      console.log(`[tester] ${EMAIL} already exists, ensured in group`);
      return id;
    }
    throw new Error(`add existing tester failed ${add.status}\n${add.text}`);
  }
  const created = await asc('POST', '/v1/betaTesters', {
    data: {
      type: 'betaTesters',
      attributes: { firstName: FIRST, lastName: LAST, email: EMAIL },
      relationships: { betaGroups: { data: [{ type: 'betaGroups', id: groupId }] } },
    },
  });
  if (!created.ok) throw new Error(`create tester failed ${created.status}\n${created.text}`);
  console.log(`[tester] created ${EMAIL} id=${created.json.data.id} (EMAIL invite)`);
  return created.json.data.id;
}

async function latestBuild() {
  const b = await asc(
    'GET',
    `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=1&include=buildBetaDetail`,
  );
  return b.json.data[0];
}

async function main() {
  console.log(`[invite] external tester ${EMAIL} -> group "${GROUP_NAME}"`);
  const groupId = await findOrCreateExternalGroup(GROUP_NAME);
  await ensureTester(groupId);

  const build = await latestBuild();
  if (!build) {
    console.error('[build] no build found, upload first');
    process.exit(2);
  }
  console.log(`[build] latest ${build.attributes.version} id=${build.id}`);

  const attach = await asc('POST', `/v1/betaGroups/${groupId}/relationships/builds`, {
    data: [{ type: 'builds', id: build.id }],
  });
  if (attach.status === 204 || attach.status === 409) {
    console.log('[build] attached to group');
  } else if (!attach.ok) {
    throw new Error(`attach build failed ${attach.status}\n${attach.text}`);
  }

  // Beta review state.
  const detail = await asc('GET', `/v1/builds/${build.id}/buildBetaDetail`);
  const ext = detail.json?.data?.attributes?.externalBuildState;
  console.log(`[build] externalBuildState=${ext}`);

  if (ext === 'READY_FOR_BETA_SUBMISSION') {
    const sub = await asc('POST', '/v1/betaAppReviewSubmissions', {
      data: {
        type: 'betaAppReviewSubmissions',
        relationships: { build: { data: { type: 'builds', id: build.id } } },
      },
    });
    if (sub.ok) {
      console.log(`[review] submitted for Beta App Review -> ${sub.json.data.attributes.betaReviewState}`);
    } else if (sub.status === 409) {
      console.log('[review] already submitted / in review, skip');
    } else {
      throw new Error(`beta review submit failed ${sub.status}\n${sub.text}`);
    }
  } else if (ext === 'WAITING_FOR_BETA_REVIEW' || ext === 'IN_BETA_REVIEW') {
    console.log('[review] already in review, nothing to submit');
  } else if (ext === 'BETA_APPROVED' || ext === 'IN_BETA_TESTING') {
    console.log('[review] build already beta-approved; tester gets the invite now');
  } else {
    console.log(`[review] state ${ext}; check ASC TestFlight tab`);
  }

  console.log(
    `\n[done] ${EMAIL} invited to "${GROUP_NAME}". Once Beta App Review approves the build, Apple emails the TestFlight invite automatically.`,
  );
}

main().catch((err) => {
  console.error('\n[invite failed]', err.message || err);
  process.exit(1);
});
