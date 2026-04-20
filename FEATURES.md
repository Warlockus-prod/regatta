# FEATURES

**Last updated:** 2026-04-20 (after V1/V2/V3 simulator split + physics engine live)
**Live:** https://regatta.icoffio.com

Inventory of everything the app does today. This is the user-facing
counterpart to `TECH.md` (architecture) and `AUDIT.md` (code-health).
When a feature is added, moved, or retired, update this file in the
same commit.

Sections:
1. At a glance
2. Three simulator versions (V1 / V2 / V3)
3. Physics engine
4. Learning content pages
5. Race game (AI opponents + coach)
6. Multiplayer
7. Replay viewer
8. Leaderboard + daily challenge
9. Admin / stats dashboard
10. Internationalization (RU / EN / PL)
11. Global UI and accessibility
12. API surface
13. Stack + infrastructure + deploy
14. What the app deliberately does NOT do

---

## 1. At a glance

Regatta is an interactive sailing education app. It teaches three
subjects side by side:

- **Course and wind** - points of sail, apparent vs true wind, no-go
  zone, tacks.
- **Sail trim** - sheet angles, twist, attached vs stalled flow, slot
  between jib and main, heel and leeway.
- **Racing** - rules of the road, start, mark roundings, laylines,
  tactics, right-of-way.

The app is bilingual-plus-Polish (RU / EN / PL) with a single language
toggle. Everything runs client-side except the physics engine tests
(pure TS, run by Vitest locally), the multiplayer authoritative server
(separate WS process), the SQLite event log, and the Claude Haiku
coaching endpoint.

**Three simulator versions** live side by side at `/simulator` (V1),
`/simulator2` (V2), `/simulator-v3` (V3). Each is a different teaching
surface over the same shared `sailing-physics` engine.

---

## 2. Three simulator versions (V1 / V2 / V3)

All three versions read the same `sailing-physics` engine. They differ
in render surface, level of abstraction, and who they are for.

### V1 - Canvas (engineer's panel) `/simulator`

HTML5 Canvas top-down view of a boat on a circle. The wind blows from
the top (or from wherever the user drags the wind arrow). The sails
render on the leeward side of the boat, correctly rotated to show the
current tack.

**Controls:**
- Drag the boat to rotate heading.
- Drag the wind arrow (grabbed when pointer is > 25% from center AND
  within 25 deg of the wind-from direction) to change wind direction.
- Sliders: wind direction, wind speed, boat heading.
- Arrow keys: rotate boat left/right, adjust wind speed.

**Visible elements:**
- Boat silhouette (hull + mast + sails), sails on the leeward side.
- No-go cone shaded red at top of circle.
- Compass ring N / E / S / W.
- Wind arrow with TWS label.
- Wave particles animating in wind direction.
- Info panel: current point of sail (Левентик / Бейдевинд / Галфвинд /
  Бакштаг / Фордевинд), angle, speed, sail angle, sail-work description.

**Hint text** under controls: "Тащи за лодку чтобы её повернуть, или за
стрелку ветра чтобы поменять направление ветра. Слайдеры и стрелки
клавиатуры тоже работают."

**Physics:** `getTackSide(boatHeading, windDir)` determines left/right
tack, used to mirror sail rendering. Speed comes from the engine's
`settle()` output per current controls.

### V2 - Three.js 3D (immersive) `/simulator2`

Full-bleed 3D scene with boat hull, mast, mainsail and jib, and an
animated wave field.

**Scene composition:**
- Sky preset (no external HDR; the original `<Environment
  preset="sunset">` was removed because it fetched from raw.githack.com
  and our CSP blocks that domain).
- Ambient + hemisphere + directional lights, all local.
- Camera at `[5, 4.5, 11]` so sails read broadside on desktop. Mobile
  aspect renders naturally well.
- Floating glass cards over the scene show TWA / AWA / AWS / boat speed
  / heel / leeway as big mono numerals.
- Sticky control strip below the hero: wind slider, heading slider,
  sheet sliders.

**Targets:** user who wants to see sailing rather than read numbers. A
showpiece, not the deepest teaching surface.

### V3 - SVG cockpit (teaching panel) `/simulator-v3`

A compact 4-pod SVG layout:

- **Top-left WIND pod**: TWS dial, TWA arrow, AWA readout.
- **Top-right MAIN pod**: main sheet angle, main AoA, ТЯНЕТ / СРЫВ
  (working / stalled) badge.
- **Bottom-left JIB pod**: jib sheet angle, jib AoA, ТЯНЕТ / СРЫВ badge.
- **Bottom-right VIEW pod**: toggle between top view and rear view
  (rear shows heel angle visually with a heeled horizon).
