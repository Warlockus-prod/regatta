# TECH

Architecture snapshot. Updated on structural changes (new module, removed
feature, changed data flow) - NOT on every commit. When updating, date the
entry in MEMORY.md pointing to the change.

**Last updated:** 2026-04-20 (after three-simulator line V1/V2/V3 + 6
post-audit fixes landed and FEATURES.md split out).

For the user-facing feature list see `FEATURES.md`. This file covers
architecture, modules, data flow, infrastructure.

---

## Stack

- **Framework:** Next.js 16.2.4 (App Router, Turbopack, React 19.2)
- **Language:** TypeScript strict
- **Styling:** Tailwind v4 + CSS variables for dark-ocean theme
  (`--accent-cyan`, `--bg-primary`, `--bg-card`, `--text-primary`,
  `--text-secondary`, `--text-muted`, `--success`, `--warning`)
- **3D (V2 simulator only):** `@react-three/fiber` + `@react-three/drei`
  + `three` ~0.184
- **Canvas (V1 simulator + game):** native HTML5 Canvas 2D
- **SVG (V3 simulator + static diagrams):** React-rendered SVG with
  inline paths and gradients
- **DB:** SQLite via `better-sqlite3`, file at `/data/regatta-stats.db`
  in the Docker volume
- **AI:** Claude Haiku 4.5 via `@anthropic-ai/sdk`, prompt caching on
  the system prompt
- **Realtime:** separate WebSocket server (`ws` library, 20 Hz
  authoritative) at `:4501` on VPS, consumed by `/multiplayer` page
- **i18n:** custom hook `useI18n()` from `src/lib/i18n`, `t(ru, en)` or
  `tp(ru, en, pl)` helper; three languages RU / EN / PL
- **Tests:** Vitest (physics engine only, `npm run test:physics`);
  Playwright MCP for manual browser audits
- **Deploy:** Docker Compose on VPS (46.225.11.249), standalone Next
  build, GitHub Actions CI/CD via SSH push
- **PWA:** manifest + SVG icons, installable on home screen

---

## Routes

**Three simulators side by side** - all three over the same
`sailing-physics` engine, each different render surface:

- `/simulator` V1 - HTML5 Canvas top-down. Drag + arrow keys.
  Wind arrow draggable (hitbox: radius > 25% AND within 25 deg of
  wind-from direction). Sails render on leeward side (tack-sign fixed
  2026-04-20).
- `/simulator2` V2 - Three.js immersive 3D. Sky + lights all local
  (Environment HDR removed due to CSP; camera at `[5, 4.5, 11]`).
- `/simulator-v3` V3 - SVG cockpit: 4 corner pods (WIND, MAIN, JIB,
  VIEW), center scene with inflated sails (two Q-curve belly + linear
  gradient), metrics strip, commentary line, Optim button, glossary
  footer.

**Content pages:**
- `/` landing with 3 entry points + secondary tools grid
- `/start` bootcamp (8 lessons, progress in localStorage)
- `/quick` 15-min refresh for experienced sailors
- `/onboard` "first week on board" (sections open by default)
- `/courses` points of sail with circular wind diagram (boat rotates
  by TWA; tack labels at bottom horizontal post 2026-04-20)
- `/racing` tactics (start, marks, laylines, right-of-way)
- `/rules` 8 scenario cards + 3 external RRS links in footer
- `/anatomy` Bavaria 46 2D side profile, 17 clickable hotspots
- `/checklist` reading reference, 8 sections (converted from a
  checkbox form)
- `/glossary` 51 sailing terms RU + EN, search + filter

**Interactive pages:**
- `/game` race with AI opponents, Claude coach after finish. Arcade-
  style physics in `race-physics.ts` (top-down position / heading /
  speed), separate abstraction from the VPP engine on purpose.
- `/multiplayer` WebSocket room, up to 10 players, 20 Hz authoritative
  server
- `/leaderboard` top times by difficulty / wind / mission
- `/r/[code]` replay viewer with scrubbable timeline

**Admin:**
- `/stats` password-gated dashboard (users, sessions, events, feedback)

**API (`/api/`):**
- `log` - client event ingestion to SQLite
- `feedback` - feedback / bug reports (SQLite + JSONL)
- `coach` - race log -> Claude Haiku analysis (fallback rule-based
  coach in `src/lib/fallback-coach.ts` when no `ANTHROPIC_API_KEY`)
- `ai-chat` - open Q&A scoped to sailing, Claude Haiku with cached
  system
- `daily` - daily challenge (mission + wind seed per UTC day)
- `leaderboard` - top times query
- `player` - nickname get / set
- `race-result` - race finish persistence
- `replay` + `replay/[code]` - race replay storage (6-char [A-Z2-9]
  codes)
