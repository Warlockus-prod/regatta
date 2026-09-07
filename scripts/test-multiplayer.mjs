// Real socket lifecycle regression test against an isolated local server.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
const WebSocket = createRequire(new URL("../ws-server/package.json", import.meta.url))("ws");
const port = 3198;
const server = spawn(process.execPath, ["ws-server/server.js"], { env: { ...process.env, PORT: String(port), NEXT_INTERNAL_URL: "http://127.0.0.1:1" }, stdio: ["ignore", "pipe", "pipe"] });
const sockets = [];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function client() {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  sockets.push(ws);
  const messages = [];
  ws.on("message", (raw) => messages.push(JSON.parse(raw)));
  await once(ws, "open");
  return { ws, messages, send: (m) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); }, async wait(type, predicate = () => true) {
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const index = messages.findIndex((m) => m.type === type && predicate(m));
      if (index >= 0) return messages.splice(index, 1)[0];
      await delay(20);
    }
    throw new Error(`Timed out waiting for ${type}`);
  } };
}
try {
  await Promise.race([once(server.stdout, "data"), once(server, "exit").then(([code]) => { throw new Error(`Server exited: ${code}`); })]);
  const host = await client();
  host.send({ type: "create", nickname: "Host QA", sid: "qa-host" });
  const room = await host.wait("joined");
  const guest = await client();
  guest.send({ type: "join", code: room.code, nickname: "Guest QA", sid: "qa-guest" });
  const joined = await guest.wait("joined");
  host.send({ type: "add-bot" });
  const roster = await host.wait("lobby-state", (m) => m.players.length === 3);
  assert.equal(roster.players.filter((p) => p.isBot).length, 1);
  host.send({ type: "start-race" });
  assert.equal((await host.wait("error")).code, "players-not-ready");
  host.send({ type: "leave" });
  await guest.wait("lobby-state", (m) => m.hostId === joined.id);
  const replacement = await client();
  replacement.send({ type: "join", code: room.code, nickname: "Guest QA", sid: "qa-guest" });
  assert.equal((await replacement.wait("joined")).id, joined.id);
  await delay(100);
  const connected = await replacement.wait("lobby-state", (m) => m.players.find((p) => p.id === joined.id)?.connected);
  assert.equal(connected.hostId, joined.id);
  const sailor = await client();
  sailor.send({ type: "join", code: room.code, nickname: "Second sailor", sid: "qa-second" });
  const sailorId = (await sailor.wait("joined")).id;
  sailor.send({ type: "ready", ready: true });
  await replacement.wait("lobby-state", (m) => m.players.some((p) => p.id === sailorId && p.ready));
  replacement.send({ type: "start-race" });
  await replacement.wait("phase", (m) => m.phase === "countdown");
  replacement.ws.close();
  await delay(100);
  const resumed = await client();
  resumed.send({ type: "join", code: room.code, nickname: "Guest QA", sid: "qa-guest" });
  await resumed.wait("joined");
  await resumed.wait("phase", (m) => m.phase === "countdown");
  await resumed.wait("phase", (m) => m.phase === "racing");
  const snapshot = await resumed.wait("state");
  assert.equal(snapshot.boats.length, 3);
  assert(snapshot.boats.every((b) => Number.isFinite(b.x) && Number.isFinite(b.s)));
  if (process.argv.includes("--full")) {
    const steer = (c, id) => c.ws.on("message", (raw) => {
      const m = JSON.parse(raw);
      if (m.type !== "state") return;
      const b = m.boats.find((b) => b.id === id);
      if (!b?.target) return;
      const dx = b.target.x - b.x, dy = b.target.y - b.y;
      let desired = Math.atan2(dx, -dy) * 180 / Math.PI;
      const angle = (x) => ((x + 540) % 360) - 180;
      if (Math.abs(angle(desired - m.wind.dir)) < 45) {
        const wind = m.wind.dir * Math.PI / 180;
        desired = m.wind.dir + (dx * Math.cos(wind) + dy * Math.sin(wind) >= 0 ? 48 : -48);
      }
      c.send({ type: "input", turn: Math.max(-1, Math.min(1, angle(desired - b.h) / 12)) });
    });
    steer(resumed, joined.id); steer(sailor, sailorId);
    const deadline = Date.now() + 310000;
    while (!resumed.messages.some((m) => m.type === "finished") && Date.now() < deadline) await delay(100);
    const finish = await resumed.wait("finished");
    assert(finish.results.every((r) => r.time != null), JSON.stringify(finish.results));
    console.log("PASS: two independent socket sailors and bot legally finished", finish.results.map((r) => r.time));
    resumed.ws.close(); await delay(100);
    const atFinish = await client();
    atFinish.send({ type: "join", code: room.code, nickname: "Guest QA", sid: "qa-guest" });
    await atFinish.wait("finished");
    atFinish.send({ type: "rematch" });
    await atFinish.wait("phase", (m) => m.phase === "lobby");
    console.log("PASS: reconnect to results and rematch in same room");
    atFinish.send({ type: "leave" });
  }
  resumed.send({ type: "leave" });
  console.log("PASS: bot roster, readiness gate, host transfer, socket replacement, countdown reconnect, authoritative racing snapshots");
} finally {
  for (const ws of sockets) ws.terminate();
  server.kill();
}