- **Center scene**: top-view boat with sails drawn as inflated canvas,
  drive + side vectors, slot marker between jib and main.
- **Metrics strip** (below scene): speed, heel, AWA, trim %.
- **Commentary line**: one-line diagnosis, e.g. "Слот здоров" / "Грот
  перетянут".
- **"Оптим" button**: applies recommended trim for current TWA / TWS.
  After click: sails flip from red "СРЫВ" to green "ТЯНЕТ", speed
  jumps, slot healthy.
- **Glossary footer**: expandable block "Что означают все эти
  сокращения?" lists 14 terms (TWS, TWA, AWS, AWA, VMG, Heel, Leeway,
  Slot, Stall, Drive, Side, AoA, Optimum, Trim).

**Sail rendering:** each sail is two quadratic curves forming a belly
(not a flat triangle). Linear gradient from `#dce7ee` (luff, shaded) to
`#ffffff` (mid, bright) to `#b9c9d4` (leech, shaded) makes the canvas
read like sailcloth under pressure.

**Defaults (tuned 2026-04-20):** `mainAngle=52, jibAngle=54`. Initial
boat-speed seed `max(3, TWS * 0.45)`. These land the engine OUT of its
starved-flow attractor so the user sees a healthy default state, not a
stall.

**Target:** user who wants to read the physics: stall vs attached,
over-trim vs under-trim, slot health.

### V1 vs V2 vs V3 in one line each

- V1 - classic flat diagram, drag + keyboard, maximum familiarity.
- V2 - pretty 3D scene for vibe.
- V3 - structured cockpit panel for learning.

---

## 3. Physics engine `src/lib/sailing-physics/`

Pure TypeScript VPP-style force-balance engine. 8-step tick pipeline,
no React imports, no `fetch`, no DOM.

**Tick steps:**
1. Apparent wind = true wind + boat velocity (vector).
2. Effective sail angle per sail from sheet + twist.
3. AoA of each sail vs apparent wind.
4. Cl / Cd from piecewise curve with explicit stall (onset around 20
   deg AoA).
5. Sail forces -> drive + side.
6. Soft slot modifier on main from jib state (not a Venturi myth - a
   tuned downwash).
7. Leeway + hull drag + heel from righting vs heeling moment.
8. Integrate boat speed. Heading is user input (no yaw dynamics in V1).

**Boat model:** abstract 2-sail cruiser, ~40 ft, ~8 tonnes displacement,
~2 m draft, GM = 1.0, hull drag K = 220. Main sail ~45 m2, jib ~30 m2.

**Tuning constants (locked per ADR-0001):**
- Cl peak = 1.5
- Stall onset AoA ~= 20 deg, drag blow-up from there
- Reef / furl: area = (1 - 0.65 * r), so r=1.0 -> 35% of full
- Downwind blanketing: jib on same side as main at TWA > 135 deg loses
  up to 60% of its force
- Beam-reach heel target [6, 15] deg (cruiser, not race boat)

**Verification tests (`npm run test:physics`):** 8/8 green.

| Test | Measured | Expected | Pass |
|---|---|---|---|
| Beam reach TWS=12 neutral | bs 6.44 kt, heel 7.5° | bs [5, 6.5], heel [6, 15] | yes |
| Over-trim stall | 12.4% speed drop | >= 10% | yes |
| Close-hauled TWA=40 TWS=12 | bs 5.17, AWA 25 < TWA, AWS 15.7 > TWS | forward apparent | yes |
| Heavy TWS=22 unreefed | bs 8.23, heel 40.6° | heel > 25° | yes |
| Heavy TWS=22 reefed | bs 5.94, heel 17.7° | heel < 22° | yes |
| Wing-on-wing TWA=180 | drive 899 > same-side 754 | wing wins | yes |
| Sanity: TWS=0 | zero forces | yes | yes |
| Sanity: head-to-wind | drive ~= 0 | yes | yes |

**Not in the engine (by design):**
- ORC tables, CFD, dynamic sail shape (Cunningham / outhaul / backstay),
  spinnaker / gennaker / Code 0, traveler / vang micro-controls, rudder
  / yaw dynamics, current, waves, gusts as wind-field perturbations.

These are candidates for Phase 4+ (see `ROADMAP.md`).

---

## 4. Learning content pages

All content pages are static or simple client React. Free of AI cost,
free of physics ticks, CSP-clean, fast.

### `/` Landing

Three primary entry cards: Start bootcamp, Simulator, Game. Secondary
grid with all other tools (courses, rules, anatomy, checklist,
glossary, multiplayer, leaderboard, onboard, quick).

