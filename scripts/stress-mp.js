#!/usr/bin/env node
// Multiplayer stress test.
//
// Spawns N WS clients, has the host create a lobby, the rest join it, starts
// a race, everyone sails for RACE_DURATION_SEC, and we collect metrics:
//   - time from `start-race` to first `state` broadcast
//   - state tick rate (should be ~20Hz)
//   - per-client average inter-tick jitter
//   - finished vs. unfinished boats
//   - server /health deltas before/after
//
// Usage:  node scripts/stress-mp.js [--url=wss://regatta.icoffio.com/ws] [--n=8] [--time=120]

import WebSocket from 'ws';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]),
);

const WS_URL = args.url || process.env.WS_URL || 'wss://regatta.icoffio.com/ws';
const HEALTH_URL = args.health || (WS_URL.startsWith('wss') ? WS_URL.replace('wss', 'https').replace('/ws', '') + '/health' : '');
const N = Number(args.n || 8);
const RACE_DURATION_SEC = Number(args.time || 120);
const POLL_HEALTH = !!args.health;

function now() { return Date.now(); }
function shortId() { return 's_' + Math.random().toString(36).slice(2, 10); }

class StressClient {
  constructor(label) {
    this.label = label;
    this.sid = shortId();
    this.ws = null;
    this.isHost = false;
    this.myId = null;
    this.roomCode = null;
    this.joinedAt = 0;
    this.firstStateAt = 0;
    this.stateCount = 0;
    this.tickIntervals = [];   // ms between state msgs
    this.lastStateAt = 0;
    this.finished = false;
    this.finishTime = null;
    this.errors = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL, { perMessageDeflate: false });
      const timer = setTimeout(() => reject(new Error('ws timeout')), 10_000);
      this.ws.on('open', () => { clearTimeout(timer); resolve(); });
      this.ws.on('error', (e) => { clearTimeout(timer); reject(e); });
      this.ws.on('message', (raw) => {
        let m; try { m = JSON.parse(raw.toString()); } catch { return; }
        this._onMsg(m);
      });
      this.ws.on('close', () => { /* noop */ });
    });
  }

  _onMsg(m) {
    switch (m.type) {
      case 'joined':
        this.myId = m.id;
        this.roomCode = m.code;
        this.isHost = m.isHost;
        this.joinedAt = now();
        break;
      case 'state': {
        const t = now();
        if (!this.firstStateAt) this.firstStateAt = t;
        if (this.lastStateAt) this.tickIntervals.push(t - this.lastStateAt);
        this.lastStateAt = t;
        this.stateCount++;
        // Track our own boat's finish
        const me = m.boats.find((b) => b.id === this.myId);
        if (me?.l === 2 && me.f != null) {
          if (!this.finished) {
            this.finished = true;
            this.finishTime = me.f;
          }
        }
        break;
      }
      case 'finished':
        // Could capture results here too
        break;
      case 'error':
        this.errors.push(m.message);
        break;
    }
  }

  send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  close() { try { this.ws?.close(); } catch {} }

  /** Drive input at 20Hz - slightly zig-zag to look realistic */
  startInputLoop() {
    this._inputTimer = setInterval(() => {
      const t = now() / 1000;
      const turn = Math.sin(t * 0.8 + Math.random() * 0.1) * 0.6;
      this.send({ type: 'input', turn });
    }, 50);
  }

  stopInputLoop() {
    if (this._inputTimer) clearInterval(this._inputTimer);
  }
}

function stats(arr) {
  if (!arr.length) return { n: 0 };
  const s = [...arr].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    n: s.length,
    min: s[0],
    max: s[s.length - 1],
    avg: +(sum / s.length).toFixed(1),
    p50: s[Math.floor(s.length / 2)],
    p95: s[Math.floor(s.length * 0.95)],
    p99: s[Math.floor(s.length * 0.99)],
  };
}

async function fetchHealth() {
  if (!HEALTH_URL) return null;
  try {
    const r = await fetch(HEALTH_URL);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

(async () => {
  console.log(`=== Regatta MP stress ===`);
  console.log(`URL=${WS_URL}  N=${N}  RACE=${RACE_DURATION_SEC}s`);
  console.log();

  const healthBefore = await fetchHealth();

  // 1. Host connects + creates
  const host = new StressClient('host');
  await host.connect();
  host.send({ type: 'create', nickname: 'HOST', sid: host.sid });
  await waitFor(() => host.roomCode, 5_000, 'host.roomCode');
  console.log(`[host] lobby=${host.roomCode}  sid=${host.sid}`);

  // 2. Guests join
  const guests = [];
  for (let i = 0; i < N - 1; i++) {
    const g = new StressClient('g' + i);
    await g.connect();
    g.send({ type: 'join', code: host.roomCode, nickname: 'G' + i, sid: g.sid });
    guests.push(g);
  }
  await waitFor(() => guests.every((g) => g.myId), 8_000, 'guests joined');
  console.log(`[lobby] joined ${guests.length + 1} / ${N}`);

  // 3. Start race
  host.send({ type: 'start-race' });

  // 4. Wait ~6 sec for countdown to end, then start input loops
  await sleep(6_000);
  [host, ...guests].forEach((c) => c.startInputLoop());

  const startedAt = now();
  console.log(`[race] started, running for ${RACE_DURATION_SEC}s ...`);

  await sleep(RACE_DURATION_SEC * 1000);

  // 5. Stop + collect
  [host, ...guests].forEach((c) => c.stopInputLoop());

  const all = [host, ...guests];
  const allIntervals = all.flatMap((c) => c.tickIntervals);
  const perClient = all.map((c) => ({
    id: c.label,
    sid: c.sid,
    states: c.stateCount,
    rateHz: +(c.stateCount / RACE_DURATION_SEC).toFixed(2),
    tick: stats(c.tickIntervals),
    finished: c.finished,
    finishTime: c.finishTime,
    errors: c.errors,
  }));

  const healthAfter = await fetchHealth();

  const report = {
    url: WS_URL,
    n: N,
    duration_sec: RACE_DURATION_SEC,
    started_at: new Date(startedAt).toISOString(),
    tick_ms_all: stats(allIntervals),
    per_client: perClient,
    finished_count: all.filter((c) => c.finished).length,
    health_before: healthBefore,
    health_after: healthAfter,
  };

  console.log();
  console.log('=== REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  all.forEach((c) => c.close());
  // Give ws time to drain
  setTimeout(() => process.exit(0), 500);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitFor(cond, timeoutMs, label) {
  const start = now();
  while (!cond()) {
    if (now() - start > timeoutMs) throw new Error('timeout waiting: ' + label);
    await sleep(50);
  }
}
