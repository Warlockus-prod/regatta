// Regatta multiplayer server
// - authoritative physics at 20Hz per room
// - lobby codes (4 chars), max 10 players per room
// - AI bots fill empty slots if host toggles
// - Mission support (server enforces wind + difficulty + constraints)
// - Reconnect grace: 20s after disconnect by sid
// - On finish: POST results to Next.js /api/race-result (leaderboard integration)

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import * as P from './race-physics.js';

const PORT = Number(process.env.PORT || 3001);
const NEXT_INTERNAL_URL = process.env.NEXT_INTERNAL_URL || 'http://regatta:3000';
const TICK_HZ = 20;
const MAX_PLAYERS_PER_ROOM = 10;
const ROOM_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const COUNTDOWN_SEC = 5;
const RECONNECT_GRACE_MS = 20_000;

// ------------------------------ Missions ---------------------------------
// Mirror of src/data/missions.ts constraints that the SERVER can verify.
const MISSIONS = [
  { id: 'clean-laps',     difficulty: 'easy',   wind: 'medium', constraints: [{ type: 'no-no-go' }] },
  { id: 'sub-90',         difficulty: 'medium', wind: 'heavy',  constraints: [{ type: 'finish-under-sec', value: 90 }] },
  { id: 'minimal-tacks',  difficulty: 'medium', wind: 'medium', constraints: [{ type: 'max-tacks', value: 4 }] },
  { id: 'light-wind-master', difficulty: 'easy', wind: 'light', constraints: [] },
];

// ------------------------------ HTTP server (health) --------------------
const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      rooms: rooms.size,
      connections: clients.size,
      uptime_sec: Math.floor(process.uptime()),
    }));
    return;
  }
  res.writeHead(404); res.end();
});

// ------------------------------ Room model -------------------------------

const rooms = new Map();
const clients = new Map();       // ws -> roomCode

function randCode() {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

function genPlayerId() {
  // Opaque per-room player id - broadcast as the public boat/player id.
  // NEVER the client's sid: the sid is the unauthenticated write key for
  // /api/race-result and must stay server-side only (it used to leak as this
  // id, letting any room peer impersonate you). Kept private on the Player.
  return 'p_' + Math.random().toString(36).slice(2, 10)
             + Math.random().toString(36).slice(2, 6);
}

function newRoom(hostSid, hostId) {
  let code;
  do { code = randCode(); } while (rooms.has(code));
  const room = {
    code,
    hostSid,
    hostId,
    phase: 'lobby',
    seed: Math.floor(Math.random() * 1000),
    raceStartTs: 0,
    course: P.makeStandardCourse(),
    players: new Map(),      // playerId -> Player
    aiBots: [],               // AI boat objects
    results: [],
    lastActivity: Date.now(),
    missionId: null,
    difficulty: 'medium',
    windStrength: 'medium',
    // Per-player race stats (for mission evaluation + leaderboard)
    stats: new Map(),         // playerId -> { tacks, noGoEntries, topSpeed, lastTWASign, wasInNoGo }
    submittedResults: false,
  };
  rooms.set(code, room);
  return room;
}

// Delete a room and cancel any pending reconnect-grace timers it still holds,
// so a long-running process cannot accumulate orphan rooms or orphan timers.
function destroyRoom(code) {
  const r = rooms.get(code);
  if (r) {
    for (const p of r.players.values()) {
      if (p.graceTimer) { clearTimeout(p.graceTimer); p.graceTimer = null; }
    }
  }
  rooms.delete(code);
}

function sendJson(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj) {
  const msg = JSON.stringify(obj);
  for (const p of room.players.values()) {
    if (p.ws && p.ws.readyState === p.ws.OPEN) p.ws.send(msg);
  }
}

function lobbyState(room) {
  return {
    type: 'lobby-state',
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    missionId: room.missionId,
    difficulty: room.difficulty,
    windStrength: room.windStrength,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id, nickname: p.nickname, ready: p.ready,
      isBot: p.isBot === true,
      connected: !!p.ws && p.ws.readyState === 1,
    })),
  };
}