### `/start` Bootcamp (8 lessons)

Progression path for a newcomer. Progress stored in `localStorage`.
Each lesson is self-contained: explanation + mini-exercise +
"next lesson" card.

### `/quick` Quick refresh (15 min)

For sailors returning after a layoff. Compact highlights of the 8
lessons without the full walkthrough.

### `/onboard` First week on board

Sections open by default (not accordions you have to click through):
what-to-listen-for, first 10 minutes, parts of the boat, maneuvers,
start drill, docking, summer tips, golden rules.

### `/courses` Points of sail diagram

Circular SVG wind diagram showing:
- Sector labels (Левентик, Бейдевинд, Галфвинд, Бакштаг, Фордевинд)
- Tack labels (ЛЕВЫЙ ГАЛС, ПРАВЫЙ ГАЛС) now at the bottom of the
  diagram, horizontal - no longer vertical at east/west where they
  collided with sector labels on narrow viewports.
- 5 sector thumbnails around the ring, each showing the boat at its
  actual angle to the (always-top) wind arrow, sail at the correct
  angle, bow marker dot. The 5 thumbnails now look visibly different -
  in-irons up, close-hauled tilted, beam reach horizontal, broad reach
  aft-angled, running downward.

### `/racing` Racing tactics

Start line strategy, upwind / downwind tactics, mark roundings,
laylines, wind shifts, covering, VMG.

### `/rules` Rules of the road (8 scenarios)

Each scenario is an accordion with SVG diagram + explanation. First
one open by default: "Левый и правый галс" with a port/starboard
diagram showing wind arrow and two boats meeting.

**Footer block** "Важно" with 3 external RRS links, all verified
returning HTTP 200:
- World Sailing (official landing) - sailing.org/racingrules/
- RRS 2025-2028 PDF mirror - asiansailing.org
- US Sailing + prescriptions - ussailing.org

Note under buttons: "Если один из сайтов не открывается - попробуй
следующий. Официальный текст одинаковый."

### `/glossary` Glossary

51 bilingual sailing terms across 7 categories. Search + filter by
category. RU + EN for every term.

### `/anatomy` Boat anatomy

Bavaria 46 2D side profile SVG. 17 clickable hotspots; clicking opens
a tooltip with the part name + description. 3D view was removed in
Phase 0 (model-viewer + Kenney placeholder GLB + CDN whitelist all
pulled).

### `/checklist` What to bring + how to behave

Reading reference, not a checkbox form. 8 sections: who-to-listen,
first-10-min, parts, maneuvers, start, docking, summer-tips,
golden-rules. Headers and intros are tri-lingual (RU / EN / PL).
Section body content falls back to English in PL mode (documented in
`docs/I18N_AUDIT.md`).

---

## 5. Race game `/game`

Arcade-style race against AI opponents. Separate physics abstraction
from the simulator on purpose - game physics lives in
`src/lib/race-physics.ts` and is a top-down position / heading / speed
model, not the full VPP engine.

**Game flow:**
1. Pick mission + difficulty (3 levels).
2. Briefing shows course layout: start line, upwind mark, leeward mark,
   finish line, wind direction.
3. Countdown start (user can jockey for position pre-start).
4. Race the course. AI opponents tack, gybe, cover, round marks.
5. On finish: race log POSTed to `/api/coach` which returns a Claude
   Haiku analysis of the race (what you did well, where you lost
   seconds, etc.). If `ANTHROPIC_API_KEY` is not set, falls back to
   rule-based coaching from `src/lib/fallback-coach.ts`.

**4 missions** (`src/data/missions.ts`): upwind-only training, short
circle course, medium windward-leeward, long coastal.

**Result screen:** elapsed time, placement, delta to fastest, OG share
card rendered by `/api/og/result`.

---

## 6. Multiplayer `/multiplayer`

WebSocket rooms with authoritative 20 Hz server. Up to 8 players per
room, stress-tested 8 clients at 20.3 Hz.

**Architecture:**
- Client connects to `wss://regatta.icoffio.com/ws/` (reverse-proxied
  to `:4501`).
- Server (`ws-server/`) is a separate Node process, not part of the
  Next build.
- Server is authoritative: client sends intent (heading, sheet), server
  ticks physics, broadcasts world state back.

**Flow:**
1. Enter nickname (validated - "Создать лобби" shows "Введи ник" error
   if blank).
2. Create lobby -> get a 4-char code.
3. Share code with friends. They enter code + nick, click "Войти".
4. Host clicks "Start" when everyone is in.
5. Race together. Finish order persisted to leaderboard.

**Player count:** 2-8. Lower bound is 2 because a 1-player race should
use `/game` not `/multiplayer`.

