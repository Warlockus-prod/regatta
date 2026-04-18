// Regatta multiplayer server
// - authoritative physics at 20Hz per room
// - lobby codes (4 chars), max 6 players per room
// - wire protocol: JSON (easy to debug, will migrate to msgpack if needed)

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import * as P from './race-physics.js';

const PORT = Number(process.env.PORT || 3001);
const TICK_HZ = 20;
const MAX_PLAYERS_PER_ROOM = 6;
const ROOM_IDLE_TIMEOUT_MS = 15 * 60 * 1000;   // 15 min
const COUNTDOWN_SEC = 5;

// ------------------------------ Health endpoint ---------------------------

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

// ------------------------------ Room state --------------------------------

/** @typedef {{
 *   code: string,
 *   hostId: string,
 *   phase: 'lobby' | 'countdown' | 'racing' | 'finished',
 *   seed: number,
 *   raceStartTs: number,
 *   course: any,
 *   players: Map<string, { ws: any, id: string, nickname: string, boat: any, input: {turn:number}, ready: boolean }>,
 *   results: any[],
 *   lastActivity: number,
 * }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();
/** @type {Map<any, string>} */
const clients = new Map();  // ws -> roomCode

function randCode() {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  // no confusing chars
  let s = '';
  for (let i = 0; i < 4; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

function newRoom(hostId) {
  let code;
  do { code = randCode(); } while (rooms.has(code));
  const room = {
    code,
    hostId,
    phase: 'lobby',
    seed: Math.floor(Math.random() * 1000),
    raceStartTs: 0,
    course: P.makeStandardCourse(),
    players: new Map(),
    results: [],
    lastActivity: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function sendJson(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj, exceptId = null) {
  const msg = JSON.stringify(obj);
  for (const p of room.players.values()) {
    if (p.id !== exceptId && p.ws.readyState === p.ws.OPEN) p.ws.send(msg);
  }
}

function lobbyState(room) {
  return {
    type: 'lobby-state',
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id, nickname: p.nickname, ready: p.ready,
    })),
  };
}

function spawnBoat(room, id, nickname, index) {
  const line = room.course.startLine;
  const cx = (line.a.x + line.b.x) / 2;
  const t = room.players.size === 1 ? 0 : (index / Math.max(1, room.players.size - 1)) * 2 - 1;
  return {
    id,
    name: nickname,
    pos: { x: cx + t * 60, y: line.a.y + 30 },
    heading: 0,
    speed: 0,
    lapDone: 0,
  };
}

// ------------------------------ Game loop ---------------------------------

const COLORS = ['#00d4ff', '#ff6688', '#ffdd44', '#44ff88', '#aa88ff', '#ff8844'];

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    // GC idle rooms
    if (now - room.lastActivity > ROOM_IDLE_TIMEOUT_MS && room.players.size === 0) {
      rooms.delete(code);
      continue;
    }

    if (room.phase === 'countdown') {
      const remain = Math.max(0, COUNTDOWN_SEC - (now - room.raceStartTs) / 1000);
      broadcast(room, { type: 'countdown', remain });
      if (remain <= 0) {
        room.phase = 'racing';
        room.raceStartTs = now;
        broadcast(room, { type: 'phase', phase: 'racing' });
      }
      continue;
    }

    if (room.phase !== 'racing') continue;

    // Physics tick
    const raceT = (now - room.raceStartTs) / 1000;
    const wind = P.windAt(raceT, room.seed);

    const dt = 1 / TICK_HZ;
    const prevPositions = new Map();
    const boats = [];
    for (const p of room.players.values()) {
      prevPositions.set(p.boat.id, { ...p.boat.pos });
      if (p.boat.lapDone < 2) {
        P.stepBoat(p.boat, dt, wind.dir, wind.gust, p.input, { speedMul: 1.0, windStrengthMul: 1.0 });
      }
      boats.push(p.boat);
    }
    P.resolveCollisions(boats);

    // Lap / finish events
    const events = [];
    for (const p of room.players.values()) {
      if (p.boat.lapDone >= 2) continue;
      const prev = prevPositions.get(p.boat.id);
      const res = P.updateLap(p.boat, prev, room.course, raceT);
      if (res) events.push({ id: p.boat.id, type: res, t: raceT });
    }

    // Broadcast state
    broadcast(room, {
      type: 'state',
      t: raceT,
      wind: { dir: Math.round(wind.dir * 10) / 10, gust: Math.round(wind.gust * 100) / 100 },
      boats: Array.from(room.players.values()).map((p) => ({
        id: p.boat.id,
        x: Math.round(p.boat.pos.x * 10) / 10,
        y: Math.round(p.boat.pos.y * 10) / 10,
        h: Math.round(p.boat.heading * 10) / 10,
        s: Math.round(p.boat.speed * 100) / 100,
        l: p.boat.lapDone,
        f: p.boat.finishTime ?? null,
      })),
      events,
    });

    // Race end condition
    const allDone = Array.from(room.players.values()).every((p) => p.boat.lapDone === 2);
    const tooLong = raceT > 300;
    if (allDone || tooLong) {
      room.phase = 'finished';
      room.results = Array.from(room.players.values())
        .map((p) => ({ id: p.boat.id, nickname: p.nickname, time: p.boat.finishTime ?? null }))
        .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
      broadcast(room, { type: 'finished', results: room.results });
    }
  }
}, 1000 / TICK_HZ);

