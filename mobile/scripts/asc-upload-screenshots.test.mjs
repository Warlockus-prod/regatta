import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { parseArgs, prepareManifest, readPng, replaceScreenshots } from "./asc-upload-screenshots.mjs";

const pngCache = new Map();
function png(width = 1320, height = 2868, marker = 1, colorType = 2, alpha = 255) {
  const cacheKey = [width, height, marker, colorType, alpha].join("/");
  if (pngCache.has(cacheKey)) return pngCache.get(cacheKey);
  const channels = colorType === 6 ? 4 : 3;
  const rowSize = width * channels + 1;
  const raw = Buffer.alloc(rowSize * height, marker);
  for (let y = 0; y < height; y += 1) {
    raw[y * rowSize] = 0;
    if (colorType === 6) for (let x = 0; x < width; x += 1) raw[y * rowSize + 1 + x * 4 + 3] = alpha;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = colorType;
  const chunk = (type, data) => {
    const bytes = Buffer.alloc(data.length + 12);
    bytes.writeUInt32BE(data.length, 0); bytes.write(type, 4, "ascii"); data.copy(bytes, 8);
    // CRC is not needed by the header/alpha parser under test.
    return bytes;
  };
  const bytes = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  pngCache.set(cacheKey, bytes);
  return bytes;
}

function manifest({ twoSets = false } = {}) {
  return prepareManifest({
    appId: "6768134329", bundleId: "com.icoffio.regatta", version: "1.7.0",
    sets: [
      { locale: "en-US", family: "APP_IPHONE_67", files: ["01-home.png", "02-pro.png"] },
      ...(twoSets ? [{ locale: "en-US", family: "APP_IPAD_PRO_3GEN_129", files: ["ipad-home.png"] }] : []),
    ],
  }, "1.7.0", "/captures", (path) => path.includes("ipad") ? png(2064, 2752) : png(1320, 2868, path.includes("02-") ? 2 : 1));
}

function fakeAsc({ twoSets = false, uploadFailure = false, processingFailure = false, processingDelay = 0, concurrentAddition = false, wrongApp = false, state = "PREPARE_FOR_SUBMISSION", failOrder = false, full = false } = {}) {
  const calls = [];
  const sets = new Map([
    ["phone", [{ id: "old-phone", attributes: { fileName: "old.png", fileSize: 100, sourceFileChecksum: "old", assetDeliveryState: { state: "COMPLETE" } } }]],
    ["tablet", [{ id: "old-tablet", attributes: { fileName: "old.png", fileSize: 100, sourceFileChecksum: "old", assetDeliveryState: { state: "COMPLETE" } } }]],
    ["unselected", [{ id: "leave-it", attributes: { fileName: "other.png", assetDeliveryState: { state: "COMPLETE" } } }]],
  ]);
  if (full) for (let i = 1; i < 10; i += 1) sets.get("phone").push({ id: `old-${i}`, attributes: { assetDeliveryState: { state: "COMPLETE" } } });
  let number = 0;
  let versionReads = 0;
  let failOrderOnce = failOrder;
  const polls = new Map();
  const find = (id) => [...sets.values()].flat().find((shot) => shot.id === id);
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (path === "/v1/apps/6768134329") return { data: { id: "6768134329", attributes: { bundleId: wrongApp ? "wrong.bundle" : "com.icoffio.regatta" } } };
    if (path.startsWith("/v1/apps/6768134329/appStoreVersions?")) {
      versionReads += 1;
      if (concurrentAddition && versionReads === 2) sets.get("phone").push({ id: "someone-else", attributes: { assetDeliveryState: { state: "COMPLETE" } } });
      return { data: [{ id: "v17", attributes: { versionString: "1.7.0", platform: "IOS", appStoreState: state } }] };
    }
    if (path.startsWith("/v1/appStoreVersions/v17/appStoreVersionLocalizations?")) return { data: [{ id: "english", attributes: { locale: "en-US" } }] };
    if (path.startsWith("/v1/appStoreVersionLocalizations/english/appScreenshotSets?")) return { data: [
      { id: "phone", attributes: { screenshotDisplayType: "APP_IPHONE_67" } },
      ...(twoSets ? [{ id: "tablet", attributes: { screenshotDisplayType: "APP_IPAD_PRO_3GEN_129" } }] : []),
      { id: "unselected", attributes: { screenshotDisplayType: "APP_IPHONE_61" } },
    ] };
    const listing = path.match(/^\/v1\/appScreenshotSets\/([^/]+)\/appScreenshots\?/);
    if (listing) return { data: structuredClone(sets.get(listing[1])) };
    if (method === "POST" && path === "/v1/appScreenshots") {
      const id = `new-${++number}`;
      const shot = { id, attributes: { ...body.data.attributes, sourceFileChecksum: null, assetDeliveryState: { state: "AWAITING_UPLOAD" }, uploadOperations: [{ method: "PUT", url: "https://upload.apple.com/private-signed-url", offset: 0, length: body.data.attributes.fileSize }] } };
      sets.get(body.data.relationships.appScreenshotSet.data.id).push(shot);
      return { data: structuredClone(shot) };
    }
    const resource = path.match(/^\/v1\/appScreenshots\/([^/?]+)$/);
    if (resource) {
      const shot = find(resource[1]);
      assert.ok(shot, `missing resource ${resource[1]}`);
      if (method === "PATCH") {
        Object.assign(shot.attributes, body.data.attributes);
        shot.attributes.assetDeliveryState.state = "UPLOAD_COMPLETE";
        return { data: structuredClone(shot) };
      }
      if (method === "GET") {
        const seen = (polls.get(shot.id) ?? 0) + 1;
        polls.set(shot.id, seen);
        if (shot.attributes.assetDeliveryState.state === "UPLOAD_COMPLETE" && seen > processingDelay) shot.attributes.assetDeliveryState.state = processingFailure ? "FAILED" : "COMPLETE";
        return { data: structuredClone(shot) };
      }
      if (method === "DELETE") {
        for (const [id, items] of sets) sets.set(id, items.filter((item) => item.id !== shot.id));
        return null;
      }
    }
    const order = path.match(/^\/v1\/appScreenshotSets\/([^/]+)\/relationships\/appScreenshots$/);
    if (method === "PATCH" && order) {
      if (failOrderOnce) { failOrderOnce = false; throw new Error("Order interrupted"); }
      const items = sets.get(order[1]);
      sets.set(order[1], body.data.map((item) => items.find((shot) => shot.id === item.id)));
      return null;
    }
    throw new Error(`Unexpected fake API call ${method} ${path}`);
  };
  const transfer = async (_operation, bytes) => {
    calls.push({ method: "TRANSFER", size: bytes.length });
    if (uploadFailure) throw new Error("Upload interrupted");
  };
  return { api, transfer, sets, calls, find };
}