- `og/result` - dynamic OG card image via `next/og`
- `admin/feedback` - auth-protected status transitions

---

## Module map

```
src/
├── app/                        # Next.js App Router, one dir per route
│   ├── simulator/              # V1 canvas top-view
│   ├── simulator2/             # V2 Three.js immersive
│   │   └── SailingScene.tsx    # the R3F scene
│   ├── simulator-v3/           # V3 SVG cockpit (pods + belly sails)
│   ├── multiplayer/
│   │   └── MultiplayerClient.tsx  # WS client + lobby + in-race UI
│   ├── game/
│   │   └── GameClient.tsx      # arcade physics + AI opponents
│   ├── r/[code]/               # replay viewer
│   ├── stats/                  # auth-gated admin (basic auth)
│   └── [content pages]/
├── components/
│   ├── Navigation.tsx          # top nav, More dropdown, mobile panel
│   ├── LanguageToggle.tsx
│   └── FeedbackWidget.tsx      # feedback + AI chat (one floating widget)
├── data/                       # pure TS data files (no React)
│   ├── anatomy.ts              # 17 Bavaria 46 parts
│   ├── bootcamp.ts             # 8 lessons
│   ├── missions.ts             # 4 game missions
│   ├── onboard.ts              # "first week" sections
│   ├── rules.ts                # 8 rule scenarios
│   └── sailing-data.ts         # points of sail + glossary
└── lib/
    ├── i18n.tsx                # useI18n + t / tp
    ├── storage.ts              # localStorage with versioning
    ├── db.ts                   # better-sqlite3 singleton
    ├── rate-limit.ts           # in-memory IP + session rate limits
    ├── log.ts                  # structured server log
    ├── client-log.ts           # client-side telemetry helper
    ├── fallback-coach.ts       # rule-based coach if no API key
    ├── mp-client.ts            # multiplayer WS client + resume state
    ├── sounds.ts               # small audio helpers
    ├── race-physics.ts         # arcade physics for /game (lookup table
    │                           # abstraction - by design, NOT fake; the
    │                           # arcade is a different surface than
    │                           # /simulator's VPP engine)
    └── sailing-physics/        # VPP-style engine (Phase 1, ADR-0001)
        ├── types.ts            # BoatState, BoatParams, Controls, Diag
        ├── boat.ts             # abstract 2-sail cruiser params
        ├── wind.ts             # true wind -> apparent wind vector math
        ├── aero.ts             # Cl/Cd piecewise curves with stall
        ├── forces.ts           # sail forces (drive + side) + slot mod
        ├── balance.ts          # heel + leeway from moment balance
        ├── simulate.ts         # tick(state, controls, params, dt)
        ├── simulate.test.ts    # 8 Vitest tests (5 ADR-0001 + 3 sanity)
        └── index.ts            # public barrel export
```

---

## Physics engine (`src/lib/sailing-physics/`)

See `DECISIONS.md` ADR-0001 for the full spec. Snapshot:

- Pure TypeScript. No React, no `fetch`, no DOM imports.
- 8-step tick pipeline: apparent wind -> effective sail angle per sail
  -> AoA -> Cl/Cd (piecewise with stall at ~20 deg) -> sail forces
  -> slot modifier on main from jib -> heel/leeway from moment balance
  -> integrate bs.
- Boat model: abstract 2-sail cruiser, ~40 ft, ~8 tonnes, GM=1.0,
  hull-drag K=220. Main ~45 m2, jib ~30 m2.
- Reef/furl: `area = (1 - 0.65 * r)` so r=1.0 -> 35% of full.
- Downwind blanketing: jib on same side as main at TWA > 135 deg loses
  up to 60% of its force.
- Verification: 8/8 green per `npm run test:physics`. Table in
  `FEATURES.md` section 3.

**Used by:** `/simulator` V1, `/simulator2` V2, `/simulator-v3` V3
(all three wire `settle()` into their render loops). NOT used by
`/game` (see `race-physics.ts` below) or `/multiplayer` (server has
its own physics tick).

**Explicitly out of scope (V1):** ORC tables, CFD, dynamic sail shape
(Cunningham/outhaul/backstay), spinnaker/gennaker/Code 0, traveler/
vang micro-controls, rudder/yaw dynamics, current, tides, waves,
gusts as wind-field perturbations.

---

## Arcade physics (`src/lib/race-physics.ts`)

Top-down position/heading/speed model used by `/game`. Lookup-table
abstraction (TWA -> speedFactor) intentionally simpler than the VPP
engine. Game is an arcade racing surface, not a simulator.