// ------------------------------ WS handlers -------------------------------

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws) => {
  /** @type {string | null} */
  let playerId = null;
  /** @type {string | null} */
  let roomCode = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const room = roomCode ? rooms.get(roomCode) : null;

    switch (msg.type) {
      case 'create': {
        playerId = String(msg.sid || ('p' + Math.random().toString(36).slice(2, 8)));
        const nickname = String(msg.nickname || 'Player').slice(0, 20);
        const r = newRoom(playerId);
        r.players.set(playerId, {
          ws, id: playerId, nickname,
          boat: spawnBoat(r, playerId, nickname, 0),
          input: { turn: 0 },
          ready: false,
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
        if (r.phase !== 'lobby') { sendJson(ws, { type: 'error', message: 'Гонка уже идёт' }); return; }
        if (r.players.size >= MAX_PLAYERS_PER_ROOM) { sendJson(ws, { type: 'error', message: 'Комната полна' }); return; }
        playerId = String(msg.sid || ('p' + Math.random().toString(36).slice(2, 8)));
        const nickname = String(msg.nickname || 'Player').slice(0, 20);
        const idx = r.players.size;
        r.players.set(playerId, {
          ws, id: playerId, nickname,
          boat: spawnBoat(r, playerId, nickname, idx),
          input: { turn: 0 },
          ready: false,
        });
        r.lastActivity = Date.now();
        roomCode = r.code;
        clients.set(ws, r.code);
        sendJson(ws, { type: 'joined', code: r.code, id: playerId, isHost: false });
        broadcast(r, lobbyState(r));
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
        if (!room || !playerId) return;
        if (room.hostId !== playerId) return;
        if (room.phase !== 'lobby') return;
        room.phase = 'countdown';
        room.raceStartTs = Date.now();
        room.lastActivity = Date.now();
        broadcast(room, { type: 'phase', phase: 'countdown', seed: room.seed });
        break;
      }
      case 'input': {
        if (!room || !playerId) return;
        const p = room.players.get(playerId);
        if (!p) return;
        const turn = Math.max(-1, Math.min(1, Number(msg.turn) || 0));
        p.input.turn = turn;
        room.lastActivity = Date.now();
        break;
      }
      case 'leave': {
        if (room && playerId) {
          room.players.delete(playerId);
          room.lastActivity = Date.now();
          broadcast(room, lobbyState(room));
          if (room.players.size === 0) rooms.delete(room.code);
        }
        roomCode = null; playerId = null;
        break;
      }
    }
  });

  ws.on('close', () => {
    if (roomCode && playerId) {
      const r = rooms.get(roomCode);
      if (r) {
        r.players.delete(playerId);
        r.lastActivity = Date.now();
        if (r.players.size === 0) rooms.delete(r.code);
        else {
          // Transfer host if needed
          if (r.hostId === playerId) {
            r.hostId = r.players.keys().next().value;
          }
          broadcast(r, lobbyState(r));
        }
      }
    }
    clients.delete(ws);
  });
});

http.listen(PORT, () => {
  console.log(`[regatta-ws] listening on :${PORT}  tick=${TICK_HZ}Hz`);
});