const writes = (fake) => fake.calls.filter((call) => ["POST", "PATCH", "DELETE", "TRANSFER"].includes(call.method));
const run = (fake, extra = {}) => replaceScreenshots({ ...fake, manifest: manifest(), wait: async () => {}, maxPolls: 3, ...extra });

test("old positional modes and implicit version cannot write; apply needs both explicit flags", () => {
  assert.throws(() => parseArgs([]), /version/);
  assert.throws(() => parseArgs(["upload"]), /Unknown/);
  assert.throws(() => parseArgs(["cancel"]), /Unknown/);
  assert.throws(() => parseArgs(["--version", "1.7.0", "--manifest", "m.json", "--apply"]), /replace/);
  assert.throws(() => parseArgs(["--version", "1.7.0", "--manifest", "m.json", "--apply", "--replace", "--dry-run"]), /mutually/);
  assert.equal(parseArgs(["--version", "1.7.0", "--manifest", "m.json"]).apply, false);
});

test("manifest validates app/version, ordered local opaque PNGs, dimensions and duplicate content before any ASC request", () => {
  const raw = { appId: "6768134329", bundleId: "com.icoffio.regatta", version: "1.7.0", sets: [{ locale: "en-US", family: "APP_IPHONE_67", files: ["home.png"] }] };
  assert.throws(() => prepareManifest({ ...raw, appId: "wrong" }, "1.7.0", "/", () => png()), /Regatta/);
  assert.throws(() => prepareManifest(raw, "1.6.4", "/", () => png()), /version/);
  assert.throws(() => prepareManifest({ ...raw, sets: [{ ...raw.sets[0], locale: undefined }] }, "1.7.0", "/", () => png()), /locale/);
  assert.throws(() => prepareManifest({ ...raw, sets: [{ ...raw.sets[0], files: ["https://host/home.png"] }] }, "1.7.0", "/", () => png()), /local/);
  assert.throws(() => prepareManifest({ ...raw, sets: [{ ...raw.sets[0], files: ["a.png", "b.png"] }] }, "1.7.0", "/", () => png()), /Duplicate screenshot/);
  assert.throws(() => readPng(png(300, 600), "APP_IPHONE_67"), /dimensions/);
  assert.throws(() => readPng(png(1320, 2868, 1, 6, 128), "APP_IPHONE_67"), /transparent/);
  assert.deepEqual(readPng(png(1320, 2868, 1, 6), "APP_IPHONE_67"), { width: 1320, height: 2868 });
  assert.equal(manifest().sets[0].files[0].fileName, `01-home--${createHash("md5").update(png()).digest("hex")}.png`);
});

