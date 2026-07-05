# Game + ws-server fix spec (deferred from the 2026-07 audit)

> STATUS (2026-07-05): all 5 fixes DONE and live-tested (ws-server + next start +
> two protocol/browser clients). See the "Fixed (game / ws-server lane)" section
> in docs/AUDIT_2026-07.md for the per-fix verification.

These need a LIVE multiplayer test, so they were not blind-shipped from the web
worktree. Do them in a session that can run the ws-server + the app + two browser
clients (a fresh worktree with `npm ci` works: `next start` resolves once
node_modules is inside the worktree; `node ws-server/server.js` for the socket).

Confirmed high-severity first.

## 1. ws-server leaks player sid to the whole room (impersonation)  [HIGH, security]
Files: `ws-server/server.js`, `src/features/.../MultiplayerClient.tsx`.
Problem: the client sends its real `regatta_sid` (the unauthenticated write key
for /api/race-result etc.) as `sid`; server sets `playerId = sid` and includes
that id in every `lobby-state` broadcast, so any room peer learns your sid.
Fix (coordinated client+server):
- Server: on create/join, generate an opaque per-room player id (e.g. random
  token or HMAC(sid, roomSecret)). Keep a private `id -> sid` map server-side for
  rate-limiting only. Never put sid in any broadcast payload.
- Client: stop assuming `player.id === my sid`. Have the server tell the client
  its own opaque id in the join/create ack; identify "me" by that.
Verify: two browsers join one room; inspect the `lobby-state` WS frames - no sid
present; each client still highlights its own boat; leaderboard submit still works.

## 2. ws-server memory leaks on a long-running process  [MEDIUM]
File: `ws-server/server.js`.
- `disconnected` map (decl ~L49, set ~L638) is write-only - never read. Either
  wire it into a real grace-reconnect (read it on rejoin) or stop writing it.
- `ipHits` entries are never evicted; add a periodic sweep dropping empty/expired
  buckets.
- Orphan rooms: ensure a room with zero live sockets is deleted (clear its
  timers) so the rooms map cannot grow unbounded.
Verify: run scripts/stress-mp.js (now points at wss://weektoregatta.com/ws) or a
local loop; watch server memory / map sizes stay flat across connect/disconnect
churn. Note: the per-IP message cap was already raised 60 -> 240/s (shipped).

## 3. Game autopilot never engages/disengages (stale closure)  [HIGH, gameplay]
File: `src/app/game/GameClient.tsx` (game-loop effect ~L1046, deps
`[gameState, difficulty]`, exhaustive-deps disabled).
Problem: `step` reads `autopilotOn` captured at effect setup, so toggling it never
takes effect and the button state desyncs.
Fix: read the live value via a ref (`autopilotOnRef.current`, updated each render)
inside the rAF loop, or include it in a stable handler. Do NOT add it to the
effect deps directly (would restart the loop each toggle).
Verify: start a race, toggle autopilot mid-race - boat starts/stops steering
itself and the button reflects state.

## 4. Russian-only strings leak to all languages  [HIGH, i18n]
- `src/app/game/GameClient.tsx` ReplayOverlay renders `activeMistake.titleRu/
  explanationRu/fixRu` directly - use the localized alias fields (title/
  explanation/fix) via the same pick the coach normaliser exposes; a few HUD
  labels bypass tp().
- `ws-server/server.js` mission-evaluation reasons are Russian literals (e.g.
  'Не финишировал', 'Вошёл в мёртвую зону'); return a stable reason CODE and
  localize it on the client, or send all 7 langs.
- `src/app/api/og/result/route.tsx` share card is hardcoded Russian ('место',
  'НАСТРОЙКИ', 'ветер') - accept a `lang` param and localize.
Verify: play + finish a race in EN/ES; replay overlay + share card are not Russian.

## 5. Physics duplicated in 3 copies + educational mismatch  [MEDIUM]
- `speedFactorFromTWA`, `calcTWA`, `stepBoat`, `windAt` etc. exist 3x: GameClient,
  `src/lib/race-physics.ts`, ws-server. Import one source; add a vitest that
  asserts the ws-server mirror matches `race-physics.ts` (drift guard).
- Theory teaches a 45-degree no-go zone (`src/data/sailing-data.ts` in-irons
  angleMax 45) but the game uses 30. Pick one and align theory + game.
Verify: `npm run test:physics` stays green; the new drift test passes.

## Test harness quick start (fresh session)
```
npm ci
node ws-server/server.js &            # socket on :3001 (or per its config)
npm run build && npm start &          # app on :3000
# open two browser tabs / playwright contexts to /multiplayer, create + join a room
```