---

## 7. Replay viewer `/r/[code]`

After any race finishes (game or multiplayer), the trajectory is
compressed and POSTed to `/api/replay`. A 6-char `[A-Z2-9]` code is
returned.

**Replay UI:**
- Canvas top-down view of the course, boats, wind.
- Scrubbable timeline at the bottom: drag to any point in the race.
- Playback speed toggle (0.5x / 1x / 2x / 4x).
- Legend: which color = which player.

**Invalid / expired code:** shows a clear error state, not a 500.

---

## 8. Leaderboard `/leaderboard` + daily challenge

**Leaderboard:**
- Top times per (difficulty, wind condition, mission) bucket.
- Filters at top: difficulty, mission, time range.
- Table with rank, nick, time, conditions, share link.

**Daily challenge:** `/api/daily` returns one mission + wind seed per
UTC day. Everyone races the same conditions. Leaderboard for the day
resets at 00:00 UTC.

---

## 9. Admin / stats `/stats`

Password-gated dashboard. HTTP Basic Auth via middleware, password from
`ADMIN_PASSWORD` env var (default `regattA` only for local dev).

**Panels:**
- Users: distinct sessions, returning users, geography (IP-derived).
- Sessions: duration histograms, drop-off per route.
- Events: stream from `/api/log` with filters (route, event type, time).
- Feedback: items from `/api/feedback` with status transitions
  (new / triaged / acted / rejected).

Data lives in `/data/regatta-stats.db` in the Docker volume, survives
redeploys.

---

## 10. Internationalization (RU / EN / PL)

**Helpers** from `src/lib/i18n.tsx`:
- `t(ru, en)` for RU + EN strings.
- `tp(ru, en, pl)` for full trilingual strings.
- `useI18n()` hook reads `lang` cookie set by `src/middleware.ts`.

**Coverage (2026-04-20):**
- Navigation: full PL (Glowna, Start, Kursy wiatru, Symulator, Regata,
  Wiecej).
- `/` Home: full PL (converted this session from `t` to `tp`).
- `/rules`: scenarios fully trilingual.
- `/simulator2` V2, `/simulator-v3` V3: full 3-lang UI coverage.
- `/checklist`: PL header + intro. Section bodies fall back to EN.
- `/simulator` V1: original RU + EN only, PL falls back to EN.
- `/courses`: labels in Russian (reference diagram, same convention
  as paper wind diagrams - not a bug, by design).
- `/rules` scenario bodies, `/start` bootcamp lessons, `/quick`,
  `/onboard` section bodies, `/anatomy` part descriptions, `/glossary`
  term definitions: mixed RU + EN, PL falls back to EN where not
  present.

Full per-file PL coverage and effort estimate in `docs/I18N_AUDIT.md`.

---

## 11. Global UI and accessibility

**Theme:** dark ocean. CSS variables `--accent-cyan`, `--bg-primary`,
`--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`,
`--success`, `--warning`. No light mode.

**Typography rule:** no em-dash (U+2014) or en-dash (U+2013) anywhere.
Plain ASCII hyphen or comma. Enforced in `PATTERNS.md` D3 pre-commit
check.

**Navigation:** top bar with primary links + "More" dropdown; mobile
burger expands to a vertical panel. Language toggle visible in the bar
at all times.

**Floating widgets** (hidden on immersive routes `/simulator`,
`/simulator2`, `/simulator-v3`, `/game`, `/multiplayer` to avoid
overlapping the scene):
- Feedback + AI chat widget (both in one; AI chat is scoped to sailing
  Q&A, powered by Claude Haiku with cached system prompt).

**Mobile:** layout stacks vertically. Tested at 390x844 (iPhone 14) and
narrower; `/courses` tack labels verified no-overlap at 320x568.

**Accessibility:**
- Keyboard navigation in V1 simulator (arrow keys for heading + wind
  speed).
- Semantic HTML where practical (sections, headings, buttons).
- Alt text on all content-carrying images.
- Known gap: no formal axe-core audit run in the 2026-04-20 pass. Not
  blocking but flagged in `docs/TEST_RUN_2026-04-20_v3.md`.

---

## 12. API surface `/api/*`

All under rate-limit (per IP + per session, in-memory) and CSP.

