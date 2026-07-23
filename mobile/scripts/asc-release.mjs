/**
 * App Store Connect release driver.
 *
 * Does the parts asc-metadata.mjs does NOT:
 *   1. Create the next App Store version (versionString from --version, default 1.6.0)
 *      if it does not already exist. Idempotent: reuses an existing editable one.
 *   2. Set "What's New" (whatsNew) for all 7 locales.
 *   3. Attach a processed build (--build, default 33) to the version - but ONLY
 *      once Apple reports the build processingState=VALID. If it is still
 *      PROCESSING, the script says so and exits 0 (re-run later to attach).
 *
 * It deliberately does NOT submit for review - that stays a human action.
 * Name/subtitle/description sync stays in asc-metadata.mjs (run that after).
 *
 * Auth: same JWT(ES256) + .p8 pattern as the other asc scripts.
 *
 * Usage:
 *   node scripts/asc-release.mjs --dry-run     # show plan, no writes
 *   node scripts/asc-release.mjs               # create version + whatsNew + attach if ready
 *   node scripts/asc-release.mjs --version 1.6.0 --build 33
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
const flag = (n) => args.includes(n);
const val = (n) => {
  const i = args.indexOf(n);
  return i === -1 ? null : args[i + 1] ?? null;
};
const DRY_RUN = flag('--dry-run');
const VERSION = val('--version') || '1.6.0';
const BUILD = val('--build') || '33';

// What's New, per ASC locale. ASCII-clean per the project typography rule
// (no em/en-dash); es/fr/de/it keep their meaningful diacritics.
const WHATS_NEW = {
  'en-US': "What's new in 1.6: the complete SRC Radio course now works offline from the first launch. Study 18 theory chapters and diagrams, answer all 324 UKE questions, complete 26 practical tasks, and operate both ICOM radio models across 19 scenarios without a connection. Speech recognition and automatic voice grading still require internet.",
  ru: 'Что нового в 1.6: полный курс SRC Radio теперь работает офлайн с первого запуска. Без интернета доступны 18 глав теории со схемами, все 324 вопроса UKE, 26 практических заданий, обе модели рации ICOM и 19 сценариев. Распознавание и автоматическая оценка речи требуют подключения.',
  pl: 'Co nowego w 1.6: pelny kurs SRC Radio dziala teraz offline od pierwszego uruchomienia. Bez internetu masz 18 rozdzialow teorii ze schematami, wszystkie 324 pytania UKE, 26 zadan praktycznych, oba modele radia ICOM i 19 scenariuszy. Rozpoznawanie i automatyczna ocena mowy wymagaja polaczenia.',
  'es-ES': 'Novedades de la 1.6: el curso completo de Radio SRC funciona sin conexion desde el primer inicio. Incluye 18 capitulos de teoria, 324 preguntas UKE, 26 tareas practicas, dos modelos ICOM y 19 escenarios. El reconocimiento y la evaluacion de voz requieren internet.',
  'fr-FR': "Nouveautes de la 1.6 : le cours SRC Radio complet fonctionne hors ligne des le premier lancement. Il comprend 18 chapitres, 324 questions UKE, 26 exercices pratiques, deux modeles ICOM et 19 scenarios. La reconnaissance et l'evaluation vocale necessitent internet.",
  'de-DE': 'Neu in 1.6: Der komplette SRC-Funkkurs funktioniert ab dem ersten Start offline. Enthalten sind 18 Theoriekapitel, 324 UKE-Fragen, 26 Praxisaufgaben, zwei ICOM-Modelle und 19 Szenarien. Spracherkennung und automatische Sprachbewertung benoetigen Internet.',
  it: "Novita della 1.6: il corso SRC Radio completo funziona offline dal primo avvio. Include 18 capitoli di teoria, 324 domande UKE, 26 esercizi pratici, due modelli ICOM e 19 scenari. Il riconoscimento e la valutazione vocale richiedono internet.",
};

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

async function getVersions() {
  const d = await asc(
    'GET',
    `/v1/apps/${APP_ID}/appStoreVersions?limit=20&fields[appStoreVersions]=versionString,appStoreState,platform,createdDate`,
  );
  return d.data || [];
}

async function ensureVersion() {
  const versions = await getVersions();
  const existing = versions.find((v) => v.attributes.versionString === VERSION);
  if (existing) {
    console.log(`[version] ${VERSION} exists (${existing.attributes.appStoreState}) id=${existing.id}`);
    return existing;
  }
  console.log(`[version] ${VERSION} not found - creating (platform IOS)`);
  if (DRY_RUN) {
    console.log('  [dry-run] would POST /v1/appStoreVersions');
    return null;
  }
  const created = await asc('POST', '/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString: VERSION },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  });
  console.log(`  [done] created version ${VERSION} id=${created.data.id}`);
  return created.data;
}

async function getVersionLocs(versionId) {
  const d = await asc('GET', `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=200`);
  return d.data || [];
}

async function setWhatsNew(version) {
  const locs = await getVersionLocs(version.id);
  const byLocale = new Map(locs.map((l) => [l.attributes.locale, l]));
  console.log(`[whatsNew] existing locales on version: ${[...byLocale.keys()].join(', ') || '(none)'}`);
  for (const [locale, text] of Object.entries(WHATS_NEW)) {
    const remote = byLocale.get(locale);
    const cur = remote?.attributes?.whatsNew ?? null;
    if (cur === text) {
      console.log(`  ${locale}: in sync`);
      continue;
    }
    console.log(`  ${locale}: ${cur ? 'update' : remote ? 'set' : 'create'} -> ${JSON.stringify(text.slice(0, 60))}`);
    if (DRY_RUN) continue;
    if (remote) {
      await asc('PATCH', `/v1/appStoreVersionLocalizations/${remote.id}`, {
        data: { type: 'appStoreVersionLocalizations', id: remote.id, attributes: { whatsNew: text } },
      });
    } else {
      // Locale missing on this version - create it with just whatsNew + locale.
      await asc('POST', '/v1/appStoreVersionLocalizations', {
        data: {
          type: 'appStoreVersionLocalizations',
          attributes: { locale, whatsNew: text },
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
        },
      });
    }
  }
}

async function getBuild() {
  const d = await asc(
    'GET',
    `/v1/builds?filter[app]=${APP_ID}&filter[version]=${BUILD}&limit=5&fields[builds]=version,processingState,uploadedDate,expired`,
  );
  // Newest first.
  const list = (d.data || []).filter((b) => !b.attributes.expired);
  list.sort((a, b) => Date.parse(b.attributes.uploadedDate || '') - Date.parse(a.attributes.uploadedDate || ''));
  return list[0] || null;
}

async function attachBuild(version) {
  const build = await getBuild();
  if (!build) {
    console.log(`[build] build ${BUILD} not visible yet (Apple still ingesting). Re-run later to attach.`);
    return false;
  }
  const state = build.attributes.processingState;
  console.log(`[build] build ${BUILD} id=${build.id} processingState=${state}`);
  if (state !== 'VALID') {
    console.log(`[build] not VALID yet - cannot attach. Re-run when processingState=VALID.`);
    return false;
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] would PATCH version build relationship -> ${build.id}`);
    return true;
  }
  await asc('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, {
    data: { type: 'builds', id: build.id },
  });
  console.log(`  [done] attached build ${BUILD} to version ${VERSION}`);
  return true;
}

async function main() {
  if (!existsSync(KEY_PATH)) {
    console.error(`[fatal] no ASC key at ${KEY_PATH}`);
    process.exit(1);
  }
  console.log(`=== ASC release driver (app=${APP_ID}, version=${VERSION}, build=${BUILD}) ${DRY_RUN ? '[DRY RUN]' : '[APPLY]'} ===`);
  const version = await ensureVersion();
  if (!version) {
    console.log('[done] dry-run: version would be created; re-run without --dry-run.');
    return;
  }
  await setWhatsNew(version);
  const attached = await attachBuild(version);
  console.log('\n=== summary ===');
  console.log(`  version ${VERSION}: ready`);
  console.log(`  whatsNew: ${DRY_RUN ? 'planned' : 'applied'} (7 locales)`);
  console.log(`  build ${BUILD} attached: ${attached ? 'YES' : 'NOT YET (re-run to attach)'}`);
  console.log('  submit-for-review: NOT done (human action - intentional)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
