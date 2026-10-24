/**
 * Replace only explicitly selected, existing App Store screenshot sets.
 * Dry-run is the default. No review submission or version creation operations.
 * Tests: node --test scripts/asc-upload-screenshots.test.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { createHash, createPrivateKey, createSign } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const API = "https://api.appstoreconnect.apple.com";
const EXPECTED_APP = "6768134329";
const EXPECTED_BUNDLE = "com.icoffio.regatta";
const FAMILIES = {
  APP_IPHONE_67: [[1260, 2736], [1290, 2796], [1320, 2868]],
  APP_IPHONE_61: [[1179, 2556], [1206, 2622]],
  APP_IPAD_PRO_3GEN_129: [[2048, 2732], [2064, 2752]],
};
const usage = "node scripts/asc-upload-screenshots.mjs --version <version> --manifest <json> [--dry-run | --apply --replace] [--report <json>]";

export function parseArgs(args) {
  const options = { apply: false, replace: false, dryRun: false };
  const values = new Map([["--version", "version"], ["--manifest", "manifest"], ["--report", "report"]]);
  const seen = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help") return { help: true };
    if (seen.has(arg)) throw new Error(`Duplicate argument ${arg}`);
    seen.add(arg);
    if (values.has(arg)) {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      options[values.get(arg)] = value;
    } else if (arg === "--apply") options.apply = true;
    else if (arg === "--replace") options.replace = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else throw new Error(`Unknown argument ${arg}`);
  }
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(options.version ?? "")) throw new Error("Explicit --version is required");
  if (!options.manifest) throw new Error("Explicit --manifest is required");
  if (options.apply && options.dryRun) throw new Error("--apply and --dry-run are mutually exclusive");
  if (options.apply && !options.replace) throw new Error("Applying requires both --apply and --replace");
  return options;
}

export function readPng(bytes, family) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("Screenshot must be a PNG file");
  }
  if (bytes.length > 20 * 1024 * 1024) throw new Error("Screenshot exceeds 20 MiB");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (bytes[24] !== 8 || ![0, 2, 4, 6].includes(bytes[25])) throw new Error("Screenshot must be an opaque 8-bit PNG");
  const sizes = FAMILIES[family];
  if (!sizes || !sizes.some(([w, h]) => (width === w && height === h) || (width === h && height === w))) {
    throw new Error(`Unsupported dimensions ${width}x${height} for ${family}`);
  }
  // Native simctl captures use RGBA even when every pixel is opaque. Verify the
  // decoded alpha rather than rejecting a harmless alpha channel or changing bytes.
  const compressed = [];
  let ended = false;
  for (let offset = 8; offset < bytes.length;) {
    if (offset + 12 > bytes.length) throw new Error("Truncated PNG chunk");
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("Truncated PNG data");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "tRNS") throw new Error("Screenshot must be opaque");
    if (type === "IDAT") compressed.push(bytes.subarray(offset + 8, end - 4));
    if (type === "IEND") { ended = true; break; }
    offset = end;
  }
  if (!ended || !compressed.length || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] !== 0) throw new Error("Unsupported PNG encoding");
  const colorType = bytes[25];
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const stride = width * channels + 1;
  let decoded;
  try { decoded = inflateSync(Buffer.concat(compressed), { maxOutputLength: stride * height }); }
  catch { throw new Error("Invalid PNG compressed data"); }
  if (decoded.length !== stride * height) throw new Error("Invalid PNG decoded size");
  let previous = new Uint8Array(width);
  let current = new Uint8Array(width);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    const filter = decoded[row];
    if (filter > 4) throw new Error("Invalid PNG filter");
    if (colorType !== 4 && colorType !== 6) continue;
    for (let x = 0; x < width; x += 1) {
      const left = x ? current[x - 1] : 0;
      const up = previous[x];
      const upperLeft = x ? previous[x - 1] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upperLeft;
        const dl = Math.abs(p - left), du = Math.abs(p - up), dc = Math.abs(p - upperLeft);
        predictor = dl <= du && dl <= dc ? left : du <= dc ? up : upperLeft;
      }
      current[x] = (decoded[row + 1 + x * channels + channels - 1] + predictor) & 255;
      if (current[x] !== 255) throw new Error("Screenshot has transparent pixels");
    }
    [previous, current] = [current, previous];
  }
  return { width, height };
}

export function prepareManifest(manifest, version, baseDir, read = readFileSync) {
  if (!manifest || manifest.appId !== EXPECTED_APP || manifest.bundleId !== EXPECTED_BUNDLE) {
    throw new Error("Manifest must explicitly identify the Regatta app and bundle");
  }
  if (manifest.version !== version) throw new Error("Manifest version does not match --version");
  if (!Array.isArray(manifest.sets) || manifest.sets.length < 1 || manifest.sets.length > 16) throw new Error("Manifest needs 1..16 explicit sets");
  const selected = new Set();
  const sets = manifest.sets.map((set) => {
    if (!set || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(set.locale ?? "") || !FAMILIES[set.family]) throw new Error("Each set needs an explicit locale and supported family");
    const selection = `${set.locale}/${set.family}`;
    if (selected.has(selection)) throw new Error(`Duplicate selection ${selection}`);
    selected.add(selection);
    if (!Array.isArray(set.files) || set.files.length < 1 || set.files.length > 10) throw new Error(`${selection} needs 1..10 ordered files`);
    const checksums = new Set();
    const files = set.files.map((path) => {
      if (typeof path !== "string" || !path || /^[a-z]+:\/\//i.test(path)) throw new Error("Screenshots must be local file paths");
      const name = basename(path);
      if (!/^[a-zA-Z0-9._-]+\.png$/.test(name)) throw new Error("Use ASCII screenshot filenames ending in .png");
      const bytes = read(resolve(baseDir, path));
      const dimensions = readPng(bytes, set.family);
      const checksum = createHash("md5").update(bytes).digest("hex");
      if (checksums.has(checksum)) throw new Error(`Duplicate screenshot bytes in ${selection}`);
      checksums.add(checksum);
      // Stable content-addressed names also identify uncommitted reservations on retry.
      const fileName = `${name.slice(0, -4).slice(0, 120)}--${checksum}.png`;
      return { path: resolve(baseDir, path), fileName, checksum, bytes, ...dimensions };
    });
    return { locale: set.locale, family: set.family, files };
  });
  return { appId: manifest.appId, bundleId: manifest.bundleId, version, sets };
}

async function list(api, path) {
  const all = [];
  for (let page = 0; path && page < 20; page += 1) {
    const result = await api("GET", path);
    if (!Array.isArray(result?.data)) throw new Error("Invalid ASC list response");
    all.push(...result.data);
    path = result.links?.next ?? null;
  }
  if (path) throw new Error("ASC pagination limit exceeded");
  return all;
}

const stateOf = (shot) => shot.attributes?.assetDeliveryState?.state;
const summaryOf = (shot) => ({ id: shot.id, fileName: shot.attributes?.fileName, checksum: shot.attributes?.sourceFileChecksum, state: stateOf(shot) });
const shotsPath = (id) => `/v1/appScreenshotSets/${encodeURIComponent(id)}/appScreenshots?limit=200`;
const shotPath = (id) => `/v1/appScreenshots/${encodeURIComponent(id)}`;

export async function findVersion(api, manifest) {
  const app = (await api("GET", `/v1/apps/${manifest.appId}`))?.data;
  if (app?.id !== manifest.appId || app.attributes?.bundleId !== manifest.bundleId) throw new Error("ASC app/bundle verification failed");
  const versions = await list(api, `/v1/apps/${manifest.appId}/appStoreVersions?limit=200`);
  const matches = versions.filter((item) => item.attributes?.versionString === manifest.version && item.attributes?.platform === "IOS");
  if (matches.length !== 1) throw new Error("Exactly one existing iOS version must match --version");
  if (matches[0].attributes.appStoreState !== "PREPARE_FOR_SUBMISSION") throw new Error("Version must be PREPARE_FOR_SUBMISSION");
  return matches[0];
}

export async function planReplacement(api, manifest) {
  const version = await findVersion(api, manifest);
  const locales = await list(api, `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=200`);
  const plans = [];
  for (const selection of manifest.sets) {
    const locale = locales.find((item) => item.attributes?.locale === selection.locale);
    if (!locale) throw new Error(`Locale ${selection.locale} does not exist on this version`);
    const sets = await list(api, `/v1/appStoreVersionLocalizations/${locale.id}/appScreenshotSets?limit=200`);
    const matches = sets.filter((item) => item.attributes?.screenshotDisplayType === selection.family);
    if (matches.length !== 1) throw new Error(`Exactly one existing set required: ${selection.locale}/${selection.family}`);
    const set = matches[0];
    const old = await list(api, shotsPath(set.id));
    const used = new Set();
    const desired = selection.files.map((file) => {
      const reusable = old.filter((shot) => shot.attributes?.fileSize === file.bytes.length && (
        shot.attributes?.sourceFileChecksum?.toLowerCase() === file.checksum ||
        (shot.attributes?.fileName === file.fileName && !shot.attributes?.sourceFileChecksum)
      ));
      if (reusable.length > 1) throw new Error("Ambiguous duplicate remote screenshot; inspect selected set");
      const existing = reusable[0];
      if (existing && !["AWAITING_UPLOAD", "UPLOAD_COMPLETE", "COMPLETE"].includes(stateOf(existing))) throw new Error("Existing matching reservation failed or has unknown state; inspect it before retry");
      if (existing && used.has(existing.id)) throw new Error("Remote screenshot matched more than once");
      if (existing) used.add(existing.id);
      return { file, existing, id: existing?.id ?? null };
    });
    const missing = desired.filter((entry) => !entry.id).length;
    if (old.length + missing > 10) throw new Error(`No safe upload capacity in ${selection.locale}/${selection.family}: keep old assets, need ${old.length + missing} slots`);
    plans.push({ ...selection, setId: set.id, old, desired });
  }
  return { versionId: version.id, plans };
}

export function reportFor(manifest, transaction, stage) {
  return {
    appId: manifest.appId, bundleId: manifest.bundleId, version: manifest.version, stage,
    checkedAt: new Date().toISOString(),
    sets: transaction.plans.map((plan) => ({
      locale: plan.locale, family: plan.family, setId: plan.setId,
      old: plan.old.map(summaryOf),
      desired: plan.desired.map((entry) => ({ id: entry.id, fileName: entry.file.fileName, checksum: entry.file.checksum, width: entry.file.width, height: entry.file.height })),
    })),
  };
}

async function upload(api, transfer, plan, entry) {
  let reservation = entry.existing;
  if (!reservation) {
    reservation = (await api("POST", "/v1/appScreenshots", { data: {
      type: "appScreenshots", attributes: { fileName: entry.file.fileName, fileSize: entry.file.bytes.length },
      relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: plan.setId } } },
    } }))?.data;
    if (!reservation?.id || stateOf(reservation) !== "AWAITING_UPLOAD") throw new Error("Unexpected screenshot reservation response");
    entry.id = reservation.id;
  }
  if (stateOf(reservation) !== "AWAITING_UPLOAD") return;
  const operations = reservation.attributes?.uploadOperations;
  if (!Array.isArray(operations) || !operations.length) throw new Error("Upload operations missing; old screenshots retained");
  const ranges = operations.map((operation) => ({ offset: operation.offset, length: operation.length })).sort((a, b) => a.offset - b.offset);
  let end = 0;
  for (const range of ranges) {
    if (!Number.isSafeInteger(range.offset) || !Number.isSafeInteger(range.length) || range.offset !== end || range.length <= 0) throw new Error("Invalid screenshot upload ranges");
    end += range.length;
  }
  if (end !== entry.file.bytes.length) throw new Error("Upload ranges do not cover screenshot exactly");
  for (const operation of operations) await transfer(operation, entry.file.bytes.subarray(operation.offset, operation.offset + operation.length));
  await api("PATCH", shotPath(entry.id), { data: { type: "appScreenshots", id: entry.id, attributes: { uploaded: true, sourceFileChecksum: entry.file.checksum } } });
}

export async function replaceScreenshots({ api, transfer, manifest, apply = false, replace = false, log = () => {}, saveReport = () => {}, wait = (ms) => new Promise((done) => setTimeout(done, ms)), maxPolls = 120, pollMs = 5000 }) {
  if (apply && !replace) throw new Error("Applying requires explicit replacement consent");
  const transaction = await planReplacement(api, manifest);
  saveReport(reportFor(manifest, transaction, apply ? "planned" : "dry-run"));
  for (const plan of transaction.plans) log(`${plan.locale}/${plan.family}: ${plan.old.length} current, ${plan.desired.length} desired, ${plan.desired.filter((entry) => entry.id).length} reusable`);
  if (!apply) return transaction;
  // Upload across every selected set before deleting anything in any selected set.
  for (const plan of transaction.plans) {
    for (const entry of plan.desired) {
      await upload(api, transfer, plan, entry);
      saveReport(reportFor(manifest, transaction, "uploaded-or-reused"));
    }
  }
  const entries = transaction.plans.flatMap((plan) => plan.desired);
  let complete = false;
  for (let poll = 0; poll < maxPolls; poll += 1) {
    complete = true;
    for (const entry of entries) {
      const shot = (await api("GET", shotPath(entry.id)))?.data;
      const state = stateOf(shot);
      if (!["AWAITING_UPLOAD", "UPLOAD_COMPLETE", "COMPLETE"].includes(state)) throw new Error("New screenshot processing failed; old screenshots retained");
      if (state !== "COMPLETE") complete = false;
      else if (shot.attributes?.sourceFileChecksum?.toLowerCase() !== entry.file.checksum) throw new Error("Processed checksum mismatch; old screenshots retained");
    }
    if (complete) break;
    if (poll + 1 < maxPolls) await wait(pollMs);
  }
  if (!complete) throw new Error("Screenshot processing timed out; old screenshots retained, retry the same manifest");
  saveReport(reportFor(manifest, transaction, "all-complete-old-retained"));
  // Recheck app/version and all selected memberships immediately before deletion.
  await findVersion(api, manifest);
  for (const plan of transaction.plans) {
    const current = await list(api, shotsPath(plan.setId));
    const expected = new Set([...plan.old.map((shot) => shot.id), ...plan.desired.map((entry) => entry.id)]);
    if (current.length !== expected.size || current.some((shot) => !expected.has(shot.id))) throw new Error("Selected set changed concurrently; no old screenshots deleted");
  }
  for (const plan of transaction.plans) {
    const keep = new Set(plan.desired.map((entry) => entry.id));
    for (const shot of plan.old) if (!keep.has(shot.id)) await api("DELETE", shotPath(shot.id));
    await api("PATCH", `/v1/appScreenshotSets/${plan.setId}/relationships/appScreenshots`, { data: plan.desired.map((entry) => ({ type: "appScreenshots", id: entry.id })) });
  }
  for (const plan of transaction.plans) {
    const final = await list(api, shotsPath(plan.setId));
    if (final.length !== plan.desired.length || final.some((shot, index) => shot.id !== plan.desired[index].id || stateOf(shot) !== "COMPLETE" || shot.attributes?.sourceFileChecksum?.toLowerCase() !== plan.desired[index].file.checksum)) throw new Error("Final screenshot order/checksum verification failed; inspect report and retry");
  }
  saveReport(reportFor(manifest, transaction, "verified"));
  log("Verified replacement of selected screenshot sets only");
  return transaction;
}

function createApi() {
  const keyId = process.env.ASC_KEY_ID || "QBF5228DP3";
  const issuer = process.env.ASC_ISSUER_ID || "c646a296-d7f1-418a-ac78-4ede7aacd995";
  const key = createPrivateKey(readFileSync(process.env.ASC_KEY_PATH || resolve(homedir(), ".appstoreconnect", "private_keys", `AuthKey_${keyId}.p8`)));
  return async (method, path, body) => {
    const url = new URL(path, API);
    if (url.origin !== API) throw new Error("Unexpected ASC API origin");
    const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64({ alg: "ES256", kid: keyId, typ: "JWT" })}.${b64({ iss: issuer, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" })}`;
    const token = `${unsigned}.${createSign("SHA256").update(unsigned).sign({ key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000), redirect: "error" });
    if (!response.ok) throw new Error(`ASC ${method} failed: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
}

async function transfer(operation, bytes) {
  const url = new URL(operation.url);
  if (url.protocol !== "https:" || operation.method !== "PUT") throw new Error("Unexpected asset upload operation");
  const headers = Object.fromEntries((operation.requestHeaders ?? []).map(({ name, value }) => [name, value]));
  if (Object.keys(headers).some((name) => name.toLowerCase() === "authorization")) throw new Error("Unexpected authorization header in asset upload operation");
  const response = await fetch(url, { method: operation.method, headers, body: bytes, signal: AbortSignal.timeout(60000), redirect: "error" });
  if (!response.ok) throw new Error(`Asset upload failed: HTTP ${response.status}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage); return; }
  const path = resolve(options.manifest);
  const raw = readFileSync(path, "utf8");
  if (raw.length > 1024 * 1024) throw new Error("Manifest too large");
  const manifest = prepareManifest(JSON.parse(raw), options.version, dirname(path));
  const report = resolve(options.report || `${path}.asc-report.json`);
  if (report === path || manifest.sets.some((set) => set.files.some((file) => file.path === report))) throw new Error("Report must not overwrite manifest or screenshots");
  console.log(`${options.apply ? "APPLY" : "DRY RUN"}: app=${manifest.appId} version=${manifest.version}, ${manifest.sets.length} selected sets`);
  await replaceScreenshots({ api: createApi(), transfer, manifest, apply: options.apply, replace: options.replace, log: console.log, saveReport: (value) => writeFileSync(report, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }) });
  console.log(`Report: ${report}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Screenshot operation failed"); process.exitCode = 1; });
}