Candidate for migration to `sailing-physics` in ROADMAP.md Phase 3,
with game-specific logic (AI opponents, missions, collisions) staying
in `GameClient.tsx`.

---

## Multiplayer server (`ws-server/`, not in Next build)

- Separate Node process with `ws` library
- Port `:4501` bound to `172.17.0.1` on VPS
- Authoritative 20 Hz tick: receives player intents (heading, sheet),
  simulates world, broadcasts state back
- Stress-tested 8 clients at 20.3 Hz (single session, earlier)
- Lobby codes: 4 chars, ~1.7M space
- Replay codes: 6 chars [A-Z2-9]
- Reconnect grace: 20 seconds

Client: `src/lib/mp-client.ts` + `src/app/multiplayer/MultiplayerClient.tsx`.

---

## Data flow

**Client event ingestion:** client emits via `fetch('/api/log', { ... })`
-> rate-limited -> SQLite `events` table -> visible in `/stats` admin.

**Feedback:** widget -> `/api/feedback` -> SQLite `feedback` + JSONL
backup -> status transitions in `/stats`.

**Game coach:** local React state game loop -> per-frame computation
in `GameClient.tsx`. Race log accumulated; on finish POSTed to
`/api/coach` which hands to Claude Haiku with a cached system prompt.

**Multiplayer:** client -> WS `:4501` -> authoritative 20 Hz server
-> broadcast world state back. Session identity via `regatta_sid`
cookie set by `src/middleware.ts` (one session per browser, not per
tab).

**Replay:** race finish posts compressed trajectory to `/api/replay`
-> SQLite -> `/r/[code]` renders canvas scrub UI reading
`/api/replay/[code]`. Invalid codes render a clean error state, not
a 500.

**i18n:** `useI18n()` reads `lang` from cookie set by middleware;
components use `t('ru', 'en')` or `tp('ru', 'en', 'pl')`.

---

## Infrastructure

- VPS: `46.225.11.249` (Ubuntu)
- Next app container: `172.17.0.1:4500`
- WS container: `172.17.0.1:4501`
- Nginx: Let's Encrypt SSL, CSP in `regatta.nginx.conf` - only
  `'self'`, no external HDR / image / font sources (which is why V2's
  original `<Environment preset="sunset">` was replaced; its HDR was
  fetched from `raw.githack.com`, blocked).
- DB: bind mount `/data/` on VPS -> `/data` in container. SQLite
  persists across redeploys.
- Secrets: `.env` on VPS at `/opt/repos/regatta/.env`, never committed
  (`ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`).
- CI/CD: `.github/workflows/deploy.yml` on push to main -> SSH to
  VPS -> `git pull` + `docker compose up -d --build`.

---

## Known rough edges

- **`middleware.ts` deprecation warning** (Next 16). Cosmetic.
  Rename to `proxy.ts` in a small sweep.
- **`metadataBase` warning** during OG generation. Cosmetic. Set
  `metadataBase` in `src/app/layout.tsx`.
- **`race-physics.ts` still alive.** By design until Phase 3. See
  ROADMAP.md.
- **V2 desktop camera.** Camera at `[5, 4.5, 11]` reads better than
  the old `[8, 5, 9]` but still shows sails flat at some TWA.
  Not a blocker; cosmetic.
- **Polish content on data-file-backed routes** (`/glossary`,
  `/anatomy`, `/onboard`, `/start`, `/rules` scenario bodies,
  `/checklist` section bodies) falls back to EN. See
  `docs/I18N_AUDIT.md`.
- **Multiplayer 2-tab test in same browser is not possible** due to
  `regatta_sid` cookie being per-browser, not per-tab. True 2-client
  sync needs two distinct browser instances or incognito windows.

---

## Commands

**Run locally:**
```
npm install
npm run dev                   # http://localhost:3000
```

**Build + test:**
```
npx next build                # production build, 0 TS errors expected
npm run test:physics          # 8/8 green
```

**Em-dash sweep (PATTERNS.md D3):**
```
git ls-files '*.ts' '*.tsx' '*.js' '*.md' '*.json' '*.css' '*.conf' \
  | xargs perl -nle 'print "$ARGV:$.: $_" if /[\x{2014}\x{2013}]/'
```

**Deploy:**
```
git push origin main          # CI picks it up
```

**Rollback:**
```
ssh root@46.225.11.249
cd /opt/repos/regatta
git checkout <tag>
docker compose up -d --build
```

**DB poke:**
```
docker exec regatta sh -c 'sqlite3 /data/regatta-stats.db "SELECT COUNT(*) FROM events"'
```