function windStrengthMul(w) {
  return w === 'light' ? 0.65 : w === 'heavy' ? 1.3 : 1.0;
}

function difficultySpeedMul(d) {
  return d === 'easy' ? 0.78 : d === 'hard' ? 1.02 : 0.92;
}

function spawnBoat(room, id, nickname, index) {
  const line = room.course.startLine;
  const cx = (line.a.x + line.b.x) / 2;
  const total = room.players.size + room.aiBots.length;
  const t = total <= 1 ? 0 : (index / Math.max(1, total - 1)) * 2 - 1;
  return {
    id,
    name: nickname,
    pos: { x: cx + t * 80, y: line.a.y + 30 },
    heading: 0,
    speed: 0,
    lapDone: 0,
    // AI bookkeeping
    tackPreference: index % 2 === 0 ? 'starboard' : 'port',
    aiTackTimer: 0,
  };
}

function resetStats(room) {
  room.stats = new Map();
  for (const p of room.players.values()) {
    room.stats.set(p.id, { tacks: 0, noGoEntries: 0, topSpeed: 0, lastTWASign: 0, wasInNoGo: false });
  }
  for (const bot of room.aiBots) {
    room.stats.set(bot.id, { tacks: 0, noGoEntries: 0, topSpeed: 0, lastTWASign: 0, wasInNoGo: false });
  }
}

function repositionAllBoats(room) {
  // Rebuild start-line positions when roster changes before start
  let idx = 0;
  for (const p of room.players.values()) {
    const b = spawnBoat(room, p.id, p.nickname, idx++);
    p.boat = b;
  }
  for (let i = 0; i < room.aiBots.length; i++) {
    const b = spawnBoat(room, room.aiBots[i].id, room.aiBots[i].name, idx++);
    Object.assign(room.aiBots[i], b);
  }
}

// ------------------------------ Mission helpers --------------------------

function applyMission(room, missionId) {
  if (!missionId) {
    room.missionId = null;
    return;
  }
  const m = MISSIONS.find((x) => x.id === missionId);
  if (!m) return;
  room.missionId = m.id;
  room.difficulty = m.difficulty;
  room.windStrength = m.wind;
}

function evaluateMissionForPlayer(room, playerId) {
  if (!room.missionId) return { passed: true, reasons: [] };
  const m = MISSIONS.find((x) => x.id === room.missionId);
  if (!m) return { passed: true, reasons: [] };
  const stats = room.stats.get(playerId);
  const player = room.players.get(playerId);
  const finishTime = player?.boat?.finishTime ?? null;
  // Reasons are stable machine-readable CODES (+ params), localized on the
  // client - the server must not ship a single hardcoded language to a
  // 7-language app. See missionReasonText() in MultiplayerClient.tsx.
  if (finishTime === null) return { passed: false, reasons: [{ code: 'dnf' }] };
  const reasons = [];
  let passed = true;
  for (const c of m.constraints) {
    if (c.type === 'no-no-go' && (stats?.noGoEntries ?? 0) > 0) {
      passed = false;
      reasons.push({ code: 'no-go', count: stats.noGoEntries });
    } else if (c.type === 'finish-under-sec' && finishTime > (c.value ?? Infinity)) {
      passed = false;
      reasons.push({ code: 'time-over', time: Math.round(finishTime * 10) / 10, limit: c.value });
    } else if (c.type === 'max-tacks' && (stats?.tacks ?? 0) > (c.value ?? Infinity)) {
      passed = false;
      reasons.push({ code: 'tacks-over', count: stats.tacks, max: c.value });
    }
  }
  if (passed) reasons.push({ code: 'passed' });
  return { passed, reasons };
}

// ------------------------------ AI logic ---------------------------------