| Endpoint | Purpose |
|---|---|
| `POST /api/log` | Client event ingestion -> SQLite `events` |
| `POST /api/feedback` | Feedback form + bug report -> SQLite `feedback` + JSONL backup |
| `POST /api/coach` | Race log -> Claude Haiku race analysis |
| `POST /api/ai-chat` | Sailing Q&A, Claude Haiku with cached system |
| `GET /api/daily` | Today's daily challenge (mission + wind seed) |
| `GET /api/leaderboard` | Top times query with filters |
| `GET/POST /api/player` | Nickname get / set |
| `POST /api/race-result` | Race finish persistence |
| `POST /api/replay` | Compressed trajectory store, returns 6-char code |
| `GET /api/replay/[code]` | Replay trajectory fetch |
| `GET /api/og/result` | Dynamic OG card image (`next/og`) |
| `GET/POST /api/admin/feedback` | Auth-gated feedback status transitions |

---

## 13. Stack + infrastructure + deploy

**Framework:** Next.js 16.2.4 App Router, React 19.2, Turbopack.
**Language:** TypeScript strict.
**Styling:** Tailwind v4 + CSS variables.
**3D (V2 only):** `@react-three/fiber` + `@react-three/drei` + three.js.
**DB:** `better-sqlite3` at `/data/regatta-stats.db`.
**AI:** `@anthropic-ai/sdk`, Claude Haiku 4.5, prompt caching on system.
**Realtime:** separate `ws` process on `:4501`, 20 Hz authoritative.
**Tests:** Vitest (physics engine only), Playwright MCP (manual browser
tests, see `docs/TEST_RUN_*.md`).
**PWA:** manifest + SVG icons, installable.

**Infrastructure:**
- VPS at `46.225.11.249` (Ubuntu).
- Docker Compose: `regatta` container on `172.17.0.1:4500`,
  `regatta-ws` on `172.17.0.1:4501`.
- Nginx with Let's Encrypt SSL. CSP in `regatta.nginx.conf` - only
  `'self'`, no external image / font / HDR sources. That CSP is why
  V2's original `<Environment preset="sunset">` was replaced (the HDR
  file was fetched from raw.githack.com, blocked).
- SQLite bind-mount `/data/` on VPS -> `/data` in container; survives
  redeploys.
- Env vars on VPS at `/opt/repos/regatta/.env`, never committed:
  `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`.

**CI/CD:** GitHub Actions `.github/workflows/deploy.yml` on push to
main -> SSH to VPS -> `git pull` + `docker compose up -d --build`.

**Rollback:**
```
ssh root@46.225.11.249
cd /opt/repos/regatta
git checkout <tag>
docker compose up -d --build
```

---

## 14. What the app deliberately does NOT do

For honesty (per `PATTERNS.md` P4: "Docs lie, I trust them, I get
confused"). Things we've chosen NOT to do, and why.

- **No user accounts / login.** Nickname is persisted in localStorage
  only. The bar to race / learn stays zero. Rationale: early-stage
  learning app; a login wall loses 80% of first-time visitors.
- **No payments / premium tier.** Free forever unless the economics of
  AI coaching force a rethink.
- **No native mobile app.** PWA only. iOS/Android wrappers are not
  planned.
- **No real-weather integration.** Wind is slider-driven, not live-feed.
- **No boat brand licensing.** The physics engine models an abstract
  2-sail cruiser, not Bavaria 46 (which is only an anatomy reference).
- **No ORC / VPP-grade physics.** Engine is "minimum viable realism" -
  enough to teach the causal chain, not enough to certify a hull.
- **No rudder / yaw dynamics.** V1 physics. Candidate for Phase 4+.
- **No spinnaker / Code 0 / gennaker.** Two-sail rig only in V1. Same.
- **No current / tide / wave modeling.** Flat water only.
- **No Kenney 3D anatomy placeholder.** Removed Phase 0 because it was
  a boat that wasn't Bavaria 46 with hotspots placed on the wrong parts.
- **No em-dash / en-dash.** Anywhere. Enforced by `PATTERNS.md` D3.

---

## Recent change log (this session, 2026-04-20)

Bugs found + fixed + verified in browser (see
`docs/TEST_RUN_2026-04-20_v2.md` for the full audit trail):

1. V2 CSP "page couldn't load" - removed Drei `<Environment>` HDR
   fetch.
2. V3 defaults loaded into stall - bumped `DEFAULT_UI.jibAngle` 42->54,
   `mainAngle` 50->52, initial bs seed `max(3, TWS*0.45)`.
3. `/courses` thumbnails all pointing up - wrapped boat render in
   `<g rotate(twa)>`.
4. `/courses` tack labels overlapping sector labels on mobile - moved
   to bottom horizontal.
5. V1 sail rendered on windward side - fixed `getTackSide` sign in
   `normalizeAngle(windDir - boatHeading)`.
6. V3 jib drew flat - redrew with two Q-curve belly + linear gradient.

Physics engine: 8/8 tests still green, no regression.
