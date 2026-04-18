# TECH

Architecture snapshot. Updated on structural changes (new module, removed
feature, changed data flow) - NOT on every commit. When updating, date the
entry in MEMORY.md pointing to the change.

**Last updated:** 2026-04-18 (after Phase 1: sailing-physics engine landed)

---

## Stack

- **Framework:** Next.js 16.2.4 (App Router, Turbopack, React 19.2)
- **Language:** TypeScript strict
- **Styling:** Tailwind v4 + CSS variables for dark-ocean theme
  (`--accent-cyan`, `--bg-primary`, `--bg-card`, `--text-primary`,
  `--text-secondary`, `--text-muted`, `--success`, `--warning`)
- **DB:** SQLite via `better-sqlite3`, file at `/data/regatta-stats.db` in
  the Docker volume
- **AI:** Claude Haiku 4.5 via `@anthropic-ai/sdk`, prompt caching on the
  system prompt
- **Realtime:** separate WebSocket server (`ws` library, 20 Hz authoritative)
  at `:4501` on VPS, consumed by `/multiplayer` page
- **i18n:** custom hook `useI18n()` from `src/lib/i18n`, `t(ru, en)` or
  `tp(ru, en, pl)` helper; three languages RU / EN / PL
- **Deploy:** Docker Compose on VPS (46.225.11.249), standalone Next build,
  GitHub Actions CI/CD via SSH push
- **PWA:** manifest + SVG icons, installable on home screen

---

## Routes (live, post-Phase 0)

**Content pages (static or simple client):**
- `/` - landing with 3 entry points + secondary tools grid
- `/start` - bootcamp (8 lessons, progress in localStorage)
- `/quick` - 15-min refresh for experienced sailors
- `/onboard` - "first week on board", expandable sections (open-by-default)
- `/courses` - points of sail with circular wind diagram
- `/racing` - tactics (start, marks, laylines, right-of-way)
- `/rules` - 8 scenario cards with SVG illustrations
- `/anatomy` - Bavaria 46 2D side profile with 17 clickable hotspots
  (3D removed Phase 0)
- `/checklist` - 48 items, 4 groups, progress saved
- `/glossary` - 51 sailing terms RU/EN, search + filter

**Interactive pages:**
- `/simulator` - VPP-style force-balance engine (post-Phase 2). Unified
  course + trim teaching screen on a single shared state.
- `/game` - race with AI opponents, Claude coach after finish. Arcade-style
  physics in `race-physics.ts` (top-down position/heading/speed), separate
  abstraction from `/simulator`'s VPP engine on purpose.
- `/multiplayer` - WebSocket room, 2-8 players
- `/leaderboard` - top times by difficulty / wind / mission
- `/r/[code]` - replay viewer with scrubbable timeline

**Admin / dynamic:**
- `/stats` - password-gated dashboard (users, sessions, events, feedback)

**API routes (`/api/`):**
- `log` - client event ingestion to SQLite
- `feedback` - feedback / bug reports (SQLite + JSONL)
- `coach` - race log -> Claude Haiku analysis
- `ai-chat` - open Q&A scoped to sailing, Claude Haiku with cached system
- `daily` - daily challenge
- `leaderboard` - top times query
- `player` - nickname get/set
- `race-result` - race finish persistence
- `replay` + `replay/[code]` - race replay storage
- `og/result` - dynamic OG card image via `next/og`
- `admin/feedback` - auth-protected status transitions

---

## Module map