function computeAIHeading(boat, course, dt, windDir) {
  const target = boat.lapDone === 0 ? course.marks[0].pos : {
    x: (course.finishLine.a.x + course.finishLine.b.x) / 2,
    y: course.finishLine.a.y,
  };
  const dx = target.x - boat.pos.x;
  const dy = target.y - boat.pos.y;
  const targetBearing = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;

  // Relative angle to wind
  const angleToWind = Math.min(
    ((targetBearing - windDir) + 360) % 360,
    360 - (((targetBearing - windDir) + 360) % 360),
  );

  let desired;
  const CH = 45;
  if (angleToWind < 42 && boat.lapDone === 0) {
    // Upwind - tack
    boat.aiTackTimer = (boat.aiTackTimer || 0) + dt;
    const interval = 3.5;
    const dist = Math.hypot(dx, dy);
    if (boat.aiTackTimer > interval || dist < 220) {
      if (dist < 180) boat.tackPreference = dx > 0 ? 'port' : 'starboard';
      else boat.tackPreference = boat.tackPreference === 'port' ? 'starboard' : 'port';
      boat.aiTackTimer = 0;
    }
    const portHdg = (windDir + CH) % 360;
    const starHdg = (windDir - CH + 360) % 360;
    desired = boat.tackPreference === 'port' ? portHdg : starHdg;
  } else {
    desired = targetBearing;
  }

  // Turn toward desired
  let diff = ((desired - boat.heading + 540) % 360) - 180;
  const maxTurn = P.TURN_RATE * 0.85 * dt;
  diff = Math.max(-maxTurn, Math.min(maxTurn, diff));
  return P.normalizeAngle(boat.heading + diff);
}

// ------------------------------ Game loop --------------------------------

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    // GC idle rooms
    if (now - room.lastActivity > ROOM_IDLE_TIMEOUT_MS && room.players.size === 0) {
      destroyRoom(code);
      continue;
    }

    if (room.phase === 'countdown') {
      const remain = Math.max(0, COUNTDOWN_SEC - (now - room.raceStartTs) / 1000);
      broadcast(room, { type: 'countdown', remain });
      if (remain <= 0) {
        room.phase = 'racing';
        room.raceStartTs = now;
        resetStats(room);
        broadcast(room, { type: 'phase', phase: 'racing' });
      }
      continue;
    }

    if (room.phase !== 'racing') continue;

    const raceT = (now - room.raceStartTs) / 1000;
    const wind = P.windAt(raceT, room.seed);
    const dt = 1 / TICK_HZ;
    const windMul = windStrengthMul(room.windStrength);
    const aiSpeedMul = difficultySpeedMul(room.difficulty);

    const prevPositions = new Map();
    const boats = [];

    // Step all player boats
    for (const p of room.players.values()) {
      if (!p.boat) continue;
      prevPositions.set(p.boat.id, { ...p.boat.pos });
      if (p.boat.lapDone < 2 && p.connectedOrGrace) {
        P.stepBoat(p.boat, dt, wind.dir, wind.gust, p.input,
                   { speedMul: 1.0, windStrengthMul: windMul });
      }
      boats.push(p.boat);
    }
    // Step AI
    for (const bot of room.aiBots) {
      prevPositions.set(bot.id, { ...bot.pos });
      if (bot.lapDone < 2) {
        bot.heading = computeAIHeading(bot, room.course, dt, wind.dir);
        P.stepBoat(bot, dt, wind.dir, wind.gust, { turn: 0 },
                   { speedMul: aiSpeedMul, windStrengthMul: windMul });
      }
      boats.push(bot);
    }

    P.resolveCollisions(boats);

    // Events + stats
    const events = [];
    for (const b of boats) {
      if (b.lapDone >= 2) continue;
      const prev = prevPositions.get(b.id);
      const res = P.updateLap(b, prev, room.course, raceT);
      if (res) events.push({ id: b.id, type: res, t: raceT });
      // Stats
      const st = room.stats.get(b.id);
      if (!st) continue;
      const twa = P.calcTWA(b.heading, wind.dir);
      // Top speed
      if (b.speed > st.topSpeed) st.topSpeed = b.speed;
      // No-go
      const inNoGo = Math.abs(twa) < 30 && b.speed < 2;
      if (inNoGo && !st.wasInNoGo) {
        st.noGoEntries++;
        events.push({ id: b.id, type: 'no-go-entered', t: raceT });
      }
      st.wasInNoGo = inNoGo;
      // Tacks
      const sign = twa > 0 ? 1 : -1;
      if (st.lastTWASign !== 0 && sign !== st.lastTWASign && b.speed > 1) {
        st.tacks++;
      }
      st.lastTWASign = sign;
    }

    // Broadcast state
    broadcast(room, {
      type: 'state',
      t: raceT,
      wind: { dir: Math.round(wind.dir * 10) / 10, gust: Math.round(wind.gust * 100) / 100 },
      boats: boats.map((b) => ({
        id: b.id,
        x: Math.round(b.pos.x * 10) / 10,
        y: Math.round(b.pos.y * 10) / 10,
        h: Math.round(b.heading * 10) / 10,
        s: Math.round(b.speed * 100) / 100,
        l: b.lapDone,
        f: b.finishTime ?? null,
      })),
      events,
    });

    // End condition
    const allDone = boats.every((b) => b.lapDone === 2);
    const tooLong = raceT > 300;
    if (allDone || tooLong) {
      room.phase = 'finished';
      // Build results + mission eval
      const byId = new Map();
      for (const p of room.players.values()) byId.set(p.id, { nickname: p.nickname, isBot: false });
      for (const b of room.aiBots) byId.set(b.id, { nickname: b.name, isBot: true });

      room.results = boats
        .map((b) => {
          const info = byId.get(b.id) || { nickname: b.name, isBot: false };
          const missionRes = !info.isBot && room.missionId
            ? evaluateMissionForPlayer(room, b.id)
            : null;
          return {
            id: b.id,
            nickname: info.nickname,
            isBot: info.isBot,
            time: b.finishTime ?? null,
            mission: missionRes,
          };
        })
        .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));

      broadcast(room, { type: 'finished', results: room.results });
      submitResultsToLeaderboard(room).catch((e) => console.error('[mp] save results failed', e.message));
    }
  }
}, 1000 / TICK_HZ);

