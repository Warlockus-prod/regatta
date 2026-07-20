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
  'en-US': "What's new in 1.5: two Polish licence courses - Sternik motorowodny and SRC Radio - with a full ICOM VHF radio simulator, voice-graded MAYDAY and PAN-PAN calls, the official UKE question banks and a timed mock exam. The simulators now open exactly what the website shows: Basics, Trainer and the 3D boat, with a one-tap switcher at the top of each. New Simulators card on the home screen, app version in Settings, and many fixes.",
  ru: 'Что нового в 1.5: два курса на польские патенты - Sternik motorowodny и Radio SRC - с полноценным симулятором рации ICOM, голосовой оценкой вызовов MAYDAY и PAN-PAN, официальными банками вопросов UKE и пробным экзаменом на время. Симуляторы теперь открывают ровно то же, что показывает сайт: Основы, Тренажёр и Лодка 3D, с переключателем в одно касание сверху. Новая карточка «Симуляторы» на главном экране, версия приложения в настройках и множество исправлений.',
  pl: 'Co nowego w 1.5: dwa kursy na polskie patenty - Sternik motorowodny i Radio SRC - z pelnym symulatorem radia ICOM, ocena glosowa wywolan MAYDAY i PAN-PAN, oficjalnymi bankami pytan UKE i probnym egzaminem na czas. Symulatory otwieraja teraz dokladnie to, co pokazuje strona: Podstawy, Trener i Lodka 3D, z przelacznikiem jednym dotknieciem na gorze. Nowa karta Symulatory na ekranie glownym, wersja aplikacji w ustawieniach i wiele poprawek.',
  'es-ES': 'Novedades de la 1.5: dos cursos para las licencias polacas - Sternik motorowodny y Radio SRC - con un simulador completo de radio VHF ICOM, evaluacion por voz de las llamadas MAYDAY y PAN-PAN, los bancos oficiales de preguntas de UKE y un examen de prueba cronometrado. Los simuladores abren ahora exactamente lo que muestra la web: Basicos, Entrenador y el barco 3D, con un selector de un toque en la parte superior. Nueva tarjeta Simuladores en la pantalla de inicio, version de la app en Ajustes y muchas correcciones.',
  'fr-FR': "Nouveautes de la 1.5 : deux cours pour les licences polonaises - Sternik motorowodny et Radio SRC - avec un simulateur complet de radio VHF ICOM, une evaluation vocale des appels MAYDAY et PAN-PAN, les banques de questions officielles de l'UKE et un examen blanc chronometre. Les simulateurs ouvrent desormais exactement ce que montre le site : Bases, Entraineur et le bateau 3D, avec un selecteur en un geste en haut. Nouvelle carte Simulateurs sur l'ecran d'accueil, version de l'app dans les Reglages et de nombreux correctifs.",
  'de-DE': 'Neu in 1.5: zwei Kurse fuer die polnischen Lizenzen - Sternik motorowodny und Radio SRC - mit einem vollstaendigen ICOM-UKW-Funksimulator, Sprachbewertung von MAYDAY- und PAN-PAN-Rufen, den offiziellen UKE-Fragenkatalogen und einer Pruefungssimulation mit Zeit. Die Simulatoren oeffnen jetzt genau das, was die Website zeigt: Grundlagen, Trainer und das 3D-Boot, mit einem Umschalter oben zum Antippen. Neue Karte Simulatoren auf dem Startbildschirm, App-Version in den Einstellungen und viele Fixes.',
  it: "Novita della 1.5: due corsi per le licenze polacche - Sternik motorowodny e Radio SRC - con un simulatore completo di radio VHF ICOM, valutazione vocale delle chiamate MAYDAY e PAN-PAN, le banche dati ufficiali UKE e un esame di prova a tempo. I simulatori ora aprono esattamente quello che mostra il sito: Base, Trainer e la barca 3D, con un selettore in alto con un tocco. Nuova scheda Simulatori nella schermata iniziale, versione dell'app nelle Impostazioni e molte correzioni.",
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
