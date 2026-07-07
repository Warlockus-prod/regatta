/**
 * App Store Connect v1.1 release driver.
 *
 * Does the parts asc-metadata.mjs does NOT:
 *   1. Create the next App Store version (versionString from --version, default 1.1)
 *      if it does not already exist. Idempotent: reuses an existing editable one.
 *   2. Set "What's New" (whatsNew) for all 7 locales.
 *   3. Attach a processed build (--build, default 14) to the version - but ONLY
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
 *   node scripts/asc-release.mjs --version 1.1 --build 14
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
const VERSION = val('--version') || '1.1';
const BUILD = val('--build') || '14';

// What's New, per ASC locale. ASCII-clean per the project typography rule
// (no em/en-dash); es/fr/de/it keep their meaningful diacritics.
const WHATS_NEW = {
  'en-US': "What's new in 1.4: two simulators - Basics (wind, turns and the angle to the wind, step 1) and the full Trainer with real physics, drills and live weather wind (step 2). The 3D boat: orbit 360, living sails and sea, hold-to-steer buttons and a quick guide. Yacht anatomy is now the full 3D viewer with 17 clickable parts and 5 camera views. One physics engine everywhere, drill scoring with pass and fail, plus many fixes.",
  ru: 'Что нового в 1.4: два симулятора - Основы (ветер, повороты и угол к ветру, шаг 1) и полный Тренажёр с настоящей физикой, упражнениями и живым ветром (шаг 2). Лодка 3D: орбита 360, живые паруса и море, кнопки штурвала с удержанием и быстрый гид. Устройство яхты - теперь полноценный 3D-вьюер: 17 кликабельных деталей и 5 ракурсов. Один физический движок везде, счёт и результат в упражнениях, плюс множество исправлений.',
  pl: 'Co nowego w 1.4: dwa symulatory - Podstawy (wiatr, zwroty i kat do wiatru, krok 1) oraz pelny Trener z prawdziwa fizyka, cwiczeniami i zywym wiatrem (krok 2). Lodka 3D: orbita 360, zywe zagle i morze, przyciski steru z przytrzymaniem i szybki przewodnik. Budowa jachtu to teraz pelny widok 3D: 17 klikalnych elementow i 5 ujec kamery. Jeden silnik fizyki wszedzie, wynik i ocena w cwiczeniach, plus wiele poprawek.',
  'es-ES': 'Novedades de la 1.4: dos simuladores - Basico (viento, giros y angulo al viento, paso 1) y el Entrenador completo con fisica real, ejercicios y viento en vivo (paso 2). El barco 3D: orbita 360, velas y mar vivos, botones de timon de mantener pulsado y una guia rapida. La anatomia del velero es ahora un visor 3D completo: 17 partes clicables y 5 vistas. Un solo motor de fisica en todas partes, puntuacion en los ejercicios y muchas mejoras.',
  'fr-FR': "Nouveautes de la 1.4 : deux simulateurs - Bases (vent, virements et angle au vent, etape 1) et l'Entraineur complet avec physique reelle, exercices et vent en direct (etape 2). Le bateau 3D : orbite 360, voiles et mer vivantes, boutons de barre a maintenir et un guide rapide. L'anatomie du voilier est desormais une visionneuse 3D complete : 17 pieces cliquables et 5 vues. Un seul moteur physique partout, score des exercices et de nombreux correctifs.",
  'de-DE': 'Neu in 1.4: zwei Simulatoren - Grundlagen (Wind, Wenden und der Winkel zum Wind, Schritt 1) und der volle Trainer mit echter Physik, Uebungen und Live-Wind (Schritt 2). Das 3D-Boot: Orbit 360, lebendige Segel und See, Ruder-Buttons zum Gedrueckthalten und eine schnelle Anleitung. Der Aufbau der Yacht ist jetzt ein voller 3D-Viewer: 17 klickbare Teile und 5 Ansichten. Ein Physik-Motor ueberall, Punktewertung in den Uebungen und viele Fixes.',
  it: "Novita della 1.4: due simulatori - Base (vento, virate e angolo al vento, passo 1) e il Trainer completo con fisica reale, esercizi e vento dal vivo (passo 2). La barca 3D: orbita 360, vele e mare vivi, pulsanti del timone da tenere premuti e una guida rapida. L'anatomia della barca e ora un visore 3D completo: 17 parti cliccabili e 5 viste. Un solo motore fisico ovunque, punteggio negli esercizi e tante correzioni.",
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