// ------------------------------ Leaderboard save -------------------------

async function submitResultsToLeaderboard(room) {
  if (room.submittedResults) return;
  room.submittedResults = true;
  for (const p of room.players.values()) {
    if (!p.sid) continue;
    const b = p.boat;
    if (!b || b.finishTime == null) continue;
    const stats = room.stats.get(p.id) || {};
    const body = {
      difficulty: room.difficulty,
      windStrength: room.windStrength,
      missionId: room.missionId,
      finishTimeSec: b.finishTime,
      position: room.results.findIndex((r) => r.id === p.id) + 1 || null,
      totalBoats: room.results.length,
      tacks: stats.tacks ?? null,
      noGoEntries: stats.noGoEntries ?? null,
      topSpeed: Math.round((stats.topSpeed ?? 0) * 10) / 10,
      score: null,
      nicknameFallback: p.nickname,
    };
    try {
      const res = await fetch(`${NEXT_INTERNAL_URL}/api/race-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `regatta_sid=${encodeURIComponent(p.sid)}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn('[mp] race-result POST failed', res.status, text.slice(0, 200));
      }
    } catch (err) {
      console.warn('[mp] race-result POST error', err.message);
    }
  }
}

// ------------------------------ Rate limit (per-IP) ----------------------

const ipHits = new Map(); // ip -> { connects: number[], msgs: number[] }

function allowConnect(ip) {
  const now = Date.now();
  const b = ipHits.get(ip) || { connects: [], msgs: [] };
  b.connects = b.connects.filter(t => now - t < 60_000);
  if (b.connects.length >= 30) return false;          // 30 connects / min / IP
  b.connects.push(now);
  ipHits.set(ip, b);
  return true;
}

function allowMessage(ip) {
  const now = Date.now();
  const b = ipHits.get(ip) || { connects: [], msgs: [] };
  b.msgs = b.msgs.filter(t => now - t < 1000);
  // Per-IP cap. Each client sends input at ~20Hz, so 60/s throttled legit play
  // for 3+ players behind one NAT (household / club / classroom WiFi - the
  // primary room-code use case). 240/s allows ~12 shared-IP players while
  // still bounding a single abusive source.
  if (b.msgs.length >= 240) return false;
  b.msgs.push(now);
  ipHits.set(ip, b);
  return true;
}

