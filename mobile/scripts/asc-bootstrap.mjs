#!/usr/bin/env node
/**
 * One-shot App Store Connect "App Info" bootstrap.
 *
 * Sets everything that App Store Connect web UI would otherwise force a
 * human to click through, via the ASC v3 API:
 *
 *   - Primary category   -> EDUCATION
 *   - Secondary category -> SPORTS
 *   - Content Rights     -> DOES_NOT_USE_THIRD_PARTY_CONTENT
 *   - Age Rating         -> all NONE / false (4+)
 *   - Price              -> Free, base territory USA, auto-spread to all markets
 *   - Privacy Policy URL -> applied to all 7 appInfoLocalizations
 *
 * Per-locale name / subtitle / description / keywords / promotional /
 * support_url / marketing_url stay in `scripts/asc-metadata.mjs`. This
 * file is the App-Info layer; the other is the version-and-locale layer.
 *
 * Idempotent. Re-running PATCHes existing rows in place; POSTs that 409
 * on duplicates are tolerated.
 *
 * Usage:
 *   node scripts/asc-bootstrap.mjs              apply
 *   node scripts/asc-bootstrap.mjs --dry-run    log diffs only, no writes
 *
 * Env / defaults (matches asc.mjs):
 *   ASC_KEY_ID        QBF5228DP3
 *   ASC_ISSUER_ID     c646a296-d7f1-418a-ac78-4ede7aacd995
 *   ASC_KEY_PATH      ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8
 *   ASC_APP_ID        6768134329
 *   ASC_PRIVACY_URL   https://regatta.icoffio.com/privacy
 *   ASC_BASE_TERRITORY USA
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
const PRIVACY_URL =
  process.env.ASC_PRIVACY_URL || 'https://regatta.icoffio.com/privacy';
const BASE_TERRITORY = process.env.ASC_BASE_TERRITORY || 'USA';
const DRY_RUN = process.argv.includes('--dry-run');

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
  if (!res.ok) {
    throw new Error(`ASC ${method} ${path} -> ${res.status}\n${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function logStep(text) {
  console.log(`\n>>> ${text}`);
}

async function main() {
  logStep('app info + age rating discovery');
  const appInfos = await asc(
    'GET',
    `/v1/apps/${APP_ID}/appInfos?include=primaryCategory,secondaryCategory,ageRatingDeclaration&fields[appInfos]=appStoreState,primaryCategory,secondaryCategory,ageRatingDeclaration`,
  );
  const editable = appInfos.data.find((a) =>
    ['PREPARE_FOR_SUBMISSION', 'WAITING_FOR_REVIEW', 'METADATA_REJECTED'].includes(
      a.attributes.appStoreState,
    ),
  );
  if (!editable) {
    console.error(
      'no editable appInfo (state must be PREPARE_FOR_SUBMISSION / WAITING_FOR_REVIEW / METADATA_REJECTED). nothing to do.',
    );
    process.exit(1);
  }
  const appInfoId = editable.id;
  const ageDeclId = editable.relationships.ageRatingDeclaration?.data?.id;
  const currentPrimary = editable.relationships.primaryCategory?.data?.id;
  const currentSecondary = editable.relationships.secondaryCategory?.data?.id;
  console.log(
    `  appInfo=${appInfoId} state=${editable.attributes.appStoreState} primary=${currentPrimary ?? '(none)'} secondary=${currentSecondary ?? '(none)'}`,
  );

  logStep('1/5 categories');
  if (currentPrimary === 'EDUCATION' && currentSecondary === 'SPORTS') {
    console.log('  already EDUCATION + SPORTS, skip');
  } else if (DRY_RUN) {
    console.log('  [dry-run] would PATCH primary=EDUCATION secondary=SPORTS');
  } else {
    await asc('PATCH', `/v1/appInfos/${appInfoId}`, {
      data: {
        type: 'appInfos',
        id: appInfoId,
        relationships: {
          primaryCategory: {
            data: { type: 'appCategories', id: 'EDUCATION' },
          },
          secondaryCategory: {
            data: { type: 'appCategories', id: 'SPORTS' },
          },
        },
      },
    });
    console.log('  set primary=EDUCATION secondary=SPORTS');
  }

  logStep('2/5 content rights');
  const app = await asc(
    'GET',
    `/v1/apps/${APP_ID}?fields[apps]=contentRightsDeclaration`,
  );
  if (app.data.attributes.contentRightsDeclaration === 'DOES_NOT_USE_THIRD_PARTY_CONTENT') {
    console.log('  already DOES_NOT_USE_THIRD_PARTY_CONTENT, skip');
  } else if (DRY_RUN) {
    console.log('  [dry-run] would PATCH contentRightsDeclaration');
  } else {
    await asc('PATCH', `/v1/apps/${APP_ID}`, {
      data: {
        type: 'apps',
        id: APP_ID,
        attributes: {
          contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT',
        },
      },
    });
    console.log('  set DOES_NOT_USE_THIRD_PARTY_CONTENT');
  }

  logStep('3/5 age rating - all NONE / false (target rating: 4+)');
  if (!ageDeclId) {
    console.log('  no ageRatingDeclaration id on appInfo, skip');
  } else if (DRY_RUN) {
    console.log('  [dry-run] would PATCH ageRatingDeclaration (24 fields)');
  } else {
    const age = {
      // booleans
      advertising: false,
      ageAssurance: false,
      gambling: false,
      healthOrWellnessTopics: false,
      lootBox: false,
      messagingAndChat: false,
      parentalControls: false,
      unrestrictedWebAccess: false,
      userGeneratedContent: false,
      // string enums
      ageRatingOverride: 'NONE',
      alcoholTobaccoOrDrugUseOrReferences: 'NONE',
      contests: 'NONE',
      gamblingSimulated: 'NONE',
      gunsOrOtherWeapons: 'NONE',
      horrorOrFearThemes: 'NONE',
      koreaAgeRatingOverride: 'NONE',
      matureOrSuggestiveThemes: 'NONE',
      medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE',
      sexualContentGraphicAndNudity: 'NONE',
      sexualContentOrNudity: 'NONE',
      violenceCartoonOrFantasy: 'NONE',
      violenceRealistic: 'NONE',
      violenceRealisticProlongedGraphicOrSadistic: 'NONE',
    };
    await asc('PATCH', `/v1/ageRatingDeclarations/${ageDeclId}`, {
      data: { type: 'ageRatingDeclarations', id: ageDeclId, attributes: age },
    });
    console.log('  set 24 age-rating fields');
  }

  logStep('4/5 pricing - Free, baseTerritory ' + BASE_TERRITORY);
  let priceScheduleExists = false;
  try {
    const ps = await asc(
      'GET',
      `/v1/apps/${APP_ID}/appPriceSchedule?fields[appPriceSchedules]=baseTerritory`,
    );
    priceScheduleExists = ps?.data != null;
  } catch (err) {
    if (!String(err).includes('404')) throw err;
  }
  if (priceScheduleExists) {
    console.log('  appPriceSchedule already exists, skip');
  } else if (DRY_RUN) {
    console.log('  [dry-run] would POST Free appPriceSchedule');
  } else {
    const points = await asc(
      'GET',
      `/v1/apps/${APP_ID}/appPricePoints?filter[territory]=${BASE_TERRITORY}&limit=5`,
    );
    const freePoint = points.data.find(
      (p) => p.attributes.customerPrice === '0.0',
    );
    if (!freePoint) throw new Error('no free pricePoint found for territory');
    await asc('POST', '/v1/appPriceSchedules', {
      data: {
        type: 'appPriceSchedules',
        relationships: {
          app: { data: { type: 'apps', id: APP_ID } },
          baseTerritory: {
            data: { type: 'territories', id: BASE_TERRITORY },
          },
          manualPrices: {
            data: [{ type: 'appPrices', id: freePoint.id }],
          },
        },
        included: [
          {
            type: 'appPrices',
            id: freePoint.id,
            attributes: { startDate: null },
            relationships: {
              appPricePoint: {
                data: { type: 'appPricePoints', id: freePoint.id },
              },
            },
          },
        ],
      },
    });
    console.log(`  created Free appPriceSchedule (pricePoint=${freePoint.id})`);
  }

  logStep('5/5 privacy policy URL on each locale');
  const all = await asc(
    'GET',
    `/v1/appInfos/${appInfoId}/appInfoLocalizations?limit=20`,
  );
  const toPatch = all.data.filter(
    (l) => l.attributes.privacyPolicyUrl !== PRIVACY_URL,
  );
  if (toPatch.length === 0) {
    console.log(`  all ${all.data.length} locales already point at ${PRIVACY_URL}`);
  } else {
    console.log(
      `  ${toPatch.length} locale(s) to PATCH: ${toPatch.map((l) => l.attributes.locale).join(', ')}`,
    );
    for (const loc of toPatch) {
      if (DRY_RUN) {
        console.log(
          `  [dry-run] would PATCH ${loc.attributes.locale} privacyPolicyUrl`,
        );
        continue;
      }
      await asc('PATCH', `/v1/appInfoLocalizations/${loc.id}`, {
        data: {
          type: 'appInfoLocalizations',
          id: loc.id,
          attributes: { privacyPolicyUrl: PRIVACY_URL },
        },
      });
      console.log(`  ${loc.attributes.locale} -> ${PRIVACY_URL}`);
    }
  }

  console.log('\n[bootstrap done]');
  if (DRY_RUN) console.log('(dry-run - re-run without --dry-run to apply)');
}

main().catch((err) => {
  console.error('\n[bootstrap failed]', err.message || err);
  process.exit(1);
});