```
src/
├── app/                  # Next.js App Router, one dir per route
├── components/
│   ├── Navigation.tsx    # top nav, primary bar + More dropdown, mobile panel
│   ├── LanguageToggle.tsx
│   └── FeedbackWidget.tsx # feedback + AI chat (both in one floating widget)
├── data/                 # pure TS data files (no React)
│   ├── anatomy.ts        # 17 Bavaria 46 parts
│   ├── bootcamp.ts       # 8 lessons
│   ├── missions.ts       # 4 game missions
│   ├── onboard.ts        # "first week" sections
│   ├── rules.ts          # 8 rule scenarios
│   └── sailing-data.ts   # points of sail + glossary
└── lib/
    ├── i18n.tsx          # useI18n + t/tp
    ├── storage.ts        # localStorage with versioning
    ├── db.ts             # better-sqlite3 singleton
    ├── rate-limit.ts     # in-memory IP/session rate limits
    ├── log.ts            # structured server log
    ├── fallback-coach.ts # rule-based coach if no ANTHROPIC_API_KEY
    ├── race-physics.ts   # shared fake physics (TWA -> speedFactor) -
    │                     # SLATED FOR REPLACEMENT by sailing-physics module
    └── sailing-physics/  # real VPP-style engine (Phase 1, ADR-0001)
        ├── types.ts      # BoatState, BoatParams, Controls, Diagnostics
        ├── boat.ts       # abstract 2-sail cruiser params
        ├── wind.ts       # true wind -> apparent wind vector math
        ├── aero.ts       # Cl/Cd piecewise curves with stall
        ├── forces.ts     # sail forces (drive + side) + slot multiplier
        ├── balance.ts    # heel + leeway from moment balance
        ├── simulate.ts   # tick(state, controls, params, dt) - pure function
        ├── simulate.test.ts # 5 ADR-0001 verification tests (+3 sanity)
        └── index.ts      # public API barrel export
```

---

## Data flow

**Client event ingestion:** client emits via `fetch('/api/log', { ... })` →
rate-limited → SQLite `events` table → visible in `/stats` admin.

**Feedback:** widget → `/api/feedback` → SQLite `feedback` + JSONL backup →
status-transition UI in `/stats`.

**Game:** local React state game loop → per-frame computation in
`GameClient.tsx`. Race log accumulated, on finish POSTed to `/api/coach`
which hands to Claude Haiku with cached system prompt.

**Multiplayer:** client -> WS `:4501` -> authoritative 20 Hz server → broadcast
world state back. Server is separate Node process (`ws-server/`, not part of
Next build).

**Replay:** race finish posts compressed trajectory to `/api/replay` →
SQLite → `/r/[code]` renders canvas scrub UI reading `/api/replay/[code]`.

**i18n:** `useI18n()` reads `lang` from cookie (set by middleware
`src/middleware.ts` acting as proxy); components use `t('ru', 'en')` or
`tp('ru', 'en', 'pl')`.

---

## Infrastructure

- VPS: `46.225.11.249` (Ubuntu)
- Next app: Docker container exposing `172.17.0.1:4500`
- WS server: `172.17.0.1:4501` (separate container)
- Nginx: Let's Encrypt SSL, CSP (see `regatta.nginx.conf`), proxy to app
- DB: bind mount `/data/` on VPS -> `/data` in container, so SQLite survives
  redeploys
- Secrets: `.env` on VPS at `/opt/repos/regatta/.env`, never committed
  (`ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`)
- CI/CD: GitHub Actions `.github/workflows/deploy.yml` on push to main →
  SSH to VPS → `git pull` + `docker compose up -d --build`

---

## Coming (Phase 2, not yet in tree)

- New `/simulator` UI that reads `sailing-physics` state directly.
  Two panels on one page: top = course/wind/vectors/metrics,
  bottom = sheets/trim diagnostics. Both panels produced by one
  `tick()` per frame (shared state, not two URLs).
- (No forced migration of `/game` off `race-physics.ts`. The game is an
  arcade, not a simulator; its abstraction is fit-for-purpose.)

See DECISIONS.md ADR-0001 and ROADMAP.md Phase 2/3 for the plan.

---

## Known dead weight (next cleanup sweep candidates)

- `src/lib/race-physics.ts` - will be superseded by sailing-physics but is
  still used by `/game` and `/simulator`. Plan: migrate game to new engine
  after Phase 2, then delete race-physics.
- `PROBLEMS.md`, `WAVE6.md` - legacy wave files, not updated, should be
  consolidated into MEMORY.md or deleted after Phase 0.
