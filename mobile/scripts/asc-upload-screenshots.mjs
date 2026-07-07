import { readFileSync, readdirSync } from 'fs';
import { createSign, createHash } from 'crypto';
const KEY_ID='QBF5228DP3', ISSUER='c646a296-d7f1-418a-ac78-4ede7aacd995', APP='6768134329';
const key = readFileSync(process.env.HOME + '/.appstoreconnect/private_keys/AuthKey_QBF5228DP3.p8');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = () => {
  const now = Math.floor(Date.now()/1000);
  const u = b64({alg:'ES256',kid:KEY_ID,typ:'JWT'}) + '.' + b64({iss:ISSUER,iat:now,exp:now+1200,aud:'appstoreconnect-v1'});
  return u + '.' + createSign('SHA256').update(u).sign({key, dsaEncoding:'ieee-p1363'}).toString('base64url');
};
const api = async (method, path, body) => {
  const res = await fetch('https://api.appstoreconnect.apple.com' + path, {
    method,
    headers: { Authorization: 'Bearer ' + jwt(), ...(body ? {'content-type':'application/json'} : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(method + ' ' + path + ' -> ' + res.status + ' ' + JSON.stringify(j?.errors?.[0] ?? j).slice(0,300));
  return j;
};

const MODE = process.argv[2]; // 'cancel' | 'upload' | 'state'
if (MODE === 'cancel') {
  const subs = await api('GET', `/v1/reviewSubmissions?filter[app]=${APP}&filter[state]=WAITING_FOR_REVIEW&limit=1`);
  if (!subs.data.length) { console.log('no waiting submission'); process.exit(0); }
  const id = subs.data[0].id;
  await api('PATCH', `/v1/reviewSubmissions/${id}`, { data: { type: 'reviewSubmissions', id, attributes: { canceled: true } } });
  console.log('canceled submission', id);
  process.exit(0);
}

const vers = await api('GET', `/v1/apps/${APP}/appStoreVersions?filter[versionString]=1.4.0&limit=1`);
const vid = vers.data[0].id;
console.log('version state:', vers.data[0].attributes.appStoreState);
if (MODE === 'state') process.exit(0);

const locs = await api('GET', `/v1/appStoreVersions/${vid}/appStoreVersionLocalizations?limit=10`);
const en = locs.data.find(l => l.attributes.locale === 'en-US');
const sets = await api('GET', `/v1/appStoreVersionLocalizations/${en.id}/appScreenshotSets?limit=10`);
const plan = [
  { type: 'APP_IPHONE_67', dir: process.env.SHOT_DIR + '/iphone67' },
  { type: 'APP_IPAD_PRO_3GEN_129', dir: process.env.SHOT_DIR + '/ipad129' },
];
for (const p of plan) {
  let set = sets.data.find(s => s.attributes.screenshotDisplayType === p.type);
  if (!set) {
    const created = await api('POST', '/v1/appScreenshotSets', { data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: p.type }, relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: en.id } } } } });
    set = created.data;
  }
  // delete existing
  const existing = await api('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
  for (const shot of existing.data) {
    await api('DELETE', `/v1/appScreenshots/${shot.id}`);
  }
  console.log(p.type, 'cleared', existing.data.length, 'old shots');
  // upload new in order
  const files = readdirSync(p.dir).filter(f => f.endsWith('.png')).sort();
  const ids = [];
  for (const f of files) {
    const buf = readFileSync(p.dir + '/' + f);
    const reserved = await api('POST', '/v1/appScreenshots', { data: { type: 'appScreenshots', attributes: { fileName: f, fileSize: buf.length }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } } });
    const ops = reserved.data.attributes.uploadOperations;
    for (const op of ops) {
      const headers = {};
      for (const h of op.requestHeaders ?? []) headers[h.name] = h.value;
      const part = buf.subarray(op.offset, op.offset + op.length);
      const r = await fetch(op.url, { method: op.method, headers, body: part });
      if (!r.ok) throw new Error('upload part failed ' + r.status);
    }
    const md5 = createHash('md5').update(buf).digest('hex');
    await api('PATCH', `/v1/appScreenshots/${reserved.data.id}`, { data: { type: 'appScreenshots', id: reserved.data.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } });
    ids.push(reserved.data.id);
    console.log(p.type, 'uploaded', f);
  }
  // explicit order
  await api('PATCH', `/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`, { data: ids.map(id => ({ type: 'appScreenshots', id })) });
  console.log(p.type, 'order set,', ids.length, 'shots');
}
console.log('DONE');