// Periodic sweep so ipHits cannot grow unbounded on a long-running process:
// prune each bucket's expired timestamps and drop buckets that went quiet.
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of ipHits) {
    b.connects = b.connects.filter((t) => now - t < 60_000);
    b.msgs = b.msgs.filter((t) => now - t < 1000);
    if (b.connects.length === 0 && b.msgs.length === 0) ipHits.delete(ip);
  }
}, 60_000);

// ------------------------------ WS handlers ------------------------------

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws, req) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .toString().split(',')[0].trim();
  if (!allowConnect(ip)) {
    try { ws.close(1008, 'rate-limit'); } catch {}
    return;
  }
  let playerId = null;
  let roomCode = null;
  let sid = null;

  ws.on('message', (raw) => {
    if (!allowMessage(ip)) return;
    // Size guard - clients should never send big messages
    if (raw.length > 4096) return;
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;
    const room = roomCode ? rooms.get(roomCode) : null;

    switch (msg.type) {
      case 'create': {
        sid = String(msg.sid || ('s' + Math.random().toString(36).slice(2, 10)));
        playerId = genPlayerId();
        const nickname = String(msg.nickname || 'Player').slice(0, 20);
        const r = newRoom(sid, playerId);
        const boat = spawnBoat(r, playerId, nickname, 0);
        r.players.set(playerId, {
          ws, id: playerId, sid, nickname,
          boat, input: { turn: 0 }, ready: false,
          isBot: false, connectedOrGrace: true,
        });
        r.lastActivity = Date.now();
        roomCode = r.code;
        clients.set(ws, r.code);
        sendJson(ws, { type: 'joined', code: r.code, id: playerId, isHost: true });
        broadcast(r, lobbyState(r));
        break;
      }
      case 'join': {
        const code = String(msg.code || '').toUpperCase();
        const r = rooms.get(code);
        if (!r) { sendJson(ws, { type: 'error', message: 'Комната не найдена' }); return; }
        sid = String(msg.sid || ('s' + Math.random().toString(36).slice(2, 10)));
        // Resume existing player if sid matches
        const existing = Array.from(r.players.values()).find((p) => p.sid === sid);
        if (existing) {
          existing.ws = ws;
          existing.connectedOrGrace = true;
          // Reconnected inside the grace window: cancel the pending auto-drop.
          if (existing.graceTimer) { clearTimeout(existing.graceTimer); existing.graceTimer = null; }
          playerId = existing.id;
          roomCode = r.code;
          clients.set(ws, r.code);
          sendJson(ws, { type: 'joined', code: r.code, id: playerId, isHost: r.hostId === playerId });
          broadcast(r, lobbyState(r));
          if (r.phase === 'racing') sendJson(ws, { type: 'phase', phase: 'racing' });
          return;
        }
        if (r.phase !== 'lobby') { sendJson(ws, { type: 'error', message: 'Гонка уже идёт' }); return; }
        if (r.players.size + r.aiBots.length >= MAX_PLAYERS_PER_ROOM) {
          sendJson(ws, { type: 'error', message: 'Комната полна' }); return;
        }
        playerId = genPlayerId();
        const nickname = String(msg.nickname || 'Player').slice(0, 20);
        const idx = r.players.size + r.aiBots.length;
        const boat = spawnBoat(r, playerId, nickname, idx);
        r.players.set(playerId, {
          ws, id: playerId, sid, nickname,
          boat, input: { turn: 0 }, ready: false,
          isBot: false, connectedOrGrace: true,
        });
        r.lastActivity = Date.now();
        roomCode = r.code;
        clients.set(ws, r.code);
        sendJson(ws, { type: 'joined', code: r.code, id: playerId, isHost: false });
        broadcast(r, lobbyState(r));
        break;
      }
      case 'set-mission': {
        if (!room || !playerId) return;
        if (room.hostId !== playerId) return;
        if (room.phase !== 'lobby') return;
        applyMission(room, msg.missionId || null);
        if (!msg.missionId) {
          if (msg.difficulty) room.difficulty = String(msg.difficulty);
          if (msg.windStrength) room.windStrength = String(msg.windStrength);
        }
        room.lastActivity = Date.now();
        broadcast(room, lobbyState(room));
        break;
      }
      case 'add-bot': {
        if (!room || room.hostId !== playerId) return;
        if (room.phase !== 'lobby') return;
        if (room.players.size + room.aiBots.length >= MAX_PLAYERS_PER_ROOM) {
          sendJson(ws, { type: 'error', message: 'Комната полна' }); return;
        }
        const names = ['Nautilus', 'Mistral', 'Trident', 'Aurora', 'Kraken', 'Borealis', 'Zephyr', 'Orion'];
        const botName = names[room.aiBots.length % names.length];
        const botId = 'bot_' + Math.random().toString(36).slice(2, 8);
        const idx = room.players.size + room.aiBots.length;
        const boat = spawnBoat(room, botId, botName, idx);
        room.aiBots.push({ ...boat, id: botId, name: botName });
        room.lastActivity = Date.now();
        broadcast(room, lobbyState(room));
        break;
      }
      case 'remove-bot': {
        if (!room || room.hostId !== playerId) return;
        if (room.phase !== 'lobby') return;
        if (room.aiBots.length === 0) return;
        room.aiBots.pop();
        room.lastActivity = Date.now();
        broadcast(room, lobbyState(room));
        break;
      }
      case 'ready': {
        if (!room || !playerId) return;
        const p = room.players.get(playerId);
        if (!p) return;
        p.ready = !!msg.ready;
        room.lastActivity = Date.now();
        broadcast(room, lobbyState(room));
        break;
      }
      case 'start-race': {
        if (!room || !playerId || room.hostId !== playerId || room.phase !== 'lobby') return;
        repositionAllBoats(room);
        room.phase = 'countdown';
        room.raceStartTs = Date.now();
        room.submittedResults = false;
        room.lastActivity = Date.now();
        broadcast(room, { type: 'phase', phase: 'countdown', seed: room.seed });
        break;
      }
      case 'input': {
        if (!room || !playerId) return;
        const p = room.players.get(playerId);
        if (!p) return;
        p.input.turn = Math.max(-1, Math.min(1, Number(msg.turn) || 0));
        room.lastActivity = Date.now();
        break;
      }
      case 'leave': {
        if (room && playerId) {
          room.players.delete(playerId);
          room.lastActivity = Date.now();
          if (room.players.size === 0) destroyRoom(room.code);
          else {
            if (room.hostId === playerId) room.hostId = room.players.keys().next().value;
            broadcast(room, lobbyState(room));
          }
        }
        roomCode = null; playerId = null;
        break;
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (!roomCode || !playerId) return;
    const r = rooms.get(roomCode);
    if (!r) return;
    const p = r.players.get(playerId);
    if (!p) return;

    // Start grace period. Player keeps their slot/boat; auto-drop after 20s.
    p.ws = null;
    p.connectedOrGrace = true;
    broadcast(r, lobbyState(r));
    const pid = playerId;
    const rc = roomCode;
    const timer = setTimeout(() => {
      const room2 = rooms.get(rc);
      if (!room2) return;
      const q = room2.players.get(pid);
      if (!q || q.ws) return;   // reconnected
      q.graceTimer = null;
      room2.players.delete(pid);
      room2.lastActivity = Date.now();
      if (room2.players.size === 0 && room2.aiBots.length === 0) {
        destroyRoom(rc);
      } else {
        if (room2.hostId === pid) {
          const next = room2.players.keys().next().value;
          if (next) room2.hostId = next;
        }
        broadcast(room2, lobbyState(room2));
      }
    }, RECONNECT_GRACE_MS);
    // Grace timer lives on the Player so a reconnect can cancel it and a room
    // teardown can clear it (was a write-only `disconnected` map that leaked).
    p.graceTimer = timer;
  });
});

http.listen(PORT, () => {
  console.log(`[regatta-ws] listening on :${PORT}  tick=${TICK_HZ}Hz  max=${MAX_PLAYERS_PER_ROOM}/room  grace=${RECONNECT_GRACE_MS}ms`);
});