test("default dry-run reads app, exact iOS editable version and selected sets, with zero writes", async () => {
  const fake = fakeAsc();
  const reports = [];
  await run(fake, { saveReport: (report) => reports.push(report) });
  assert.deepEqual(writes(fake), []);
  assert.equal(reports[0].stage, "dry-run");
  assert.deepEqual(reports[0].sets[0].old.map((shot) => shot.id), ["old-phone"]);
});

test("wrong app, noneditable version, missing selected set and insufficient spare slots stop before writes", async () => {
  for (const [options, error] of [[{ wrongApp: true }, /verification/], [{ state: "WAITING_FOR_REVIEW" }, /PREPARE/], [{ full: true }, /capacity/]]) {
    const fake = fakeAsc(options);
    await assert.rejects(run(fake, { apply: true, replace: true }), error);
    assert.deepEqual(writes(fake), []);
  }
  const fake = fakeAsc();
  await assert.rejects(run(fake, { manifest: manifest({ twoSets: true }), apply: true, replace: true }), /existing set/);
  assert.deepEqual(writes(fake), []);
});

test("all desired assets across both sets must be COMPLETE before any old ID is deleted; unselected set stays exact", async () => {
  const fake = fakeAsc({ twoSets: true, processingDelay: 1 });
  const reports = [];
  await run(fake, { manifest: manifest({ twoSets: true }), apply: true, replace: true, saveReport: (report) => reports.push(report) });
  const firstDelete = fake.calls.findIndex((call) => call.method === "DELETE");
  const completedReads = fake.calls.slice(0, firstDelete).filter((call) => call.method === "GET" && /^\/v1\/appScreenshots\/new-/.test(call.path));
  assert.equal(completedReads.length, 6);
  assert.equal(fake.sets.get("phone").length, 2);
  assert.equal(fake.sets.get("tablet").length, 1);
  assert.deepEqual(fake.sets.get("unselected").map((shot) => shot.id), ["leave-it"]);
  assert.deepEqual(fake.calls.filter((call) => call.method === "DELETE").map((call) => call.path), ["/v1/appScreenshots/old-phone", "/v1/appScreenshots/old-tablet"]);
  assert.ok(reports.some((report) => report.stage === "all-complete-old-retained"));
  assert.equal(reports.at(-1).stage, "verified");
});

test("upload/processing failure and timeout preserve every old screenshot, with no DELETE or reorder", async () => {
  for (const options of [{ uploadFailure: true }, { processingFailure: true }, { processingDelay: 20 }]) {
    const fake = fakeAsc(options);
    await assert.rejects(run(fake, { apply: true, replace: true }));
    assert.ok(fake.find("old-phone"));
    assert.equal(fake.calls.some((call) => call.method === "DELETE" || call.path?.includes("/relationships/appScreenshots")), false);
  }
});

test("retry reuses deterministic uncommitted reservations after interrupted upload, and COMPLETE assets after success", async () => {
  const fake = fakeAsc();
  let fail = true;
  const transfer = async () => { if (fail) { fail = false; throw new Error("Disconnected"); } };
  await assert.rejects(run(fake, { transfer, apply: true, replace: true }), /Disconnected/);
  assert.equal(fake.calls.filter((call) => call.method === "POST").length, 1);
  await run(fake, { transfer, apply: true, replace: true });
  assert.equal(fake.calls.filter((call) => call.method === "POST").length, 2);
  assert.deepEqual(fake.sets.get("phone").map((shot) => shot.id), ["new-1", "new-2"]);
  const before = fake.calls.length;
  await run(fake, { apply: true, replace: true });
  assert.equal(fake.calls.slice(before).some((call) => ["POST", "DELETE", "TRANSFER"].includes(call.method)), false);
});

test("a concurrent new ID aborts the destructive phase in all selected sets", async () => {
  const fake = fakeAsc({ twoSets: true, concurrentAddition: true });
  await assert.rejects(run(fake, { manifest: manifest({ twoSets: true }), apply: true, replace: true }), /concurrently/);
  assert.ok(fake.find("old-phone"));
  assert.ok(fake.find("old-tablet"));
  assert.ok(fake.find("someone-else"));
  assert.equal(fake.calls.some((call) => call.method === "DELETE"), false);
});

test("retry after interrupted final ordering keeps new COMPLETE assets and restores manifest order without upload", async () => {
  const fake = fakeAsc({ failOrder: true });
  await assert.rejects(run(fake, { apply: true, replace: true }), /Order interrupted/);
  const before = fake.calls.length;
  await run(fake, { apply: true, replace: true });
  assert.equal(fake.calls.slice(before).some((call) => ["POST", "DELETE", "TRANSFER"].includes(call.method)), false);
  assert.deepEqual(fake.sets.get("phone").map((shot) => shot.id), ["new-1", "new-2"]);
});
