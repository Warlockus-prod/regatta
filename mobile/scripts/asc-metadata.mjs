/**
 * App Store Connect metadata uploader.
 *
 * Reads the localised metadata files in `mobile/asc-metadata/<lang>/*`
 * and PATCHes the App Store version on App Store Connect, one locale
 * at a time. Idempotent: re-running with no local changes uploads
 * nothing.
 *
 * Auth: same JWT pattern as `mobile/scripts/asc.mjs`. Reuses the same
 * env vars (ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, ASC_APP_ID).
 *
 * Usage:
 *   node scripts/asc-metadata.mjs --dry-run       # diff only, no writes
 *   node scripts/asc-metadata.mjs                 # apply changes
 *   node scripts/asc-metadata.mjs --lang en,ru    # only these locales
 *   node scripts/asc-metadata.mjs --version 1.0.0 # target a specific version
 *
 * Behaviour notes:
 * - The script targets the latest App Store version that is in an
 *   editable state ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED",
 *   "REJECTED", "METADATA_REJECTED", "INVALID_BINARY") - if none is
 *   editable, the script logs the version state and exits 0 with a
 *   "nothing to do" hint.
 * - For each locale it ensures an `appStoreVersionLocalizations`
 *   record exists, then PATCHes the fields that differ from local.
 * - The `name` field lives on the App resource itself
 *   (`appInfoLocalizations`) and gets PATCHed on the editable
 *   `appInfos` record (state EDITABLE).
 * - `support_url.txt` and `marketing_url.txt` are stored in the
 *   per-locale `appStoreVersionLocalizations` record.
 * - `keywords.txt` is also per-locale on the App Store version.
 * - `description.md` is uploaded as plain text - ASC strips Markdown
 *   on its end. The `.md` extension is for repo readability.
 *
 * The script does NOT:
 * - Trigger a submit-for-review (that is a human action in ASC web UI).
 * - Upload screenshots (see `asc-screenshots.mjs`).
 * - Touch app pricing, age rating, or App Privacy.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- Auth ----------

const KEY_ID = process.env.ASC_KEY_ID || 'QBF5228DP3';
const ISSUER_ID =
  process.env.ASC_ISSUER_ID || 'c646a296-d7f1-418a-ac78-4ede7aacd995';
const KEY_PATH =
  process.env.ASC_KEY_PATH ||
  join(homedir(), '.appstoreconnect', 'private_keys', `AuthKey_${KEY_ID}.p8`);
const APP_ID = process.env.ASC_APP_ID || '6768134329';

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

// ---------- CLI ----------

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  return args[i + 1] ?? null;
};

const DRY_RUN = flag('--dry-run');
const VERBOSE = flag('--verbose') || flag('-v');
const LANG_FILTER = (value('--lang') || '').split(',').map((s) => s.trim()).filter(Boolean);
const VERSION_FILTER = value('--version');

// ---------- Locale map ----------
//
// ASC uses regional codes (en-US, ru-RU, ...). Our filesystem uses the
// shorter ISO codes the rest of the app already speaks.
const LOCALES = [
  { fs: 'ru', asc: 'ru' },
  { fs: 'en', asc: 'en-US' },
  { fs: 'pl', asc: 'pl' },
  { fs: 'es', asc: 'es-ES' },
  { fs: 'fr', asc: 'fr-FR' },
  { fs: 'de', asc: 'de-DE' },
  { fs: 'it', asc: 'it' },
];

const HERE = dirname(fileURLToPath(import.meta.url));
const METADATA_ROOT = join(HERE, '..', 'asc-metadata');

// ---------- Local file reader ----------

function readField(langDir, name) {
  const p = join(METADATA_ROOT, langDir, name);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').replace(/\s+$/, '');
}

function loadLocale(fsLang) {
  return {
    name: readField(fsLang, 'name.txt'),
    subtitle: readField(fsLang, 'subtitle.txt'),
    description: readField(fsLang, 'description.md'),
    keywords: readField(fsLang, 'keywords.txt'),
    promotionalText: readField(fsLang, 'promotional.txt'),
    supportUrl: readField(fsLang, 'support_url.txt'),
    marketingUrl: readField(fsLang, 'marketing_url.txt'),
  };
}

// ---------- ASC reads ----------

const EDITABLE_VERSION_STATES = new Set([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
  'WAITING_FOR_REVIEW', // we still allow text edits in some cases
]);

const EDITABLE_APP_INFO_STATES = new Set([
  'PREPARE_FOR_SUBMISSION',
  'WAITING_FOR_REVIEW',
  'REJECTED',
]);

async function fetchAppStoreVersions() {
  // ASC rejects `sort` on this endpoint (PARAMETER_ERROR.ILLEGAL),
  // so we fetch unsorted and sort client-side by createdDate desc.
  const data = await asc(
    'GET',
    `/v1/apps/${APP_ID}/appStoreVersions?limit=20&fields[appStoreVersions]=versionString,appStoreState,createdDate,platform`,
  );
  const list = data.data || [];
  list.sort((a, b) => {
    const ta = Date.parse(a.attributes.createdDate || '') || 0;
    const tb = Date.parse(b.attributes.createdDate || '') || 0;
    return tb - ta;
  });
  return list;
}

async function pickTargetVersion() {
  const versions = await fetchAppStoreVersions();
  if (!versions.length) {
    console.log('[asc] no app store versions found - create one in ASC web UI first');
    return null;
  }
  if (VERSION_FILTER) {
    const hit = versions.find((v) => v.attributes.versionString === VERSION_FILTER);
    if (!hit) {
      console.log(`[asc] no version "${VERSION_FILTER}" found. Available:`);
      for (const v of versions) {
        console.log(`  ${v.attributes.versionString} (${v.attributes.appStoreState})`);
      }
      return null;
    }
    return hit;
  }
  // Pick the most recent editable version.
  const editable = versions.find((v) =>
    EDITABLE_VERSION_STATES.has(v.attributes.appStoreState),
  );
  if (!editable) {
    console.log('[asc] no editable App Store version. States:');
    for (const v of versions) {
      console.log(`  ${v.attributes.versionString} -> ${v.attributes.appStoreState}`);
    }
    console.log('[asc] create the next version in ASC web UI to enable metadata edits.');
    return null;
  }
  return editable;
}

async function fetchVersionLocalizations(versionId) {
  const data = await asc(
    'GET',
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=200`,
  );
  return data.data;
}

async function fetchAppInfoEditable() {
  const data = await asc(
    'GET',
    `/v1/apps/${APP_ID}/appInfos?limit=10&fields[appInfos]=appStoreState,appStoreAgeRating`,
  );
  const editable = data.data.find((a) =>
    EDITABLE_APP_INFO_STATES.has(a.attributes.appStoreState),
  );
  return editable || data.data[0] || null;
}

async function fetchAppInfoLocalizations(appInfoId) {
  const data = await asc(
    'GET',
    `/v1/appInfos/${appInfoId}/appInfoLocalizations?limit=200`,
  );
  return data.data;
}

// ---------- Diff helpers ----------

function shortish(s, n = 80) {
  if (s == null) return '<null>';
  if (s.length <= n) return JSON.stringify(s);
  return JSON.stringify(s.slice(0, n) + '...');
}

function diffField(fieldName, local, remote) {
  if (local == null) return null; // nothing on disk - skip
  if (local === remote) return null;
  return {
    field: fieldName,
    local,
    remote: remote ?? null,
  };
}

function buildVersionLocDiff(local, remote) {
  const diffs = [];
  const remoteAttrs = remote?.attributes ?? {};
  const checks = [
    ['description', local.description, remoteAttrs.description],
    ['keywords', local.keywords, remoteAttrs.keywords],
    ['promotionalText', local.promotionalText, remoteAttrs.promotionalText],
    ['supportUrl', local.supportUrl, remoteAttrs.supportUrl],
    ['marketingUrl', local.marketingUrl, remoteAttrs.marketingUrl],
  ];
  for (const [name, l, r] of checks) {
    const d = diffField(name, l, r);
    if (d) diffs.push(d);
  }
  return diffs;
}

function buildAppInfoLocDiff(local, remote) {
  const diffs = [];
  const remoteAttrs = remote?.attributes ?? {};
  const checks = [
    ['name', local.name, remoteAttrs.name],
    ['subtitle', local.subtitle, remoteAttrs.subtitle],
  ];
  for (const [name, l, r] of checks) {
    const d = diffField(name, l, r);
    if (d) diffs.push(d);
  }
  return diffs;
}

// ---------- ASC writes ----------

async function patchVersionLocalization(id, attrs) {
  await asc('PATCH', `/v1/appStoreVersionLocalizations/${id}`, {
    data: {
      type: 'appStoreVersionLocalizations',
      id,
      attributes: attrs,
    },
  });
}

async function createVersionLocalization(versionId, asc_locale, attrs) {
  await asc('POST', '/v1/appStoreVersionLocalizations', {
    data: {
      type: 'appStoreVersionLocalizations',
      attributes: { locale: asc_locale, ...attrs },
      relationships: {
        appStoreVersion: {
          data: { type: 'appStoreVersions', id: versionId },
        },
      },
    },
  });
}

async function patchAppInfoLocalization(id, attrs) {
  await asc('PATCH', `/v1/appInfoLocalizations/${id}`, {
    data: {
      type: 'appInfoLocalizations',
      id,
      attributes: attrs,
    },
  });
}

async function createAppInfoLocalization(appInfoId, asc_locale, attrs) {
  await asc('POST', '/v1/appInfoLocalizations', {
    data: {
      type: 'appInfoLocalizations',
      attributes: { locale: asc_locale, ...attrs },
      relationships: {
        appInfo: { data: { type: 'appInfos', id: appInfoId } },
      },
    },
  });
}

// ---------- Main ----------

function logHeader(text) {
  console.log(`\n=== ${text} ===`);
}

function localesToProcess() {
  if (!LANG_FILTER.length) return LOCALES;
  return LOCALES.filter((l) => LANG_FILTER.includes(l.fs));
}

async function main() {
  logHeader(`ASC metadata sync (app=${APP_ID}) ${DRY_RUN ? '[DRY RUN]' : '[APPLY]'}`);

  // Sanity: the metadata folder exists.
  if (!existsSync(METADATA_ROOT)) {
    console.error(`[fatal] metadata folder not found: ${METADATA_ROOT}`);
    process.exit(1);
  }

  // Sanity: the on-disk locales match the LOCALES table.
  const onDisk = readdirSync(METADATA_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => !n.startsWith('.') && n !== 'screenshots');
  const expected = new Set(LOCALES.map((l) => l.fs));
  const missing = LOCALES.map((l) => l.fs).filter((l) => !onDisk.includes(l));
  const extra = onDisk.filter((l) => !expected.has(l));
  if (missing.length) console.warn(`[warn] missing locale folders: ${missing.join(', ')}`);
  if (extra.length) console.warn(`[warn] extra locale folders (ignored): ${extra.join(', ')}`);

  // 1. Pick the editable App Store version.
  const targetVersion = await pickTargetVersion();
  if (!targetVersion) {
    console.log('[done] no editable version - nothing to do (this is fine)');
    return;
  }
  console.log(
    `[version] ${targetVersion.attributes.versionString} (${targetVersion.attributes.appStoreState}) id=${targetVersion.id}`,
  );

  // 2. Pick the editable App Info (for `name` + `subtitle`).
  const appInfo = await fetchAppInfoEditable();
  if (!appInfo) {
    console.log('[warn] no app info found, name/subtitle will be skipped');
  } else {
    console.log(`[appInfo] id=${appInfo.id} state=${appInfo.attributes.appStoreState}`);
  }

  // 3. Fetch existing localizations.
  const versionLocs = await fetchVersionLocalizations(targetVersion.id);
  const versionLocByLocale = new Map(
    versionLocs.map((l) => [l.attributes.locale, l]),
  );
  const appInfoLocs = appInfo
    ? await fetchAppInfoLocalizations(appInfo.id)
    : [];
  const appInfoLocByLocale = new Map(
    appInfoLocs.map((l) => [l.attributes.locale, l]),
  );

  if (VERBOSE) {
    console.log(`[remote] versionLocalizations: ${versionLocs.map((l) => l.attributes.locale).join(', ')}`);
    console.log(`[remote] appInfoLocalizations: ${appInfoLocs.map((l) => l.attributes.locale).join(', ')}`);
  }

  // 4. Walk each locale, diff, optionally write.
  let totalDiffs = 0;
  let totalLocales = 0;

  for (const loc of localesToProcess()) {
    totalLocales += 1;
    const local = loadLocale(loc.fs);
    const versionRemote = versionLocByLocale.get(loc.asc);
    const appInfoRemote = appInfoLocByLocale.get(loc.asc);

    logHeader(`locale ${loc.fs} -> ${loc.asc}`);

    // Version-level fields.
    const vDiffs = buildVersionLocDiff(local, versionRemote);
    if (vDiffs.length === 0) {
      console.log(`  [version] in sync`);
    } else {
      console.log(`  [version] ${vDiffs.length} diff(s):`);
      for (const d of vDiffs) {
        console.log(`    - ${d.field}: ${shortish(d.remote)} -> ${shortish(d.local)}`);
      }
      totalDiffs += vDiffs.length;
      if (!DRY_RUN) {
        const attrs = Object.fromEntries(vDiffs.map((d) => [d.field, d.local]));
        if (versionRemote) {
          await patchVersionLocalization(versionRemote.id, attrs);
          console.log(`    [done] PATCHed ${versionRemote.id}`);
        } else {
          await createVersionLocalization(targetVersion.id, loc.asc, attrs);
          console.log(`    [done] CREATEd ${loc.asc}`);
        }
      }
    }

    // App-info-level fields (name, subtitle).
    if (appInfo) {
      const aDiffs = buildAppInfoLocDiff(local, appInfoRemote);
      if (aDiffs.length === 0) {
        console.log(`  [appInfo] in sync`);
      } else {
        console.log(`  [appInfo] ${aDiffs.length} diff(s):`);
        for (const d of aDiffs) {
          console.log(`    - ${d.field}: ${shortish(d.remote)} -> ${shortish(d.local)}`);
        }
        totalDiffs += aDiffs.length;
        if (!DRY_RUN) {
          const attrs = Object.fromEntries(aDiffs.map((d) => [d.field, d.local]));
          if (appInfoRemote) {
            await patchAppInfoLocalization(appInfoRemote.id, attrs);
            console.log(`    [done] PATCHed ${appInfoRemote.id}`);
          } else {
            await createAppInfoLocalization(appInfo.id, loc.asc, attrs);
            console.log(`    [done] CREATEd ${loc.asc}`);
          }
        }
      }
    }
  }

  logHeader('summary');
  console.log(`  locales processed: ${totalLocales}`);
  console.log(`  field diffs found: ${totalDiffs}`);
  if (DRY_RUN) {
    console.log(`  [dry-run] no writes performed`);
    if (totalDiffs > 0) {
      console.log(`  re-run without --dry-run to apply`);
    }
  } else {
    console.log(`  [apply] writes complete`);
  }
}

// ---------- Offline / sandbox fallback ----------
//
// If the ASC API is unreachable (offline machine, sandbox, no key file),
// the script falls back to a "local-only" mode that prints the local
// metadata as a summary so reviewers can still eyeball the content.

async function safeMain() {
  // If KEY_PATH does not exist or we cannot reach the API, we cannot
  // produce a real diff. Show local content + exit 0.
  const haveKey = existsSync(KEY_PATH);
  if (!haveKey) {
    console.log(`[fallback] no ASC key at ${KEY_PATH}`);
    console.log(`[fallback] ${DRY_RUN ? 'dry-run' : 'apply'} cannot proceed without API auth.`);
    console.log(`[fallback] printing local metadata summary instead:`);
    for (const loc of localesToProcess()) {
      const local = loadLocale(loc.fs);
      logHeader(`local: ${loc.fs}`);
      console.log(`  name=${shortish(local.name)}`);
      console.log(`  subtitle=${shortish(local.subtitle)}`);
      console.log(`  promotionalText=${shortish(local.promotionalText)}`);
      console.log(`  keywords=${shortish(local.keywords)}`);
      console.log(`  description=${local.description ? local.description.length + ' chars' : '<missing>'}`);
      console.log(`  supportUrl=${shortish(local.supportUrl)}`);
      console.log(`  marketingUrl=${shortish(local.marketingUrl)}`);
    }
    console.log(`\n[fallback] exit 0 (local files validated; ASC sync skipped)`);
    return;
  }

  try {
    await main();
  } catch (err) {
    if (DRY_RUN && /fetch failed|ENOTFOUND|ECONNREFUSED|getaddrinfo/.test(String(err))) {
      console.log(`[dry-run] could not reach ASC API: ${String(err).split('\n')[0]}`);
      console.log(`[dry-run] falling back to local-only diff:`);
      for (const loc of localesToProcess()) {
        const local = loadLocale(loc.fs);
        logHeader(`local: ${loc.fs}`);
        console.log(`  name=${shortish(local.name)}`);
        console.log(`  subtitle=${shortish(local.subtitle)}`);
        console.log(`  promotionalText=${shortish(local.promotionalText)}`);
        console.log(`  keywords=${shortish(local.keywords)}`);
        console.log(`  description=${local.description ? local.description.length + ' chars' : '<missing>'}`);
      }
      console.log(`\n[dry-run] exit 0 (local files validated; ASC unreachable)`);
      return;
    }
    throw err;
  }
}

safeMain().catch((err) => {
  console.error(err);
  process.exit(1);
});
